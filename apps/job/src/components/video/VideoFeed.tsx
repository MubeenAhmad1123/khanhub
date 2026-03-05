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
    const [videosWatched, setVideosWatched] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
            if (index !== activeIndex) {
                setActiveIndex(index);

                // Guest tracking
                if (!user) {
                    const newCount = videosWatched + 1;
                    setVideosWatched(newCount);
                    if (newCount >= 3) {
                        setShowGuestWall(true);
                    }
                }
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
        }
        return () => container?.removeEventListener('scroll', handleScroll);
    }, [activeIndex, videosWatched, user]);

    return (
        <div className="relative h-[100dvh] bg-black overflow-hidden mt-20 md:mt-0">
            <FeedTabs />

            <div
                ref={containerRef}
                className="feed-container h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            >
                {videos.map((video, index) => (
                    <div key={video.id} className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black">
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
                onContinue={() => setShowGuestWall(false)}
            />
        </div>
    );
}
