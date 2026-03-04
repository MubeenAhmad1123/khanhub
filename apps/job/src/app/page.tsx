'use client';

import React, { useState } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CategoryKey, CATEGORY_CONFIG } from '@/lib/categories';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
    const { setCategory, setRole } = useCategory();
    const [selectedCat, setSelectedCat] = useState<CategoryKey | null>(null);
    const router = useRouter();

    const handleCategorySelect = (key: CategoryKey) => {
        setSelectedCat(key);
        setCategory(key);
    };

    const handleRoleSelect = (role: 'provider' | 'seeker') => {
        setRole(role);
        // Store in guest prefs
        localStorage.setItem('jobreel_guest_prefs', JSON.stringify({
            category: selectedCat,
            role: role
        }));
        router.push('/feed');
    };

    return (
        <div className="min-h-screen bg-[--bg-primary] text-[--text-primary] px-6 pt-12 pb-24 font-dm-sans">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-12">
                <h1 className="text-2xl font-bold tracking-tighter font-syne italic">
                    <span className="text-[--accent]">JOB</span>REEL
                </h1>
                <Link href="/auth/login" className="text-sm font-medium text-[--text-muted] hover:text-white transition-colors">
                    Login
                </Link>
            </div>

            {/* Hero Text */}
            <div className="mb-10">
                <h2 className="text-4xl font-bold font-syne leading-tight mb-2">
                    What are you <br /> looking for?
                </h2>
                <p className="text-[--text-muted] text-sm leading-relaxed">
                    Select your industry to get started. Each category connects <br />
                    experts with those who need them.
                </p>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.entries(CATEGORY_CONFIG) as [CategoryKey, any][]).map(([key, config]) => (
                    <motion.button
                        key={key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategorySelect(key)}
                        className={`flex flex-col items-center justify-center p-6 glass-card transition-all duration-300 ${selectedCat === key
                                ? 'border-[--accent] ring-1 ring-[--accent] shadow-[0_0_24px_var(--accent-glow)]'
                                : 'border-[--border] hover:border-[--text-muted]'
                            }`}
                    >
                        <span className="text-4xl mb-3 drop-shadow-lg">{config.emoji}</span>
                        <span className={`text-xs font-medium tracking-wide ${selectedCat === key ? 'text-white' : 'text-[--text-muted]'}`}>
                            {config.label}
                        </span>
                    </motion.button>
                ))}
            </div>

            {/* Role Picker Bottom Sheet */}
            <AnimatePresence>
                {selectedCat && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedCat(null)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-[--bg-secondary] border-t border-[--border] rounded-t-[32px] p-8 z-50 pb-12"
                        >
                            <div className="w-12 h-1 bg-[--border] rounded-full mx-auto mb-8" />

                            <div className="flex items-center gap-3 mb-6 bg-[--bg-card] w-fit px-4 py-2 rounded-full border border-[--border]">
                                <span className="text-xl">{CATEGORY_CONFIG[selectedCat].emoji}</span>
                                <span className="text-sm font-bold font-syne uppercase tracking-wider">
                                    You selected: {CATEGORY_CONFIG[selectedCat].label}
                                </span>
                            </div>

                            <h3 className="text-2xl font-bold font-syne mb-6">I am a...</h3>

                            <div className="space-y-4">
                                <button
                                    onClick={() => handleRoleSelect('provider')}
                                    className="w-full flex items-center justify-between p-5 glass-card border-[--border] hover:border-[--accent] transition-all group"
                                >
                                    <div className="text-left">
                                        <div className="text-lg font-bold font-syne group-hover:text-[--accent] transition-colors">
                                            {CATEGORY_CONFIG[selectedCat].providerLabel}
                                        </div>
                                        <div className="text-sm text-[--text-muted]">
                                            {selectedCat === 'marriage' ? 'Introducing the groom' : 'I offer my skills / services'}
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-[--bg-card] flex items-center justify-center border border-[--border] group-hover:border-[--accent] group-hover:text-[--accent]">
                                        👤
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleRoleSelect('seeker')}
                                    className="w-full flex items-center justify-between p-5 glass-card border-[--border] hover:border-[--accent] transition-all group"
                                >
                                    <div className="text-left">
                                        <div className="text-lg font-bold font-syne group-hover:text-[--accent] transition-colors">
                                            {CATEGORY_CONFIG[selectedCat].seekerLabel}
                                        </div>
                                        <div className="text-sm text-[--text-muted]">
                                            {selectedCat === 'marriage' ? 'Looking for a match' : 'I am looking for expert help'}
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-[--bg-card] flex items-center justify-center border border-[--border] group-hover:border-[--accent] group-hover:text-[--accent]">
                                        🔍
                                    </div>
                                </button>
                            </div>

                            <div className="mt-8 flex flex-col items-center gap-4">
                                <button
                                    onClick={() => handleRoleSelect('provider')} // Default guest role if they just want to browse
                                    className="text-[--accent] font-bold font-syne text-sm uppercase tracking-widest hover:underline"
                                >
                                    Continue as Guest →
                                </button>
                                <div className="text-xs text-[--text-muted]">
                                    Already have an account? <Link href="/auth/login" className="text-white hover:underline">Login</Link>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
