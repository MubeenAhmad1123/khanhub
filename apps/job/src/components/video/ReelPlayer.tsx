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
        const video = videoRef.current
        if (!video) return
        if (!isActive && !isAdjacent) return // don't load far videos

        const hlsUrl = getHlsUrl(cloudinaryUrl)
        const mp4Url = getOptimizedMp4(cloudinaryUrl)

        // Cleanup previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy()
            hlsRef.current = null
        }

        if (Hls.isSupported() && hlsUrl.includes('.m3u8')) {
            // HLS path — full ABR streaming
            const hls = new Hls({
                // Aggressive preloading config:
                maxBufferLength: isActive ? 30 : 8,        // buffer 30s for active, 8s for adjacent
                maxMaxBufferLength: isActive ? 60 : 15,
                maxBufferSize: isActive ? 60 * 1000 * 1000 : 10 * 1000 * 1000, // 60MB active, 10MB adjacent
                startLevel: -1,           // auto quality selection
                abrEwmaDefaultEstimate: 500000, // assume 500kbps default (Pakistan networks)

                // Faster start:
                manifestLoadingTimeOut: 8000,
                manifestLoadingMaxRetry: 3,
                levelLoadingTimeOut: 8000,

                // Low latency start:
                lowLatencyMode: false,
                backBufferLength: 5,
            })

            hls.loadSource(hlsUrl)
            hls.attachMedia(video)

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setIsReady(true)
                if (isActive) {
                    video.play().catch(() => { })
                }
            })

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    // HLS failed — fallback to plain MP4
                    hls.destroy()
                    video.src = mp4Url
                    video.load()
                    if (isActive) video.play().catch(() => { })
                }
            })

            hlsRef.current = hls

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS support
            video.src = hlsUrl
            video.load()
            if (isActive) video.play().catch(() => { })
            setIsReady(true)

        } else {
            // Fallback: optimized MP4
            video.src = mp4Url
            video.load()
            if (isActive) video.play().catch(() => { })
            setIsReady(true)
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy()
                hlsRef.current = null
            }
        }
    }, [cloudinaryUrl, isActive, isAdjacent])

    // Play/pause based on active state
    useEffect(() => {
        const video = videoRef.current
        if (!video || !isReady) return
        if (isActive) {
            video.play().catch(() => { })
        } else {
            video.pause()
            if (!isAdjacent) {
                video.currentTime = 0 // reset far videos
            }
        }
    }, [isActive, isReady])

    // Mute control
    useEffect(() => {
        if (videoRef.current) videoRef.current.muted = isMuted
    }, [isMuted])

    return (
        <div style={{ position: 'absolute', inset: 0, background: '#000' }}>

            {/* Thumbnail shown while buffering */}
            {(isBuffering || !isReady) && thumbnailUrl && (
                <img
                    src={thumbnailUrl}
                    alt=""
                    style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover', zIndex: 1
                    }}
                />
            )}

            {/* Loading spinner over thumbnail */}
            {isActive && isBuffering && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.25)',
                        borderTop: '3px solid rgba(255,255,255,0.9)',
                        animation: 'spin 0.75s linear infinite'
                    }} />
                </div>
            )}

            {/* The actual video */}
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
                    width: '100%', height: '100%',
                    objectFit: 'cover'
                }}
            />
        </div>
    )
}
