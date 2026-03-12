'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORY_PLACEHOLDERS, PLACEHOLDER_OVERLAY_DATA } from '@/lib/categories';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

interface ExploreGridProps {
    category: string;
    filter: string;
    searchQuery?: string;
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

export function ExploreGrid({ category, filter, searchQuery = '' }: ExploreGridProps) {
    const router = useRouter();
    const [videos, setVideos] = useState<VideoItem[]>([]);

    useEffect(() => {
        const q = query(
            collection(db, 'videos'),
            where('is_live', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const real = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(d => {
                    const url = d.cloudinaryUrl;
                    const isValidCloudinary = url &&
                        url.includes('cloudinary.com') &&
                        !url.includes('youtube.com') &&
                        !url.includes('youtu.be') &&
                        !url.includes('zoo');

                    return d.admin_status === 'approved' &&
                        (d.category === category || !d.category) &&
                        isValidCloudinary;
                })
                .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .slice(0, 50)
                .map((d: any): VideoItem => ({
                    id: d.id,
                    isPlaceholder: false,
                    cloudinaryUrl: d.cloudinaryUrl,
                    youtubeId: undefined,
                    title: d.overlayData?.title || d.title || '',
                    badge: d.overlayData?.badge || d.role || d.userRole || '',
                    field1: d.overlayData?.field1,
                    field2: d.overlayData?.field2,
                    views: d.views || 0,
                }));

            if (real.length > 0) {
                setVideos(real);
            } else {
                const safeCat = CATEGORY_PLACEHOLDERS[category] ? category : 'jobs';
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
        }, (error) => {
            console.warn('[ExploreGrid] Snapshot error:', error.message);
        });

        return () => unsubscribe();
    }, [category]);

    const getThumbnail = (item: VideoItem): string => {
        if (!item.isPlaceholder && item.cloudinaryUrl) {
            return item.cloudinaryUrl
                .replace('/upload/', '/upload/w_300,h_533,c_fill,f_jpg,so_1/')
                .replace(/\.(mp4|mov|webm)$/i, '.jpg');
        }
        return `https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`;
    };

    const providerBadges = ['Doctor', 'Teacher', 'Agent', 'Freelancer', 'Job Seeker', 'Helper', 'Lawyer', 'Profile', 'Worker', 'Agency', 'Farmer', 'Seller', 'Driver', 'Presenting'];
    const seekerBadges = ['Patient', 'Student', 'Buyer / Renter', 'Client', 'Company', 'Household', 'Hiring', 'Seeking', 'Looking', 'Employer', 'Buyer', 'Passenger', 'Traveler'];

    const filteredItems = videos.filter(item => {
        let matchesFilter = true;
        if (filter === 'Provider') matchesFilter = providerBadges.includes(item.badge);
        else if (filter === 'Seeker') matchesFilter = seekerBadges.includes(item.badge);

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const titleMatch = item.title?.toLowerCase().includes(q);
            const badgeMatch = item.badge?.toLowerCase().includes(q);
            matchesFilter = matchesFilter && (titleMatch || badgeMatch);
        }

        return matchesFilter;
    });

    const openFeedAtVideo = (videoId: string) => {
        if (!videoId) return;
        router.push(`/feed?v=${videoId}`);
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
            gap: '2px',
            width: '100%',
            padding: '0 0 80px',
        }}>
            {filteredItems.map((video, index) => (
                <div
                    key={video.id + '-' + index}
                    onClick={() => openFeedAtVideo(video.id)}
                    style={{
                        position: 'relative',
                        aspectRatio: '9/16',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: '#111',
                    }}
                >
                    <img
                        src={getThumbnail(video)}
                        alt=""
                        loading="lazy"
                        style={{
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                        }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x600/ffffff/000000?text=Video`;
                        }}
                    />

                    <div style={{
                        position: 'absolute', bottom: '2px', left: '2px',
                        color: '#fff', fontSize: '10px', fontWeight: 'bold',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}>
                        ▶ {formatCount(video.views)}
                    </div>
                </div>
            ))}
        </div>
    );
}
