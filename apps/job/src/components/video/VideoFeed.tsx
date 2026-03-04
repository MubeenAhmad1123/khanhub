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

export function VideoFeed() {
    const { activeCategory, categoryConfig, activeRole } = useCategory();
    const { user } = useAuth();
    const [activeIndex, setActiveIndex] = useState(0);
    const [showReveal, setShowReveal] = useState(false);
    const [showGuestWall, setShowGuestWall] = useState(false);
    const [videosWatched, setVideosWatched] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Use placeholder videos from config
    const videos = categoryConfig.placeholderVideos.map((id, index) => ({
        id: `${activeCategory}-${index}`,
        videoId: id,
        title: index === 0 ? `Premium ${categoryConfig.label} Expert` : `${categoryConfig.label} Specialist`,
        badge: activeRole === 'provider' ? categoryConfig.seekerLabel : categoryConfig.providerLabel,
        field1: categoryConfig.label === 'Jobs' ? 'UI/UX Design • React' : 'Specialist • 10+ yrs exp',
        field2: categoryConfig.label === 'Jobs' ? 'Rs. 150k/mo' : 'Verified Professional',
        location: index % 2 === 0 ? 'Karachi' : 'Lahore',
        name: index === 0 ? 'Ahmed Raza' : 'Sara Khan'
    }));

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
                    if (newCount % 4 === 0) {
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
        <div className="relative h-screen bg-black overflow-hidden mt-20 md:mt-0">
            <FeedTabs />

            <div
                ref={containerRef}
                className="feed-container h-full"
            >
                {videos.map((video, index) => (
                    <div key={video.id} className="reel-item">
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
                targetName={videos[activeIndex]?.name}
                userId={videos[activeIndex]?.id}
            />

            <GuestWall
                isVisible={showGuestWall}
                onContinue={() => setShowGuestWall(false)}
            />
        </div>
    );
}
