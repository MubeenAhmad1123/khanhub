'use client';

import React, { useState } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CATEGORY_CONFIG, CategoryKey, CategoryConfig } from '@/lib/categories';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export function CategoryDropdown() {
    const { activeCategory, setCategory, categoryConfig } = useCategory();
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (key: string) => {
        setCategory(key as any);
        setIsOpen(false);
    };

    return (
        <div className="relative pointer-events-auto">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-black/20 border border-white/20 text-white transition-all hover:bg-black/30"
                style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '13px' }}
            >
                <span className="flex items-center gap-1.5 uppercase tracking-wide">
                    {categoryConfig?.emoji} {categoryConfig?.label}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop to close */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute top-full left-0 mt-2 w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
                        >
                            <div className="max-h-[60vh] overflow-y-auto scrollbar-hide py-1">
                                {(Object.entries(CATEGORY_CONFIG) as [CategoryKey, CategoryConfig][]).map(([key, config], index) => (
                                    <motion.button
                                        key={key}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        onClick={() => handleSelect(key)}
                                        className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all ${activeCategory === key
                                                ? 'bg-white/20 text-white'
                                                : 'hover:bg-white/10 text-white/70 hover:text-white'
                                            }`}
                                    >
                                        <span className="text-xl">{config.emoji}</span>
                                        <span className="text-[12px] font-bold uppercase tracking-wider font-poppins">{config.label}</span>
                                        {activeCategory === key && (
                                            <motion.div 
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="ml-auto w-1.5 h-1.5 rounded-full bg-[--accent]" 
                                            />
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
