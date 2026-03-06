'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { ReelPlayer } from './ReelPlayer';
import { VideoOverlay } from '@/components/feed/VideoOverlay';
import { ActionButtons } from '@/components/feed/ActionButtons';
import { GuestWall } from '@/components/feed/GuestWall';
import { FeedTabs } from '@/components/feed/FeedTabs';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { CATEGORY_PLACEHOLDERS, PLACEHOLDER_OVERLAY_DATA } from '@/lib/categories';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

export function VideoFeed() {
    const { activeCategory, activeRole } = useCategory();
    const { user } = useAuth();
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeTab, setActiveTab] = useState(0);
    const [showGuestWall, setShowGuestWall] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
    const watchedIndices = useRef<Set<number>>(new Set());

    // ── Real Firestore videos ─────────────────────────────────────
    const [firestoreVideos, setFirestoreVideos] = useState<any[]>([]);
    const [firestoreLoading, setFirestoreLoading] = useState(true);

    useEffect(() => {
        setFirestoreLoading(true);
        setFirestoreVideos([]);

        // Simple query on a single field — no composite index required
        // Category filtering happens client-side to avoid Firestore index deployment
        const q = query(
            collection(db, 'videos'),
            where('is_live', '==', true)
        );

        const getTabFilter = (tabIndex: number) => {
            if (tabIndex === 0) return null;           // no filter
            if (tabIndex === 1) return 'seeker';       // companies hiring, doctors, agents
            if (tabIndex === 2) return 'provider';     // job seekers, patients looking
            return null;
        };

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roleFilter = getTabFilter(activeTab);

            const videos = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                // Filter client-side: must be approved + matching category + role tab
                .filter(d =>
                    d.admin_status === 'approved' &&
                    (d.category === activeCategory || !d.category) &&
                    (!roleFilter || d.userRole === roleFilter)
                )
                // Sort newest first
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
                }));
            setFirestoreVideos(videos);
            setFirestoreLoading(false);
        }, () => {
            setFirestoreLoading(false);
        });

        return () => unsubscribe();
    }, [activeCategory, activeTab]);

    // ── Build video list: real first, then placeholders ───────────
    const placeholderList = CATEGORY_PLACEHOLDERS[activeCategory].map((id, i) => ({
        id: `placeholder-${i}`,
        isPlaceholder: true,
        videoId: id,
        cloudinaryUrl: undefined,
        category: activeCategory,
        ...(PLACEHOLDER_OVERLAY_DATA[activeCategory][i % PLACEHOLDER_OVERLAY_DATA[activeCategory].length] || {}),
    }));

    const videos = firestoreVideos.length > 0 ? firestoreVideos : placeholderList;

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
        if (user) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        const index = reelRefs.current.findIndex(ref => ref === entry.target);

                        if (index !== -1 && !watchedIndices.current.has(index)) {
                            watchedIndices.current.add(index);
                            setActiveIndex(index);

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
        if (!user) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        const index = reelRefs.current.findIndex(ref => ref === entry.target);
                        if (index !== -1) {
                            setActiveIndex(index);
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

    // ── Jump to index from Explore page ──────────────────────────
    useEffect(() => {
        const startIndex = sessionStorage.getItem('feed_start_index');
        const videoId = sessionStorage.getItem('feed_video_id');

        if (startIndex && containerRef.current) {
            const idx = Number(startIndex);
            setTimeout(() => {
                containerRef.current!.scrollTop = idx * window.innerHeight;
                setActiveIndex(idx);
            }, 100);
            sessionStorage.removeItem('feed_start_index');
            sessionStorage.removeItem('feed_video_id');
            sessionStorage.removeItem('feed_source');
        }
        watchedIndices.current = new Set();
    }, [videos.length]);

    // Scroll to specific index programmatically
    const scrollToIndex = (index: number) => {
        if (index < 0 || index >= videos.length) return;
        reelRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
        setActiveIndex(index);
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

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
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
                    <FeedTabs activeTab={activeTab} onChange={setActiveTab} />
                </div>

                <div
                    ref={containerRef}
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
                            ref={(el) => { reelRefs.current[index] = el; }}
                            style={{
                                position: 'relative',
                                height: '100dvh',
                                width: '100%',
                                overflow: 'hidden',
                                background: '#000',
                                scrollSnapAlign: 'start',
                                scrollSnapStop: 'always',
                                flexShrink: 0,
                            }}
                        >
                            <ReelPlayer
                                videoId={video.videoId}
                                cloudinaryUrl={video.cloudinaryUrl}
                                isPlaceholder={video.isPlaceholder}
                                isActive={activeIndex === index && !showGuestWall}
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
                                    onConnect={() => {
                                        if (video.userId || video.id) {
                                            router.push(`/profile/jobseeker/${video.userId || video.id}`);
                                        }
                                    }}
                                    connectLabel={
                                        activeCategory === 'jobs'
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
                    onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#1A1A1A')}
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: '#1A1A1A', border: '1px solid #333',
                        color: '#fff', fontSize: 18, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s',
                    }}
                >
                    ↑
                </button>
                <button
                    onClick={() => scrollToIndex(activeIndex + 1)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#1A1A1A')}
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: '#1A1A1A', border: '1px solid #333',
                        color: '#fff', fontSize: 18, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s',
                    }}
                >
                    ↓
                </button>
            </div>

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
        </div>
    );
}
