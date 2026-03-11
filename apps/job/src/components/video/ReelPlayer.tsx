'use client'
import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface ReelPlayerProps {
    cloudinaryUrl: string
    thumbnailUrl?: string
    isActive: boolean
    isAdjacent: boolean // ±1 from active = prebuffer
    videoId: string
    isMuted: boolean
}

export default function ReelPlayer({
    cloudinaryUrl, thumbnailUrl, isActive, isAdjacent, videoId, isMuted
}: ReelPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const hlsRef = useRef<Hls | null>(null)
    const [isBuffering, setIsBuffering] = useState(true)
    const [isReady, setIsReady] = useState(false)

    // Convert Cloudinary URL to HLS streaming URL
    const getHlsUrl = (url: string): string => {
        if (!url) return ''
        if (url.includes('cloudinary.com') && !url.includes('.m3u8')) {
            // Transform Cloudinary URL to HLS format:
            // Replace /upload/ with /upload/sp_hd/ and change extension to .m3u8
            return url
                .replace('/upload/', '/upload/sp_hd/')
                .replace(/\.(mp4|mov|webm|avi)$/i, '.m3u8')
        }
        return url // already HLS or other
    }

    // Fallback optimized MP4 URL (if HLS not available)
    const getOptimizedMp4 = (url: string): string => {
        if (!url || !url.includes('cloudinary.com')) return url
        return url.replace('/upload/', '/upload/q_auto,f_auto/')
    }

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isActive) return;

        // Try HLS first
        const hlsUrl = getHlsUrl(cloudinaryUrl);
        const mp4Url = getOptimizedMp4(cloudinaryUrl);

        // Safety timeout: if video hasn't started in 4s, force MP4
        const fallbackTimer = setTimeout(() => {
            if (video.readyState < 2) { // HAVE_CURRENT_DATA = 2
                console.log('HLS timeout — falling back to MP4');
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                }
                video.src = mp4Url;
                video.load();
                video.play().catch(() => { });
            }
        }, 4000);

        return () => clearTimeout(fallbackTimer);
    }, [isActive, cloudinaryUrl]);

    // Cleanup previous HLS instance & Initial Load
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (!isActive && !isAdjacent) return; // don't load far videos

        const hlsUrl = getHlsUrl(cloudinaryUrl);
        const mp4Url = getOptimizedMp4(cloudinaryUrl);

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (Hls.isSupported() && hlsUrl.includes('.m3u8')) {
            const hls = new Hls({
                maxBufferLength: isActive ? 30 : 8,
                maxMaxBufferLength: isActive ? 60 : 15,
                maxBufferSize: isActive ? 60 * 1000 * 1000 : 10 * 1000 * 1000,
                startLevel: -1,
                abrEwmaDefaultEstimate: 500000,
                manifestLoadingTimeOut: 8000,
                manifestLoadingMaxRetry: 3,
                levelLoadingTimeOut: 8000,
                lowLatencyMode: false,
                backBufferLength: 5,
            });

            hls.loadSource(hlsUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setIsReady(true);
                if (isActive) video.play().catch(() => { });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    hls.destroy();
                    video.src = mp4Url;
                    video.load();
                    if (isActive) video.play().catch(() => { });
                }
            });

            hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            video.load();
            if (isActive) video.play().catch(() => { });
            setIsReady(true);
        } else {
            video.src = mp4Url;
            video.load();
            if (isActive) video.play().catch(() => { });
            setIsReady(true);
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [cloudinaryUrl, isActive, isAdjacent]);

    // Play/pause based on active state
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isReady) return;
        if (isActive) {
            video.play().catch(() => { });
        } else {
            video.pause();
            if (!isAdjacent) video.currentTime = 0;
        }
    }, [isActive, isReady, isAdjacent]);

    // Mute control
    useEffect(() => {
        if (videoRef.current) videoRef.current.muted = isMuted;
    }, [isMuted]);

    return (
        <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
            {(isBuffering || !isReady) && thumbnailUrl && (
                <img
                    src={thumbnailUrl}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                />
            )}

            {isActive && isBuffering && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.25)', borderTop: '3px solid rgba(255,255,255,0.9)', animation: 'spin 0.75s linear infinite' }} />
                </div>
            )}

            <video
                ref={videoRef}
                poster={thumbnailUrl}
                playsInline
                muted={isMuted}
                loop
                preload={isActive ? 'auto' : isAdjacent ? 'metadata' : 'none'}
                onCanPlay={() => setIsBuffering(false)}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
        </div>
    );
}
