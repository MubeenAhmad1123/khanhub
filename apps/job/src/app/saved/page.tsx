'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase/firebase-config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { TopBar } from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import { useRouter } from 'next/navigation';
import { Bookmark, Play, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface VideoItem {
    id: string;
    cloudinaryUrl: string;
    title: string;
    role: string;
    views: number;
    overlayData?: any;
}

export default function SavedVideosPage() {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && user) {
            setLoading(true);
            fetchSavedVideos(user.uid);
        }
    }, [user, authLoading]);

    const fetchSavedVideos = async (uid: string) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (!userDoc.exists()) {
                setLoading(false);
                return;
            }

            const savedIds = userDoc.data().savedVideos || [];
            if (savedIds.length === 0) {
                setVideos([]);
                setLoading(false);
                return;
            }

            // Fetch video details in chunks (Firestore 'in' query limit is 10/30 depending on version, but 10 is safe)
            const fetchedVideos: VideoItem[] = [];
            for (let i = 0; i < savedIds.length; i += 10) {
                const chunk = savedIds.slice(i, i + 10);
                const q = query(collection(db, 'videos'), where('__name__', 'in', chunk));
                const snap = await getDocs(q);
                snap.docs.forEach(d => {
                    fetchedVideos.push({ id: d.id, ...d.data() } as VideoItem);
                });
            }

            setVideos(fetchedVideos);
        } catch (error) {
            console.error('Error fetching saved videos:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCloudinaryThumbnail = (videoUrl: string): string => {
        if (!videoUrl) return '';
        if (!videoUrl.includes('cloudinary.com')) return videoUrl;
        return videoUrl
            .replace('/video/upload/', '/video/upload/so_0,w_400,h_711,c_fill,q_80/')
            .replace('.mp4', '.jpg')
            .replace('.webm', '.jpg')
            .replace('.mov', '.jpg');
    };

    const formatCount = (n: number) => {
        if (!n) return '0';
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return String(n);
    };

    const openFeedAtVideo = (videoId: string) => {
        sessionStorage.setItem('feed_start_video_id', videoId);
        sessionStorage.setItem('feed_source', 'saved');
        router.push('/feed');
    };

    if (authLoading || loading) {
        return (
            <div style={{
                height: '100dvh', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: '#fff'
            }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: '3px solid #eee', borderTop: '3px solid #FF0069',
                    animation: 'spin 0.75s linear infinite'
                }} />
                <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <Bookmark className="w-8 h-8 text-slate-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Login to see saved videos</h1>
                <p className="text-slate-500 mb-8 max-w-xs">Save your favorite connections and view them anytime.</p>
                <button
                    onClick={() => router.push('/auth/register?from=saved')}
                    className="px-8 py-3 bg-[--accent] text-white rounded-full font-bold shadow-lg"
                >
                    Sign Up Free
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-24">
            <div className="pt-0 px-4 max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-[--accent]/10 rounded-xl">
                        <Bookmark className="w-5 h-5 text-[--accent]" />
                    </div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter">KHAN HUB <span className="text-[--accent] opacity-50">/</span> SAVED</h1>
                </div>

                {videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                            <Bookmark className="w-10 h-10 text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-medium">No saved videos yet</p>
                        <p className="text-slate-300 text-sm mt-1">Tap the bookmark icon on any video to save it.</p>
                        <button
                            onClick={() => router.push('/feed')}
                            className="mt-8 text-[10px] font-black uppercase tracking-widest text-[--accent] border-b-2 border-[--accent] pb-1"
                        >
                            Browse Feed
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1 md:gap-2">
                        {videos.map((item) => (
                            <div
                                key={item.id}
                                className="relative aspect-[9/16] bg-slate-100 rounded-lg overflow-hidden cursor-pointer group"
                                onClick={() => openFeedAtVideo(item.id)}
                            >
                                <Image
                                    src={getCloudinaryThumbnail(item.cloudinaryUrl)}
                                    alt={item.title || 'Video thumbnail'}
                                    fill
                                    sizes="(max-width: 600px) 33vw, 200px"
                                    className="object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[8px] font-bold">
                                    <Play className="w-2 h-2 fill-white" />
                                    {formatCount(item.views)}
                                </div>

                                <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md p-1 rounded-md">
                                    <Bookmark className="w-3 h-3 text-white fill-white" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
