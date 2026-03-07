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
            gap: 24,
            padding: '12px 16px 8px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
            pointerEvents: 'all',
        }}>
            {tabs.map((tab, i) => (
                <button
                    key={tab}
                    onClick={() => onChange(i)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'DM Sans',
                        fontWeight: activeTab === i ? 700 : 400,
                        fontSize: 15,
                        color: activeTab === i ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                        position: 'relative',
                        padding: '2px 0',
                        letterSpacing: '0.01em',
                        transition: 'color 0.2s',
                    }}
                >
                    {tab}
                    {/* Active underline */}
                    {activeTab === i && (
                        <span style={{
                            position: 'absolute',
                            bottom: -4,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 20,
                            height: 2,
                            background: '#FFFFFF',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.8)',
                            borderRadius: 999,
                            display: 'block',
                        }} />
                    )}
                </button>
            ))}
        </div>
    );
}
