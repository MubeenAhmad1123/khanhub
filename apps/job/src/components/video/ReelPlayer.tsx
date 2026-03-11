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
}

export default function ReelPlayer({ cloudinaryUrl, thumbnailUrl, isActive, isAdjacent, videoId }: ReelPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [showPauseIcon, setShowPauseIcon] = useState(false);
    const [loadingTooLong, setLoadingTooLong] = useState(false);

    // Tap handler — toggle pause/play
    const handleTap = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play().catch(() => { });
            setIsPaused(false);
            setShowPauseIcon(false);
        } else {
            video.pause();
            setIsPaused(true);
            setShowPauseIcon(true);
            setTimeout(() => setShowPauseIcon(false), 1200);
        }
    }, []);

    // Mute toggle — separate button
    const handleMuteToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(video.muted);
    }, []);

    // Main control for isActive
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isActive) {
            video.muted = false;
            setIsMuted(false);
            video.play().catch(() => {
                video.muted = true;
                setIsMuted(true);
                video.play().catch(() => { });
            });
            setIsPaused(false);
        } else {
            video.pause();
            video.currentTime = 0;
            if (hlsRef.current) hlsRef.current.stopLoad();
        }
    }, [isActive]);

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
            onClick={handleTap}
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

            {/* Tap Feedback Icon */}
            {showPauseIcon && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'fadeOut 1.2s ease forwards',
                    }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <div style={{ width: '5px', height: '22px', background: '#fff', borderRadius: '2px' }} />
                            <div style={{ width: '5px', height: '22px', background: '#fff', borderRadius: '2px' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Persistent Play Icon when paused */}
            {isPaused && !showPauseIcon && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{
                            width: 0, height: 0,
                            borderTop: '12px solid transparent',
                            borderBottom: '12px solid transparent',
                            borderLeft: '20px solid white',
                            marginLeft: '4px',
                        }} />
                    </div>
                </div>
            )}

            {/* Mute Toggle */}
            <button
                onClick={handleMuteToggle}
                style={{
                    position: 'absolute',
                    bottom: '120px',
                    right: '16px',
                    zIndex: 20,
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none', borderRadius: '50%',
                    width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white', fontSize: '16px',
                }}
            >
                {isMuted ? '🔇' : '🔊'}
            </button>

            <video
                ref={videoRef}
                playsInline
                loop
                muted={isMuted}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => { setIsBuffering(false); setIsPaused(false); }}
                onCanPlay={() => setIsBuffering(false)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                }}
            />
        </div>
    );
}
