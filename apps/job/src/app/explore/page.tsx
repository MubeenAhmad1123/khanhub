'use client';

import React, { useState } from 'react';
import { ExploreGrid } from '@/components/feed/ExploreGrid';
import BottomNav from '@/components/layout/BottomNav';
import { useCategory } from '@/context/CategoryContext';
import { useSearchParams } from 'next/navigation';

// Hardcoded chip styles for guaranteed visibility
const selectedChipStyle = {
    background: '#0A0A0A',
    color: '#FFFFFF',
    border: '1.5px solid #0A0A0A',
    borderRadius: '20px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'Poppins'
};

const unselectedChipStyle = {
    background: '#F0F0F0',
    color: '#0A0A0A',
    border: '1.5px solid #E5E5E5',
    borderRadius: '20px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'Poppins'
};

import { CATEGORY_CONFIG } from '@/lib/categories';

export default function ExplorePage() {
    const { activeCategory: globalCategory } = useCategory();
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('q') || '';
    const [activeFilter, setActiveFilter] = useState('All');

    // Combine static filters with categories
    const categories = Object.keys(CATEGORY_CONFIG);
    const filters = ['All', 'Nearby', ...categories];

    const getSelectedCategory = () => {
        if (activeFilter === 'All' || activeFilter === 'Nearby') return globalCategory;
        return activeFilter;
    };

    return (
        <div style={{
            paddingTop: '0',
            marginTop: '0',
            background: '#fff',
            minHeight: '100vh',
            paddingBottom: '80px'
        }}>
            {/* Filter chips — horizontal scroll */}
            <div style={{
                display: 'flex',
                gap: '4px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                padding: '4px 16px 12px',
                background: '#fff',
                position: 'sticky',
                top: '64px', // Keep under navbar
                zIndex: 40,
                borderBottom: '1px solid #F0F0F0',
            }} className="no-scrollbar">
                {filters.map((filter) => {
                    const isCat = CATEGORY_CONFIG[filter as keyof typeof CATEGORY_CONFIG];
                    const label = isCat ? `${isCat.emoji} ${isCat.label}` : filter;
                    return (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            style={activeFilter === filter ? selectedChipStyle : unselectedChipStyle}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Video grid — immediately below filters */}
            <div style={{ marginTop: '0' }}>
                <ExploreGrid
                    category={getSelectedCategory()}
                    filter={activeFilter === 'Nearby' ? 'Nearby' : 'All'}
                    searchQuery={searchQuery}
                />
            </div>

            <BottomNav />
        </div>
    );
}
