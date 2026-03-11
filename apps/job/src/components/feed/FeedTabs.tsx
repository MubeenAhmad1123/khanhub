'use client';

import React, { useState } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CATEGORY_FEED_TABS, CATEGORY_CONFIG, CategoryKey } from '@/lib/categories';
import { ChevronDown } from 'lucide-react';

interface FeedTabsProps {
    activeTab: number;
    onChange: (index: number) => void;
}

export function FeedTabs({ activeTab, onChange }: FeedTabsProps) {
    const { activeCategory, setCategory, categoryConfig } = useCategory();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const tabs = CATEGORY_FEED_TABS[activeCategory] || ['For You', 'Providers', 'Seekers'];
    const currentCategoryLabel = categoryConfig?.label || 'Jobs';

    const CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
        key: key as CategoryKey,
        label: config.label,
        emoji: config.emoji
    }));

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            padding: '2px 8px',
            gap: '4px',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            width: '100%',
        }} className="no-scrollbar feed-tabs-bar">

            {/* FIRST ITEM: Category dropdown pill */}
            <div style={{ position: 'relative', flexShrink: 0, zIndex: 1001 }}>
                <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '20px',
                        padding: '6px 12px', fontSize: '13px',
                        fontWeight: 700, color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                        fontFamily: 'Poppins'
                    }}
                >
                    {categoryConfig?.emoji} {currentCategoryLabel} <ChevronDown size={13} />
                </button>

                {dropdownOpen && (
                    <div style={{
                        position: 'absolute', top: '110%', left: 0,
                        zIndex: 9999,
                        background: '#FFFFFF',
                        borderRadius: '12px',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                        minWidth: '180px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                        isolation: 'isolate',
                    }}>
                        {CATEGORIES.map(cat => (
                            <button key={cat.key}
                                onClick={() => {
                                    sessionStorage.removeItem('feed_last_index');
                                    setCategory(cat.key);
                                    setDropdownOpen(false);
                                    onChange(0); // Reset to For You tab on category change
                                }}
                                style={{
                                    width: '100%', padding: '12px 16px',
                                    textAlign: 'left', background: activeCategory === cat.key ? 'rgba(0,0,0,0.05)' : 'transparent',
                                    color: '#000', border: 'none', cursor: 'pointer',
                                    fontSize: '14px', fontWeight: activeCategory === cat.key ? 700 : 400,
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <span>{cat.emoji}</span> {cat.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* REMAINING ITEMS: For You, Role1, Role2 */}
            {tabs.map((tab, i) => (
                <button key={tab}
                    onClick={() => {
                        sessionStorage.removeItem('feed_last_index');
                        onChange(i);
                    }}
                    style={{
                        padding: '12px 14px', flexShrink: 0,
                        fontSize: '13px', fontWeight: activeTab === i ? 700 : 400,
                        color: activeTab === i ? '#fff' : 'rgba(255,255,255,0.6)',
                        borderBottom: activeTab === i ? '2px solid #fff' : '2px solid transparent',
                        background: 'none', border: 'none',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        fontFamily: 'Poppins'
                    }}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
}
