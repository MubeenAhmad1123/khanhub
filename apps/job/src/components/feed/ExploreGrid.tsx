'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORY_PLACEHOLDERS, PLACEHOLDER_OVERLAY_DATA } from '@/lib/categories';
import { Play } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
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
        const q = query(
            collection(db, 'videos'),
            where('admin_status', '==', 'approved'),
            where('is_live', '==', true),
            where('category', '==', category),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            if (snap.docs.length > 0) {
                const real: VideoItem[] = snap.docs.map(d => ({
                    id: d.id,
                    isPlaceholder: false,
                    cloudinaryUrl: d.data().cloudinaryUrl,
                    youtubeId: undefined,
                    title: d.data().overlayData?.title || '',
                    badge: d.data().overlayData?.badge || '',
                    field1: d.data().overlayData?.field1,
                    field2: d.data().overlayData?.field2,
                    views: d.data().views || 0,
                }));
                setVideos(real);
            } else {
                const overlays = PLACEHOLDER_OVERLAY_DATA[category] || [];
                const ph: VideoItem[] = CATEGORY_PLACEHOLDERS[category].map((id, i) => ({
                    id: `ph-${i}`,
                    isPlaceholder: true,
                    cloudinaryUrl: undefined,
                    youtubeId: id,
                    title: overlays[i % overlays.length]?.title || '',
                    badge: overlays[i % overlays.length]?.badge || '',
                    field1: overlays[i % overlays.length]?.field1,
                    field2: overlays[i % overlays.length]?.field2,
                    views: overlays[i % overlays.length]?.views || 0,
                }));
                setVideos(ph);
            }
        }, () => {
            // Fallback on error (e.g. index not yet built)
            const overlays = PLACEHOLDER_OVERLAY_DATA[category] || [];
            const ph: VideoItem[] = CATEGORY_PLACEHOLDERS[category].map((id, i) => ({
                id: `ph-${i}`,
                isPlaceholder: true,
                cloudinaryUrl: undefined,
                youtubeId: id,
                title: overlays[i % overlays.length]?.title || '',
                badge: overlays[i % overlays.length]?.badge || '',
                field1: overlays[i % overlays.length]?.field1,
                field2: overlays[i % overlays.length]?.field2,
                views: overlays[i % overlays.length]?.views || 0,
            }));
            setVideos(ph);
        });

        return () => unsubscribe();
    }, [category]);

    // Thumbnail helper
    const getThumbnail = (item: VideoItem): string => {
        if (!item.isPlaceholder && item.cloudinaryUrl) {
            return item.cloudinaryUrl.replace('/upload/', '/upload/so_0,w_400,h_600,c_fill/');
        }
        return `https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`;
    };

    // Filter logic
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
        <div className="grid grid-cols-3 gap-[2px] w-full">
            {filteredItems.map((item, i) => (
                <div
                    key={item.id}
                    className={`relative aspect-square overflow-hidden cursor-pointer bg-[#111] group ${isFeatured(i) ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}`}
                    onClick={() => openFeedAtIndex(i)}
                >
                    {/* Thumbnail */}
                    <img
                        src={getThumbnail(item)}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                            // Fallback thumbnail on error
                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`;
                        }}
                    />

                    {/* View count badge */}
                    <div style={{
                        position: 'absolute', bottom: 6, left: 6,
                        background: 'rgba(0,0,0,0.7)', color: '#fff',
                        fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                        fontFamily: 'DM Sans', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '3px', zIndex: 10,
                    }}>
                        ▶ {formatCount(item.views)}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-active:opacity-100 md:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 md:p-4">
                        <span className="text-[10px] md:text-xs font-bold text-white leading-tight">{item.title}</span>
                        <span className="text-[8px] md:text-[10px] text-[--accent] font-black uppercase tracking-wider">{item.badge}</span>
                    </div>

                    {/* Play icon */}
                    <div className="absolute top-2 right-2 text-white/80">
                        <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                    </div>
                </div>
            ))}
        </div>
    );
}
