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
        <div className="sticky top-[60px] z-[9500] w-full bg-black/30 backdrop-blur-sm py-2 px-4 flex justify-center items-center border-b border-white/5">
            <div className="flex items-center gap-2 sm:gap-4 select-none">
                {tabs.map((tab, i) => (
                    <React.Fragment key={tab}>
                        {i > 0 && (
                            <span className="text-white/20 text-[11px] sm:text-xs select-none">|</span>
                        )}
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('feed_last_index');
                                onChange(i);
                            }}
                            className={`relative px-3 py-1.5 text-[13px] sm:text-[14px] font-black tracking-wider uppercase font-poppins transition-all duration-300 outline-none whitespace-nowrap focus:outline-none cursor-pointer ${
                                activeTab === i 
                                    ? 'text-white font-extrabold' 
                                    : 'text-white/60 hover:text-white/90'
                            }`}
                            style={{
                                textShadow: activeTab === i ? '0 0 12px rgba(255,255,255,0.6)' : 'none',
                            }}
                        >
                            <span className="relative z-10">{tab}</span>
                            {activeTab === i && (
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
                ))}
            </div>
        </div>
    );
}
