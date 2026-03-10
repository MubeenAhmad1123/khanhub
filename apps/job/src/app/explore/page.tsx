'use client';

import React, { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { ExploreGrid } from '@/components/feed/ExploreGrid';
import { Search, MapPin } from 'lucide-react';
import { useCategory } from '@/context/CategoryContext';

export default function ExplorePage() {
    const { activeCategory, categoryConfig } = useCategory();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    const filters = ['All', 'Provider', 'Seeker', 'Nearby'];

    return (
        <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] pb-24 overflow-x-hidden">
            <TopBar />

            <div className="pt-20 px-4 space-y-6 max-w-lg mx-auto">
                <h1 className="sr-only">{categoryConfig.label} Videos & Profiles in Pakistan | KHAN HUB</h1>

                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#BBBBBB] group-focus-within:text-[--accent] transition-colors" />
                    <input
                        type="text"
                        placeholder={`Search ${categoryConfig.label} roles...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#F0F0F0] border border-[#E5E5E5] rounded-2xl pl-12 pr-4 py-4 text-sm text-[#0A0A0A] focus:border-[--accent] outline-none transition-all placeholder-[#BBBBBB]"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeFilter === filter
                                ? 'bg-[--accent] border-[--accent] text-[#FFFFFF] shadow-[0_0_20px_var(--accent-glow)]'
                                : 'bg-[#F0F0F0] border-[#E5E5E5] text-[#666666] hover:border-[#CCCCCC]'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Explore Grid */}
                <ExploreGrid
                    category={activeCategory}
                    searchQuery={searchQuery}
                    filter={activeFilter}
                />
            </div>

            <BottomNav />
        </div>
    );
}
