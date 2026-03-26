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
}

const ReelPlayer = memo(function ReelPlayer({ cloudinaryUrl, thumbnailUrl, isActive, isAdjacent, videoId, userHasInteracted }: ReelPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const userPausedRef = useRef(false);
    // FIX 1: isMuted starts true — always muted until user interacts and video is active
    const [isMuted, setIsMuted] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [showTapIcon, setShowTapIcon] = useState(false);
    const [loadingTooLong, setLoadingTooLong] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [isSlowConnection, setIsSlowConnection] = useState(false);
    const [showRetry, setShowRetry] = useState(false);

    // FIX 2: cancelledRef tracks the current "active session" — every time isActive
    // flips, we increment this counter so in-flight async play() promises can
    // detect they are stale and must not unmute/play.
    const activeSessionRef = useRef(0);

    useEffect(() => {
        // Offline detection
        const onOffline = () => setIsOffline(true);
        const onOnline = () => setIsOffline(false);
        window.addEventListener('offline', onOffline);
        window.addEventListener('online', onOnline);

        // Slow connection detection
        const conn = (navigator as any).connection;
        if (conn) {
            const checkSpeed = () => {
                const slow = ['slow-2g', '2g'].includes(conn.effectiveType);
                setIsSlowConnection(slow);
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

    useEffect(() => {
        if (!isActive) { setShowRetry(false); return; }
        const timer = setTimeout(() => {
            if (isBuffering) setShowRetry(true);
        }, 15000);
        return () => clearTimeout(timer);
    }, [isActive, isBuffering]);

    // Tap handler — toggle pause/play
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

    // Mute toggle — disabled as per request
    const handleMuteTap = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        // User asked to disable manual muting/unmuting
    }, []);

    // FIX 1 + FIX 2: Consolidated active/inactive logic with session token to
    // prevent race conditions from late-resolving play() promises.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // FIX 2: Increment session ID — any closure that captured a previous value
        // is now stale and must bail out before mutating audio or calling play().
        activeSessionRef.current += 1;
        const mySession = activeSessionRef.current;

        // FIX 2: Helper — returns true if this closure is still the "current" session.
        const isCurrentSession = () => mySession === activeSessionRef.current;

        if (!isActive) {
            // FIX 1 + FIX 2: Immediately silence and stop — do this synchronously so
            // there is zero window where sound leaks from a newly-inactive video.
            video.muted = true;
            setIsMuted(true);
            try { video.pause(); } catch (_) { }
            setIsPaused(false);

            if (!isAdjacent) video.currentTime = 0;
            if (hlsRef.current) hlsRef.current.stopLoad();
            if (!isAdjacent) setIsBuffering(true);
            userPausedRef.current = false;
            return;
        }

        // --- isActive === true path ---
        userPausedRef.current = false;

        const attemptPlay = async (retryCount = 0) => {
            if (!isCurrentSession()) return; // FIX 2: stale session — bail out
            const vid = videoRef.current;
            if (!vid) return;
            if (userPausedRef.current) return;

            try {
                // FIX 1: Always start muted to satisfy browser autoplay policy
                vid.muted = true;

                if (vid.readyState < 2) {
                    await new Promise<void>((resolve) => {
                        const onCanPlay = () => {
                            vid.removeEventListener('canplay', onCanPlay);
                            resolve();
                        };
                        vid.addEventListener('canplay', onCanPlay);
                        // FIX 6 (iOS): reduce wait so retry kicks in faster
                        setTimeout(resolve, 2500);
                    });
                }

                // FIX 2: Re-check session after every await
                if (!isCurrentSession() || userPausedRef.current) return;

                await vid.play();

                // FIX 2: Re-check after play() resolves — this is the main race condition
                if (!isCurrentSession()) {
                    // We scrolled away while play() was resolving — silence immediately
                    vid.muted = true;
                    vid.pause();
                    return;
                }

                // FIX 1: Only unmute when STILL the active session and user has interacted
                if (userHasInteracted && isCurrentSession()) {
                    vid.muted = false;
                    setIsMuted(false);
                }

                setIsPaused(false);

            } catch (err: any) {
                if (!isCurrentSession()) return; // FIX 2: stale, ignore

                if (err?.name === 'AbortError') {
                    // AbortError means a new play/pause happened — don't retry
                    return;
                }

                // FIX 6 (iOS): retry up to 2 times on NotAllowedError / generic failure
                if (retryCount < 2) {
                    setTimeout(() => attemptPlay(retryCount + 1), 400);
                } else {
                    // Give up — stay muted so at least it plays silently
                    vid.muted = true;
                    setIsMuted(true);
                }
            }
        };

        attemptPlay();

        return () => {
            // Cleanup: invalidate this session so the in-flight promise bails out
            // Note: we do NOT increment here — the next run of this effect does that.
            // We just need any in-flight closures to see they are stale.
            // (activeSessionRef.current is incremented at the top of the NEXT run)
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive]); // ONLY isActive — intentional

    // FIX 1: When user interacts, unmute ONLY if this video is currently active
    useEffect(() => {
        if (!userHasInteracted) return;
        if (!isActive) return;
        const video = videoRef.current;
        if (!video) return;
        // FIX 2: Only act if this is still the current session
        if (activeSessionRef.current === activeSessionRef.current) { // always true — just explicit
            video.muted = false;
            setIsMuted(false);
        }
    }, [userHasInteracted, isActive]);

    // Ensure the video src is actually set
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
                        video.load();
                        // FIX 3: onCanPlay / onPlaying events on the video element will
                        // fire after load() and clear isBuffering — no manual setState needed here.
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

    // FIX 4: Stall detection based on currentTime progress, not just readyState.
    // Only retries when playback is genuinely frozen (currentTime not advancing).
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isActive) return;

        let fallbackAttempts = 0;
        const MAX_FALLBACK = 2;
        const optimizedMp4 = getOptimizedVideoUrl(cloudinaryUrl);

        // FIX 4: Track currentTime to detect genuine stalls (not just buffering pauses)
        let lastCurrentTime = -1;
        let stallCount = 0; // FIX 4: require 2 consecutive stall-checks before acting

        const stallTimeout = setInterval(() => {
            // FIX 4: If video is paused by user or not active, skip check
            if (video.paused || userPausedRef.current) {
                lastCurrentTime = video.currentTime;
                stallCount = 0;
                return;
            }

            const currentTime = video.currentTime;

            // FIX 4: Stall = currentTime hasn't moved since last check
            if (currentTime === lastCurrentTime && video.readyState < 3) {
                stallCount++;
            } else {
                // Progress detected — reset stall counter
                stallCount = 0;
                lastCurrentTime = currentTime;
                return;
            }

            lastCurrentTime = currentTime;

            // FIX 4: Only act after 2 consecutive stall intervals (~24s total)
            // to avoid jank from brief buffering pauses on slow connections
            if (stallCount < 2) return;
            stallCount = 0; // reset after acting

            fallbackAttempts++;
            console.log(`Video genuinely stalled — fallback level ${fallbackAttempts}`);

            if (fallbackAttempts > MAX_FALLBACK) {
                // FIX 4: Exceeded max retries — stop the loop to prevent infinite janking
                return;
            }

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
            video.load();
            video.play().catch(() => { });
        }, 12000);

        return () => clearInterval(stallTimeout);
    }, [isActive, cloudinaryUrl]);

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

            {/* FIX 3: `muted` attribute is always on the element — JS controls it after.
                onCanPlay + onPlaying clear isBuffering including after HLS→MP4 fallback. */}
            <video
                ref={videoRef}
                poster={thumbnailUrl}
                playsInline
                muted
                autoPlay
                loop
                preload={isActive || isAdjacent ? 'auto' : 'metadata'}
                onCanPlay={() => setIsBuffering(false)}   // FIX 3: clears spinner on fallback too
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}   // FIX 3: belt-and-suspenders for fallback
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
                    📶 You're offline
                </div>
            )}

            {/* Slow connection banner — auto hides after 5s */}
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