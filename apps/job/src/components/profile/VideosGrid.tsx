'use client';

import React, { useEffect, useState } from 'react';
import { Play, Video, Clock } from 'lucide-react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface VideosGridProps {
    uid: string;
    onVideoTap?: (index: number) => void;
}

export default function VideosGrid({ uid, onVideoTap }: VideosGridProps) {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const openVideoInFeed = (videoIndex: number, videoId: string) => {
        sessionStorage.setItem('feed_start_index', String(videoIndex));
        sessionStorage.setItem('feed_source', 'profile');
        sessionStorage.setItem('feed_video_id', videoId);
        router.push('/feed');
    };

    useEffect(() => {
        if (!uid) return;

        // Query the 'videos' collection filtering by userId (not 'reels' / 'creatorId')
        // Show ALL videos the user uploaded, including pending, so they can see their content
        const q = query(
            collection(db, 'videos'),
            where('userId', '==', uid)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const vids = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                // sort newest first client-side (avoids composite index requirement)
                .sort((a: any, b: any) => {
                    const ta = a.createdAt?.seconds || 0;
                    const tb = b.createdAt?.seconds || 0;
                    return tb - ta;
                });
            setVideos(vids);
            setLoading(false);
        }, (error) => {
            console.warn('[VideosGrid] Snapshot error:', error.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [uid]);

    const formatCount = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return String(n || 0);
    };

    const getThumbnail = (vid: any): string => {
        if (vid.cloudinaryUrl) {
            // Generate Cloudinary thumbnail from video URL
            return vid.cloudinaryUrl.replace('/upload/', '/upload/so_0,w_400,h_600,c_fill/');
        }
        if (vid.thumbnailUrl) return vid.thumbnailUrl;
        if (vid.videoId) return `https://img.youtube.com/vi/${vid.videoId}/mqdefault.jpg`;
        return '';
    };

    const getStatusBadge = (status: string) => {
        if (status === 'approved') return { text: '✓', color: '#00C864' };
        if (status === 'pending') return { text: '⏳', color: '#FFB800' };
        if (status === 'rejected') return { text: '✕', color: '#FF4444' };
        return null;
    };

    if (loading) {
        return (
            <div className="grid grid-cols-3 gap-1 px-1 py-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="aspect-[9/16] bg-[#0d0d0d] animate-pulse rounded-sm" />
                ))}
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: '#111', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', margin: '0 auto 16px',
                }}>
                    <Video size={32} color="#444" />
                </div>
                <p style={{ color: '#444', fontFamily: 'Poppins', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                    No videos yet
                </p>
                <p style={{ color: '#333', fontFamily: 'DM Sans', fontSize: 12 }}>
                    Upload your first video to get discovered
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-[2px] py-2">
            {videos.map((vid, index) => {
                const badge = getStatusBadge(vid.admin_status);
                const thumb = getThumbnail(vid);

                return (
                    <div
                        key={vid.id}
                        className="relative overflow-hidden group cursor-pointer bg-[#0d0d0d]"
                        style={{ aspectRatio: '9/16' }}
                        onClick={() => openVideoInFeed(index, vid.id)}
                    >
                        {thumb ? (
                            <img
                                src={thumb}
                                alt={vid.overlayData?.title || 'Video'}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            /* Fallback when no thumbnail available yet */
                            <div style={{
                                width: '100%', height: '100%',
                                background: 'linear-gradient(135deg, #111, #1a1a1a)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Video size={24} color="#333" />
                            </div>
                        )}

                        {/* Dark gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                        {/* Views count */}
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white z-10">
                            <Play size={10} fill="white" />
                            <span className="text-[10px] font-bold">{formatCount(vid.views || 0)}</span>
                        </div>

                        {/* Status badge */}
                        {vid.admin_status === 'pending' && (
                            <div style={{
                                position: 'absolute', top: 6, left: 6,
                                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                                color: '#fff', fontSize: 8, fontWeight: 900,
                                padding: '2px 6px', borderRadius: 4,
                                zIndex: 10, border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', gap: 3
                            }}>
                                <Clock size={8} /> PENDING
                            </div>
                        )}
                        {vid.admin_status === 'approved' && (
                            <div style={{
                                position: 'absolute', top: 6, right: 6,
                                width: 18, height: 18, borderRadius: '50%',
                                background: 'rgba(0,200,100,0.8)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, color: '#fff', zIndex: 10
                            }}>
                                ✓
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
