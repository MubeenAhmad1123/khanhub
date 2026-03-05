'use client';

import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

interface VideosGridProps {
    uid: string;
}

export default function VideosGrid({ uid }: VideosGridProps) {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchVideos() {
            if (!uid) return;
            try {
                const q = query(
                    collection(db, 'reels'),
                    where('creatorId', '==', uid),
                    orderBy('createdAt', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const vids = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setVideos(vids);
            } catch (error) {
                console.error('Error fetching user videos:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchVideos();
    }, [uid]);

    if (loading) {
        return (
            <div className="grid grid-cols-3 gap-1 px-1 py-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="aspect-[9/16] bg-[#0d0d0d] animate-pulse rounded-sm" />
                ))}
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className="py-20 text-center">
                <p className="text-sm text-[--text-muted] font-bold uppercase tracking-widest">No videos posted yet</p>
                <button className="mt-4 text-[#FF0069] text-xs font-black uppercase tracking-widest hover:underline">
                    Upload Your First Reel →
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-1 px-1 py-6">
            {videos.map((vid) => (
                <div key={vid.id} className="relative aspect-[9/16] bg-[#0d0d0d] overflow-hidden group cursor-pointer group">
                    <video
                        src={vid.videoUrl}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all"
                        muted
                        playsInline
                    />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white">
                        <Play size={10} fill="white" />
                        <span className="text-[10px] font-bold">1.2k</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
