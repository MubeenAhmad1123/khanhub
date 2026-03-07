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
                const overlays = PLACEHOLDER_OVERLAY_DATA[category] || [];
                setVideos(
                    CATEGORY_PLACEHOLDERS[category].map((id, i): VideoItem => ({
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
            const overlays = PLACEHOLDER_OVERLAY_DATA[category] || [];
            setVideos(
                CATEGORY_PLACEHOLDERS[category].map((id, i): VideoItem => ({
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

    const isFeatured = (index: number) => index % 7 === 3;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 2,
            maxWidth: 935,
            margin: '0 auto',
            padding: '0 0 80px',
        }}>
            {filteredItems.map((item, i) => (
                <div
                    key={item.id}
                    className={`relative aspect-square overflow-hidden cursor-pointer bg-white border border-gray-200 group ${isFeatured(i) ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}`}
                    onClick={() => openFeedAtIndex(i)}
                >
                    <img
                        src={getThumbnail(item)}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x600/ffffff/000000?text=Video`;
                        }}
                    />

                    {/* View count badge */}
                    <div style={{
                        position: 'absolute', bottom: 6, left: 6,
                        background: 'rgba(255,255,255,0.8)', color: '#000',
                        fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                        fontFamily: 'DM Sans', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '3px', zIndex: 10,
                    }}>
                        ▶ {formatCount(item.views)}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-white/70 opacity-0 group-active:opacity-100 md:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 md:p-4">
                        <span className="text-[10px] md:text-xs font-bold text-black leading-tight">{item.title}</span>
                        <span className="text-[8px] md:text-[10px] text-[--accent] font-black uppercase tracking-wider">{item.badge}</span>
                    </div>

                    <div className="absolute top-2 right-2 text-black/80">
                        <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                    </div>
                </div>
            ))}
        </div>
    );
}
