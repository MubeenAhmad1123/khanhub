'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';

interface ReelPlayerProps {
    videoId: string;
    isActive: boolean;
}

export function ReelPlayer({ videoId, isActive }: ReelPlayerProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [userUnmuted, setUserUnmuted] = useState(false);
    const [showMuteIndicator, setShowMuteIndicator] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-unmute after video loads when active
    useEffect(() => {
        if (isActive && !userUnmuted) {
            const timer = setTimeout(() => {
                setIsMuted(false);
                setUserUnmuted(true);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isActive, userUnmuted]);

    // YouTube Shorts embed URL
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3`;

    const toggleMute = () => {
        setIsMuted(!isMuted);
        setUserUnmuted(true);
        setShowMuteIndicator(true);
        setTimeout(() => setShowMuteIndicator(false), 1500);
    };

    return (
        <div
            ref={containerRef}
            onClick={toggleMute}
            style={{
                position: 'absolute',
                inset: 0,
                background: '#000',
                overflow: 'hidden',
                cursor: 'pointer',
            }}
        >
            {/* VIDEO LAYER - fills entire container */}
            <div className="absolute inset-0">
                {isActive && (
                    <iframe
                        src={embedUrl}
                        className="w-full h-full border-none"
                        style={{ objectFit: 'cover' }}
                        allow="autoplay; encrypted-media; fullscreen"
                        loading="lazy"
                    />
                )}
            </div>

            {/* GRADIENT OVERLAY - bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none z-[5]" />

            {/* Placeholder / Black Screen when not active */}
            {!isActive && <div className="absolute inset-0 bg-black z-[1]" />}

            {/* Mute Indicator */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none z-40 ${showMuteIndicator ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-black/40 backdrop-blur-md p-4 rounded-full">
                    {isMuted ? <VolumeX className="w-8 h-8 text-white" /> : <Volume2 className="w-8 h-8 text-white" />}
                </div>
            </div>

            {/* Tap Overlay (Invisible) */}
            <div className="absolute inset-0 z-10" />
        </div>
    );
}
