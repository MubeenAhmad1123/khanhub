'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CATEGORY_FEED_TABS, CATEGORY_CONFIG, CategoryKey } from '@/lib/categories';
import { ChevronDown } from 'lucide-react';

interface FeedTabsProps {
    activeTab: number;
    onChange: (index: number) => void;
}

import { useClickOutside } from '@/hooks/useClickOutside';

import { motion, AnimatePresence } from 'framer-motion';

export function FeedTabs({ activeTab, onChange }: FeedTabsProps) {
    const { activeCategory, setCategory, categoryConfig } = useCategory();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownButtonRef = useRef<HTMLButtonElement>(null);

    useClickOutside([dropdownRef, dropdownButtonRef], () => setDropdownOpen(false), dropdownOpen);

    const tabs = CATEGORY_FEED_TABS[activeCategory] || ['For You', 'Providers', 'Seekers'];
    const CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
        key: key as CategoryKey,
        label: config.label,
        emoji: config.emoji
    }));

    return (
        <div className="relative w-full flex items-center gap-2 p-1.5 z-[1000] backdrop-blur-md bg-black/40 rounded-2xl border border-white/10 no-scrollbar overflow-x-auto">
            {/* Category Dropdown */}
            <div className="relative shrink-0">
                <motion.button
                    ref={dropdownButtonRef}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-[13px] font-bold uppercase tracking-wide font-poppins"
                >
                    <span>{categoryConfig?.emoji}</span>
                    <span className="hidden sm:inline">{categoryConfig?.label}</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                    {dropdownOpen && (
                        <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            className="absolute top-full left-0 mt-2 w-52 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1.5"
                        >
                            <div className="max-h-[60vh] overflow-y-auto scrollbar-hide">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.key}
                                        onClick={() => {
                                            sessionStorage.removeItem('feed_last_index');
                                            setCategory(cat.key);
                                            setDropdownOpen(false);
                                            onChange(0);
                                        }}
                                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors ${
                                            activeCategory === cat.key 
                                            ? 'bg-white/20 text-white font-bold' 
                                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        <span className="text-lg">{cat.emoji}</span>
                                        <span className="text-[11px] uppercase tracking-wider font-poppins">{cat.label}</span>
                                        {activeCategory === cat.key && (
                                            <motion.div layoutId="activeCat" className="ml-auto w-1.5 h-1.5 rounded-full bg-[--accent]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Scrolling Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {tabs.map((tab, i) => (
                    <button
                        key={tab}
                        onClick={() => {
                            sessionStorage.removeItem('feed_last_index');
                            onChange(i);
                        }}
                        className="relative px-4 py-2 text-[13px] font-bold uppercase tracking-wider font-poppins transition-colors duration-300 outline-none whitespace-nowrap"
                        style={{ color: activeTab === i ? '#fff' : 'rgba(255,255,255,0.5)' }}
                    >
                        {tab}
                        {activeTab === i && (
                            <motion.div
                                layoutId="activeTabUnderline"
                                className="absolute bottom-0 left-2 right-2 h-0.5 bg-white rounded-full"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
