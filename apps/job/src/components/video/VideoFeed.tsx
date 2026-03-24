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
import { collection, query, where, orderBy, getDocs, doc, limit, getDoc, updateDoc, increment } from 'firebase/firestore';
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
    const { user, loading, firebaseUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const targetVideoId = searchParams.get('v');
    const targetCategoryId = searchParams.get('c');

    if (process.env.NODE_ENV === 'development') {
        console.log('[DEEPLINK] URL params on mount →', { targetVideoId, targetCategoryId });
    }

    const [activeIndex, setActiveIndex] = useState(0);
    const [activeTab, setActiveTab] = useState(2); // Default to 'For You'
    const [showGuestWall, setShowGuestWall] = useState(false);
    const [showStoriesBar, setShowStoriesBar] = useState(true);
    const [firestoreVideos, setFirestoreVideos] = useState<any[]>([]);
    const [displayVideos, setDisplayVideos] = useState<any[]>([]);
    const [isMuted, setIsMuted] = useState(true);
    const [userHasInteracted, setUserHasInteracted] = useState(false);
    const [videosLoading, setVideosLoading] = useState(true);
    const allVideosRef = useRef<any[]>([]);
    const hasLoadedOnce = useRef(false);
    // Capture deep link params ONCE on mount — never lost
    const mountVideoId = useRef<string | null>(
        typeof window !== 'undefined'
            ? new URL(window.location.href).searchParams.get('v')
            : null
    );
    const mountCategoryId = useRef<string | null>(
        typeof window !== 'undefined'
            ? new URL(window.location.href).searchParams.get('c')
            : null
    );
    const sessionResumeId = useRef<string | null>(
        typeof window !== 'undefined'
            ? sessionStorage.getItem('jobreel_last_video')
            : null
    );

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
            // Reset deeplink flag so it doesn't re-scroll on next category change
            hasDeeplinked.current = false;
        }
    }, [user]);

    const isMountedRef = useRef(false);
    useEffect(() => {
        if (!isMountedRef.current) {
            isMountedRef.current = true;
            return; // skip first run on mount
        }
        // Only runs on actual tab/category CHANGE, not on mount
        hasDeeplinked.current = false;
        mountVideoId.current = null;
        mountCategoryId.current = null;
        sessionResumeId.current = null;
        sessionStorage.removeItem('jobreel_last_video');
    }, [activeCategory, activeTab]);

    // Reset feed on signal (but NOT automatically on category change to prevent jumpiness)
    useEffect(() => {
        const resetRequested = sessionStorage.getItem('feed_reset_requested');

        if (resetRequested === 'true') {
            if (process.env.NODE_ENV === 'development') {
                console.log('[RESET] Feed reset requested by CategoryStoriesBar');
            }
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
    const prevActiveRef = useRef<number>(0);

    // List updated — just sync refs
    useEffect(() => {
        prevDisplayRef.current = displayVideos;
        prevActiveRef.current = activeIndex;
    }, [displayVideos, activeIndex]);

    // ── Load User Profile & Watched Videos ────────────────────────
    // User Profile Snapshot removed to stop chain reaction

    // ── Fetch Firestore Videos ────────────────────────────────────
    useEffect(() => {
        const fetchVideos = async () => {
            // ONLY show hard spinner if we don't have videos yet or category/tab changed
            if (displayVideos.length === 0) {
                setVideosLoading(true);
            }
            hasLoadedOnce.current = false;
            const isForYou = activeTab === 2;

            // Clear resume on intentional tab/category change
            if (hasLoadedOnce.current) {
                sessionResumeId.current = null;
                sessionStorage.removeItem('jobreel_last_video');
            }

            let q;
            if (isForYou && !mountVideoId.current) {
                // Pure For You — no deep link active
                q = query(
                    collection(db, 'videos'),
                    where('is_live', '==', true),
                    where('admin_status', '==', 'approved'),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );
            } else if (isForYou && mountVideoId.current && mountCategoryId.current) {
                // Deep link from Explore — fetch that category so clicked video is in results
                q = query(
                    collection(db, 'videos'),
                    where('is_live', '==', true),
                    where('admin_status', '==', 'approved'),
                    where('category', '==', mountCategoryId.current),
                    orderBy('createdAt', 'desc'),
                    limit(30)
                );
            } else if (isForYou && mountVideoId.current && !mountCategoryId.current) {
                // Deep link but no category — fetch all
                q = query(
                    collection(db, 'videos'),
                    where('is_live', '==', true),
                    where('admin_status', '==', 'approved'),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );
            } else if (!isForYou) {
                const qCategory = (mountCategoryId.current && mountVideoId.current)
                    ? mountCategoryId.current
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

            try {
                const snapshot = await getDocs(q);
                const roleFilter = getTabFilter(activeTab);
                const hiddenIds = JSON.parse(localStorage.getItem('jobreel_hidden_videos') || '[]');
                let videos = snapshot.docs
                    .map(d => ({ id: d.id, ...(d.data() as object) } as any))
                    .filter(d => {
                        if (hiddenIds.includes(d.id)) return false;
                        const matchesCategory = isForYou || d.category === (mountCategoryId.current || activeCategory);
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

                // FIX 3: For You priority sort
                const priority = videos.filter(v => v.category === activeCategory);
                const rest = videos.filter(v => v.category !== activeCategory);
                videos = priority.length > 0
                    ? [...priority, ...shuffleArray(rest)]
                    : shuffleArray(videos);

                // FIX 4: New videos first, seen videos later
                if (user?.uid) {
                    const watchedIds: string[] = user.watchedVideos || [];
                    const unseen = videos.filter(v => !watchedIds.includes(v.id));
                    const seen = videos.filter(v => watchedIds.includes(v.id));
                    videos = [...unseen, ...seen];
                }

                setFirestoreVideos(videos);
                allVideosRef.current = videos;

                // Problem 1 Fix: Only set displayVideos if it's the first load for this query
                if (!hasLoadedOnce.current) {
                    setDisplayVideos(videos);
                    hasLoadedOnce.current = true;
                }

                // Session resume — scroll to last watched video on refresh
                if (!mountVideoId.current && sessionResumeId.current && !hasDeeplinked.current) {
                    const resumeIdx = videos.findIndex(v => v.id === sessionResumeId.current);
                    if (resumeIdx > 0) {
                        hasDeeplinked.current = true;
                        setTimeout(() => {
                            setActiveIndex(resumeIdx);
                            videoRefs.current[resumeIdx]?.scrollIntoView({ behavior: 'instant' });
                        }, 150);
                    }
                }

                setVideosLoading(false);
            } catch (error: any) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[VideoFeed Videos] Fetch error:', error.message);
                }
                setVideosLoading(false);
            }
        };

        fetchVideos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategory, activeTab]); // Problem 1 & 3 Fix: Remove URL params from deps




    // Track last updated video ID to prevent unnecessary URL updates
    const lastUpdatedVideoRef = useRef<string | null>(null);

    // ── Intersection Observer for Active Index & URL ───────────────
    useEffect(() => {
        if (displayVideos.length === 0) return;

        const observers: IntersectionObserver[] = [];
        const refs = videoRefs.current;

        refs.forEach((ref, index) => {
            if (!ref) return;
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                            const currentVideo = displayVideos[index];
                            if (!currentVideo || currentVideo.isPlaceholder) return;

                            setActiveIndex(index);
                            sessionStorage.setItem('jobreel_last_video', currentVideo.id);

                            // Update URL only when video changes (not on every scroll)
                            if (currentVideo.id !== lastUpdatedVideoRef.current && typeof window !== 'undefined') {
                                lastUpdatedVideoRef.current = currentVideo.id;
                                const url = new URL(window.location.href);
                                if (url.searchParams.get('v') !== currentVideo.id) {
                                    url.searchParams.set('v', currentVideo.id);
                                    window.history.replaceState(null, '', url.pathname + url.search);
                                }
                            }

                            // Guest Wall Logic — only trigger if user is completely unauthenticated
                            if (!user && !firebaseUser && !loading) {
                                const watchedCount = parseInt(localStorage.getItem('jobreel_videos_watched') || '0') + 1;
                                localStorage.setItem('jobreel_videos_watched', String(watchedCount));
                                if (watchedCount >= 3) {
                                    setShowGuestWall(true);
                                }
                            }
                        }
                    });
                },
                {
                    root: containerRef.current,
                    threshold: 0.8,        // video must be 80% visible before it becomes active
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
                    videoRefs.current[next]?.scrollIntoView({ behavior: 'instant' });
                }
            } else if (e.key === 'ArrowUp') {
                const prev = activeIndex - 1;
                if (prev >= 0) {
                    videoRefs.current[prev]?.scrollIntoView({ behavior: 'instant' });
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
        if (process.env.NODE_ENV === 'development') {
            console.log('[SCROLL] Sync Video Index triggered →', {
                mountVideoId: mountVideoId.current,
                displayVideosCount: displayVideos.length,
                foundAtIndex: displayVideos.findIndex(v => v.id === mountVideoId.current),
                currentActiveIndex: activeIndex
            });
        }

        if (!mountVideoId.current || displayVideos.length === 0) return;
        if (hasDeeplinked.current) return;

        const idx = displayVideos.findIndex(v => v.id === mountVideoId.current);

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
                    const docSnap = await getDoc(doc(db, 'videos', mountVideoId.current!));
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
                            if (prev.some(v => v.id === mountVideoId.current)) return prev;
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
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('[DEEPLINK] Failed to fetch missing video:', err);
                    }
                }
            };
            fetchAndPrepend();
        }
    }, [displayVideos]);

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

    // Fix D: If user logs in while GuestWall is showing — hide it immediately
    useEffect(() => {
        if (firebaseUser && showGuestWall) {
            if (process.env.NODE_ENV === 'development') {
                console.log('[VideoFeed] User authenticated — hiding GuestWall');
            }
            setShowGuestWall(false);
            localStorage.removeItem('jobreel_videos_watched');
        }
    }, [firebaseUser, showGuestWall]);

    const getVideoState = (index: number) => {
        const distance = index - activeIndex;
        if (distance === 0) return { isActive: true, isAdjacent: false };
        if (distance >= -PRELOAD_BEHIND && distance <= PRELOAD_AHEAD) {
            return { isActive: false, isAdjacent: true };
        }
        return { isActive: false, isAdjacent: false };
    };

    // Problem 2 Fix: Memoize video list to prevent remounting/animation replay
    // Strictly following Rules of Hooks - must be at top level
    const renderedVideos = useMemo(() => {
        return displayVideos.map((video, index) => {
            const { isActive, isAdjacent } = getVideoState(index);
            const isVisible = Math.abs(index - activeIndex) <= 3;

            return (
                <div
                    key={video.id}
                    ref={el => { videoRefs.current[index] = el; }}
                    style={{
                        height: '100dvh',
                        minHeight: '100vh',
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        position: 'relative',
                        background: '#000',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingTop: '50px',
                        paddingBottom: '0px',
                    }}
                >
                    {isVisible ? (
                        <>
                            {/* BLACK SPACE above video — absorbs all extra height */}

                            {/* VIDEO BOX — 3:4 ratio */}
                            <div style={{
                                position: 'relative',
                                width: '100%',
                                flex: 1,
                                overflow: 'hidden',
                                background: '#000',
                                flexShrink: 0,
                            }}>
                                <ReelPlayer
                                    cloudinaryUrl={video.cloudinaryUrl}
                                    thumbnailUrl={video.thumbnailUrl}
                                    isActive={isActive}
                                    isAdjacent={isAdjacent}
                                    videoId={video.id}
                                    isMuted={isMuted}
                                    userHasInteracted={userHasInteracted}
                                />

                                {/* Avatar + Like + Save — moved to fixed column */}
                            </div>

                            {/* End of feed label */}
                            {index === displayVideos.length - 1 && (
                                <div style={{
                                    position: 'absolute', bottom: 'calc(180px + env(safe-area-inset-bottom, 0px))', left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                                    padding: '8px 16px', borderRadius: '20px',
                                    fontSize: '13px', fontWeight: 600,
                                    whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none',
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
        });
    }, [displayVideos, activeIndex, isMuted, userHasInteracted, activeCategory, activeRole, router]);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', display: 'flex', justifyContent: 'center' }}>

            {/* Desktop UI Arrows (Side) */}
            <div className="hidden md:flex flex-col justify-center gap-4 fixed left-8 z-50">
                <button onClick={() => videoRefs.current[activeIndex - 1]?.scrollIntoView({ behavior: 'instant' })} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md">↑</button>
                <button onClick={() => videoRefs.current[activeIndex + 1]?.scrollIntoView({ behavior: 'instant' })} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md">↓</button>
            </div>

            <div style={{
                width: '100%',
                maxWidth: '480px', // Constrain on desktop for better reel experience
                height: '100dvh',
                position: 'absolute',
                overflow: 'hidden',
                boxShadow: '0 0 100px rgba(0,0,0,0.5)', // Add depth on desktop
            }}>

                {/* Overlay layer — floats above video */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    zIndex: 100,
                    // Gradient fades to transparent so video visible below stories
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 30%, transparent 100%)',
                    pointerEvents: 'none',    // clicks pass through to video
                }}>
                    {/* Give pointer events back to interactive elements */}
                    <div style={{ pointerEvents: 'all' }}>
                        <div className="flex items-center p-2 pt-4">
                            <FeedTabs activeTab={activeTab} onChange={setActiveTab} />
                        </div>
                        <AnimatePresence>
                            {showStoriesBar && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    style={{
                                        background: 'rgba(0, 0, 0, 0.6)',
                                        backdropFilter: 'blur(8px)',
                                        paddingBottom: 8,
                                    }}
                                >
                                    <CategoryStoriesBar onCategoryChange={() => { }} />
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
                    {videosLoading ? (
                        /* ── Loading spinner while Firestore fetches ── */
                        <div style={{
                            height: '100dvh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#000',
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                border: '3px solid #333',
                                borderTop: '3px solid #FF0069',
                                animation: 'spin 0.75s linear infinite'
                            }} />
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : displayVideos.length === 0 ? (
                        /* ── Empty state after fetch resolves with 0 results ── */
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
                                width: 80, height: 80, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: 24,
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <span style={{ fontSize: 32 }}>📹</span>
                            </div>
                            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: 'Poppins' }}>
                                No videos in this category
                            </h3>
                            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                                Be the first one to upload a video in this category.
                            </p>
                        </div>
                    ) : (
                        renderedVideos
                    )}
                </div>

                {/* ── FIXED INFO BAR — always above bottom nav, never scrolls ── */}
                {displayVideos[activeIndex] && !displayVideos[activeIndex].isPlaceholder && (
                    <div style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
                        zIndex: 200,
                        maxWidth: '480px',
                        margin: '0 auto',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        paddingBottom: '10px',
                        pointerEvents: 'none',
                    }}>
                        {/* Left: VideoOverlay */}
                        <div style={{ flex: 1, minWidth: 0, pointerEvents: 'auto' }}>
                            <VideoOverlay data={displayVideos[activeIndex]} />
                        </div>
                    </div>
                )}

                {/* ── TOP 3 BUTTONS: Avatar + Like + Save (above info bar) ── */}
                {displayVideos[activeIndex] && !displayVideos[activeIndex].isPlaceholder && (
                    <div style={{
                        position: 'fixed',
                        right: 10,
                        bottom: 'calc(30px + env(safe-area-inset-bottom, 0px) + 160px + 20px)',
                        zIndex: 201,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 20,
                    }}>
                        {/* Avatar */}
                        <div
                            onClick={() => router.push(`/profile/${displayVideos[activeIndex].userRole || 'user'}/${displayVideos[activeIndex].userId}`)}
                            style={{ position: 'relative', cursor: 'pointer' }}
                        >
                            <img
                                src={displayVideos[activeIndex].userPhoto || '/default-avatar.svg'}
                                alt="profile"
                                style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #fff', objectFit: 'cover' }}
                            />
                            <div style={{
                                position: 'absolute', bottom: -6, left: '50%',
                                transform: 'translateX(-50%)',
                                width: 18, height: 18, borderRadius: '50%',
                                background: '#FF0069',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, color: '#fff', fontWeight: 700,
                            }}>+</div>
                        </div>

                        {/* Like */}
                        <ActionButtons
                            mode="like-only"
                            videoId={displayVideos[activeIndex].id}
                            videoUserId={displayVideos[activeIndex].userId}
                            likes={displayVideos[activeIndex].likes || 0}
                        />

                        {/* Save */}
                        <ActionButtons
                            mode="save-only"
                            videoId={displayVideos[activeIndex].id}
                            videoUserId={displayVideos[activeIndex].userId}
                            saves={displayVideos[activeIndex].saves || 0}
                        />
                    </div>
                )}

                {/* ── BOTTOM 2 BUTTONS: Share + Three Dots (right side of info bar zone) ── */}
                {displayVideos[activeIndex] && !displayVideos[activeIndex].isPlaceholder && (
                    <div style={{
                        position: 'fixed',
                        right: 10,
                        bottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 20px)',
                        zIndex: 201,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 20,
                    }}>
                        {/* Share */}
                        <ActionButtons
                            mode="share-only"
                            videoId={displayVideos[activeIndex].id}
                            shares={displayVideos[activeIndex].shares || 0}
                        />

                        {/* Three Dots */}
                        <ActionButtons
                            mode="dots-only"
                            videoId={displayVideos[activeIndex].id}
                            videoUserId={displayVideos[activeIndex].userId}
                            onNotInterested={() => {
                                const next = activeIndex + 1;
                                if (next < displayVideos.length) {
                                    videoRefs.current[next]?.scrollIntoView({ behavior: 'instant' });
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Only show wall if user is NOT logged in (both profile and firebase auth) */}
            {!user && !firebaseUser && showGuestWall && (
                <GuestWall isVisible={true} onContinue={() => {
                    localStorage.removeItem('jobreel_videos_watched');
                    setShowGuestWall(false);
                }} />
            )}
        </div>
    );
}