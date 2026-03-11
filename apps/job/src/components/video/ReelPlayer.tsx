'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { getHlsUrl, getOptimizedVideoUrl } from '@/lib/services/cloudinary';

interface ReelPlayerProps {
    cloudinaryUrl: string;
    thumbnailUrl?: string;
    isActive: boolean;
    isAdjacent: boolean;
    videoId: string;
    isMuted?: boolean;
    userHasInteracted?: boolean;
}

export default function ReelPlayer({ cloudinaryUrl, thumbnailUrl, isActive, isAdjacent, videoId, userHasInteracted }: ReelPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [isMuted, setIsMuted] = useState(true);      // start muted (browser requirement)
    const [needsUnmutePrompt, setNeedsUnmutePrompt] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [showTapIcon, setShowTapIcon] = useState(false);
    const [loadingTooLong, setLoadingTooLong] = useState(false);

    // Tap handler — toggle pause/play
    const handleVideoTap = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        // If needs unmute — first tap unmutes
        if (needsUnmutePrompt) {
            video.muted = false;
            setIsMuted(false);
            setNeedsUnmutePrompt(false);
            return;
        }

        if (video.paused) {
            video.play().catch(() => { });
            setIsPaused(false);
        } else {
            video.pause();
            setIsPaused(true);
            setShowTapIcon(true);
            setTimeout(() => setShowTapIcon(false), 1000);
        }
    }, [needsUnmutePrompt]);

    // Mute toggle — separate button
    const handleMuteTap = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(video.muted);
        setNeedsUnmutePrompt(false);
    }, []);

    // Main control for isActive
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isActive) return;

        video.muted = true; // must start muted
        video.play()
            .then(() => {
                // Play succeeded — now try to unmute if user has interacted
                if (userHasInteracted) {
                    video.muted = false;
                    setIsMuted(false);
                    setNeedsUnmutePrompt(false);
                } else {
                    // Stay muted, show prompt if they haven't interacted yet
                    setNeedsUnmutePrompt(true);
                }
            })
            .catch(() => {
                // Autoplay blocked — stay muted, show prompt
                setIsMuted(true);
                setNeedsUnmutePrompt(true);
            });
        setIsPaused(false);
    }, [isActive, userHasInteracted]);

    // Handle isAdjacent/Inactive
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (!isActive) {
            video.pause();
            if (!isAdjacent) video.currentTime = 0;
            if (hlsRef.current) hlsRef.current.stopLoad();
        }
    }, [isActive, isAdjacent]);

    // Loading feedback
    useEffect(() => {
        if (!isActive) {
            setLoadingTooLong(false);
            return;
        }
        const timer = setTimeout(() => {
            if (isBuffering) setLoadingTooLong(true);
        }, 8000);
        return () => clearTimeout(timer);
    }, [isActive, isBuffering]);

    // Player Initialization & Fallback Chain
    useEffect(() => {
        const video = videoRef.current;
        if (!video || (!isActive && !isAdjacent)) return;

        const hlsUrl = getHlsUrl(cloudinaryUrl);
        const optimizedMp4 = getOptimizedVideoUrl(cloudinaryUrl);
        let fallbackAttempts = 0;

        const initHls = () => {
            if (Hls.isSupported() && hlsUrl.includes('.m3u8')) {
                const hls = new Hls({
                    startLevel: 0,
                    abrEwmaDefaultEstimate: 300000,
                    maxBufferLength: 10,
                    maxMaxBufferLength: 20,
                    manifestLoadingTimeOut: 10000,
                    manifestLoadingMaxRetry: 5,
                    levelLoadingTimeOut: 10000,
                    levelLoadingMaxRetry: 5,
                    fragLoadingTimeOut: 20000,
                    fragLoadingMaxRetry: 6,
                    highBufferWatchdogPeriod: 3,
                    nudgeMaxRetry: 5,
                });
                hls.loadSource(hlsUrl);
                hls.attachMedia(video);
                hlsRef.current = hls;

                hls.on(Hls.Events.ERROR, (_, data) => {
                    if (data.fatal) {
                        console.warn('HLS Fatal Error, falling back to MP4');
                        hls.destroy();
                        hlsRef.current = null;
                        video.src = optimizedMp4;
                        video.load();
                        if (isActive) video.play().catch(() => { });
                    }
                });
            } else {
                video.src = optimizedMp4;
                video.load();
                if (isActive) video.play().catch(() => { });
            }
        };

        const stallTimeout = setTimeout(() => {
            if (isActive && video.readyState < 3) {
                fallbackAttempts++;
                console.log(`Video stalled — fallback level ${fallbackAttempts}`);
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                }
                video.src = fallbackAttempts === 1 ? optimizedMp4 : cloudinaryUrl;
                video.load();
                video.play().catch(() => { });
            }
        }, 6000);

        initHls();

        return () => {
            clearTimeout(stallTimeout);
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [cloudinaryUrl, isActive, isAdjacent]);

    return (
        <div
            onClick={handleVideoTap}
            style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
            className="video-slide"
        >
            {/* Buffering spinner */}
            {isBuffering && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 2,
                    background: thumbnailUrl ? `url(${thumbnailUrl}) center/cover no-repeat` : '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.3)',
                        borderTop: '3px solid white',
                        animation: 'spin 0.75s linear infinite',
                    }} />
                </div>
            )}

            {/* Loading Feedback */}
            {loadingTooLong && (
                <div style={{
                    position: 'absolute', bottom: '200px', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)', borderRadius: '20px',
                    padding: '8px 16px', zIndex: 15,
                    color: 'white', fontSize: '13px', whiteSpace: 'nowrap',
                }}>
                    Slow connection — loading...
                </div>
            )}

            {/* Pause indicator */}
            {(isPaused || showTapIcon) && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {isPaused
                            ? <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '18px solid white', marginLeft: '4px' }} />
                            : <div style={{ display: 'flex', gap: '5px' }}>
                                <div style={{ width: '4px', height: '18px', background: 'white', borderRadius: '2px' }} />
                                <div style={{ width: '4px', height: '18px', background: 'white', borderRadius: '2px' }} />
                            </div>
                        }
                    </div>
                </div>
            )}

            {/* 🔇 TAP TO UNMUTE prompt — shows when browser blocked audio */}
            {needsUnmutePrompt && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20, pointerEvents: 'none',
                    background: 'rgba(0,0,0,0.65)',
                    borderRadius: '24px', padding: '10px 18px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                    <span style={{ fontSize: '20px' }}>🔇</span>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                        Tap to unmute
                    </span>
                </div>
            )}

            {/* Mute/Unmute button — always visible */}
            <button
                onClick={handleMuteTap}
                style={{
                    position: 'absolute', top: '70px', right: '12px', zIndex: 20,
                    background: 'rgba(0,0,0,0.5)', border: 'none',
                    borderRadius: '50%', width: '38px', height: '38px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: '18px',
                }}
            >
                {isMuted ? '🔇' : '🔊'}
            </button>

            <video
                ref={videoRef}
                poster={thumbnailUrl}
                playsInline
                muted          // always start muted — JS unmutes after play() resolves
                loop
                preload={isActive || isAdjacent ? 'auto' : 'none'}
                onCanPlay={() => setIsBuffering(false)}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    width: '100%', height: '100%', objectFit: 'cover',
                }}
            />
        </div>
    );
}
