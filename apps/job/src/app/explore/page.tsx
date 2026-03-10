'use client';

import React, { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { ExploreGrid } from '@/components/feed/ExploreGrid';
import { MapPin } from 'lucide-react';
import { useCategory } from '@/context/CategoryContext';

export default function ExplorePage() {
    const { activeCategory, categoryConfig } = useCategory();
    const [activeFilter, setActiveFilter] = useState('All');

    const filters = ['All', 'Provider', 'Seeker', 'Nearby'];

    return (
        <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] pb-24 overflow-x-hidden">
            <TopBar />

            <div className="pt-20 space-y-4">
                {/* Filter Pills */}
                <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeFilter === filter
                                ? 'bg-[--accent] border-[--accent] text-[#FFFFFF]'
                                : 'bg-[#F0F0F0] border-[#F0F0F0] text-[#0A0A0A] hover:border-[#E5E5E5]'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Explore Grid */}
                <ExploreGrid
                    category={activeCategory}
                    filter={activeFilter}
                />
            </div>

            <BottomNav />
        </div>
    );
}
