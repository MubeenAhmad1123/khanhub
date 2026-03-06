'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface ReelPlayerProps {
    videoId?: string;         // YouTube ID (placeholder)
    cloudinaryUrl?: string;   // Cloudinary URL (real video)
    isPlaceholder: boolean;
    isActive: boolean;
}

export function ReelPlayer({ videoId, cloudinaryUrl, isPlaceholder, isActive }: ReelPlayerProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [userActed, setUserActed] = useState(false);
    const [showMuteIndicator, setShowMuteIndicator] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Auto-unmute after 800ms for YouTube (autoplay workaround)
    useEffect(() => {
        if (isActive && !userActed) {
            const timer = setTimeout(() => {
                setIsMuted(false);
                setUserActed(true);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isActive, userActed]);

    // Play/pause real Cloudinary video based on isActive
    useEffect(() => {
        if (!isPlaceholder && videoRef.current) {
            if (isActive) {
                videoRef.current.play().catch(() => { });
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isActive, isPlaceholder]);

    // YouTube embed URL
    const embedUrl = isPlaceholder && videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3`
        : null;

    const toggleMute = () => {
        if (!isPlaceholder && videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        } else {
            setIsMuted(prev => !prev);
        }
        setUserActed(true);
        setShowMuteIndicator(true);
        setTimeout(() => setShowMuteIndicator(false), 1500);
    };

    return (
        <div
            onClick={toggleMute}
            style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden', cursor: 'pointer' }}
        >
            {/* REAL VIDEO — Cloudinary native <video> */}
            {!isPlaceholder && cloudinaryUrl && (
                <>
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
                        <video
                            src={cloudinaryUrl}
                            muted loop playsInline
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover',
                                filter: 'blur(20px) brightness(0.4)',
                                transform: 'scale(1.1)',
                            }}
                        />
                    </div>
                    <video
                        ref={videoRef}
                        src={cloudinaryUrl}
                        muted={isMuted}
                        loop playsInline
                        style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'contain',
                            zIndex: 1,
                        }}
                    />
                </>
            )}

            {/* PLACEHOLDER — YouTube iframe */}
            {isPlaceholder && isActive && embedUrl && (
                <div style={{ position: 'absolute', inset: 0 }}>
                    <iframe
                        src={embedUrl}
                        style={{
                            position: 'absolute',
                            top: '-10%',
                            left: 0,
                            width: '100%',
                            height: '120%',
                            border: 'none',
                            pointerEvents: 'none',
                        }}
                        allow="autoplay; encrypted-media"
                    />
                    <div
                        style={{ position: 'absolute', inset: 0, zIndex: 2 }}
                        onClick={toggleMute}
                    />
                </div>
            )}

            {/* Gradient overlay */}
            <div
                style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)',
                    pointerEvents: 'none', zIndex: 5,
                }}
            />

            {/* Black screen when inactive */}
            {!isActive && <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 1 }} />}

            {/* Mute indicator */}
            <div
                style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none', zIndex: 40,
                    opacity: showMuteIndicator ? 1 : 0, transition: 'opacity 0.3s',
                }}
            >
                <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: '50%', padding: 16 }}>
                    {isMuted ? <VolumeX size={28} color="#fff" /> : <Volume2 size={28} color="#fff" />}
                </div>
            </div>

            {/* Tap overlay */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
        </div>
    );
}
