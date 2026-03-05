'use client';

import React, { useState } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CategoryKey, CATEGORY_CONFIG, CategoryConfig } from '@/lib/categories';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ArrowRight, Sparkles } from 'lucide-react';

export default function HomePage() {
    const { setCategory, setRole } = useCategory();
    const [selectedCat, setSelectedCat] = useState<CategoryKey | null>(null);
    const [showRolePicker, setShowRolePicker] = useState(false);
    const router = useRouter();

    const handleCategorySelect = (key: CategoryKey) => {
        setSelectedCat(key);
        setCategory(key);
    };

    const handleNext = () => {
        if (selectedCat) {
            setShowRolePicker(true);
        }
    };

    const handleRoleSelect = (role: 'provider' | 'seeker') => {
        setRole(role);
        localStorage.setItem('jobreel_guest_prefs', JSON.stringify({
            category: selectedCat,
            role: role
        }));
        router.push('/feed');
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 px-6 py-12 font-sans flex flex-col items-center">
            {/* Header */}
            <div className="text-center mb-12 animate-in fade-in slide-in-from-top-10 duration-700">
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-2">
                    Choose your <span className="text-slate-500 font-medium italic">interests</span>
                </h1>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 max-w-5xl w-full mb-16">
                {(Object.entries(CATEGORY_CONFIG) as [CategoryKey, CategoryConfig][]).map(([key, config]) => (
                    <div
                        key={key}
                        onClick={() => handleCategorySelect(key)}
                        className="flex flex-col items-center group cursor-pointer"
                    >
                        <div className="relative w-28 h-28 md:w-32 md:h-32 mb-4 transition-transform duration-300 group-hover:scale-105 active:scale-95">
                            <div className={`w-full h-full rounded-full overflow-hidden border-4 transition-all duration-300 shadow-xl ${selectedCat === key
                                ? 'border-slate-400 ring-4 ring-slate-400/10'
                                : 'border-white shadow-slate-200'
                                }`}>
                                {config.imageUrl ? (
                                    <Image
                                        src={config.imageUrl}
                                        alt={config.label}
                                        fill
                                        className={`object-cover transition-all duration-500 ${selectedCat === key ? 'scale-110 brightness-50' : 'group-hover:scale-110'
                                            }`}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-3xl">
                                        {config.emoji}
                                    </div>
                                )}

                                {/* Checkmark Overlay */}
                                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${selectedCat === key ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                                    }`}>
                                    <Check className="w-12 h-12 text-white stroke-[4]" />
                                </div>
                            </div>
                        </div>

                        {/* Label */}
                        <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest text-center transition-colors duration-300 ${selectedCat === key ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
                            }`}>
                            {config.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Next Button */}
            <div className="fixed bottom-12 left-0 right-0 flex justify-center px-6">
                <button
                    onClick={handleNext}
                    disabled={!selectedCat}
                    className="w-full max-w-sm flex items-center justify-center gap-3 bg-[--bg-secondary] hover:bg-slate-50 text-slate-900 border border-slate-200 py-5 rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50 group bg-slate-100"
                >
                    <span className="text-xl font-bold">Next</span>
                    <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                </button>
            </div>

            {/* Role Picker Modal */}
            <AnimatePresence>
                {showRolePicker && selectedCat && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRolePicker(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="fixed bottom-0 left-0 right-0 bg-white border-t rounded-t-[40px] p-8 z-50 pb-16 max-w-lg mx-auto"
                        >
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-10" />

                            <div className="flex items-center gap-4 mb-8 bg-slate-50 w-fit px-6 py-3 rounded-full border border-slate-100">
                                <span className="text-2xl">{CATEGORY_CONFIG[selectedCat].emoji}</span>
                                <span className="text-sm font-black uppercase tracking-widest text-slate-800">
                                    {CATEGORY_CONFIG[selectedCat].label}
                                </span>
                            </div>

                            <h3 className="text-3xl font-black text-slate-900 mb-8 italic">I am a...</h3>

                            <div className="space-y-4">
                                <button
                                    onClick={() => handleRoleSelect('provider')}
                                    className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-3xl transition-all group"
                                >
                                    <div className="text-left font-black uppercase italic tracking-tighter text-xl">
                                        {CATEGORY_CONFIG[selectedCat].providerLabel}
                                    </div>
                                    <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-transform group-hover:translate-x-1" />
                                </button>

                                <button
                                    onClick={() => handleRoleSelect('seeker')}
                                    className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-3xl transition-all group"
                                >
                                    <div className="text-left font-black uppercase italic tracking-tighter text-xl">
                                        {CATEGORY_CONFIG[selectedCat].seekerLabel}
                                    </div>
                                    <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
