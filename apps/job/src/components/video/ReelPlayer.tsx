'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';

interface ReelPlayerProps {
    videoId: string;
    isActive: boolean;
}

export function ReelPlayer({ videoId, isActive }: ReelPlayerProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [showMuteIndicator, setShowMuteIndicator] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // YouTube Shorts embed URL
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3`;

    const toggleMute = () => {
        setIsMuted(!isMuted);
        setShowMuteIndicator(true);
        setTimeout(() => setShowMuteIndicator(false), 1500);
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center cursor-pointer"
            onClick={toggleMute}
        >
            {/* YouTube Iframe */}
            {isActive && (
                <iframe
                    src={embedUrl}
                    className="w-full h-full scale-[1.3] pointer-events-none"
                    style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                    allow="autoplay; encrypted-media"
                    loading="lazy"
                />
            )}

            {/* Placeholder / Black Screen when not active */}
            {!isActive && <div className="w-full h-full bg-black" />}

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
