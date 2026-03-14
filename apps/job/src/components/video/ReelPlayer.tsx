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
    const userPausedRef = useRef(false);
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
            userPausedRef.current = false;   // user wants to play
            video.play().catch(() => { });
            setIsPaused(false);
        } else {
            userPausedRef.current = true;    // user wants to pause — RESPECT THIS
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

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let cancelled = false;
        let playTimeout: NodeJS.Timeout;

        const attemptPlay = async () => {
            if (cancelled || !videoRef.current) return;

            // CRITICAL: if user manually paused this video, don't resume:
            if (userPausedRef.current) return;

            try {
                video.muted = true;

                if (video.readyState < 2) {
                    await new Promise<void>((resolve) => {
                        const onCanPlay = () => {
                            video.removeEventListener('canplay', onCanPlay);
                            resolve();
                        };
                        video.addEventListener('canplay', onCanPlay);
                        setTimeout(resolve, 3000);
                    });
                }

                if (cancelled || userPausedRef.current) return;

                await video.play();

                if (cancelled) {
                    video.pause();
                    return;
                }

                setTimeout(() => {
                    if (!cancelled && !userPausedRef.current && videoRef.current) {
                        videoRef.current.muted = false;
                        setIsMuted(false);
                    }
                }, 150);

                setIsPaused(false);

            } catch (err: any) {
                if (cancelled) return;
                if (err?.name !== 'AbortError') {
                    video.muted = true;
                    setIsMuted(true);
                }
            }
        };

        if (isActive) {
            // Reset user-paused flag ONLY when scrolling to a NEW video:
            // (not when re-rendering the same video)
            userPausedRef.current = false;
            playTimeout = setTimeout(attemptPlay, 100);
        } else {
            try { video.pause(); } catch (_) {}
            if (!isAdjacent) video.currentTime = 0;
            if (hlsRef.current) hlsRef.current.stopLoad();
            if (!isAdjacent) setIsBuffering(true);
            // Reset flag when video leaves view:
            userPausedRef.current = false;
        }

        return () => {
            cancelled = true;
            clearTimeout(playTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive]); // ONLY isActive

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
        const MAX_FALLBACK = 2; // stop after level 2, don't go to 3/4/5

        const stallTimeout = setInterval(() => {
            if (video.readyState < 3) {
                fallbackAttempts++;
                console.log(`Video stalled — fallback level ${fallbackAttempts}`);
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                }
                
                if (fallbackAttempts >= MAX_FALLBACK) {
                    // Final fallback: plain MP4 with Cloudinary optimization params
                    video.src = cloudinaryUrl.replace('/upload/', '/upload/q_auto,f_auto,br_1m/');
                    console.log('Video: using optimized MP4 final fallback');
                    return;
                }
                
                video.src = fallbackAttempts === 1 ? optimizedMp4 : cloudinaryUrl;
                video.load();
                video.play().catch(() => { });
            }
        }, 12000); // STALL_TIMEOUT_MS = 12000 was 6000

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
                muted
                autoPlay={false}
                loop
                preload={isActive || isAdjacent ? 'auto' : 'metadata'}
                onCanPlay={() => setIsBuffering(false)}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    width: '100%', height: '100%', objectFit: 'cover',
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)',
                }}
            />
        </div>
    );
}
