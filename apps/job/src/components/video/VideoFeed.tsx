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
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

export function VideoFeed() {
    const { activeCategory, categoryConfig, activeRole } = useCategory();
    const { user } = useAuth();
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const [showReveal, setShowReveal] = useState(false);
    const [showGuestWall, setShowGuestWall] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
    const watchedIndices = useRef<Set<number>>(new Set());

    const countView = async (videoId: string) => {
        // For placeholder videos — skip Firestore update
        if (!videoId || videoId.startsWith('placeholder-')) return;

        try {
            await updateDoc(doc(db, 'reels', videoId), {
                views: increment(1)
            });
        } catch (e) {
            // Silent fail — view counting is non-critical
            console.error('View count error:', e);
        }
    };

    useEffect(() => {
        if (user) return; // registered users skip all of this

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        const index = reelRefs.current.findIndex(ref => ref === entry.target);

                        // Only count each video once per session
                        if (index !== -1 && !watchedIndices.current.has(index)) {
                            watchedIndices.current.add(index);
                            setActiveIndex(index);

                            const current = parseInt(localStorage.getItem('jobreel_videos_watched') || '0');
                            const newCount = current + 1;
                            localStorage.setItem('jobreel_videos_watched', String(newCount));

                            console.log(`Video ${index} watched. Total: ${newCount}`); // debug

                            if (newCount >= 3) {
                                setShowGuestWall(true);
                            }

                            // Count view in Firestore
                            const targetVideo = videos[index];
                            if (targetVideo) {
                                countView(targetVideo.id);
                            }
                        }
                    }
                });
            },
            { threshold: 0.5, root: containerRef.current }
        );

        // Small delay to let refs attach
        const timeout = setTimeout(() => {
            reelRefs.current.forEach((ref) => {
                if (ref) observer.observe(ref);
            });
        }, 100);

        return () => {
            observer.disconnect();
            clearTimeout(timeout);
        };
    }, [user, activeCategory]); // Re-run if user or category changes (category changes the video list)

    // Get Firestore videos (currently empty/mocked as empty for this phase)
    const firestoreVideos: any[] = [];

    // Fallback to placeholders
    const videos = firestoreVideos.length > 0
        ? firestoreVideos
        : CATEGORY_PLACEHOLDERS[activeCategory].map((id, i) => ({
            id: `placeholder-${i}`,
            isPlaceholder: true,
            videoId: id,
            category: activeCategory,
            ...(PLACEHOLDER_OVERLAY_DATA[activeCategory][i % 5])
        }));

    useEffect(() => {
        // Initial scroll to index if coming from Explore
        const startIndex = Number(sessionStorage.getItem('feed_start_index') || 0);
        if (startIndex > 0 && containerRef.current) {
            containerRef.current.scrollTop = startIndex * window.innerHeight;
            setActiveIndex(startIndex);
            // Clear session storage but maybe keep feed_source for back button logic later
            sessionStorage.removeItem('feed_start_index');
        }
        // Reset watched indices when category changes
        watchedIndices.current = new Set();
    }, [activeCategory]);

    return (
        <div className="relative bg-black" style={{ height: '100dvh', overflow: 'hidden' }}>
            {/* FeedTabs floats OVER the video — not inside the layout flow */}
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
                        {/* VIDEO — fills entire parent absolutely */}
                        <ReelPlayer
                            videoId={video.videoId}
                            isActive={activeIndex === index && !showGuestWall}
                        />

                        {/* OVERLAY — absolutely positioned over the video */}
                        <div style={{ position: 'absolute', bottom: 80, left: 0, right: 60, zIndex: 20, pointerEvents: 'none' }}>
                            <VideoOverlay data={video} />
                        </div>

                        {/* ACTION BUTTONS — absolutely positioned right side */}
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
                userId={videos[activeIndex]?.id}
            />

            <GuestWall
                isVisible={showGuestWall}
                onContinue={() => {
                    localStorage.setItem('jobreel_videos_watched', '0');
                    setShowGuestWall(false);
                }}
            />
        </div>
    );
}
