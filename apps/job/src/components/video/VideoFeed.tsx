'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { ReelPlayer } from './ReelPlayer';
import { VideoOverlay } from '@/components/feed/VideoOverlay';
import { ActionButtons } from '@/components/feed/ActionButtons';
import { RevealContactSheet } from '@/components/feed/RevealContactSheet';
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
    const [showReveal, setShowReveal] = useState(false);
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

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const videos = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                // Filter client-side: must be approved + matching category
                .filter(d =>
                    d.admin_status === 'approved' &&
                    (d.category === activeCategory || !d.category)
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
                    userId: d.userId,
                }));
            setFirestoreVideos(videos);
            setFirestoreLoading(false);
        }, () => {
            setFirestoreLoading(false);
        });

        return () => unsubscribe();
    }, [activeCategory]);

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
        const startIndex = Number(sessionStorage.getItem('feed_start_index') || 0);
        if (startIndex > 0 && containerRef.current) {
            containerRef.current.scrollTop = startIndex * window.innerHeight;
            setActiveIndex(startIndex);
            sessionStorage.removeItem('feed_start_index');
        }
        watchedIndices.current = new Set();
    }, [activeCategory]);

    return (
        <div className="relative bg-black" style={{ height: '100dvh', overflow: 'hidden' }}>
            {/* FeedTabs floats OVER the video */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }}>
                <FeedTabs />
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
                        {/* VIDEO */}
                        <ReelPlayer
                            videoId={video.videoId}
                            cloudinaryUrl={video.cloudinaryUrl}
                            isPlaceholder={video.isPlaceholder}
                            isActive={activeIndex === index && !showGuestWall}
                        />

                        {/* OVERLAY */}
                        <div style={{ position: 'absolute', bottom: 80, left: 0, right: 60, zIndex: 20, pointerEvents: 'none' }}>
                            <VideoOverlay data={video} />
                        </div>

                        {/* ACTION BUTTONS */}
                        <div style={{ position: 'absolute', right: 12, bottom: 100, zIndex: 20 }}>
                            <ActionButtons
                                onConnect={() => setShowReveal(true)}
                                connectLabel={
                                    activeCategory === 'jobs'
                                        ? (activeRole === 'provider' ? 'Hire 🤝' : 'Apply ✋')
                                        : activeCategory === 'marriage'
                                            ? 'Interest 💍'
                                            : 'Connect'
                                }
                            />
                        </div>
                    </div>
                ))}
            </div>

            <RevealContactSheet
                isOpen={showReveal}
                onClose={() => setShowReveal(false)}
                targetName={videos[activeIndex]?.title}
                userId={videos[activeIndex]?.userId || videos[activeIndex]?.id}
            />

            <GuestWall
                isVisible={showGuestWall}
                onContinue={() => {
                    const round = parseInt(localStorage.getItem('jobreel_guest_round') || '0');
                    if (round === 0) {
                        // Allow 3 more — enter round 2
                        localStorage.setItem('jobreel_guest_round', '1');
                        localStorage.setItem('jobreel_videos_watched', '0');
                        setShowGuestWall(false);
                    }
                    // If round >= 1: wall stays (GuestWall hides the bypass button)
                }}
            />
        </div>
    );
}
