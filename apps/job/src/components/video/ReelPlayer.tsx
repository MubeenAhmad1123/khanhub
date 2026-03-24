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

    // Always start muted so iOS allows autoplay —
    // we unmute immediately after first user interaction.
    const [isMuted, setIsMuted] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [showTapIcon, setShowTapIcon] = useState(false);
    const [loadingTooLong, setLoadingTooLong] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [isSlowConnection, setIsSlowConnection] = useState(false);
    const [showRetry, setShowRetry] = useState(false);

    // ── Unmute as soon as the user touches anything ───────────────
    // iOS Safari hard-blocks autoplay with sound until a user gesture.
    // We respect that rule: start muted, then silently unmute on first touch.
    useEffect(() => {
        if (!userHasInteracted) return;
        const video = videoRef.current;
        if (!video) return;
        video.muted = false;
        setIsMuted(false);
    }, [userHasInteracted]);

    // ── Network / connection detection ────────────────────────────
    useEffect(() => {
        const onOffline = () => setIsOffline(true);
        const onOnline = () => setIsOffline(false);
        window.addEventListener('offline', onOffline);
        window.addEventListener('online', onOnline);

        const conn = (navigator as any).connection;
        if (conn) {
            const checkSpeed = () => setIsSlowConnection(['slow-2g', '2g'].includes(conn.effectiveType));
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

    // ── Retry button after long buffer ────────────────────────────
    useEffect(() => {
        if (!isActive) { setShowRetry(false); return; }
        const timer = setTimeout(() => { if (isBuffering) setShowRetry(true); }, 15000);
        return () => clearTimeout(timer);
    }, [isActive, isBuffering]);

    // ── Tap to pause / resume ─────────────────────────────────────
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

    // ── Play / pause based on isActive ────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let cancelled = false;

        const attemptPlay = async () => {
            if (cancelled || !videoRef.current) return;
            if (userPausedRef.current) return;

            try {
                // Must be muted for iOS autoplay policy
                video.muted = true;

                if (video.readyState < 2) {
                    await new Promise<void>((resolve) => {
                        const onCanPlay = () => { video.removeEventListener('canplay', onCanPlay); resolve(); };
                        video.addEventListener('canplay', onCanPlay);
                        setTimeout(resolve, 3000); // don't wait forever
                    });
                }

                if (cancelled || userPausedRef.current) return;

                await video.play();

                if (cancelled) { video.pause(); return; }

                // Now that play succeeded, unmute if the user has already interacted.
                // If they haven't yet, the userHasInteracted effect above will unmute later.
                if (userHasInteracted && !cancelled) {
                    video.muted = false;
                    setIsMuted(false);
                }

                setIsPaused(false);

            } catch (err: any) {
                if (cancelled) return;
                // On autoplay failure, stay muted and try again silently
                if (err?.name !== 'AbortError') {
                    video.muted = true;
                    setIsMuted(true);
                }
            }
        };

        if (isActive) {
            userPausedRef.current = false;
            attemptPlay();
        } else {
            try { video.pause(); } catch (_) { }
            if (!isAdjacent) video.currentTime = 0;
            if (hlsRef.current) hlsRef.current.stopLoad();
            if (!isAdjacent) setIsBuffering(true);
            userPausedRef.current = false;
        }

        return () => { cancelled = true; };
    }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Load video source (HLS → MP4 fallback) ───────────────────
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

    // ── Long-buffer feedback ──────────────────────────────────────
    useEffect(() => {
        if (!isActive) { setLoadingTooLong(false); return; }
        const timer = setTimeout(() => { if (isBuffering) setLoadingTooLong(true); }, 8000);
        return () => clearTimeout(timer);
    }, [isActive, isBuffering]);

    // ── Stall watchdog → fallback to MP4 ─────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isActive) return;

        let fallbackAttempts = 0;
        const optimizedMp4 = getOptimizedVideoUrl(cloudinaryUrl);
        const MAX_FALLBACK = 2;

        const stallTimeout = setInterval(() => {
            if (video.readyState < 3) {
                fallbackAttempts++;
                if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

                if (fallbackAttempts >= MAX_FALLBACK) {
                    video.src = cloudinaryUrl.replace('/upload/', '/upload/q_auto,f_auto,br_1m/');
                    return;
                }
                video.src = fallbackAttempts === 1 ? optimizedMp4 : cloudinaryUrl;
                video.load();
                video.play().catch(() => { });
            }
        }, 12000);

        return () => clearInterval(stallTimeout);
    }, [isActive, cloudinaryUrl]);

    // ─────────────────────────────────────────────────────────────
    return (
        <div
            onClick={handleVideoTap}
            style={{
                position: 'absolute', inset: 0, cursor: 'pointer',
                background: '#000',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                overflow: 'hidden',
            }}
            className="video-slide"
        >
            {/* Buffering spinner + thumbnail placeholder */}
            {isBuffering && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 2,
                    background: thumbnailUrl ? `url(${thumbnailUrl}) center/cover no-repeat` : '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.3)',
                        borderTop: '3px solid white',
                        animation: 'spin 0.75s linear infinite',
                    }} />
                </div>
            )}

            {/* Slow connection message */}
            {loadingTooLong && (
                <div style={{
                    position: 'absolute', bottom: 200, left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)', borderRadius: 20,
                    padding: '8px 16px', zIndex: 15,
                    color: '#fff', fontSize: 13, whiteSpace: 'nowrap',
                }}>
                    Slow connection — loading...
                </div>
            )}

            {/* Retry button */}
            {showRetry && (
                <div style={{ position: 'absolute', bottom: 160, left: '50%', transform: 'translateX(-50%)', zIndex: 15 }}>
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
                            fontFamily: 'Poppins', fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        ↺ Tap to retry
                    </button>
                </div>
            )}

            {/* Pause / play icon flash */}
            {(isPaused || showTapIcon) && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {isPaused
                            ? <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '18px solid white', marginLeft: 4 }} />
                            : <div style={{ display: 'flex', gap: 5 }}>
                                <div style={{ width: 4, height: 18, background: 'white', borderRadius: 2 }} />
                                <div style={{ width: 4, height: 18, background: 'white', borderRadius: 2 }} />
                            </div>
                        }
                    </div>
                </div>
            )}

            {/* THE VIDEO — muted attr required for iOS autoplay; we unmute via JS after interaction */}
            <video
                ref={videoRef}
                poster={thumbnailUrl}
                playsInline       // required on iOS — prevents fullscreen takeover
                muted             // required for autoplay on iOS — JS unmutes after first touch
                autoPlay
                loop
                preload={isActive || isAdjacent ? 'auto' : 'metadata'}
                onCanPlay={() => setIsBuffering(false)}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
            />

            {/* Offline banner */}
            {isOffline && (
                <div style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', padding: '6px 14px', borderRadius: 999,
                    fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600,
                    zIndex: 30, whiteSpace: 'nowrap',
                }}>
                    📶 You're offline
                </div>
            )}

            {/* Slow connection banner */}
            {isSlowConnection && isBuffering && (
                <div style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(180,120,0,0.9)', color: '#fff',
                    padding: '6px 14px', borderRadius: 999,
                    fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600,
                    zIndex: 30, whiteSpace: 'nowrap',
                }}>
                    ⚡ Slow connection — buffering
                </div>
            )}
        </div>
    );
});

export default ReelPlayer;