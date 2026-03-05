'use client';

import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { db } from '@/lib/firebase/firebase-config';
import { doc, getDoc } from 'firebase/firestore';

interface SavedGridProps {
    savedIds: string[];
    onVideoTap?: (index: number) => void;
}

export default function SavedGrid({ savedIds, onVideoTap }: SavedGridProps) {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const formatCount = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return String(n || 0);
    };

    useEffect(() => {
        async function fetchSavedVideos() {
            if (!savedIds || savedIds.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const videoPromises = savedIds.map(id => getDoc(doc(db, 'reels', id)));
                const snaps = await Promise.all(videoPromises);
                const vids = snaps
                    .filter(s => s.exists())
                    .map(s => ({ id: s.id, ...s.data() }));
                setVideos(vids);
            } catch (error) {
                console.error('Error fetching saved videos:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchSavedVideos();
    }, [savedIds]);

    if (loading) {
        return (
            <div className="grid grid-cols-3 gap-1 px-1 py-6">
                {[1, 2, 3].map((n) => (
                    <div key={n} className="aspect-[9/16] bg-[#0d0d0d] animate-pulse rounded-sm" />
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
                    className="relative aspect-[9/16] bg-[#0d0d0d] overflow-hidden group cursor-pointer"
                    onClick={() => onVideoTap?.(index)}
                >
                    <img
                        src={`https://img.youtube.com/vi/${vid.videoId}/mqdefault.jpg`}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all"
                    />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white z-10">
                        <Play size={10} fill="white" />
                        <span className="text-[10px] font-bold">{formatCount(vid.views)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
