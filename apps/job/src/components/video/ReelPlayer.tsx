'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

interface ReelPlayerProps {
    videoId?: string;         // YouTube ID (placeholder)
    cloudinaryUrl?: string;   // Cloudinary URL (real video)
    thumbnailUrl?: string;    // Image thumbnail URL
    isPlaceholder: boolean;
    isActive: boolean;
    isPreload?: boolean;      // Whether to preload this video
}

export function ReelPlayer({ videoId, cloudinaryUrl, thumbnailUrl, isPlaceholder, isActive, isPreload }: ReelPlayerProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [userActed, setUserActed] = useState(false);
    const [showIndicator, setShowIndicator] = useState<'mute' | 'unmute' | 'play' | 'pause' | null>(null);
    const [isSpeed2x, setIsSpeed2x] = useState(false);
    const [ready, setReady] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [error, setError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const holdTimer = useRef<NodeJS.Timeout | null>(null);

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

    // Optimize Cloudinary URL (Commit 3)
    const getOptimizedUrl = (url: string) => {
        if (!url || !url.includes('cloudinary.com')) return url;
        if (url.includes('q_auto')) return url;
        return url.replace('/video/upload/', '/video/upload/q_auto,f_auto/');
    };

    const optimizedCloudinaryUrl = cloudinaryUrl ? getOptimizedUrl(cloudinaryUrl) : null;

    // Play/pause real Cloudinary video based on isActive
    useEffect(() => {
        if (!isPlaceholder && videoRef.current) {
            if (isActive && isPlaying && ready) {
                videoRef.current.play().catch(() => { });
            } else {
                videoRef.current.pause();
                if (!isActive) {
                    videoRef.current.currentTime = 0;
                    setIsPlaying(true);
                }
            }
        }
    }, [isActive, isPlaceholder, isPlaying, ready]);

    const { user: currentUser } = useAuth();

    // Track watched videos (Commit 2)
    useEffect(() => {
        if (!isActive || isPlaceholder || !videoId) return;

        const timer = setTimeout(async () => {
            try {
                // If logged in: mark as watched and increment views
                if (currentUser) {
                    const userRef = doc(db, 'users', currentUser.uid);
                    await updateDoc(userRef, {
                        watchedVideos: arrayUnion(videoId)
                    });
                }

                // Global view increment (for both guests and logged in)
                const videoRef = doc(db, 'videos', videoId);
                await updateDoc(videoRef, {
                    views: increment(1)
                });
            } catch (err) {
                console.error("Error tracking view:", err);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [isActive, videoId, isPlaceholder, currentUser]);

    // YouTube embed URL
    const embedUrl = isPlaceholder && videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3`
        : null;

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isPlaceholder && videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
            setShowIndicator(videoRef.current.muted ? 'mute' : 'unmute');
        } else {
            setIsMuted(prev => !prev);
            setShowIndicator(!isMuted ? 'mute' : 'unmute');
        }
        setUserActed(true);
        setTimeout(() => setShowIndicator(null), 1000);
    };

    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
        setShowIndicator(!isPlaying ? 'play' : 'pause');
        setTimeout(() => setShowIndicator(null), 1000);
    };

    // 2x speed handlers — only for real Cloudinary videos
    const handlePointerDown = () => {
        if (isPlaceholder) return;
        holdTimer.current = setTimeout(() => {
            setIsSpeed2x(true);
            if (videoRef.current) {
                videoRef.current.playbackRate = 2.0;
            }
        }, 300);
    };

    const handlePointerUp = () => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        if (isSpeed2x) {
            setIsSpeed2x(false);
            if (videoRef.current) {
                videoRef.current.playbackRate = 1.0;
            }
        }
    };

    return (
        <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={togglePlayPause}
            style={{ position: 'absolute', inset: 0, background: '#fff', overflow: 'hidden', cursor: 'pointer' }}
        >
            {/* REAL VIDEO — Cloudinary native <video> */}
            {!isPlaceholder && cloudinaryUrl && (
                <>
                    {/* Thumbnail/Loading State */}
                    {(!ready || isBuffering) && !error && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: '#000' }}>
                            {thumbnailUrl ? (
                                <img
                                    src={thumbnailUrl}
                                    alt="Thumbnail"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                                />
                            ) : null}
                            <div className="flex items-center justify-center absolute inset-0 bg-black/20">
                                <div style={{
                                    width: 40, height: 40,
                                    border: '3px solid rgba(255,255,255,0.1)',
                                    borderTop: '3px solid var(--accent)',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div style={{
                            position: 'absolute', inset: 0, zIndex: 11,
                            background: 'rgba(0,0,0,0.8)', display: 'flex',
                            flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', color: '#fff', textAlign: 'center',
                            padding: 20
                        }}>
                            <span style={{ fontSize: 40, marginBottom: 12 }}>⚠️</span>
                            <p style={{ fontFamily: 'Poppins', fontWeight: 600 }}>Video Unavailable</p>
                        </div>
                    )}

                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
                        <video
                            src={optimizedCloudinaryUrl!}
                            muted loop playsInline
                            preload={isPreload || isActive ? "auto" : "none"}
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover',
                                filter: 'blur(20px) brightness(0.4)',
                                transform: 'scale(1.1)',
                                opacity: ready ? 1 : 0,
                                transition: 'opacity 0.3s'
                            }}
                        />
                    </div>
                    <video
                        src={optimizedCloudinaryUrl!}
                        muted loop playsInline
                        preload={isPreload || isActive ? "auto" : "none"}
                        poster={thumbnailUrl}
                        onPlaying={() => {
                            setReady(true);
                            setIsBuffering(false);
                        }}
                        onWaiting={() => setIsBuffering(true)}
                        onCanPlay={() => setReady(true)}
                        onError={() => setError(true)}
                        style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'contain',
                            zIndex: 1,
                            opacity: ready ? 1 : 0,
                            transition: 'opacity 0.3s'
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

            {/* Gradient overlay - always black to prevent video fog */}
            <div
                style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)',
                    pointerEvents: 'none', zIndex: 5,
                }}
            />

            {/* White screen when inactive */}
            {!isActive && <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 1 }} />}

            {/* Play/Pause & Mute Indicator */}
            <div
                style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none', zIndex: 40,
                    opacity: showIndicator ? 1 : 0, transition: 'opacity 0.3s',
                }}
            >
                <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', borderRadius: '50%', padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {showIndicator === 'mute' && <VolumeX size={36} color="#000" />}
                    {showIndicator === 'unmute' && <Volume2 size={36} color="#000" />}
                    {showIndicator === 'play' && <Play size={36} color="#000" fill="#000" />}
                    {showIndicator === 'pause' && <Pause size={36} color="#000" fill="#000" />}
                </div>
            </div>

            {/* 2x speed indicator */}
            {isSpeed2x && (
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    fontFamily: 'Poppins', fontWeight: 800,
                    fontSize: 18, padding: '8px 16px',
                    borderRadius: 999, zIndex: 50,
                    pointerEvents: 'none',
                    letterSpacing: '0.05em',
                }}>
                    ⚡ 2x
                </div>
            )}

            {/* Volume Button Overlay */}
            <div
                style={{
                    position: 'absolute', top: '120px', right: '16px', zIndex: 45,
                    background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)',
                    borderRadius: '50%', padding: '10px', display: 'flex', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onClick={toggleMute}
            >
                {isMuted ? <VolumeX size={20} color="#000" /> : <Volume2 size={20} color="#000" />}
            </div>

            {/* Tap overlay */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
        </div>
    );
}

