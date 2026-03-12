'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCategory } from '@/context/CategoryContext';
import ReelPlayer from './ReelPlayer'; // Ensure default import or named if needed
import { VideoOverlay } from '@/components/feed/VideoOverlay';
import { ActionButtons } from '@/components/feed/ActionButtons';
import { GuestWall } from '@/components/feed/GuestWall';
import { FeedTabs } from '@/components/feed/FeedTabs';
import { CategoryStoriesBar } from '@/components/feed/CategoryStoriesBar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
// import { CategoryDropdown } from '@/components/feed/CategoryDropdown'; // Removed for inline placement
import { CATEGORY_PLACEHOLDERS, PLACEHOLDER_OVERLAY_DATA } from '@/lib/categories';
import { collection, query, where, orderBy, onSnapshot, doc, limit, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

// Preload window config:
const PRELOAD_AHEAD = 2   // preload 2 videos ahead
const PRELOAD_BEHIND = 1  // keep 1 video behind buffered

export function VideoFeed() {
    const { activeCategory, activeRole } = useCategory();
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeIndex, setActiveIndex] = useState(0);
    const [activeTab, setActiveTab] = useState(0);
    const [showGuestWall, setShowGuestWall] = useState(false);
    const [showStoriesBar, setShowStoriesBar] = useState(true);
    const [firestoreProfile, setFirestoreProfile] = useState<any>(null);
    const [firestoreVideos, setFirestoreVideos] = useState<any[]>([]);
    const [watchedIds, setWatchedIds] = useState<string[]>([]);
    const [displayVideos, setDisplayVideos] = useState<any[]>([]);
    const [isMuted, setIsMuted] = useState(true);
    const [userHasInteracted, setUserHasInteracted] = useState(false);

    useEffect(() => {
        const markInteracted = () => setUserHasInteracted(true);
        document.addEventListener('click', markInteracted, { once: true });
        document.addEventListener('keydown', markInteracted, { once: true });
        document.addEventListener('scroll', markInteracted, { once: true });
        return () => {
            document.removeEventListener('click', markInteracted);
            document.removeEventListener('keydown', markInteracted);
            document.removeEventListener('scroll', markInteracted);
        };
    }, []);

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Ensure videoRefs array is scaled
    if (videoRefs.current.length < displayVideos.length) {
        videoRefs.current = [...videoRefs.current, ...new Array(displayVideos.length - videoRefs.current.length).fill(null)];
    }

    // Fix 1: Force first video active on mount (Guaranteed Playback Start)
    useEffect(() => {
        if (displayVideos.length === 0) return;
        // Give DOM time to render, then ensure index 0 is active
        const timer = setTimeout(() => {
            setActiveIndex(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [displayVideos.length]);

    // ── Load User Profile & Watched Videos ────────────────────────
    useEffect(() => {
        if (!user) {
            setFirestoreProfile(null);
            setWatchedIds([]);
            return;
        }
        const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setFirestoreProfile(data);
                setWatchedIds(data.watchedVideos || []);
            }
        });
        return () => unsub();
    }, [user]);

    // ── Fetch Firestore Videos ────────────────────────────────────
    useEffect(() => {
        const queryCategory = (activeTab === 0 && firestoreProfile?.category)
            ? firestoreProfile.category
            : activeCategory;

        const q = query(
            collection(db, 'videos'),
            where('is_live', '==', true),
            where('admin_status', '==', 'approved'),
            where('category', '==', queryCategory),
            orderBy('createdAt', 'desc'),
            limit(30)
        );

        const getTabFilter = (tabIndex: number) => {
            if (tabIndex === 0) return null;
            if (activeCategory === 'jobs') return tabIndex === 1 ? 'seeker' : 'provider';
            return tabIndex === 1 ? 'provider' : 'seeker';
        };

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roleFilter = getTabFilter(activeTab);
            const videos = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(d => {
                    const matchesCategory = d.category === queryCategory;
                    const matchesRole = !roleFilter || d.userRole === roleFilter;
                    const url = d.cloudinaryUrl;
                    const isValidCloudinary = url && url.includes('cloudinary.com') && !url.includes('youtube.com');
                    return d.admin_status === 'approved' && matchesCategory && matchesRole && isValidCloudinary;
                })
                .map(d => ({
                    id: d.id,
                    isPlaceholder: false,
                    cloudinaryUrl: d.cloudinaryUrl,
                    thumbnailUrl: d.thumbnailUrl || d.userPhoto || '',
                    ...d
                }));
            setFirestoreVideos(videos);
        });

        return () => unsubscribe();
    }, [activeCategory, activeTab, firestoreProfile]);

    // ── Build Final Display List ───────────────────────────────────
    useEffect(() => {
        const baseVideos = [...firestoreVideos];
        if (!user) {
            setDisplayVideos(baseVideos);
            return;
        }
        const unwatched = baseVideos.filter(v => !watchedIds.includes(v.id));
        const watched = baseVideos.filter(v => watchedIds.includes(v.id));
        setDisplayVideos(unwatched.length > 0 ? unwatched : (watched.length > 0 ? [...watched].reverse() : baseVideos));
    }, [firestoreVideos, watchedIds, user]);

    // ── Intersection Observer for Active Index & URL ───────────────
    useEffect(() => {
        if (displayVideos.length === 0) return;

        const observers: IntersectionObserver[] = [];
        const refs = videoRefs.current;

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

        refs.forEach((ref, index) => {
            if (!ref) return;
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                            setActiveIndex(index);
                            // Update URL
                            const video = displayVideos[index];
                            if (video && !video.isPlaceholder) {
                                const url = new URL(window.location.href);
                                if (url.searchParams.get('v') !== video.id) {
                                    url.searchParams.set('v', video.id);
                                    window.history.replaceState(null, '', url.pathname + url.search);
                                }
                            }
                            // Guest Wall Logic
                            if (!user) {
                                const watchedCount = parseInt(localStorage.getItem('jobreel_videos_watched') || '0') + 1;
                                localStorage.setItem('jobreel_videos_watched', String(watchedCount));
                                if (watchedCount >= 3) setShowGuestWall(true);
                            }
                        }
                    });
                },
                {
                    threshold: 0.5,
                    root: containerRef.current,
                    rootMargin: '0px',
                }
            );
            observer.observe(ref);
            observers.push(observer);
        });

        return () => observers.forEach(o => o.disconnect());
    }, [displayVideos.length, user]);

    // Method 2: Scroll event fallback (DevTools emulation backup)
    useEffect(() => {
        const container = containerRef.current;
        if (!container || displayVideos.length === 0) return;

        const handleScroll = () => {
            const containerHeight = container.clientHeight;
            if (containerHeight === 0) return;

            const scrollTop = container.scrollTop;
            const newIndex = Math.round(scrollTop / containerHeight);

            if (newIndex !== activeIndex && newIndex >= 0 && newIndex < displayVideos.length) {
                setActiveIndex(newIndex);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [displayVideos.length, activeIndex]);

    // ── Keyboard Navigation ───────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                const next = activeIndex + 1;
                if (next < displayVideos.length) {
                    videoRefs.current[next]?.scrollIntoView({ behavior: 'smooth' });
                }
            } else if (e.key === 'ArrowUp') {
                const prev = activeIndex - 1;
                if (prev >= 0) {
                    videoRefs.current[prev]?.scrollIntoView({ behavior: 'smooth' });
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex, displayVideos.length]);

    // ── Deep Linking Support (?v=videoId) ────────────────────────
    const targetVideoId = searchParams.get('v');

    useEffect(() => {
        if (!targetVideoId || displayVideos.length === 0) return;
        const idx = displayVideos.findIndex(v => v.id === targetVideoId);
        if (idx !== -1 && idx !== activeIndex) {
            setActiveIndex(idx);
            // Scroll to that video:
            setTimeout(() => {
                videoRefs.current[idx]?.scrollIntoView({ behavior: 'instant' });
            }, 100);
        }
    }, [targetVideoId, displayVideos]);

    // ── Stories Bar Visibility ────────────────────────────────────
    useEffect(() => {
        setShowStoriesBar(activeIndex === 0);
    }, [activeIndex]);

    const getVideoState = (index: number) => {
        const distance = index - activeIndex;
        if (distance === 0) return { isActive: true, isAdjacent: false };
        if (distance >= -PRELOAD_BEHIND && distance <= PRELOAD_AHEAD) {
            return { isActive: false, isAdjacent: true };
        }
        return { isActive: false, isAdjacent: false };
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', justifyContent: 'center' }}>

            {/* Desktop UI Arrows (Side) */}
            <div className="hidden md:flex flex-col justify-center gap-4 fixed left-8 z-50">
                <button onClick={() => videoRefs.current[activeIndex - 1]?.scrollIntoView({ behavior: 'smooth' })} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md">↑</button>
                <button onClick={() => videoRefs.current[activeIndex + 1]?.scrollIntoView({ behavior: 'smooth' })} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md">↓</button>
            </div>

            <div style={{ width: '100%', maxWidth: 450, height: '100dvh', position: 'relative', overflow: 'hidden' }}>

                {/* Header Overlays */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, pointerEvents: 'none' }}>
                    <div className="flex items-center p-2 pt-6 pointer-events-auto">
                        <FeedTabs activeTab={activeTab} onChange={setActiveTab} />
                    </div>
                    <AnimatePresence>
                        {showStoriesBar && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <CategoryStoriesBar onCategoryChange={() => setActiveIndex(0)} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div
                    ref={containerRef}
                    className="feed-container no-scrollbar"
                    style={{
                        height: '100dvh',
                        minHeight: '-webkit-fill-available', // iOS Safari fix
                        overflowY: 'scroll',
                        scrollSnapType: 'y mandatory',
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        position: 'relative',
                        background: '#000',
                    }}
                >
                    {displayVideos.map((video, index) => {
                        const { isActive, isAdjacent } = getVideoState(index);
                        const isVisible = Math.abs(index - activeIndex) <= 3;

                        return (
                            <div
                                key={video.id}
                                ref={el => { videoRefs.current[index] = el; }}
                                style={{
                                    height: '100dvh',
                                    minHeight: '100vh',         // fallback
                                    scrollSnapAlign: 'start',
                                    scrollSnapStop: 'always',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: '#000',
                                    flexShrink: 0,
                                }}
                            >
                                {isVisible ? (
                                    <>
                                        <ReelPlayer
                                            cloudinaryUrl={video.cloudinaryUrl}
                                            thumbnailUrl={video.thumbnailUrl}
                                            isActive={isActive}
                                            isAdjacent={isAdjacent}
                                            videoId={video.id}
                                            isMuted={isMuted}
                                            userHasInteracted={userHasInteracted}
                                        />
                                        <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, zIndex: 20, pointerEvents: 'none' }}>
                                            <VideoOverlay data={video} />
                                        </div>
                                        <div style={{ position: 'absolute', right: 12, bottom: 100, zIndex: 20 }}>
                                            <ActionButtons
                                                videoUserId={video.userId}
                                                videoUserPhoto={video.userPhoto}
                                                videoUserRole={video.userRole}
                                                onConnect={() => router.push(`/profile/${video.userRole || 'user'}/${video.userId}`)}
                                                connectLabel={activeCategory === 'jobs' ? (activeRole === 'provider' ? 'Hire 🤝' : 'Apply ✋') : 'Connect'}
                                                likes={video.likes || 0}
                                                saves={video.saves || 0}
                                                shares={video.shares || 0}
                                                videoId={video.id}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ position: 'absolute', inset: 0, background: '#111' }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {!user && showGuestWall && (
                <GuestWall isVisible={true} onContinue={() => {
                    localStorage.setItem('jobreel_videos_watched', '0');
                    setShowGuestWall(false);
                }} />
            )}
        </div>
    );
}
