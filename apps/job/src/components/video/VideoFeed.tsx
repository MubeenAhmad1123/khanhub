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

import { CATEGORY_PLACEHOLDERS, PLACEHOLDER_OVERLAY_DATA } from '@/lib/categories';
import { useRouter } from 'next/navigation';

export function VideoFeed() {
    const { activeCategory, categoryConfig, activeRole } = useCategory();
    const { user } = useAuth();
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const [showReveal, setShowReveal] = useState(false);
    const [showGuestWall, setShowGuestWall] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const reelRefs = useRef<(HTMLDivElement | null)[]>([]);

    const incrementWatchCount = () => {
        const isRegistered = !!user;
        if (isRegistered) return;

        const current = parseInt(localStorage.getItem('jobreel_videos_watched') || '0');
        const newCount = current + 1;
        localStorage.setItem('jobreel_videos_watched', String(newCount));

        if (newCount >= 3) {
            setShowGuestWall(true);
        }
    };

    useEffect(() => {
        if (!containerRef.current || user) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                        const index = reelRefs.current.indexOf(entry.target as HTMLDivElement);
                        if (index !== -1 && index !== activeIndex) {
                            setActiveIndex(index);
                            incrementWatchCount();
                        }
                    }
                });
            },
            { threshold: 0.6 }
        );

        reelRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [user, activeIndex]);

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
    }, [activeCategory]);

    return (
        <div className="relative h-[100dvh] bg-black overflow-hidden mt-20 md:mt-0">
            <FeedTabs />

            <div
                ref={containerRef}
                className="feed-container h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            >
                {videos.map((video, index) => (
                    <div
                        key={video.id}
                        ref={(el) => { reelRefs.current[index] = el; }}
                        className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black"
                    >
                        <ReelPlayer
                            videoId={video.videoId}
                            isActive={activeIndex === index && !showGuestWall}
                        />

                        <VideoOverlay data={video} />

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
