'use client';
// ReelPlayer.tsx
import React, {
    useEffect,
    useRef,
    useState,
    useCallback,
    memo,
} from 'react';
import Hls from 'hls.js';
import { Volume2, VolumeX } from 'lucide-react';
import { getHlsUrl, getOptimizedVideoUrl } from '@/lib/services/cloudinary';

interface ReelPlayerProps {
    cloudinaryUrl: string;
    thumbnailUrl?: string;
    isActive: boolean;
    isAdjacent: boolean;
    videoId: string;
    userHasInteracted?: boolean;
    isMobileDevice?: boolean;
    forceStop?: boolean;
    // globalMuted is the single source of truth for mute state.
    // ReelPlayer never owns mute state — it reads globalMuted and
    // calls onToggleMute() to ask VideoFeed to flip it.
    globalMuted: boolean;
    onToggleMute: () => void;
}

const MIN_LOADING_MS = 800;

const ReelPlayer = memo(function ReelPlayer({
    cloudinaryUrl,
    thumbnailUrl,
    isActive,
    isAdjacent,
    videoId,
    userHasInteracted,
    forceStop = false,
    globalMuted,
    onToggleMute,
}: ReelPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const userPausedRef = useRef(false);

    const [isPaused, setIsPaused] = useState(false);
    const [showInitialLoading, setShowInitialLoading] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [showTapIcon, setShowTapIcon] = useState(false);
    const [loadingTooLong, setLoadingTooLong] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [isSlowConnection, setIsSlowConnection] = useState(false);
    const [showRetry, setShowRetry] = useState(false);

    const activeSessionRef = useRef(0);

    // ── Sync globalMuted → video element ──────────────────────────
    // This is the ONLY place video.muted is driven by globalMuted.
    // Flow: button click → onToggleMute() → VideoFeed flips
    // globalMuted state → this effect fires → video.muted updates.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        // Non-active videos are ALWAYS muted, no exceptions
        if (!isActive) {
            video.muted = true;
            return;
        }
        video.muted = globalMuted;
    }, [globalMuted, isActive]);

    // ── Offline / slow connection detection ───────────────────────
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

    // ── Retry button after 15s buffering ──────────────────────────
    useEffect(() => {
        if (!isActive) {
            setShowRetry(false);
            return;
        }
        const timer = setTimeout(() => {
            if (isBuffering || showInitialLoading) setShowRetry(true);
        }, 15000);
        return () => clearTimeout(timer);
    }, [isActive, isBuffering, showInitialLoading]);

    // ── Tap handler — ONLY play/pause, never mute ─────────────────
    const handleVideoTap = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        // While black loading screen is visible, ignore all taps
        if (showInitialLoading) return;

        if (video.paused) {
            userPausedRef.current = false;
            video
                .play()
                .then(() => setIsPaused(false))
                .catch(() => { });
        } else {
            userPausedRef.current = true;
            video.pause();
            setIsPaused(true);
            setShowTapIcon(true);
            setTimeout(() => setShowTapIcon(false), 1000);
        }
    }, [showInitialLoading]);

    // ── Mute button handler ───────────────────────────────────────
    // stopPropagation prevents the click from reaching handleVideoTap
    // (which would toggle play/pause unintentionally).
    const handleMuteClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleMute();
        },
        [onToggleMute],
    );

    // ── Active / inactive state ───────────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        activeSessionRef.current += 1;
        const mySession = activeSessionRef.current;
        const isCurrentSession = () => mySession === activeSessionRef.current;

        // Point 2 & 5: Immediate synchronous closure
        if (!isActive || forceStop) {
            video.muted = true;
            try { video.pause(); } catch { }
            setIsPaused(false);
            
            // Point 2: Stop loading if not adjacent
            if (hlsRef.current && !isAdjacent) {
                hlsRef.current.stopLoad();
            }

            if (!isAdjacent) {
                setIsBuffering(true);
                setShowInitialLoading(true);
            }
            userPausedRef.current = false;

            // Point 5: Explicit synchronous cleanup
            return () => {
                if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.muted = true;
                }
            };
        }

        // --- isActive === true && !forceStop ---
        userPausedRef.current = false;
        setShowInitialLoading(true);
        setIsBuffering(true);
        const loadingStart = performance.now();
        
        // Point 2: Call hls.startLoad() if needed
        if (hlsRef.current) {
            hlsRef.current.startLoad();
        }

        const attemptPlay = async (retryCount = 0) => {
            if (!isCurrentSession()) return;
            const vid = videoRef.current;
            if (!vid) return;
            if (userPausedRef.current) return;

            try {
                // Point 2: Set muted state before play
                vid.muted = globalMuted;

                if (vid.readyState < 2) {
                    await new Promise<void>(resolve => {
                        const onCanPlay = () => {
                            vid.removeEventListener('canplay', onCanPlay);
                            resolve();
                        };
                        vid.addEventListener('canplay', onCanPlay);
                        setTimeout(resolve, 2500);
                    });
                }

                if (!isCurrentSession() || userPausedRef.current) return;

                const elapsed = performance.now() - loadingStart;
                const extraDelay = Math.max(0, MIN_LOADING_MS - elapsed);
                if (extraDelay > 0) {
                    await new Promise(res => setTimeout(res, extraDelay));
                }

                // Point 2: Call video.play()
                if (forceStop) return;
                await vid.play();

                if (!isCurrentSession()) {
                    vid.muted = true;
                    try { vid.pause(); } catch { }
                    return;
                }

                // Recalibrate mute state post-play
                vid.muted = globalMuted;

                setIsPaused(false);
                setShowInitialLoading(false);
            } catch (err: any) {
                if (!isCurrentSession()) return;
                if (err?.name === 'AbortError') return;

                if (retryCount < 2) {
                    setTimeout(() => attemptPlay(retryCount + 1), 400);
                } else {
                    if (videoRef.current) videoRef.current.muted = true;
                }
            }
        };

        attemptPlay();

        const timer = setTimeout(() => {
            if (isCurrentSession()) setShowInitialLoading(false);
        }, MIN_LOADING_MS * 2);

        return () => {
            clearTimeout(timer);
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.muted = true;
            }
        };
    }, [isActive, isAdjacent, userHasInteracted, forceStop]);

    // ── Auto-unmute when userHasInteracted first fires ────────────
    useEffect(() => {
        if (!userHasInteracted || !isActive || globalMuted) return;
        const video = videoRef.current;
        if (!video) return;

        const capturedSession = activeSessionRef.current;
        setTimeout(() => {
            if (activeSessionRef.current !== capturedSession) return;
            if (!isActive) return;
            const vid = videoRef.current;
            if (!vid || vid.paused || userPausedRef.current) return;
            vid.muted = false;
        }, 80);
    }, [userHasInteracted, isActive, globalMuted]);

    // ── Video src / HLS init ──────────────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !cloudinaryUrl || (!isActive && !isAdjacent)) return;

        // Always enforce mute on non-active videos
        if (!isActive) {
            video.muted = true;
        }

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
                    }
                });
            } else {
                video.src = optimizedMp4;
                video.load();
            }
        }
    }, [cloudinaryUrl, isActive, isAdjacent]);

    // ── Unmount cleanup ───────────────────────────────────────────
    useEffect(() => {
        return () => {
            const video = videoRef.current;
            if (hlsRef.current) {
                try { hlsRef.current.destroy(); } catch { }
                hlsRef.current = null;
            }
            if (video) {
                try { video.pause(); } catch { }
                video.removeAttribute('src');
                video.load();
            }
        };
    }, []);

    // ── Loading too long hint ─────────────────────────────────────
    useEffect(() => {
        if (!isActive) {
            setLoadingTooLong(false);
            return;
        }
        const timer = setTimeout(() => {
            if (isBuffering || showInitialLoading) setLoadingTooLong(true);
        }, 8000);
        return () => clearTimeout(timer);
    }, [isActive, isBuffering, showInitialLoading]);

    // ── Stall detection / MP4 fallback ───────────────────────────
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
            if (stallCount < 2) return;
            stallCount = 0;

            fallbackAttempts++;
            if (fallbackAttempts > MAX_FALLBACK) return;

            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }

            video.src =
                fallbackAttempts === MAX_FALLBACK
                    ? cloudinaryUrl.replace('/upload/', '/upload/q_auto,f_auto,br_1m/')
                    : optimizedMp4;
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
            {/* Black loading overlay + spinner */}
            {(showInitialLoading || isBuffering) && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 2,
                        background: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            border: '3px solid rgba(255,255,255,0.2)',
                            borderTop: '3px solid #fff',
                            animation: 'spin 0.75s linear infinite',
                        }}
                    />
                </div>
            )}

            {loadingTooLong && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '200px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.7)',
                        borderRadius: '20px',
                        padding: '8px 16px',
                        zIndex: 15,
                        color: 'white',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Slow connection — loading...
                </div>
            )}

            {showRetry && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '160px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 15,
                    }}
                >
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            const video = videoRef.current;
                            if (!video) return;
                            setShowRetry(false);
                            setShowInitialLoading(true);
                            setIsBuffering(true);
                            video.load();
                            video.play().catch(() => { });
                        }}
                        style={{
                            background: '#FF0069',
                            border: 'none',
                            color: '#fff',
                            padding: '10px 24px',
                            borderRadius: 999,
                            fontSize: 13,
                            fontFamily: 'Poppins',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        ↺ Tap to retry
                    </button>
                </div>
            )}

            {/* Play/pause icon overlay */}
            {(isPaused || showTapIcon) && !showInitialLoading && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.55)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {isPaused ? (
                            <div
                                style={{
                                    width: 0,
                                    height: 0,
                                    borderTop: '10px solid transparent',
                                    borderBottom: '10px solid transparent',
                                    borderLeft: '18px solid white',
                                    marginLeft: '4px',
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <div style={{ width: '4px', height: '18px', background: 'white', borderRadius: '2px' }} />
                                <div style={{ width: '4px', height: '18px', background: 'white', borderRadius: '2px' }} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Video element */}
            <video
                ref={videoRef}
                poster={thumbnailUrl}
                playsInline
                loop
                preload={isActive || isAdjacent ? 'auto' : 'none'}
                onCanPlay={() => {
                    setIsBuffering(false);
                    setShowInitialLoading(false);
                }}
                onWaiting={() => {
                    if (isActive) setIsBuffering(true);
                }}
                onPlaying={() => setIsBuffering(false)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    background: '#000',
                }}
            />

            {isOffline && (
                <div
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.85)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontFamily: 'DM Sans',
                        fontWeight: 600,
                        zIndex: 30,
                        whiteSpace: 'nowrap',
                    }}
                >
                    📶 You&apos;re offline
                </div>
            )}

            {isSlowConnection && (isBuffering || showInitialLoading) && (
                <div
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(180,120,0,0.9)',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontFamily: 'DM Sans',
                        fontWeight: 600,
                        zIndex: 30,
                        whiteSpace: 'nowrap',
                    }}
                >
                    ⚡ Slow connection — buffering
                </div>
            )}

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
});

export { ReelPlayer };