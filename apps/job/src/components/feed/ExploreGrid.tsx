'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORY_PLACEHOLDERS, PLACEHOLDER_OVERLAY_DATA } from '@/lib/categories';
import { Play } from 'lucide-react';

interface ExploreGridProps {
    category: string;
    searchQuery: string;
    filter: string;
}

export function ExploreGrid({ category, searchQuery, filter }: ExploreGridProps) {
    const router = useRouter();

    // Map placeholders to items
    const items = CATEGORY_PLACEHOLDERS[category].map((id, i) => ({
        id: `explore-${i}`,
        youtubeId: id,
        ...PLACEHOLDER_OVERLAY_DATA[category][i % 5]
    }));

    // Filter logic
    const filteredItems = items.filter(item => {
        const matchesSearch =
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.badge.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesFilter = true;
        if (filter === 'Provider') {
            // Simplified: badges like 'Doctor', 'Teacher', 'Agent', 'Freelancer', 'Job Seeker' (depending on category)
            // For now, assume certain badges are providers based on prompt logic
            matchesFilter = ['Doctor', 'Teacher', 'Agent', 'Freelancer', 'Job Seeker', 'Helper', 'Lawyer'].includes(item.badge);
        } else if (filter === 'Seeker') {
            matchesFilter = ['Patient', 'Student', 'Buyer / Renter', 'Client', 'Company', 'Household', 'Hiring', 'Seeking'].includes(item.badge);
        }

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
                    className={`relative aspect-square overflow-hidden cursor-pointer bg-[#111] group ${isFeatured(i) ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'
                        }`}
                    onClick={() => openFeedAtIndex(i)}
                >
                    {/* YouTube Thumbnail */}
                    <img
                        src={`https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />

                    {/* View count badge on thumbnail — bottom left */}
                    <div style={{
                        position: 'absolute', bottom: 6, left: 6,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff', fontSize: '10px',
                        padding: '2px 6px', borderRadius: '4px',
                        fontFamily: 'DM Sans', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '3px',
                        zIndex: 10
                    }}>
                        ▶ {formatCount(item.views || 0)}
                    </div>

                    {/* Overlay on hover/tap */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-active:opacity-100 md:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 md:p-4">
                        <span className="text-[10px] md:text-xs font-bold text-white leading-tight">
                            {item.title}
                        </span>
                        <span className="text-[8px] md:text-[10px] text-[--accent] font-black uppercase tracking-wider">
                            {item.badge}
                        </span>
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
