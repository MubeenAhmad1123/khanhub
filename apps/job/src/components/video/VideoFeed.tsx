//apps/job/src/components/video/VideoFeed.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCategory } from '@/context/CategoryContext';
import ReelPlayer from './ReelPlayer';
import { VideoOverlay } from '@/components/feed/VideoOverlay';
import { ActionButtons } from '@/components/feed/ActionButtons';
import { GuestWall } from '@/components/feed/GuestWall';
import { FeedTabs } from '@/components/feed/FeedTabs';
import { CategoryStoriesBar } from '@/components/feed/CategoryStoriesBar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { CATEGORY_PLACEHOLDERS, PLACEHOLDER_OVERLAY_DATA } from '@/lib/categories';
import {
    collection, query, where, orderBy, getDocs,
    doc, limit, getDoc, updateDoc, increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

// ─── helpers ────────────────────────────────────────────────────────────────

const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const PRELOAD_AHEAD  = 2;
const PRELOAD_BEHIND = 1;

// ─── component ──────────────────────────────────────────────────────────────

export function VideoFeed() {
    const { activeCategory, activeRole, setActiveCategory } = useCategory();
    const { user, loading, firebaseUser } = useAuth();
    const router       = useRouter();
    const searchParams = useSearchParams();

    const targetVideoId    = searchParams.get('v');
    const targetCategoryId = searchParams.get('c');

    // ── ui state ──────────────────────────────────────────────────
    // Mubeen uses -1 as initial activeIndex (nothing active until IO fires)
    const [activeIndex,    setActiveIndex]    = useState(-1);
    const [forceStopAll,   setForceStopAll]   = useState(false);
    const activeIndexRef                      = useRef<number | null>(null);
    const debounceTimerRef                    = useRef<NodeJS.Timeout | null>(null);
    const playingRef                          = useRef<number | null>(null);
    const [activeTab,      setActiveTab]      = useState(2);
    const [showGuestWall,  setShowGuestWall]  = useState(false);
    const [showStoriesBar, setShowStoriesBar] = useState(true);
    const [firestoreVideos, setFirestoreVideos] = useState<any[]>([]);
    const [displayVideos,  setDisplayVideos]  = useState<any[]>([]);
    const [isMuted,        setIsMuted]        = useState(true);
    const [videosLoading,  setVideosLoading]  = useState(true);

    // Deeplink open (?v=...) counts as user interaction so first video unmutes
    const [userHasInteracted, setUserHasInteracted] = useState(
        typeof window !== 'undefined'
            ? new URL(window.location.href).searchParams.has('v')
            : false,
    );

    // ─────────────────────────────────────────────────────────────
    // ROOT CAUSE FIX — why clicking any card always opened video 0:
    //
    // mountVideoId was a plain ref. Refs don't trigger re-renders so
    // the sync-scroll useEffect (depending on [displayVideos]) never
    // re-fired after a card click — displayVideos was already loaded.
    //
    // Fix: store deeplink ID as STATE (activeDeeplinkId).
    // The searchParams useEffect updates it on every URL change.
    // The sync-scroll effect depends on [displayVideos, activeDeeplinkId]
    // so it fires every time a new card is clicked.
    // ─────────────────────────────────────────────────────────────
    const [activeDeeplinkId, setActiveDeeplinkId] = useState<string | null>(
        typeof window !== 'undefined'
            ? new URL(window.location.href).searchParams.get('v')
            : null,
    );

    // Ref copy for reads inside async callbacks (avoids stale closures)
    const activeDeeplinkIdRef = useRef<string | null>(activeDeeplinkId);
    useEffect(() => { activeDeeplinkIdRef.current = activeDeeplinkId; }, [activeDeeplinkId]);

    const mountCategoryId = useRef<string | null>(
        typeof window !== 'undefined'
            ? new URL(window.location.href).searchParams.get('c')
            : null,
    );

    // Keep activeDeeplinkId in sync with URL on every navigation.
    // This makes the 2nd, 3rd, Nth card click work correctly.
    useEffect(() => {
        const newVid = searchParams.get('v');
        const newCat = searchParams.get('c');

        if (newVid !== activeDeeplinkIdRef.current) {
            hasDeeplinked.current = false;   // allow sync-scroll to fire again
            setActiveDeeplinkId(newVid);     // state update → re-render → effect fires
        }
        if (newCat !== mountCategoryId.current) {
            mountCategoryId.current = newCat;
        }
    }, [searchParams]);

    const sessionResumeId = useRef<string | null>(
        typeof window !== 'undefined'
            ? sessionStorage.getItem('jobreel_last_video')
            : null,
    );

    // Block IO from racing back to index 0 while a programmatic scroll settles
    const ignoreObserverUntilRef = useRef<number | null>(null);

    // ── interaction detection ─────────────────────────────────────
    useEffect(() => {
        const mark = () => setUserHasInteracted(true);
        document.addEventListener('click',   mark, { once: true });
        document.addEventListener('keydown', mark, { once: true });
        document.addEventListener('scroll',  mark, { once: true });
        return () => {
            document.removeEventListener('click',   mark);
            document.removeEventListener('keydown', mark);
            document.removeEventListener('scroll',  mark);
        };
    }, []);

    // ── refs ──────────────────────────────────────────────────────
    const containerRef        = useRef<HTMLDivElement>(null);
    const hasDeeplinked       = useRef(false);
    const videoRefs           = useRef<(HTMLDivElement | null)[]>([]);
    const allVideosRef        = useRef<any[]>([]);
    const hasLoadedOnce       = useRef(false);
    const ioActiveIndexRef    = useRef(0);
    const lastUpdatedVideoRef = useRef<string | null>(null);

    if (videoRefs.current.length < displayVideos.length) {
        videoRefs.current = [
            ...videoRefs.current,
            ...new Array(displayVideos.length - videoRefs.current.length).fill(null),
        ];
    }

    // ── auth changes ──────────────────────────────────────────────
    useEffect(() => {
        if (user) {
            setShowGuestWall(false);
            hasDeeplinked.current = false;
        }
    }, [user]);

    // ── tab / category change — clear deeplink state ──────────────
    const isMountedRef = useRef(false);
    useEffect(() => {
        if (!isMountedRef.current) { isMountedRef.current = true; return; }
        hasDeeplinked.current   = false;
        mountCategoryId.current = null;
        sessionResumeId.current = null;
        // Note: intentionally NOT clearing activeDeeplinkId here so that
        // a deeplink video opened before a tab switch is still tracked
        sessionStorage.removeItem('jobreel_last_video');
    }, [activeCategory, activeTab]);

    // ── feed-reset signal from CategoryStoriesBar ─────────────────
    useEffect(() => {
        if (sessionStorage.getItem('feed_reset_requested') !== 'true') return;
        if (process.env.NODE_ENV === 'development') console.log('[RESET] Feed reset requested');
        setActiveTab(2);
        sessionStorage.removeItem('feed_reset_requested');
        const t = setTimeout(() => videoRefs.current[0]?.scrollIntoView({ behavior: 'instant' }), 50);
        return () => clearTimeout(t);
    }, [searchParams]);

    // Keep refs in sync
    const prevDisplayRef = useRef<any[]>([]);
    const prevActiveRef  = useRef<number>(0);
    useEffect(() => {
        prevDisplayRef.current = displayVideos;
        prevActiveRef.current  = activeIndex;
    }, [displayVideos, activeIndex]);

    // ── fetch videos ──────────────────────────────────────────────
    useEffect(() => {
        const fetchVideos = async () => {
            if (displayVideos.length === 0) setVideosLoading(true);
            hasLoadedOnce.current = false;

            const isForYou    = activeTab === 2;
            const deeplinkVid = activeDeeplinkIdRef.current;
            const deeplinkCat = mountCategoryId.current;

            let q: any;
            if (isForYou && !deeplinkVid) {
                q = query(
                    collection(db, 'videos'),
                    where('is_live', '==', true),
                    where('admin_status', '==', 'approved'),
                    orderBy('createdAt', 'desc'),
                    limit(50),
                );
            } else if (isForYou && deeplinkVid && deeplinkCat) {
                q = query(
                    collection(db, 'videos'),
                    where('is_live', '==', true),
                    where('admin_status', '==', 'approved'),
                    where('category', '==', deeplinkCat),
                    orderBy('createdAt', 'desc'),
                    limit(30),
                );
            } else if (isForYou && deeplinkVid && !deeplinkCat) {
                q = query(
                    collection(db, 'videos'),
                    where('is_live', '==', true),
                    where('admin_status', '==', 'approved'),
                    orderBy('createdAt', 'desc'),
                    limit(50),
                );
            } else {
                const qCategory = deeplinkCat && deeplinkVid ? deeplinkCat : activeCategory;
                q = query(
                    collection(db, 'videos'),
                    where('is_live', '==', true),
                    where('admin_status', '==', 'approved'),
                    where('category', '==', qCategory),
                    orderBy('createdAt', 'desc'),
                    limit(30),
                );
            }

            const getTabFilter = (tabIndex: number) => {
                if (tabIndex === 2) return null;
                if (activeCategory === 'jobs') return tabIndex === 0 ? 'seeker' : 'provider';
                return tabIndex === 0 ? 'provider' : 'seeker';
            };

            try {
                const snapshot   = await getDocs(q);
                const roleFilter = getTabFilter(activeTab);
                const hiddenIds  = JSON.parse(localStorage.getItem('jobreel_hidden_videos') || '[]');

                let videos = snapshot.docs
                    .map(d => ({ id: d.id, ...(d.data() as object) } as any))
                    .filter(d => {
                        if (hiddenIds.includes(d.id)) return false;
                        const matchesCategory = isForYou || d.category === (deeplinkCat || activeCategory);
                        const matchesRole     = !roleFilter || d.userRole === roleFilter;
                        const url             = d.cloudinaryUrl;
                        const validCloudinary = url && url.includes('cloudinary.com') && !url.includes('youtube.com');
                        return d.admin_status === 'approved' && matchesCategory && matchesRole && validCloudinary;
                    })
                    .map(d => ({
                        id: d.id,
                        isPlaceholder: false,
                        cloudinaryUrl: d.cloudinaryUrl,
                        thumbnailUrl:  d.thumbnailUrl || d.userPhoto || '',
                        ...d,
                    }));

                // Active-category videos first, rest shuffled
                const priority = videos.filter(v => v.category === activeCategory);
                const rest      = videos.filter(v => v.category !== activeCategory);
                videos = priority.length > 0
                    ? [...priority, ...shuffleArray(rest)]
                    : shuffleArray(videos);

                // Unseen before seen
                if (user?.uid) {
                    const watchedIds = (user.watchedVideos as string[]) || [];
                    const unseen     = videos.filter(v => !watchedIds.includes(v.id));
                    const seen       = videos.filter(v =>  watchedIds.includes(v.id));
                    videos = [...unseen, ...seen];
                }

                setFirestoreVideos(videos);
                allVideosRef.current = videos;

                if (!hasLoadedOnce.current) {
                    setDisplayVideos(videos);
                    hasLoadedOnce.current = true;
                }

                // Session resume
                if (!deeplinkVid && sessionResumeId.current && !hasDeeplinked.current) {
                    const resumeIdx = videos.findIndex(v => v.id === sessionResumeId.current);
                    if (resumeIdx > 0) {
                        hasDeeplinked.current = true;
                        setTimeout(() => {
                            setForceStopAll(false);
                            activeIndexRef.current = resumeIdx;
                            playingRef.current = resumeIdx;
                            ioActiveIndexRef.current = resumeIdx;
                            setActiveIndex(resumeIdx);
                            videoRefs.current[resumeIdx]?.scrollIntoView({ behavior: 'instant' });
                        }, 150);
                    }
                }

                setVideosLoading(false);
            } catch (error: any) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[VideoFeed] Fetch error:', error.message);
                }
                setVideosLoading(false);
            }
        };

        fetchVideos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategory, activeTab]);

    // ── IntersectionObserver ──────────────────────────────────────
    useEffect(() => {
        if (displayVideos.length === 0) return;
        const observers: IntersectionObserver[] = [];

        videoRefs.current.forEach((ref, index) => {
            if (!ref) return;
            const observer = new IntersectionObserver(
                (entries) => {
                    const now = Date.now();
                    if (ignoreObserverUntilRef.current && now < ignoreObserverUntilRef.current) return;

                    entries.forEach(entry => {
                        if (!entry.isIntersecting || entry.intersectionRatio < 0.7) return;

                        const currentVideo = displayVideos[index];
                        if (!currentVideo || currentVideo.isPlaceholder) return;

                        setForceStopAll(true);

                        if (playingRef.current !== null && playingRef.current !== index) {
                            const prevContainer = videoRefs.current[playingRef.current];
                            if (prevContainer) {
                                const prevVidEl = prevContainer.querySelector('video');
                                if (prevVidEl) {
                                    try {
                                        prevVidEl.pause();
                                        prevVidEl.muted = true;
                                    } catch (e) {}
                                }
                            }
                        }

                        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                        debounceTimerRef.current = setTimeout(() => {
                            setForceStopAll(false);
                            activeIndexRef.current = index;
                            playingRef.current = index;

                            ioActiveIndexRef.current = index;
                            setActiveIndex(index);
                            sessionStorage.setItem('jobreel_last_video', currentVideo.id);

                            if (currentVideo.id !== lastUpdatedVideoRef.current && typeof window !== 'undefined') {
                                lastUpdatedVideoRef.current = currentVideo.id;
                                const url = new URL(window.location.href);
                                if (url.searchParams.get('v') !== currentVideo.id) {
                                    url.searchParams.set('v', currentVideo.id);
                                    window.history.replaceState(null, '', url.pathname + url.search);
                                }
                            }

                            if (!user && !firebaseUser && !loading) {
                                const count = parseInt(localStorage.getItem('jobreel_videos_watched') || '0') + 1;
                                localStorage.setItem('jobreel_videos_watched', String(count));
                                if (count >= 3) setShowGuestWall(true);
                            }
                        }, 80);
                    });
                },
                {
                    root: containerRef.current,
                    threshold: 0.7,
                    rootMargin: '-10% 0px',
                },
            );
            observer.observe(ref);
            observers.push(observer);
        });

        return () => observers.forEach(o => o.disconnect());
    }, [displayVideos, user, loading]);

    // Development-only scroll fallback
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        const container = containerRef.current;
        if (!container || displayVideos.length === 0) return;

        const handleScroll = () => {
            const now = Date.now();
            if (ignoreObserverUntilRef.current && now < ignoreObserverUntilRef.current) return;
            const h = container.clientHeight;
            if (!h) return;
            const idx = Math.round(container.scrollTop / h);
            if (idx !== ioActiveIndexRef.current && idx >= 0 && idx < displayVideos.length) {
                setForceStopAll(true);
                if (playingRef.current !== null && playingRef.current !== idx) {
                    const prevVid = videoRefs.current[playingRef.current]?.querySelector('video');
                    if (prevVid) { try { prevVid.pause(); prevVid.muted = true; } catch (e) {} }
                }
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = setTimeout(() => {
                    setForceStopAll(false);
                    activeIndexRef.current = idx;
                    playingRef.current = idx;
                    ioActiveIndexRef.current = idx;
                    setActiveIndex(idx);
                }, 80);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [displayVideos.length]);

    // ── keyboard navigation (Mubeen's improved version) ───────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = activeIndex + 1;
                if (next < displayVideos.length) {
                    ignoreObserverUntilRef.current = Date.now() + 800;
                    videoRefs.current[next]?.scrollIntoView({ behavior: 'instant' });
                    setForceStopAll(true);
                    if (playingRef.current !== null && playingRef.current !== next) {
                        const prevContainer = videoRefs.current[playingRef.current];
                        if (prevContainer) {
                            const prevVidEl = prevContainer.querySelector('video');
                            if (prevVidEl) { try { prevVidEl.pause(); prevVidEl.muted = true; } catch (e) {} }
                        }
                    }
                    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = setTimeout(() => {
                        setForceStopAll(false);
                        activeIndexRef.current = next;
                        playingRef.current = next;
                        setActiveIndex(next);
                        ioActiveIndexRef.current = next;
                    }, 80);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = activeIndex - 1;
                if (prev >= 0) {
                    ignoreObserverUntilRef.current = Date.now() + 800;
                    videoRefs.current[prev]?.scrollIntoView({ behavior: 'instant' });
                    setForceStopAll(true);
                    if (playingRef.current !== null && playingRef.current !== prev) {
                        const prevContainer = videoRefs.current[playingRef.current];
                        if (prevContainer) {
                            const prevVidEl = prevContainer.querySelector('video');
                            if (prevVidEl) { try { prevVidEl.pause(); prevVidEl.muted = true; } catch (e) {} }
                        }
                    }
                    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = setTimeout(() => {
                        setForceStopAll(false);
                        activeIndexRef.current = prev;
                        playingRef.current = prev;
                        setActiveIndex(prev);
                        ioActiveIndexRef.current = prev;
                    }, 80);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex, displayVideos.length]);

    // ── deeplink: sync category ───────────────────────────────────
    useEffect(() => {
        if (!targetCategoryId || targetCategoryId === activeCategory) return;
        const { CATEGORY_CONFIG } = require('@/lib/categories');
        if (CATEGORY_CONFIG && Object.keys(CATEGORY_CONFIG).includes(targetCategoryId)) {
            setActiveCategory(targetCategoryId as any);
        }
    }, [targetCategoryId, activeCategory, setActiveCategory]);

    // ── deeplink: scroll to correct video ─────────────────────────
    // Depends on BOTH [displayVideos, activeDeeplinkId]:
    //   • when video list loads        → displayVideos changes → fires
    //   • when user clicks a new card  → activeDeeplinkId state changes → fires
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('[SCROLL] sync effect →', {
                activeDeeplinkId,
                count: displayVideos.length,
                foundAt: displayVideos.findIndex(v => v.id === activeDeeplinkId),
                hasDeeplinked: hasDeeplinked.current,
            });
        }

        if (!activeDeeplinkId || displayVideos.length === 0) return;
        if (hasDeeplinked.current) return;

        const idx = displayVideos.findIndex(v => v.id === activeDeeplinkId);

        if (idx !== -1) {
            hasDeeplinked.current          = true;
            ignoreObserverUntilRef.current = Date.now() + 700;

            if (idx !== activeIndex) {
                // Scroll first, then set index (Mubeen's approach — no setTimeout needed)
                videoRefs.current[idx]?.scrollIntoView({ behavior: 'instant' });
                setForceStopAll(true);
                if (playingRef.current !== null && playingRef.current !== idx) {
                    const prevContainer = videoRefs.current[playingRef.current];
                    if (prevContainer) {
                        const prevVidEl = prevContainer.querySelector('video');
                        if (prevVidEl) { try { prevVidEl.pause(); prevVidEl.muted = true; } catch (e) {} }
                    }
                }
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = setTimeout(() => {
                    setForceStopAll(false);
                    activeIndexRef.current = idx;
                    playingRef.current = idx;
                    setActiveIndex(idx);
                    ioActiveIndexRef.current = idx;
                }, 80);
            }
        } else {
            // Video not in list — fetch by ID and prepend
            const fetchAndPrepend = async () => {
                try {
                    const docSnap = await getDoc(doc(db, 'videos', activeDeeplinkId));
                    if (!docSnap.exists()) return;

                    const data = docSnap.data() as any;
                    const missingVideo = {
                        id: docSnap.id,
                        isPlaceholder: false,
                        cloudinaryUrl: data.cloudinaryUrl,
                        thumbnailUrl:  data.thumbnailUrl || data.userPhoto || '',
                        ...data,
                    };

                    setDisplayVideos(prev => {
                        if (prev.some(v => v.id === activeDeeplinkId)) return prev;
                        return [missingVideo, ...prev];
                    });

                    hasDeeplinked.current          = true;
                    ignoreObserverUntilRef.current = Date.now() + 700;

                    setTimeout(() => {
                        setForceStopAll(false);
                        activeIndexRef.current = 0;
                        playingRef.current = 0;
                        setActiveIndex(0);
                        ioActiveIndexRef.current = 0;
                        videoRefs.current[0]?.scrollIntoView({ behavior: 'instant' });
                    }, 150);
                } catch (err) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('[DEEPLINK] Failed to fetch missing video:', err);
                    }
                }
            };
            fetchAndPrepend();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayVideos, activeDeeplinkId]); // ← activeDeeplinkId is the real fix

    // ── stories bar ───────────────────────────────────────────────
    useEffect(() => { setShowStoriesBar(activeIndex === 0); }, [activeIndex]);

    // ── view tracking ─────────────────────────────────────────────
    const markWatched = useCallback(async (videoId: string) => {
        if (!user?.uid) return;
        try { await updateDoc(doc(db, 'videos', videoId), { views: increment(1) }); }
        catch (_) { /* silent */ }
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid || displayVideos.length === 0) return;
        const video = displayVideos[activeIndex];
        if (!video || video.isPlaceholder) return;
        const t = setTimeout(() => markWatched(video.id), 3000);
        return () => clearTimeout(t);
    }, [activeIndex, displayVideos, user, markWatched]);

    // ── guest wall recovery ───────────────────────────────────────
    useEffect(() => {
        if (firebaseUser && showGuestWall) {
            if (process.env.NODE_ENV === 'development') {
                console.log('[VideoFeed] User authenticated — hiding GuestWall');
            }
            setShowGuestWall(false);
            localStorage.removeItem('jobreel_videos_watched');
        }
    }, [firebaseUser, showGuestWall]);

    // ── video state helper ────────────────────────────────────────
    const getVideoState = (index: number) => {
        const d = index - activeIndex;
        if (d === 0) return { isActive: true, isAdjacent: false };
        if (d >= -PRELOAD_BEHIND && d <= PRELOAD_AHEAD) return { isActive: false, isAdjacent: true };
        return { isActive: false, isAdjacent: false };
    };

    // ── video slides ──────────────────────────────────────────────
    const renderedVideos = useMemo(() => {
        return displayVideos.map((video, index) => {
            const { isActive, isAdjacent } = getVideoState(index);

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
                            userHasInteracted={userHasInteracted}
                            isMobileDevice={false}
                            forceStop={forceStopAll}
                        />
                    </div>

                    {index === displayVideos.length - 1 && (
                        <div style={{
                            position: 'absolute',
                            bottom: 'calc(180px + env(safe-area-inset-bottom, 0px))',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            zIndex: 20,
                            pointerEvents: 'none',
                        }}>
                            You&apos;re all caught up ✓
                        </div>
                    )}
                </div>
            );
        });
    }, [displayVideos, activeIndex, isMuted, userHasInteracted, activeCategory, activeRole, router, forceStopAll]);

    // ── render ────────────────────────────────────────────────────
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: '#000', display: 'flex', justifyContent: 'center',
        }}>
            {/* Desktop nav arrows */}
            <div className="hidden md:flex flex-col justify-center gap-4 fixed left-8 z-50">
                <button
                    onClick={() => videoRefs.current[activeIndex - 1]?.scrollIntoView({ behavior: 'instant' })}
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md"
                >↑</button>
                <button
                    onClick={() => videoRefs.current[activeIndex + 1]?.scrollIntoView({ behavior: 'instant' })}
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md"
                >↓</button>
            </div>

            <div style={{
                width: '100%', maxWidth: '480px', height: '100dvh',
                position: 'absolute', overflow: 'hidden',
                boxShadow: '0 0 100px rgba(0,0,0,0.5)',
            }}>
                {/* Top overlay: tabs + stories bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 30%, transparent 100%)',
                    pointerEvents: 'none',
                }}>
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
                                        background: 'rgba(0,0,0,0.6)',
                                        backdropFilter: 'blur(8px)',
                                        paddingBottom: 8,
                                    }}
                                >
                                    <CategoryStoriesBar onCategoryChange={() => {}} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Scrollable feed */}
                <div
                    ref={containerRef}
                    className="feed-container no-scrollbar"
                    style={{
                        height: '100dvh',
                        minHeight: '-webkit-fill-available',
                        overflowY: 'scroll',
                        scrollSnapType: 'y mandatory',
                        scrollBehavior: 'auto',          // Mubeen's value
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        position: 'relative',
                        background: '#000',
                    }}
                >
                    {videosLoading ? (
                        <div style={{
                            height: '100dvh', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', background: '#000',
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                border: '3px solid #333', borderTop: '3px solid #FF0069',
                                animation: 'spin 0.75s linear infinite',
                            }} />
                            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                        </div>
                    ) : displayVideos.length === 0 ? (
                        <div style={{
                            height: '100dvh', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            padding: '40px', textAlign: 'center', background: '#000', color: '#fff',
                        }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)',
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
                    ) : renderedVideos}
                </div>

                {/* Bottom-left: video info */}
                {displayVideos[activeIndex] && !displayVideos[activeIndex].isPlaceholder && (
                    <div style={{
                        position: 'fixed', left: 0, right: 0,
                        bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
                        zIndex: 200, maxWidth: '480px', margin: '0 auto',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                        paddingBottom: '10px', pointerEvents: 'none',
                    }}>
                        <div style={{ flex: 1, minWidth: 0, pointerEvents: 'auto' }}>
                            <VideoOverlay data={displayVideos[activeIndex]} />
                        </div>
                    </div>
                )}

                {/* Right side: avatar + like + save */}
                {displayVideos[activeIndex] && !displayVideos[activeIndex].isPlaceholder && (
                    <div style={{
                        position: 'fixed', right: 10,
                        bottom: 'calc(30px + env(safe-area-inset-bottom, 0px) + 160px + 20px)',
                        zIndex: 201, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 20,
                    }}>
                        <div
                            onClick={() => router.push(
                                `/profile/${displayVideos[activeIndex].userRole || 'user'}/${displayVideos[activeIndex].userId}`
                            )}
                            style={{ position: 'relative', cursor: 'pointer' }}
                        >
                            <img
                                src={displayVideos[activeIndex].userPhoto || '/default-avatar.svg'}
                                alt="profile"
                                style={{
                                    width: 44, height: 44, borderRadius: '50%',
                                    border: '2px solid #fff', objectFit: 'cover',
                                }}
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
                        <ActionButtons
                            mode="like-only"
                            videoId={displayVideos[activeIndex].id}
                            videoUserId={displayVideos[activeIndex].userId}
                            likes={displayVideos[activeIndex].likes || 0}
                        />
                        <ActionButtons
                            mode="save-only"
                            videoId={displayVideos[activeIndex].id}
                            videoUserId={displayVideos[activeIndex].userId}
                            saves={displayVideos[activeIndex].saves || 0}
                        />
                    </div>
                )}

                {/* Right side: share + dots */}
                {displayVideos[activeIndex] && !displayVideos[activeIndex].isPlaceholder && (
                    <div style={{
                        position: 'fixed', right: 10,
                        bottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 20px)',
                        zIndex: 201, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 20,
                    }}>
                        <ActionButtons
                            mode="share-only"
                            videoId={displayVideos[activeIndex].id}
                            shares={displayVideos[activeIndex].shares || 0}
                        />
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

            {/* Guest wall */}
            {!user && !firebaseUser && showGuestWall && (
                <GuestWall
                    isVisible={true}
                    onContinue={() => {
                        localStorage.removeItem('jobreel_videos_watched');
                        setShowGuestWall(false);
                    }}
                />
            )}
        </div>
    );
}