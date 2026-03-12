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
    const [isMuted, setIsMuted] = useState(false);      // Default to unmuted
    const [isPaused, setIsPaused] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [showTapIcon, setShowTapIcon] = useState(false);
    const [loadingTooLong, setLoadingTooLong] = useState(false);

    // Tap handler — toggle pause/play
    const handleVideoTap = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play().catch(() => { });
            setIsPaused(false);
        } else {
            video.pause();
            setIsPaused(true);
            setShowTapIcon(true);
            setTimeout(() => setShowTapIcon(false), 1000);
        }
    }, []);

    // Mute toggle — disabled as per request
    const handleMuteTap = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        // User asked to disable manual muting/unmuting
    }, []);

    // Fix 4: ReelPlayer: Play Video When isActive Becomes True
    const attemptPlay = useCallback(() => {
        const video = videoRef.current;
        if (!video || !isActive) return;

        // Autoplay policy: must be muted to start
        video.muted = true;
        const playPromise = video.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    setIsBuffering(false);
                    // Standard autoplay logic: wait a moment then unmute
                    setTimeout(() => {
                        if (videoRef.current && isActive) {
                            videoRef.current.muted = false;
                            setIsMuted(false);
                        }
                    }, 150);
                })
                .catch((err) => {
                    console.log('Autoplay failed:', err.message);
                    setIsMuted(true);
                });
        }
        setIsPaused(false);
    }, [isActive]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isActive) {
            // Reset to start
            video.currentTime = 0;

            if (video.readyState >= 3) {
                // Already have enough data to play
                attemptPlay();
            } else {
                // Wait for enough data
                const handleCanPlay = () => {
                    attemptPlay();
                    video.removeEventListener('canplay', handleCanPlay);
                };
                video.addEventListener('canplay', handleCanPlay);
                return () => video.removeEventListener('canplay', handleCanPlay);
            }
        } else {
            video.pause();
            if (!isAdjacent) {
                video.currentTime = 0;
                setIsBuffering(true);
            }
            if (hlsRef.current) hlsRef.current.stopLoad();
        }
    }, [isActive, attemptPlay, isAdjacent]);

    // Ensure the video src is actually set
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !cloudinaryUrl || (!isActive && !isAdjacent)) return;

        // If video has no src yet — set it:
        if (!video.src || video.src === window.location.href) {
            const hlsUrl = getHlsUrl(cloudinaryUrl);
            const optimizedMp4 = getOptimizedVideoUrl(cloudinaryUrl);

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
        }
    }, [cloudinaryUrl, isActive, isAdjacent]);

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

    // Status monitoring for stall
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isActive) return;

        let fallbackAttempts = 0;
        const optimizedMp4 = getOptimizedVideoUrl(cloudinaryUrl);

        const stallTimeout = setInterval(() => {
            if (video.readyState < 3) {
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

        return () => clearInterval(stallTimeout);
    }, [isActive, cloudinaryUrl]);

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

            {/* User requested removal of "Tap to unmute" prompt and Mute button */}

            <video
                ref={videoRef}
                poster={thumbnailUrl}
                playsInline
                muted={isMuted}
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
