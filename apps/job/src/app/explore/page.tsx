'use client';

import React, { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { ExploreGrid } from '@/components/feed/ExploreGrid';
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

export default function ExplorePage() {
    const { activeCategory } = useCategory();
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('q') || '';
    const [activeFilter, setActiveFilter] = useState('All');

    const filters = ['All', 'Provider', 'Seeker', 'Nearby'];

    return (
        <div style={{
            paddingTop: '0',
            marginTop: '0',
            background: '#fff',
            minHeight: '100vh',
            paddingBottom: '80px'
        }}>
            <TopBar />

            {/* Filter chips — sticky under navbar */}
            <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                padding: '8px 12px',
                marginTop: '0',
                background: '#fff',
                position: 'sticky',
                top: '64px', // Adjusted for TopBar height
                zIndex: 40,
                borderBottom: '1px solid #F0F0F0',
            }} className="no-scrollbar">
                {filters.map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        style={activeFilter === filter ? selectedChipStyle : unselectedChipStyle}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* Video grid — immediately below filters */}
            <div style={{ marginTop: '0' }}>
                <ExploreGrid
                    category={activeCategory}
                    filter={activeFilter}
                    searchQuery={searchQuery}
                />
            </div>

            <BottomNav />
        </div>
    );
}
