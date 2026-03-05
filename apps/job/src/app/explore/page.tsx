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
        <div className="min-h-screen bg-black text-white pb-24">
            <TopBar />

            <div className="pt-24 px-4 space-y-6">
                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[--text-muted] group-focus-within:text-[--accent] transition-colors" />
                    <input
                        type="text"
                        placeholder={`Search ${categoryConfig.label} roles...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[--bg-card] border border-[--border] rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-[--accent] outline-none transition-all"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeFilter === filter
                                    ? 'bg-[--accent] border-[--accent] text-black shadow-[0_0_20px_var(--accent-glow)]'
                                    : 'bg-[--bg-card] border-[--border] text-[--text-muted] hover:border-white/20'
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
