'use client';

import React from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CATEGORY_FEED_TABS } from '@/lib/categories';
import { motion } from 'framer-motion';

interface FeedTabsProps {
    activeTab: number;
    onChange: (index: number) => void;
}

export function FeedTabs({ activeTab, onChange }: FeedTabsProps) {
    const { activeCategory } = useCategory();
    
    // Always show "For You" first. Filter it out from category tabs to avoid
    // duplicates, then prepend it. Display index 0 = VideoFeed tab 0 (For You).
    const categoryTabs = CATEGORY_FEED_TABS[activeCategory] || ['Providers', 'Seekers'];
    const tabs = [
        'For You',
        ...categoryTabs.filter((t: string) => t.toLowerCase() !== 'for you'),
    ];

    return (
        <div className="sticky top-[60px] z-[9500] w-full bg-black/30 backdrop-blur-sm py-2 px-4 flex justify-center items-center border-b border-white/5">
            <div className="flex items-center gap-2 sm:gap-4 select-none">
                {tabs.map((tab, i) => {
                    const isActive = activeTab === i;
                    return (
                        <React.Fragment key={tab}>
                            {i > 0 && (
                                <span className="text-white/20 text-[11px] sm:text-xs select-none">|</span>
                            )}
                            <button
                                onClick={() => {
                                    sessionStorage.removeItem('feed_last_index');
                                    onChange(i);
                                }}
                                className={`relative px-3 py-1.5 tracking-wider uppercase font-poppins transition-all duration-300 outline-none whitespace-nowrap focus:outline-none cursor-pointer ${
                                    isActive 
                                        ? 'text-white' 
                                        : 'text-white/60 hover:text-white/90'
                                }`}
                                style={{
                                    textShadow: isActive ? '0 0 12px rgba(255,255,255,0.6)' : 'none',
                                    fontSize: isActive ? 13 : 12,
                                    fontWeight: isActive ? 700 : 400,
                                }}
                            >
                                <span className="relative z-10">{tab}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabUnderline"
                                        className="absolute bottom-0 left-3 right-3 h-0.5 bg-white rounded-full"
                                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                                        style={{
                                            boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)'
                                        }}
                                    />
                                )}
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
