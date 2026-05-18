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
    const tabs = CATEGORY_FEED_TABS[activeCategory] || ['Job Seeker', 'Company', 'For You'];

    return (
        <div className="fixed top-16 left-0 right-0 mx-auto max-w-[480px] h-12 flex justify-center items-center bg-black/40 backdrop-blur-md border-b border-white/5 z-[9500]">
            <div className="flex items-center gap-2 sm:gap-4 select-none">
                {tabs.map((tab, i) => (
                    <React.Fragment key={tab}>
                        {i > 0 && (
                            <span className="text-white/25 text-[11px] sm:text-xs select-none">|</span>
                        )}
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('feed_last_index');
                                onChange(i);
                            }}
                            className="relative px-3 py-2 text-[13px] sm:text-[14px] font-black tracking-wider uppercase font-poppins transition-all duration-300 outline-none whitespace-nowrap focus:outline-none cursor-pointer"
                            style={{
                                color: activeTab === i ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
                                textShadow: activeTab === i ? '0 1px 8px rgba(0,0,0,0.6)' : 'none',
                            }}
                        >
                            <span className="relative z-10">{tab}</span>
                            {activeTab === i && (
                                <motion.div
                                    layoutId="activeTabUnderline"
                                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-white rounded-full"
                                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                                    style={{
                                        boxShadow: '0 1px 4px rgba(255, 255, 255, 0.4)'
                                    }}
                                />
                            )}
                        </button>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
