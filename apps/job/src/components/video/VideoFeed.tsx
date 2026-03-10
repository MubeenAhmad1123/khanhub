'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { ReelPlayer } from './ReelPlayer';
import { VideoOverlay } from '@/components/feed/VideoOverlay';
import { ActionButtons } from '@/components/feed/ActionButtons';
import { GuestWall } from '@/components/feed/GuestWall';
import { FeedTabs } from '@/components/feed/FeedTabs';
import { CategoryStoriesBar } from '@/components/feed/CategoryStoriesBar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';


import { CATEGORY_PLACEHOLDERS, PLACEHOLDER_OVERLAY_DATA } from '@/lib/categories';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

export function VideoFeed() {
    const { activeCategory, activeRole } = useCategory();
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('feed_last_index');
            if (saved !== null && !isNaN(Number(saved))) {
                return Number(saved);
            }
        }
        return 0;
    });
    const [activeTab, setActiveTab] = useState(0);
    const [showGuestWall, setShowGuestWall] = useState(false);
    const [showStoriesBar, setShowStoriesBar] = useState(true);
    const [feedKey, setFeedKey] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
    const watchedIndices = useRef<Set<number>>(new Set());
    const touchStartX = useRef<number>(0);
    const touchStartY = useRef<number>(0);
    const restoredIndexRef = useRef<number | null>(null);

    // Initial restore from sessionStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = sessionStorage.getItem('feed_last_index');
        if (saved !== null && !isNaN(Number(saved))) {
            restoredIndexRef.current = Number(saved);
        }
    }, []);

    // ── Real Firestore videos ─────────────────────────────────────
    const [firestoreVideos, setFirestoreVideos] = useState<any[]>([]);
    const [firestoreLoading, setFirestoreLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setFirestoreLoading(true);
        setFirestoreVideos([]);

        const q = query(
            collection(db, 'videos'),
            where('is_live', '==', true)
        );

        const getTabFilter = (tabIndex: number) => {
            if (tabIndex === 0) return null;
            if (activeCategory === 'dailywages') {
                return tabIndex === 1 ? 'seeker' : 'provider';
            }
            return tabIndex === 1 ? 'provider' : 'seeker';
        };

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roleFilter = getTabFilter(activeTab);

            const videos = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(d => {
                    const matchesCategory = d.category === activeCategory || (activeCategory === 'dailywages' && !d.category);
                    const matchesRole = !roleFilter || d.userRole === roleFilter;

                    // Search filter
                    const title = (d.overlayData?.title || d.title || '').toLowerCase();
                    const role = (d.overlayData?.badge || d.role || '').toLowerCase();
                    const catName = (d.category || '').toLowerCase();
                    const searchLower = searchQuery.toLowerCase();
                    const matchesSearch = !searchQuery ||
                        title.includes(searchLower) ||
                        role.includes(searchLower) ||
                        catName.includes(searchLower);

                    return d.admin_status === 'approved' && matchesCategory && matchesRole && matchesSearch;
                })
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .map(d => ({
                    id: d.id,
                    isPlaceholder: false,
                    videoId: undefined,
                    cloudinaryUrl: d.cloudinaryUrl,
                    category: d.category,
                    title: d.overlayData?.title || d.title || '',
                    badge: d.overlayData?.badge || d.role || '',
                    field1: d.overlayData?.field1 || '',
                    field2: d.overlayData?.field2 || '',
                    location: d.overlayData?.location || d.city || '',
                    views: d.views || 0,
                    likes: d.likes || 0,
                    saves: d.saves || 0,
                    shares: d.shares || 0,
                    userId: d.userId,
                    userPhoto: d.userPhoto || '',
                    userRole: d.userRole || '',
                }));
            setFirestoreVideos(videos);
            setFirestoreLoading(false);
        }, () => {
            setFirestoreLoading(false);
        });

        return () => unsubscribe();
    }, [activeCategory, activeTab, searchQuery]);

    // ── Build video list: real first, then placeholders ───────────
    const roleFilter = activeTab === 0 ? null : (activeCategory === 'dailywages' ? (activeTab === 1 ? 'seeker' : 'provider') : (activeTab === 1 ? 'provider' : 'seeker'));

    // Map placeholder badge to role for filtering
    const getPlaceholderRole = (badge: string): 'provider' | 'seeker' => {
        const b = badge.toLowerCase();
        if (b.includes('hiring') || b.includes('patient') || b.includes('client') || b.includes('looking') || b.includes('household') || b.includes('buyer')) return 'seeker';
        return 'provider';
    };

    const placeholderList = CATEGORY_PLACEHOLDERS[activeCategory].map((id, i) => {
        const overlay = PLACEHOLDER_OVERLAY_DATA[activeCategory][i % PLACEHOLDER_OVERLAY_DATA[activeCategory].length] || {};
        return {
            id: `placeholder-${i}`,
            isPlaceholder: true,
            videoId: id,
            userId: null,
            userPhoto: null,
            userRole: getPlaceholderRole(overlay.badge || ''),
            cloudinaryUrl: undefined,
            category: activeCategory,
            ...overlay,
        };
    }).filter(p => !roleFilter || p.userRole === roleFilter);

    const videos = [...firestoreVideos, ...placeholderList];

    // ── View counting ─────────────────────────────────────────────
    const countView = async (videoId: string) => {
        if (!videoId || videoId.startsWith('placeholder-')) return;
        try {
            await updateDoc(doc(db, 'videos', videoId), {
                views: increment(1),
            });
        } catch {
            // Silent fail — view counting is non-critical
        }
    };

    // ── Guest wall via IntersectionObserver ───────────────────────
    useEffect(() => {
        if (loading || user) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        const index = reelRefs.current.findIndex(ref => ref === entry.target);

                        if (index !== -1 && !watchedIndices.current.has(index)) {
                            watchedIndices.current.add(index);
                            setActiveIndex(index);
                            sessionStorage.setItem('feed_last_index', String(index));

                            const current = parseInt(localStorage.getItem('jobreel_videos_watched') || '0');
                            const newCount = current + 1;
                            localStorage.setItem('jobreel_videos_watched', String(newCount));

                            if (newCount >= 3) {
                                setShowGuestWall(true);
                            }

                            const targetVideo = videos[index];
                            if (targetVideo) countView(targetVideo.id);
                        }
                    }
                });
            },
            { threshold: 0.5, root: containerRef.current }
        );

        const timeout = setTimeout(() => {
            reelRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
        }, 100);

        return () => { observer.disconnect(); clearTimeout(timeout); };
    }, [user, activeCategory, videos]);

    // ── Logged-in user: track active index via IntersectionObserver
    useEffect(() => {
        if (loading || !user) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        const index = reelRefs.current.findIndex(ref => ref === entry.target);
                        if (index !== -1) {
                            setActiveIndex(index);
                            sessionStorage.setItem('feed_last_index', String(index));
                            const targetVideo = videos[index];
                            if (targetVideo) countView(targetVideo.id);
                        }
                    }
                });
            },
            { threshold: 0.5, root: containerRef.current }
        );
        const timeout = setTimeout(() => {
            reelRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
        }, 100);
        return () => { observer.disconnect(); clearTimeout(timeout); };
    }, [user, activeCategory, videos]);

    // ── Jump to index or videoId from URL or Session ──────────────────────────
    const searchParams = useSearchParams();

    useEffect(() => {
        const urlVideoId = searchParams.get('v');
        const sessionVideoId = sessionStorage.getItem('feed_start_video_id');
        const sessionIndex = sessionStorage.getItem('feed_start_index');

        const targetVideoId = urlVideoId || sessionVideoId;

        if (targetVideoId && videos.length > 0 && containerRef.current) {
            const idx = videos.findIndex(v => v.id === targetVideoId);
            if (idx !== -1) {
                setTimeout(() => {
                    reelRefs.current[idx]?.scrollIntoView({ behavior: 'auto' });
                    setActiveIndex(idx);
                }, 200);
            }
            sessionStorage.removeItem('feed_start_video_id');
            sessionStorage.removeItem('feed_source');
        } else if (sessionIndex && videos.length > 0 && containerRef.current) {
            const idx = Number(sessionIndex);
            setTimeout(() => {
                reelRefs.current[idx]?.scrollIntoView({ behavior: 'auto' });
                setActiveIndex(idx);
            }, 200);
            sessionStorage.removeItem('feed_start_index');
            sessionStorage.removeItem('feed_source');
        }
        watchedIndices.current = new Set();
    }, [videos.length, searchParams]);

    // ── Restore scroll position on mount ──────────────────────────
    useEffect(() => {
        if (!videos.length) return;
        if (restoredIndexRef.current === null || restoredIndexRef.current === 0) return;

        const index = Math.min(restoredIndexRef.current, videos.length - 1);
        restoredIndexRef.current = null; // only restore once

        // Small delay to ensure DOM is rendered
        setTimeout(() => {
            if (containerRef.current && reelRefs.current[index]) {
                reelRefs.current[index]?.scrollIntoView({ behavior: 'auto' });
                setActiveIndex(index);
            }
        }, 150);
    }, [videos]);


    // Scroll to specific index programmatically
    const scrollToIndex = (index: number) => {
        if (index < 0 || index >= videos.length) return;
        reelRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
        setActiveIndex(index);
        sessionStorage.setItem('feed_last_index', String(index));
    };

    // Keyboard arrow keys — desktop navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                scrollToIndex(activeIndex + 1);
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                scrollToIndex(activeIndex - 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex, videos.length]);

    // Hide stories bar when user scrolls past first video
    useEffect(() => {
        if (activeIndex > 0 && showStoriesBar) {
            setShowStoriesBar(false);
        }
        // Show again only if user scrolls back to top
        if (activeIndex === 0) {
            setShowStoriesBar(true);
        }
    }, [activeIndex, showStoriesBar]);

    // When category changes from stories bar — scroll to top + refresh
    const handleCategoryChange = () => {
        setActiveIndex(0);
        setFeedKey(prev => prev + 1);  // forces re-mount of video list
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent, video: any) => {
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
        // Swipe left > 60px, vertical movement < 30px, and video has real userId
        if (deltaX < -60 && deltaY < 30 && video.userId && video.userId.length >= 10) {
            router.push(`/profile/${video.userRole || 'user'}/${video.userId}`);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#fff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        }}>
            {/* Desktop side panels — black with subtle content */}
            <div className="hidden md:flex" style={{
                flex: 1,
                height: '100dvh',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 24,
                gap: 16,
            }}>
                <div style={{ color: '#333', fontSize: 12, fontFamily: 'DM Sans', textAlign: 'right' }}>
                    <div>↑ ↓ to navigate</div>
                </div>
            </div>

            {/* CENTER COLUMN — the actual feed */}
            <div style={{
                width: '100%',
                maxWidth: 400,
                height: '100dvh',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
            }}>
                {/* FeedTabs floats over */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, pointerEvents: 'none', paddingTop: 'env(safe-area-inset-top, 12px)' }}>
                    <div className="flex flex-col gap-2 p-4 pointer-events-auto">
                        <FeedTabs activeTab={activeTab} onChange={setActiveTab} />

                        {/* Inline Search Bar */}
                        <div className="relative group mt-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 group-focus-within:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder={`Search in ${activeCategory}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/20 backdrop-blur-md border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:bg-black/40 transition-all placeholder:text-white/40"
                            />
                        </div>
                    </div>
                </div>

                {/* STORIES BAR — only visible on first video */}
                <AnimatePresence>
                    {showStoriesBar && (
                        <motion.div
                            initial={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.25 }}
                            style={{
                                position: 'absolute',
                                top: 48,       // below FeedTabs
                                left: 0, right: 0,
                                zIndex: 28,
                            }}
                        >
                            <CategoryStoriesBar onCategoryChange={handleCategoryChange} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div
                    ref={containerRef}
                    key={feedKey}
                    className="scrollbar-hide"
                    style={{
                        height: '100dvh',
                        overflowY: 'scroll',
                        scrollSnapType: 'y mandatory',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {videos.map((video, index) => (
                        <div
                            key={video.id}
                            data-index={index}
                            ref={(el) => { reelRefs.current[index] = el; }}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={(e) => handleTouchEnd(e, video)}
                            style={{
                                position: 'relative',
                                height: index === 0 && showStoriesBar
                                    ? 'calc(100dvh - 130px)'
                                    : '100dvh',
                                width: '100%',
                                overflow: 'hidden',
                                background: '#000',
                                scrollSnapAlign: 'start',
                                scrollSnapStop: 'always',
                                flexShrink: 0,
                                marginTop: index === 0 && showStoriesBar ? 130 : 0,
                                transition: 'height 0.3s ease, margin-top 0.3s ease',
                            }}
                        >
                            <ReelPlayer
                                videoId={video.videoId}
                                cloudinaryUrl={video.cloudinaryUrl}
                                thumbnailUrl={video.thumbnailUrl || video.userPhoto} // fallback to userPhoto for now
                                isPlaceholder={video.isPlaceholder}
                                isActive={activeIndex === index && !showGuestWall}
                                isPreload={index >= activeIndex - 1 && index <= activeIndex + 2}
                            />

                            <div style={{
                                position: 'absolute',
                                bottom: 80,
                                left: 0,
                                right: 60,
                                zIndex: 20,
                                pointerEvents: 'none',
                            }}>
                                <VideoOverlay data={video} />
                            </div>

                            <div style={{
                                position: 'absolute',
                                right: 12,
                                bottom: 100,
                                zIndex: 20,
                            }}>
                                <ActionButtons
                                    videoUserId={video.userId}
                                    videoUserPhoto={video.userPhoto}
                                    videoUserRole={video.userRole}
                                    onConnect={() => {
                                        if (video.userId) {
                                            router.push(`/profile/${video.userRole || 'user'}/${video.userId}`);
                                        }
                                    }}
                                    connectLabel={
                                        activeCategory === 'dailywages'
                                            ? (activeRole === 'provider' ? 'Hire 🤝' : 'Apply ✋')
                                            : activeCategory === 'marriage'
                                                ? 'Interest 💍'
                                                : 'Connect'
                                    }
                                    likes={video.likes || 0}
                                    saves={video.saves || 0}
                                    shares={video.shares || 0}
                                    videoId={video.id}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT SIDE — desktop navigation arrows */}
            <div className="hidden md:flex" style={{
                flex: 1,
                height: '100dvh',
                alignItems: 'center',
                paddingLeft: 24,
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 16,
            }}>
                <button
                    onClick={() => scrollToIndex(activeIndex - 1)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e0e0e0')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#f5f5f5')}
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: '#f5f5f5', border: '1px solid #ddd',
                        color: '#000', fontSize: 18, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s',
                    }}
                >
                    ↑
                </button>
                <button
                    onClick={() => scrollToIndex(activeIndex + 1)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e0e0e0')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#f5f5f5')}
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: '#f5f5f5', border: '1px solid #ddd',
                        color: '#000', fontSize: 18, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s',
                    }}
                >
                    ↓
                </button>
            </div>

            {!user && !loading && (
                <GuestWall
                    isVisible={showGuestWall}
                    onContinue={() => {
                        const round = parseInt(localStorage.getItem('jobreel_guest_round') || '0');
                        if (round === 0) {
                            localStorage.setItem('jobreel_guest_round', '1');
                            localStorage.setItem('jobreel_videos_watched', '0');
                            setShowGuestWall(false);
                        }
                    }}
                />
            )}
        </div>
    );
}
