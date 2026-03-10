'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORY_PLACEHOLDERS, PLACEHOLDER_OVERLAY_DATA } from '@/lib/categories';
import { Play } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

interface ExploreGridProps {
    category: string;
    searchQuery: string;
    filter: string;
}

interface VideoItem {
    id: string;
    isPlaceholder: boolean;
    cloudinaryUrl?: string;
    youtubeId?: string;
    title: string;
    badge: string;
    field1?: string;
    field2?: string;
    views: number;
}

export function ExploreGrid({ category, searchQuery, filter }: ExploreGridProps) {
    const router = useRouter();
    const [videos, setVideos] = useState<VideoItem[]>([]);

    useEffect(() => {
        // Simple single-field query — no composite index needed.
        // Category + admin_status filtering happens client-side.
        const q = query(
            collection(db, 'videos'),
            where('is_live', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const real = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(d =>
                    d.admin_status === 'approved' &&
                    (d.category === category || !d.category)
                )
                .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .slice(0, 50)
                .map((d: any): VideoItem => ({
                    id: d.id,
                    isPlaceholder: false,
                    cloudinaryUrl: d.cloudinaryUrl,
                    youtubeId: undefined,
                    title: d.overlayData?.title || d.title || '',
                    badge: d.overlayData?.badge || d.role || '',
                    field1: d.overlayData?.field1,
                    field2: d.overlayData?.field2,
                    views: d.views || 0,
                }));

            if (real.length > 0) {
                setVideos(real);
            } else {
                // Fallback: placeholders
                const safeCat = CATEGORY_PLACEHOLDERS[category] ? category : 'dailywages';
                const overlays = PLACEHOLDER_OVERLAY_DATA[safeCat] || [];
                setVideos(
                    CATEGORY_PLACEHOLDERS[safeCat].map((id, i): VideoItem => ({
                        id: `ph-${i}`,
                        isPlaceholder: true,
                        cloudinaryUrl: undefined,
                        youtubeId: id,
                        title: overlays[i % overlays.length]?.title || '',
                        badge: overlays[i % overlays.length]?.badge || '',
                        field1: overlays[i % overlays.length]?.field1,
                        field2: overlays[i % overlays.length]?.field2,
                        views: overlays[i % overlays.length]?.views || 0,
                    }))
                );
            }
        }, () => {
            // Index error or permission error → show placeholders
            const safeCat = CATEGORY_PLACEHOLDERS[category] ? category : 'dailywages';
            const overlays = PLACEHOLDER_OVERLAY_DATA[safeCat] || [];
            setVideos(
                CATEGORY_PLACEHOLDERS[safeCat].map((id, i): VideoItem => ({
                    id: `ph-${i}`,
                    isPlaceholder: true,
                    cloudinaryUrl: undefined,
                    youtubeId: id,
                    title: overlays[i % overlays.length]?.title || '',
                    badge: overlays[i % overlays.length]?.badge || '',
                    field1: overlays[i % overlays.length]?.field1,
                    field2: overlays[i % overlays.length]?.field2,
                    views: overlays[i % overlays.length]?.views || 0,
                }))
            );
        });

        return () => unsubscribe();
    }, [category]);

    // ── Thumbnail helper ──────────────────────────────────────────
    const getCloudinaryThumbnail = (videoUrl: string): string => {
        if (!videoUrl) return '';
        if (!videoUrl.includes('cloudinary.com')) return videoUrl;
        return videoUrl
            .replace('/video/upload/', '/video/upload/so_0,w_400,h_711,c_fill,q_80/')
            .replace('.mp4', '.jpg')
            .replace('.webm', '.jpg')
            .replace('.mov', '.jpg');
    };

    const getThumbnail = (item: VideoItem): string => {
        if (!item.isPlaceholder && item.cloudinaryUrl) {
            return getCloudinaryThumbnail(item.cloudinaryUrl);
        }
        return `https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`;
    };

    // ── Filter ────────────────────────────────────────────────────
    const providerBadges = ['Doctor', 'Teacher', 'Agent', 'Freelancer', 'Job Seeker', 'Helper', 'Lawyer', 'Profile'];
    const seekerBadges = ['Patient', 'Student', 'Buyer / Renter', 'Client', 'Company', 'Household', 'Hiring', 'Seeking', 'Looking'];

    const filteredItems = videos.filter(item => {
        const matchesSearch =
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.badge.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesFilter = true;
        if (filter === 'Provider') matchesFilter = providerBadges.includes(item.badge);
        else if (filter === 'Seeker') matchesFilter = seekerBadges.includes(item.badge);

        return matchesSearch && matchesFilter;
    });

    const openFeedAtIndex = (index: number) => {
        sessionStorage.setItem('feed_start_index', String(index));
        sessionStorage.setItem('feed_source', 'explore');
        router.push('/feed');
    };

    const formatCount = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return String(n);
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px',
            maxWidth: 935,
            margin: '0 auto',
            padding: '0 0 80px',
        }}>
            {filteredItems.map((item, i) => (
                <div
                    key={item.id}
                    className="relative aspect-square overflow-hidden cursor-pointer bg-slate-100 group"
                    onClick={() => openFeedAtIndex(i)}
                >
                    <img
                        src={getThumbnail(item)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x600/ffffff/000000?text=Video`;
                        }}
                    />

                    {/* View count bottom left */}
                    <div style={{
                        position: 'absolute', bottom: 4, left: 4,
                        color: '#fff',
                        fontSize: '10px', padding: '2px 4px',
                        fontFamily: 'DM Sans', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '2px', zIndex: 10,
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                        <Play className="w-2.5 h-2.5 fill-white" />
                        {formatCount(item.views)}
                    </div>
                </div>
            ))}
        </div>
    );
}
