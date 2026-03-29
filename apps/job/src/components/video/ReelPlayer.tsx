'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
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
    isMobileDevice?: boolean;
}

const ReelPlayer = memo(function ReelPlayer({
    cloudinaryUrl,
    thumbnailUrl,
    isActive,
    isAdjacent,
    videoId,
    userHasInteracted,
}: ReelPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const userPausedRef = useRef(false);

    // Always start muted — unmuted only after user interaction + video is active
    const [isMuted, setIsMuted] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [showTapIcon, setShowTapIcon] = useState(false);
    const [loadingTooLong, setLoadingTooLong] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [isSlowConnection, setIsSlowConnection] = useState(false);
    const [showRetry, setShowRetry] = useState(false);

    // activeSessionRef — incremented every time isActive changes.
    // Any in-flight async play() promise that captured a previous value
    // is stale and must bail out before mutating audio or calling play().
    const activeSessionRef = useRef(0);

    // ── Offline / slow-connection detection ──────────────────────
    useEffect(() => {
        const onOffline = () => setIsOffline(true);
        const onOnline = () => setIsOffline(false);
        window.addEventListener('offline', onOffline);
        window.addEventListener('online', onOnline);

        const conn = (navigator as any).connection;
        if (conn) {
            const checkSpeed = () => {
                setIsSlowConnection(['slow-2g', '2g'].includes(conn.effectiveType));
            };
            checkSpeed();
            conn.addEventListener('change', checkSpeed);
            return () => {
                window.removeEventListener('offline', onOffline);
                window.removeEventListener('online', onOnline);
                conn.removeEventListener('change', checkSpeed);
            };
        }
        return () => {
            window.removeEventListener('offline', onOffline);
            window.removeEventListener('online', onOnline);
        };
    }, []);

    // ── Retry button — shown after 15s of buffering while active ─
    useEffect(() => {
        if (!isActive) { setShowRetry(false); return; }
        const timer = setTimeout(() => {
            if (isBuffering) setShowRetry(true);
        }, 15000);
        return () => clearTimeout(timer);
    }, [isActive, isBuffering]);

    // ── Tap handler — toggle pause / play ────────────────────────
    const handleVideoTap = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            userPausedRef.current = false;
            video.play().catch(() => { });
            setIsPaused(false);
        } else {
            userPausedRef.current = true;
            video.pause();
            setIsPaused(true);
            setShowTapIcon(true);
            setTimeout(() => setShowTapIcon(false), 1000);
        }
    }, []);

    // Mute toggle disabled per product requirement
    const handleMuteTap = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    // ── Core active / inactive logic ──────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Increment session — all previous in-flight closures are now stale
        activeSessionRef.current += 1;
        const mySession = activeSessionRef.current;
        const isCurrentSession = () => mySession === activeSessionRef.current;

        if (!isActive) {
            // Silence and stop synchronously — zero window for sound to leak
            video.muted = true;
            setIsMuted(true);
            try { video.pause(); } catch (_) { }
            setIsPaused(false);

            // Always reset to start (TikTok/Shorts behaviour)
            video.currentTime = 0;

            if (hlsRef.current) hlsRef.current.stopLoad();
            if (!isAdjacent) setIsBuffering(true);
            userPausedRef.current = false;
            return;
        }

        // --- isActive === true ---
        userPausedRef.current = false;

        const attemptPlay = async (retryCount = 0) => {
            if (!isCurrentSession()) return;
            const vid = videoRef.current;
            if (!vid) return;
            if (userPausedRef.current) return;

            try {
                // Always start muted to satisfy browser autoplay policy
                vid.muted = true;

                if (vid.readyState < 2) {
                    await new Promise<void>((resolve) => {
                        const onCanPlay = () => {
                            vid.removeEventListener('canplay', onCanPlay);
                            resolve();
                        };
                        vid.addEventListener('canplay', onCanPlay);
                        setTimeout(resolve, 2500); // iOS fallback timeout
                    });
                }

                if (!isCurrentSession() || userPausedRef.current) return;

                await vid.play();

                // Re-check after play() resolves — this is the main race condition
                if (!isCurrentSession()) {
                    vid.muted = true;
                    vid.pause();
                    return;
                }

                // Only unmute when still the active session and user has interacted
                if (userHasInteracted && isCurrentSession()) {
                    vid.muted = false;
                    setIsMuted(false);
                }

                setIsPaused(false);

            } catch (err: any) {
                if (!isCurrentSession()) return;

                if (err?.name === 'AbortError') return;

                // Retry up to 2 times on iOS NotAllowedError / generic failure
                if (retryCount < 2) {
                    setTimeout(() => attemptPlay(retryCount + 1), 400);
                } else {
                    vid.muted = true;
                    setIsMuted(true);
                }
            }
        };

        attemptPlay();
    }, [isActive]); // ONLY isActive — intentional

    // ── userHasInteracted → unmute with real session guard ───────
    useEffect(() => {
        if (!userHasInteracted || !isActive) return;
        const video = videoRef.current;
        if (!video) return;

        // Capture session NOW — before the async gap
        const capturedSession = activeSessionRef.current;

        setTimeout(() => {
            if (activeSessionRef.current !== capturedSession) return;
            if (!isActive) return;
            video.muted = false;
            setIsMuted(false);
        }, 50);
    }, [userHasInteracted, isActive]);

    // ── Video source initialisation ───────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !cloudinaryUrl || (!isActive && !isAdjacent)) return;

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
                        // load() only — attemptPlay handles play() with session guards
                        video.load();
                    }
                });
            } else {
                video.src = optimizedMp4;
                // load() only — attemptPlay handles play() with session guards
                video.load();
            }
        }
    }, [cloudinaryUrl, isActive, isAdjacent]);

    // ── Loading feedback — "slow connection" hint after 8s ───────
    useEffect(() => {
        if (!isActive) { setLoadingTooLong(false); return; }
        const timer = setTimeout(() => {
            if (isBuffering) setLoadingTooLong(true);
        }, 8000);
        return () => clearTimeout(timer);
    }, [isActive, isBuffering]);

    // ── Stall detection — retries only on genuine currentTime freeze
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isActive) return;

        let fallbackAttempts = 0;
        const MAX_FALLBACK = 2;
        const optimizedMp4 = getOptimizedVideoUrl(cloudinaryUrl);

        let lastCurrentTime = -1;
        let stallCount = 0;

        const stallTimeout = setInterval(() => {
            if (video.paused || userPausedRef.current) {
                lastCurrentTime = video.currentTime;
                stallCount = 0;
                return;
            }

            const currentTime = video.currentTime;

            if (currentTime === lastCurrentTime && video.readyState < 3) {
                stallCount++;
            } else {
                stallCount = 0;
                lastCurrentTime = currentTime;
                return;
            }

            lastCurrentTime = currentTime;

            // Require 2 consecutive stall intervals (~24s) before acting
            if (stallCount < 2) return;
            stallCount = 0;

            fallbackAttempts++;
            console.log(`Video genuinely stalled — fallback level ${fallbackAttempts}`);

            if (fallbackAttempts > MAX_FALLBACK) return;

            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }

            if (fallbackAttempts === MAX_FALLBACK) {
                video.src = cloudinaryUrl.replace('/upload/', '/upload/q_auto,f_auto,br_1m/');
                console.log('Video: using optimized MP4 final fallback');
            } else {
                video.src = optimizedMp4;
            }
            // load() only — let attemptPlay handle play()
            video.load();
        }, 12000);

        return () => clearInterval(stallTimeout);
    }, [isActive, cloudinaryUrl]);

    // ── Render ────────────────────────────────────────────────────
    return (
        <div
            onClick={handleVideoTap}
            style={{
                position: 'absolute',
                inset: 0,
                cursor: 'pointer',
                background: '#000',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
            }}
            className="video-slide"
        >
            {/* Buffering spinner with thumbnail behind it */}
            {isBuffering && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 2,
                    background: thumbnailUrl
                        ? `url(${thumbnailUrl}) center/cover no-repeat`
                        : '#000',
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

            {/* Slow connection hint */}
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

            {/* Retry button */}
            {showRetry && (
                <div style={{
                    position: 'absolute', bottom: '160px', left: '50%',
                    transform: 'translateX(-50%)', zIndex: 15,
                }}>
                    <button
                        onClick={() => {
                            const video = videoRef.current;
                            if (!video) return;
                            setShowRetry(false);
                            video.load();
                            video.play().catch(() => { });
                        }}
                        style={{
                            background: '#FF0069', border: 'none',
                            color: '#fff', padding: '10px 24px',
                            borderRadius: 999, fontSize: 13,
                            fontFamily: 'Poppins', fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        ↺ Tap to retry
                    </button>
                </div>
            )}

            {/* Pause / play indicator */}
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
                            ? <div style={{
                                width: 0, height: 0,
                                borderTop: '10px solid transparent',
                                borderBottom: '10px solid transparent',
                                borderLeft: '18px solid white',
                                marginLeft: '4px',
                            }} />
                            : <div style={{ display: 'flex', gap: '5px' }}>
                                <div style={{ width: '4px', height: '18px', background: 'white', borderRadius: '2px' }} />
                                <div style={{ width: '4px', height: '18px', background: 'white', borderRadius: '2px' }} />
                            </div>
                        }
                    </div>
                </div>
            )}

            {/* Video element — muted always on, JS controls after play() */}
            <video
                ref={videoRef}
                poster={thumbnailUrl}
                playsInline
                muted
                loop
                preload={isActive || isAdjacent ? 'auto' : 'none'}
                onCanPlay={() => setIsBuffering(false)}
                onWaiting={() => { if (isActive) setIsBuffering(true); }}
                onPlaying={() => setIsBuffering(false)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    background: '#000',
                }}
            />

            {/* Offline banner */}
            {isOffline && (
                <div style={{
                    position: 'absolute', top: 12, left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.85)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', padding: '6px 14px',
                    borderRadius: 999, fontSize: 12,
                    fontFamily: 'DM Sans', fontWeight: 600,
                    zIndex: 30, whiteSpace: 'nowrap',
                }}>
                    📶 You&apos;re offline
                </div>
            )}

            {/* Slow connection banner */}
            {isSlowConnection && isBuffering && (
                <div style={{
                    position: 'absolute', top: 12, left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(180,120,0,0.9)',
                    color: '#fff', padding: '6px 14px',
                    borderRadius: 999, fontSize: 12,
                    fontFamily: 'DM Sans', fontWeight: 600,
                    zIndex: 30, whiteSpace: 'nowrap',
                }}>
                    ⚡ Slow connection — buffering
                </div>
            )}
        </div>
    );
});

export default ReelPlayer;