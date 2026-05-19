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
import { motion } from 'framer-motion';
import NextImage from 'next/image';
import { Volume2, VolumeX, Play, Pause, Maximize2, RotateCcw, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { getHlsUrl, getOptimizedVideoUrl } from '@/lib/services/cloudinary';

interface ReelPlayerProps {
    cloudinaryUrl: string;
    thumbnailUrl?: string;
    isActive: boolean;
    isAdjacent: boolean;
    videoId: string;
    userHasInteracted?: boolean;
    isMobileDevice?: boolean;
    globalMuted: boolean;
    onToggleMute: () => void;
    // Live ref from VideoFeed — always holds the currently active video ID.
    // Async code reads this to abort immediately when video changes.
    activeVideoIdRef: React.MutableRefObject<string>;
    onRegisterPause: (pauseFn: () => void) => void;
}

const MIN_LOADING_MS = 800;

const ReelPlayer = memo(function ReelPlayer({
    cloudinaryUrl,
    thumbnailUrl,
    isActive,
    isAdjacent,
    videoId,
    userHasInteracted,
    globalMuted,
    onToggleMute,
    activeVideoIdRef,
    onRegisterPause,
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
    const [hasShownUnmutePill, setHasShownUnmutePill] = useState(false);

    const activeSessionRef = useRef(0);

    // ── Sync globalMuted → video element ──────────────────────────
    // This is the ONLY place video.muted is driven by globalMuted.
    // Flow: button click → onToggleMute() → VideoFeed flips
    // globalMuted state → this effect fires → video.muted updates.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        // Non-active videos are ALWAYS muted — both JS property AND HTML attribute
        if (!isActive) {
            video.muted = true;
            video.setAttribute('muted', '');
            video.volume = 0;
            return;
        }
        // Active video: sync JS property. HTML attribute was removed in attemptPlay.
        video.muted = globalMuted;
        if (!globalMuted) {
            video.removeAttribute('muted');
            video.volume = 1;
        } else {
            video.setAttribute('muted', '');
            video.volume = 0;
        }
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

        // If loading has taken too long, allow tap to force-attempt play
        if (loadingTooLong && (showInitialLoading || isBuffering)) {
            setLoadingTooLong(false);
            setShowRetry(false);
            video.play()
                .then(() => {
                    setShowInitialLoading(false);
                    setIsBuffering(false);
                    setIsPaused(false);
                })
                .catch(() => {
                    setIsPaused(true);
                    setShowInitialLoading(false);
                    setIsBuffering(false);
                });
            return;
        }

        // While black loading screen is visible (and not timed out), ignore taps
        if (showInitialLoading && !loadingTooLong) return;

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
    }, [showInitialLoading, loadingTooLong, isBuffering]);

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

    // ── Register imperative pause function ────────────────────────
    useEffect(() => {
        onRegisterPause(() => {
            const video = videoRef.current;
            if (!video) return;
            try {
                video.pause();
                video.muted = true;
                video.setAttribute('muted', '');
                video.volume = 0;
            } catch (e) { }
            setIsPaused(true);
        });
    }, [onRegisterPause]);

    // ── Active / inactive state ───────────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        activeSessionRef.current += 1;
        const mySession = activeSessionRef.current;
        setHasShownUnmutePill(false);
        const isCurrentSession = () => mySession === activeSessionRef.current;

        // Point 2 & 5: Immediate synchronous closure
        if (!isActive) {
            video.muted = true;
            video.setAttribute('muted', '');
            video.volume = 0;
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

            // Explicit synchronous cleanup
            return () => {
                if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.muted = true;
                    videoRef.current.setAttribute('muted', '');
                    videoRef.current.volume = 0;
                }
            };
        }

        // --- isActive === true && !forceStop ---
        userPausedRef.current = false;
        const alreadyBuffered = !!video && video.readyState >= 3; // HAVE_FUTURE_DATA or better
        if (!alreadyBuffered) {
            setShowInitialLoading(true);
            setIsBuffering(true);
        }
        const loadingStart = performance.now();

        // Point 2: Call hls.startLoad() if needed
        if (hlsRef.current) {
            hlsRef.current.startLoad();
        }

        const attemptPlay = async (retryCount = 0) => {
            // Helper: am I still the intended active video RIGHT NOW?
            // Checks BOTH the session counter AND the live activeVideoIdRef.
            // activeVideoIdRef is updated synchronously on every scroll,
            // so this is immune to all closure-staleness race conditions.
            const isMine = () =>
                mySession === activeSessionRef.current &&
                activeVideoIdRef.current === videoId;

            if (!isMine()) return;
            const vid = videoRef.current;
            if (!vid) return;
            if (userPausedRef.current) return;

            try {
                if (!isMine()) return;

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

                // Re-check after async canplay wait
                if (!isMine() || userPausedRef.current) {
                    vid.muted = true;
                    vid.setAttribute('muted', '');
                    vid.volume = 0;
                    try { vid.pause(); } catch { }
                    return;
                }

                const elapsed = performance.now() - loadingStart;
                // Skip the artificial delay entirely if the video was already buffered
                const extraDelay = alreadyBuffered
                    ? 0
                    : Math.max(0, MIN_LOADING_MS - elapsed);
                if (extraDelay > 0) {
                    await new Promise(res => setTimeout(res, extraDelay));
                }

                // Re-check after MIN_LOADING_MS delay
                if (!isMine() || userPausedRef.current) {
                    vid.muted = true;
                    vid.setAttribute('muted', '');
                    vid.volume = 0;
                    try { vid.pause(); } catch { }
                    return;
                }

                // Play muted — the HTML attribute is still set.
                // iOS Safari will not produce audio while the attribute exists.
                await vid.play();

                if (!isMine()) {
                    vid.muted = true;
                    vid.setAttribute('muted', '');
                    vid.volume = 0;
                    try { vid.pause(); } catch { }
                    return;
                }

                setIsPaused(false);
                setShowInitialLoading(false);

                // Wait for the iOS audio pipeline start window (50-200ms).
                // Only after this are we sure no ghost audio will leak.
                await new Promise(res => setTimeout(res, 250));

                // Final ownership check after the audio-start delay
                if (!isMine()) {
                    vid.muted = true;
                    vid.setAttribute('muted', '');
                    vid.volume = 0;
                    try { vid.pause(); } catch { }
                    return;
                }

                // Confirmed owner — remove HTML muted attribute and set JS property.
                // Both must be done: attribute for iOS, property for all browsers.
                if (!globalMuted) {
                    vid.removeAttribute('muted');
                    vid.volume = 1;
                }
                vid.muted = globalMuted;
            } catch (err: any) {
                if (!isMine()) return;
                if (err?.name === 'AbortError') return;

                // NotAllowedError = browser blocked autoplay before user gesture.
                // Retrying will not help. Hide the loader and show tap-to-play icon
                // so the user knows to tap. handleVideoTap() will resume play inside
                // a user gesture handler, which the browser allows.
                if (err?.name === 'NotAllowedError') {
                    setShowInitialLoading(false);
                    setIsBuffering(false);
                    setIsPaused(true);
                    return;
                }

                if (retryCount < 2) {
                    setTimeout(() => attemptPlay(retryCount + 1), 400);
                } else {
                    // All retries exhausted — hide loader so user isn't stuck.
                    setShowInitialLoading(false);
                    setIsBuffering(false);
                    setIsPaused(true);
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
                videoRef.current.setAttribute('muted', '');
                videoRef.current.volume = 0;
            }
        };
    }, [isActive, isAdjacent, userHasInteracted, activeVideoIdRef, globalMuted, videoId]);

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
            vid.removeAttribute('muted');
            vid.muted = false;
            vid.volume = 1;
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
                    autoStartLoad: false,
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
        const video = videoRef.current;
        return () => {
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
        // Clear immediately when video has loaded
        if (!isBuffering && !showInitialLoading) {
            setLoadingTooLong(false);
            return;
        }
        const timer = setTimeout(() => {
            // Re-check at timeout — video may have loaded by then
            setLoadingTooLong(prev =>
                (isBuffering || showInitialLoading) ? true : prev
            );
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

            {loadingTooLong && !isSlowConnection && (
                <div
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 9000,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                        background: 'rgba(0,0,0,0.82)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 20,
                        padding: '22px 28px',
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        maxWidth: '260px',
                        textAlign: 'center',
                    }}
                >
                    <span style={{ fontSize: 28 }}>⏳</span>
                    <div style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 12, fontFamily: 'DM Sans', lineHeight: 1.4,
                    }}>
                        Taking longer than usual — still loading...
                    </div>
                    <div style={{
                        marginTop: 8,
                        background: '#FF0069',
                        color: '#fff',
                        fontSize: 12,
                        fontFamily: 'Poppins',
                        fontWeight: 700,
                        padding: '6px 16px',
                        borderRadius: 20,
                    }}>
                        Tap to play
                    </div>
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

            {/* Overlay 1: Tap to Unmute Pill */}
            {isActive && !isPaused && !isBuffering && !showInitialLoading && globalMuted && !hasShownUnmutePill && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleMute();
                        setHasShownUnmutePill(true);
                    }}
                    style={{
                        position: 'absolute',
                        bottom: '140px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 25,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '999px',
                        padding: '8px 14px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        userSelect: 'none',
                        animation: 'pillFadeIn 0.3s ease-out',
                        maxWidth: '90%',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <VolumeX size={16} color="#fff" />
                    <span
                        style={{
                            color: '#fff',
                            fontSize: '12px',
                            fontFamily: 'DM Sans, sans-serif',
                            fontWeight: 600,
                            letterSpacing: '0.2px',
                        }}
                    >
                        Tap to unmute
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setHasShownUnmutePill(true);
                        }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.5)',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            marginLeft: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontFamily: 'sans-serif',
                            fontWeight: 'bold',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Overlay 2: Tap to Play Full Overlay */}
            {isActive && isPaused && !showInitialLoading && !isBuffering && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 20,
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        animation: 'overlayFadeIn 0.3s ease-out',
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: 'rgba(255, 0, 105, 0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(255, 0, 105, 0.6)',
                            animation: 'pulse 2s infinite',
                        }}
                    >
                        <Play size={32} color="#fff" fill="#fff" style={{ marginLeft: '4px' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div
                            style={{
                                color: '#fff',
                                fontSize: '18px',
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 700,
                                textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                            }}
                        >
                            Tap to play
                        </div>
                        <div
                            style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '12px',
                                fontFamily: 'DM Sans, sans-serif',
                                marginTop: '4px',
                                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                            }}
                        >
                            Autoplay blocked by browser
                        </div>
                    </div>
                </div>
            )}

            {/* Video element — muted HTML attribute is PERMANENT.
                iOS Safari ignores JS .muted=true for buffered adjacent videos.
                Only the HTML attribute reliably prevents audio from starting.
                We call removeAttribute('muted') only after confirmed ownership. */}
            {/* Background Thumbnail with blur during loading */}
            {thumbnailUrl && (showInitialLoading || isBuffering) && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                    <NextImage
                        src={thumbnailUrl}
                        alt="Video Thumbnail"
                        fill
                        style={{ objectFit: 'cover', filter: 'blur(20px) brightness(0.6)', transform: 'scale(1.1)' }}
                    />
                </div>
            )}

            {/* Video element */}
            <motion.video
                ref={videoRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: (showInitialLoading || isBuffering) ? 0 : 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                poster={thumbnailUrl}
                playsInline
                muted
                loop
                preload="none"
                onCanPlay={() => {
                    if (isActive) {
                        setIsBuffering(false);
                        setShowInitialLoading(false);
                    }
                }}
                onWaiting={() => {
                    if (isActive) setIsBuffering(true);
                }}
                onPlaying={() => {
                    if (isActive) setIsBuffering(false);
                }}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    background: '#000',
                    zIndex: 2
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
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 9000,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 12,
                        background: 'rgba(0,0,0,0.82)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 20,
                        padding: '24px 32px',
                        pointerEvents: 'none',
                        maxWidth: '260px',
                        textAlign: 'center',
                    }}
                >
                    <span style={{ fontSize: 32 }}>📶</span>
                    <div>
                        <div style={{
                            color: '#fff', fontSize: 14,
                            fontFamily: 'Poppins', fontWeight: 700,
                            marginBottom: 4,
                        }}>
                            Slow Connection
                        </div>
                        <div style={{
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: 12, fontFamily: 'DM Sans',
                            lineHeight: 1.4,
                        }}>
                            Video is loading — tap anywhere to play when ready
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pillFadeIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 0, 105, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 16px rgba(255, 0, 105, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 0, 105, 0);
          }
        }
      `}</style>
        </div>
    );
});

export { ReelPlayer };