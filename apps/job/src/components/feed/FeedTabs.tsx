'use client';

import React from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CATEGORY_FEED_TABS } from '@/lib/categories';

interface FeedTabsProps {
    activeTab: number;
    onChange: (index: number) => void;
}

export function FeedTabs({ activeTab, onChange }: FeedTabsProps) {
    const { activeCategory } = useCategory();

    // Default to a generic list if category isn't found
    const tabs = CATEGORY_FEED_TABS[activeCategory] || ['For You', 'Providers', 'Seekers'];

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            padding: '10px 16px',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            pointerEvents: 'all',
        }}>
            <div style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                borderRadius: 999,
                padding: '4px',
                border: '1px solid rgba(255,255,255,0.15)',
            }}>
                {tabs.map((tab, i) => (
                    <button
                        key={tab}
                        onClick={() => {
                            sessionStorage.removeItem('feed_last_index');
                            onChange(i);
                        }}
                        style={{
                            background: activeTab === i ? 'rgba(255,255,255,0.2)' : 'none',
                            border: 'none',
                            borderRadius: 999,
                            cursor: 'pointer',
                            padding: '6px 20px',
                            fontFamily: 'Poppins',
                            fontWeight: 700,
                            fontSize: 13,
                            color: '#FFFFFF',
                            transition: 'all 0.2s',
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>
    );
}
