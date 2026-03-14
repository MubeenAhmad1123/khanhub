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
import { collection, query, where, orderBy, onSnapshot, doc, limit, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

// Shuffle helper:
const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// Preload window config:
const PRELOAD_AHEAD = 2   // preload 2 videos ahead
const PRELOAD_BEHIND = 1  // keep 1 video behind buffered

export function VideoFeed() {
    const { activeCategory, activeRole } = useCategory();
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const targetVideoId = searchParams.get('v');
    const targetCategoryId = searchParams.get('c');

    console.log('[DEEPLINK] URL params on mount →', { targetVideoId, targetCategoryId });

    const [activeIndex, setActiveIndex] = useState(0);
    const [activeTab, setActiveTab] = useState(2); // Default to 'For You'
    const [showGuestWall, setShowGuestWall] = useState(false);
    const [showStoriesBar, setShowStoriesBar] = useState(true);
    const [firestoreVideos, setFirestoreVideos] = useState<any[]>([]);
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
    const hasDeeplinked = useRef(false);
    const videoRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Ensure videoRefs array is scaled
    if (videoRefs.current.length < displayVideos.length) {
        videoRefs.current = [...videoRefs.current, ...new Array(displayVideos.length - videoRefs.current.length).fill(null)];
    }
    useEffect(() => {
        if (user) {
            setShowGuestWall(false);
            // Clear ?v= param to stop the deeplink loop on login
            if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                if (url.searchParams.has('v')) {
                    window.history.replaceState(null, '', url.pathname);
                }
            }
            // Reset deeplink flag so it doesn't re-scroll on next category change
            hasDeeplinked.current = false;
        }
    }, [user]);

    // Reset feed on signal (but NOT automatically on category change to prevent jumpiness)
    useEffect(() => {
        const resetRequested = sessionStorage.getItem('feed_reset_requested');
        
        if (resetRequested === 'true') {
            console.log('[RESET] Feed reset requested by CategoryStoriesBar');
            setActiveTab(2); // Back to For You
            sessionStorage.removeItem('feed_reset_requested');
            
            // Scroll to top immediately
            const timer = setTimeout(() => {
                videoRefs.current[0]?.scrollIntoView({ behavior: 'instant' });
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    // Ensure first video active on mount and preserve active index on list update
    const prevDisplayRef = useRef<any[]>([]);
    const prevActiveRef  = useRef<number>(0);

    // List updated — just sync refs
    useEffect(() => {
        prevDisplayRef.current = displayVideos;
        prevActiveRef.current = activeIndex;
    }, [displayVideos, activeIndex]);

    // ── Load User Profile & Watched Videos ────────────────────────
    // User Profile Snapshot removed to stop chain reaction

    // ── Fetch Firestore Videos ────────────────────────────────────
    useEffect(() => {
        const isForYou = activeTab === 2;

        let q;
        if (isForYou) {
            // ── FOR YOU: mixed categories, newest first ──
            q = query(
                collection(db, 'videos'),
                where('is_live', '==', true),
                where('admin_status', '==', 'approved'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
        } else {
            const qCategory = (targetCategoryId && targetVideoId)
                ? targetCategoryId
                : activeCategory;

            q = query(
                collection(db, 'videos'),
                where('is_live', '==', true),
                where('admin_status', '==', 'approved'),
                where('category', '==', qCategory),
                orderBy('createdAt', 'desc'),
                limit(30)
            );
        }

        const getTabFilter = (tabIndex: number) => {
            if (tabIndex === 2) return null; // 'For You' — no role filter
            if (activeCategory === 'jobs') return tabIndex === 0 ? 'seeker' : 'provider';
            return tabIndex === 0 ? 'provider' : 'seeker';
        };

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roleFilter = getTabFilter(activeTab);
            let videos = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(d => {
                    const matchesCategory = isForYou || d.category === (targetCategoryId || activeCategory);
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

            // Shuffle if For You tab — ONLY on first load:
            setFirestoreVideos(prev => {
                if (isForYou && prev.length === 0) {
                    return shuffleArray(videos);
                }
                return videos;
            });
        }, (error) => {
            console.warn('[VideoFeed Videos] Snapshot error:', error.message);
        });

        return () => unsubscribe();
    }, [activeCategory, activeTab, targetCategoryId, targetVideoId, activeRole]);

    // ── Display videos — NEVER filter, only soft-sort: ──
    const buildDisplayList = useCallback((
      videos: any[],
      wIds: string[]
    ): any[] => {
      // Step A — Remove ALL watched video filtering:
      return videos;
    }, []);

    // ── When videos load — set display list, NEVER touch activeIndex: ──
    useEffect(() => {
      if (!firestoreVideos.length) return;
      // REPLACE setDisplayVideos with direct assignment:
      setDisplayVideos(firestoreVideos);  // show ALL videos, no filtering
      // ❌ DO NOT call setActiveIndex here
      // ❌ DO NOT call scrollToTop here
    }, [firestoreVideos, buildDisplayList]);

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
                            setActiveIndex(prev => prev === index ? prev : index);

                            // Update URL — but ONLY if auth has resolved (not loading)
                            const video = displayVideos[index];
                            if (video && !video.isPlaceholder && !loading) {
                                const url = new URL(window.location.href);
                                if (url.searchParams.get('v') !== video.id) {
                                    url.searchParams.set('v', video.id);
                                    window.history.replaceState(null, '', url.pathname + url.search);
                                }
                            }

                            // Guest Wall Logic — ONLY if auth resolved AND user is confirmed null
                            if (!user && !loading) {
                                const watchedCount = parseInt(localStorage.getItem('jobreel_videos_watched') || '0') + 1;
                                localStorage.setItem('jobreel_videos_watched', String(watchedCount));
                                if (watchedCount >= 3) setShowGuestWall(true);
                            }
                        }
                    });
                },
                {
                    root: containerRef.current,
                    threshold: 0.5,        // 50% visible = active
                    rootMargin: '0px',
                }
            );
            observer.observe(ref);
            observers.push(observer);
        });

        return () => observers.forEach(o => o.disconnect());
    }, [displayVideos, user, loading]);

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

    // ── Deep Linking Support (?v=videoId&c=categoryId) ────────────
    const { setActiveCategory } = useCategory();

    // 1. Sync Category if needed
    useEffect(() => {
        if (targetCategoryId && targetCategoryId !== activeCategory) {
            // Ensure it's a valid category
            const { CATEGORY_CONFIG } = require('@/lib/categories');
            if (CATEGORY_CONFIG && Object.keys(CATEGORY_CONFIG).includes(targetCategoryId)) {
                setActiveCategory(targetCategoryId as any);
            }
        }
    }, [targetCategoryId, activeCategory, setActiveCategory]);

    // 2. Sync Video Index
    useEffect(() => {
        console.log('[SCROLL] Sync Video Index triggered →', {
            targetVideoId,
            displayVideosCount: displayVideos.length,
            foundAtIndex: displayVideos.findIndex(v => v.id === targetVideoId),
            currentActiveIndex: activeIndex
        });

        if (!targetVideoId || displayVideos.length === 0) return;
        if (hasDeeplinked.current) return;

        const idx = displayVideos.findIndex(v => v.id === targetVideoId);

        if (idx !== -1) {
            hasDeeplinked.current = true;
            // Video found in list — scroll to it
            if (idx !== activeIndex) {
                setActiveIndex(idx);
                setTimeout(() => {
                    videoRefs.current[idx]?.scrollIntoView({ behavior: 'instant' });
                }, 100);
            }
        } else {
            // Video NOT in list (e.g. has no category field, was excluded by Firestore query)
            // Fetch it directly by document ID and prepend it to the feed
            const fetchAndPrepend = async () => {
                try {
                    const docSnap = await getDoc(doc(db, 'videos', targetVideoId));
                    if (docSnap.exists()) {
                        const data = docSnap.data() as any;
                        const missingVideo = {
                            id: docSnap.id,
                            isPlaceholder: false,
                            cloudinaryUrl: data.cloudinaryUrl,
                            thumbnailUrl: data.thumbnailUrl || data.userPhoto || '',
                            ...data,
                        };
                        // Prepend the missing video so it becomes index 0
                        setDisplayVideos(prev => {
                            // Avoid duplicates in case of race condition
                            if (prev.some(v => v.id === targetVideoId)) return prev;
                            return [missingVideo, ...prev];
                        });
                        hasDeeplinked.current = true;
                        // Scroll to index 0 after prepend
                        setTimeout(() => {
                            setActiveIndex(0);
                            videoRefs.current[0]?.scrollIntoView({ behavior: 'instant' });
                        }, 150);
                    }
                } catch (err) {
                    console.warn('[DEEPLINK] Failed to fetch missing video:', err);
                }
            };
            fetchAndPrepend();
        }
    }, [targetVideoId, displayVideos]);

    // ── Stories Bar Visibility ────────────────────────────────────
    useEffect(() => {
        setShowStoriesBar(activeIndex === 0);
    }, [activeIndex]);

    // ── Watched video tracking — SAFE version: ──
    const markWatched = useCallback(async (videoId: string) => {
      // Rule 1: guests never write:
      if (!user?.uid) return;

      // Rule 2: silent failure — never crash feed:
      try {
        await updateDoc(doc(db, 'videos', videoId), {
          views: increment(1)
        });
        // ← NO watchedVideos write here
      } catch (_) {
        // Silently ignore — permissions, offline, etc.
      }
    }, [user?.uid]);

    // ── View Tracking Timer ────────────────
    useEffect(() => {
        if (!user?.uid || displayVideos.length === 0) return;
        const currentVideo = displayVideos[activeIndex];
        if (!currentVideo || currentVideo.isPlaceholder) return;

        const timer = setTimeout(() => {
            markWatched(currentVideo.id);
        }, 3000);

        return () => clearTimeout(timer);
    }, [activeIndex, displayVideos, user, markWatched]);

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

                {/* Overlay layer — floats above video */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    zIndex: 100,
                    // Gradient fades to transparent so video visible below stories
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
                    pointerEvents: 'none',    // clicks pass through to video
                }}>
                    {/* Give pointer events back to interactive elements */}
                    <div style={{ pointerEvents: 'all' }}>
                        <div className="flex items-center p-2 pt-6">
                            <FeedTabs activeTab={activeTab} onChange={setActiveTab} />
                        </div>
                        <AnimatePresence>
                            {showStoriesBar && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                    <CategoryStoriesBar onCategoryChange={() => {}} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
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
                    {displayVideos.length === 0 ? (
                        <div style={{
                            height: '100dvh',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px',
                            textAlign: 'center',
                            background: '#000',
                            color: '#fff'
                        }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <span style={{ fontSize: 32 }}>📹</span>
                            </div>
                            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: 'Poppins' }}>
                                No videos yet
                            </h3>
                            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.5 }}>
                                Be the first one to upload video in this category.
                            </p>
                            <button
                                onClick={() => router.push('/dashboard/upload-video')}
                                style={{
                                    background: 'var(--accent)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '16px',
                                    padding: '16px 32px',
                                    fontSize: 15,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 16px var(--accent-glow)'
                                }}
                            >
                                Upload Video
                            </button>
                        </div>
                    ) : displayVideos.map((video, index) => {
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
                                        {index === displayVideos.length - 1 && (
                                            <div style={{
                                                position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
                                                background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '8px 16px', borderRadius: '20px',
                                                fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none',
                                            }}>
                                                You're all caught up ✓
                                            </div>
                                        )}
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
