'use client';

import React, { useState } from 'react';
import { Search, Bell, ChevronDown, Menu } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useCategory } from '@/context/CategoryContext';

import { CATEGORY_CONFIG, CategoryKey, CategoryConfig } from '@/lib/categories';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export function TopBar() {
    const { activeCategory, categoryConfig, setCategory } = useCategory();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isShowSearch = searchParams.get('search') === 'true';
    const [searchQuery, setSearchQuery] = useState('');

    const [showSwitcher, setShowSwitcher] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 backdrop-blur-md z-50 px-4 py-3" style={{ background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid #E5E5E5' }}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-[#0A0A0A]">
                {/* Left: Brand */}
                <div className="flex items-center gap-3">
                    <Link href="/" className="text-xl font-black italic tracking-tighter uppercase whitespace-nowrap text-[--accent]">
                        KHAN HUB
                    </Link>
                </div>

                {/* Center: Category Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowSwitcher(!showSwitcher)}
                        className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full hover:border-[--accent] transition-all"
                    >
                        <span className="text-[11px] font-black font-poppins uppercase tracking-wider text-[#0A0A0A]">
                            {categoryConfig?.label || 'All'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-[#333333] transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showSwitcher && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowSwitcher(false)}
                                    className="fixed inset-0 z-[60] bg-black/5 backdrop-blur-[2px]"
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white border border-[#E5E5E5] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-3 grid grid-cols-1 gap-1 z-[70] overflow-hidden"
                                >
                                    <div className="px-4 py-2 mb-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Category</span>
                                    </div>
                                    {(Object.entries(CATEGORY_CONFIG) as [CategoryKey, CategoryConfig][]).map(([key, config]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setShowSwitcher(false);
                                                router.push(`/auth/onboarding?mode=change&cat=${key}`);
                                            }}
                                            className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all ${activeCategory === key
                                                ? 'bg-[#F0F0F0] border border-[#E5E5E5] text-[#0A0A0A]'
                                                : 'hover:bg-black/5 text-[#444444]'
                                                }`}
                                        >
                                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10">
                                                {config.imageUrl ? (
                                                    <Image src={config.imageUrl} alt={config.label} fill className="object-cover" />
                                                ) : (
                                                    <span className="text-sm">{config.emoji}</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black font-poppins uppercase tracking-wider text-[#0A0A0A]">{config.label}</span>
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

                {/* Right: Icons & Menu */}
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                    {pathname === '/explore' && (
                        <>
                            {isShowSearch ? (
                                <motion.div
                                    initial={{ width: 40, opacity: 0 }}
                                    animate={{ width: '100%', opacity: 1 }}
                                    className="relative flex-1 max-w-[200px]"
                                >
                                    <input
                                        autoFocus
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onBlur={() => {
                                            if (!searchQuery) {
                                                const params = new URLSearchParams(searchParams.toString());
                                                params.delete('search');
                                                router.push(`${pathname}?${params.toString()}`);
                                            }
                                        }}
                                        placeholder="Search..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 text-xs font-bold focus:outline-none focus:border-[--accent]"
                                    />
                                    <button
                                        onClick={() => {
                                            const params = new URLSearchParams(searchParams.toString());
                                            params.delete('search');
                                            router.push(`${pathname}?${params.toString()}`);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    >
                                        <Search className="w-3.5 h-3.5" />
                                    </button>
                                </motion.div>
                            ) : (
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set('search', 'true');
                                        router.push(`${pathname}?${params.toString()}`);
                                    }}
                                    className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:text-[--accent] transition-colors"
                                >
                                    <Search className="w-4.5 h-4.5" />
                                </button>
                            )}
                        </>
                    )}
                    <button className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:text-[--accent] transition-colors relative">
                        <Bell className="w-4.5 h-4.5" />
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[--accent] rounded-full border border-white" />
                    </button>
                    <button className="p-1 hover:bg-slate-50 rounded-lg transition-colors ml-1">
                        <Menu className="w-6 h-6 text-slate-700" />
                    </button>
                </div>
            </div>
        </header>
    );
}

