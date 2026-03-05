'use client';

import React, { useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useCategory } from '@/context/CategoryContext';
import { CATEGORY_CONFIG, CategoryKey, CategoryConfig } from '@/lib/categories';
import { motion, AnimatePresence } from 'framer-motion';

import Image from 'next/image';

export function TopBar() {
    const { activeCategory, categoryConfig, setCategory } = useCategory();
    const [showSwitcher, setShowSwitcher] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 bg-black/60 backdrop-blur-md border-b border-[--border] z-50 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                {/* Logo & Category Switcher */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-xl font-bold font-syne tracking-tighter italic whitespace-nowrap">
                        <span className="text-[--accent]">JR</span>
                    </Link>

                    <div className="relative">
                        <button
                            onClick={() => setShowSwitcher(!showSwitcher)}
                            className="flex items-center gap-2 bg-[--bg-card] border border-[--border] px-2 py-1 rounded-full hover:border-[--accent] transition-all"
                        >
                            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/20">
                                {categoryConfig.imageUrl ? (
                                    <Image src={categoryConfig.imageUrl} alt={categoryConfig.label} fill className="object-cover" />
                                ) : (
                                    <span className="text-xs">{categoryConfig.emoji}</span>
                                )}
                            </div>
                            <span className="text-[10px] font-black font-syne uppercase tracking-wider hidden sm:inline">
                                {categoryConfig.label}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-[--text-muted] transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showSwitcher && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setShowSwitcher(false)}
                                        className="fixed inset-0 z-40"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 mt-2 w-64 bg-[--bg-secondary] border border-[--border] rounded-2xl shadow-2xl p-2 grid grid-cols-1 gap-1 z-50"
                                    >
                                        {(Object.entries(CATEGORY_CONFIG) as [CategoryKey, CategoryConfig][]).map(([key, config]) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    setCategory(key);
                                                    setShowSwitcher(false);
                                                }}
                                                className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all ${activeCategory === key
                                                    ? 'bg-[--bg-card] border border-[--border] text-white'
                                                    : 'hover:bg-white/5 text-[--text-muted]'
                                                    }`}
                                            >
                                                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10">
                                                    {config.imageUrl ? (
                                                        <Image src={config.imageUrl} alt={config.label} fill className="object-cover" />
                                                    ) : (
                                                        <span className="text-sm">{config.emoji}</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black font-syne uppercase tracking-wider">{config.label}</span>
                                                {activeCategory === key && (
                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[--accent]" />
                                                )}
                                            </button>
                                        ))}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Search */}
                <div className="flex-1 max-w-md hidden md:block">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] group-focus-within:text-[--accent] transition-colors" />
                        <input
                            type="text"
                            placeholder={`Search in ${categoryConfig.label}...`}
                            className="w-full bg-[--bg-card] border border-[--border] rounded-full pl-12 pr-4 py-2 text-sm focus:border-[--accent] outline-none transition-all placeholder:text-[--text-muted]"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button className="w-9 h-9 rounded-full bg-[--bg-card] border border-[--border] flex items-center justify-center text-[--text-muted] hover:text-white transition-colors relative md:hidden">
                        <Search className="w-4 h-4" />
                    </button>
                    <button className="w-9 h-9 rounded-full bg-[--bg-card] border border-[--border] flex items-center justify-center text-[--text-muted] hover:text-white transition-colors relative">
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-[--accent] rounded-full border-2 border-black" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-[--accent] flex items-center justify-center font-bold text-[10px] text-black">
                        JD
                    </div>
                </div>
            </div>
        </header>
    );
}
