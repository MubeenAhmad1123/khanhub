'use client';

import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface SavedGridProps {
    savedIds: string[];
    onVideoTap?: (index: number) => void;
}

const getThumbnail = (video: any): string => {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (video.cloudinaryUrl) {
        return video.cloudinaryUrl
            .replace('/upload/', '/upload/so_0,w_400,h_711,c_fill,q_70/')
            .replace(/\.(mp4|webm|mov)$/i, '.jpg');
    }
    const ytId = video.youtubeId || video.videoId;
    if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    return '';
};

const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n || 0);
};

export default function SavedGrid({ savedIds, onVideoTap }: SavedGridProps) {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!savedIds || savedIds.length === 0) {
            setLoading(false);
            return;
        }

        // Filter out placeholder IDs
        const realIds = savedIds.filter((id: string) =>
            !id.startsWith('placeholder') && !id.startsWith('manual_') && id.length >= 10
        );

        if (realIds.length === 0) {
            setLoading(false);
            return;
        }

        // Batch fetch — Firestore 'in' supports max 10 per query
        const chunks: string[][] = [];
        for (let i = 0; i < realIds.length; i += 10) {
            chunks.push(realIds.slice(i, i + 10));
        }

        Promise.all(chunks.map(chunk =>
            getDocs(query(collection(db, 'videos'), where('__name__', 'in', chunk)))
        )).then(results => {
            const all = results.flatMap(snap =>
                snap.docs.map(d => ({ id: d.id, ...d.data() }))
            );
            setVideos(all);
        }).catch(err => {
            console.error('Error fetching saved videos:', err);
        }).finally(() => {
            setLoading(false);
        });
    }, [savedIds]);

    if (loading) {
        return (
            <div className="grid grid-cols-3 gap-1 px-1 py-6">
                {[1, 2, 3].map((n) => (
                    <div key={n} className="aspect-[9/16] bg-[#F0F0F0] animate-pulse rounded-sm" />
                ))}
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#555' }}>
                <p style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    No saved videos yet
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-1 px-1 py-6">
            {videos.map((vid, index) => (
                <div
                    key={vid.id}
                    className="relative aspect-[9/16] bg-[#F0F0F0] overflow-hidden group cursor-pointer"
                    onClick={() => onVideoTap?.(index)}
                >
                    <img
                        src={getThumbnail(vid)}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all"
                        onError={e => (e.currentTarget.style.display = 'none')}
                    />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white z-10">
                        <Play size={10} fill="white" />
                        <span className="text-[10px] font-bold">{formatCount(vid.views || 0)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
