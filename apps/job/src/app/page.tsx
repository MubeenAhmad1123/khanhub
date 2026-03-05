'use client';

import React, { useState } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CategoryKey, CATEGORY_CONFIG, CategoryConfig } from '@/lib/categories';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const HOMEPAGE_CATEGORIES = [
    { key: 'jobs', label: 'Jobs', emoji: '💼', image: 'jobs.webp', tagline: 'Find work & hire talent', accent: '#FF0069' },
    { key: 'healthcare', label: 'Healthcare', emoji: '🏥', image: 'healthcare.webp', tagline: 'Connect doctors & patients', accent: '#00C896' },
    { key: 'it', label: 'IT & Tech', emoji: '💻', image: 'tech.webp', tagline: 'Freelancers & tech clients', accent: '#00E5FF' },
    { key: 'education', label: 'Education', emoji: '🎓', image: 'education (2).webp', tagline: 'Teachers & students', accent: '#FFD600' },
    { key: 'marriage', label: 'Marriage', emoji: '💍', image: 'marraige.webp', tagline: 'Rishta connections', accent: '#FF6B9D' },
    { key: 'domestic', label: 'Domestic Help', emoji: '🏠', image: 'domestic help.webp', tagline: 'Helpers & households', accent: '#FF8C42' },
    { key: 'legal', label: 'Legal', emoji: '⚖️', image: 'lawyer.webp', tagline: 'Lawyers & clients', accent: '#4A90D9' },
    { key: 'realestate', label: 'Real Estate', emoji: '🏗️', image: 'real-estate.webp', tagline: 'Agents & buyers', accent: '#7638FA' },
];

export default function HomePage() {
    const { setCategory, setRole } = useCategory();
    const [selectedCat, setSelectedCat] = useState<any>(null);
    const [showRolePicker, setShowRolePicker] = useState(false);
    const router = useRouter();

    const handleCategorySelect = (category: any) => {
        setSelectedCat(category);
        setCategory(category.key as CategoryKey);
        setShowRolePicker(true);
    };

    const handleRoleSelect = (role: 'provider' | 'seeker') => {
        setRole(role);
        localStorage.setItem('jobreel_guest_prefs', JSON.stringify({
            category: selectedCat.key,
            role: role
        }));
        setShowRolePicker(false);
        router.push('/feed');
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">
            {/* Navbar */}
            <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <span className="font-syne font-black text-2xl tracking-tighter italic">
                        <span className="text-[#FF0069]">JOB</span>REEL
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/auth/login" className="text-sm font-bold uppercase tracking-widest hover:text-[#FF0069] transition-colors">
                        Login
                    </Link>
                    <Link href="/auth/register" className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-widest hover:bg-[#FF0069] hover:text-white transition-all">
                        Start →
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="px-6 pt-12 pb-16 max-w-7xl mx-auto w-full">
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-6xl md:text-8xl font-syne font-bold mb-6 leading-[0.9] tracking-tight"
                >
                    Find Your<br />
                    <span className="text-[#FF0069] italic">Perfect Match.</span>
                </motion.h1>
                <div className="w-32 h-1 bg-[#FF0069] mb-8" />
                <p className="text-[--text-muted] max-w-md text-lg leading-relaxed mb-4">
                    Video-first platform connecting people across 8 industries in Pakistan.
                </p>
                <p className="text-[--text-muted] font-bold text-sm uppercase tracking-widest">
                    Select your industry to begin
                </p>
            </header>

            {/* Category Grid */}
            <main className="px-6 pb-24 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {HOMEPAGE_CATEGORIES.map((cat) => (
                        <CategoryCard
                            key={cat.key}
                            category={cat}
                            isSelected={selectedCat?.key === cat.key}
                            onClick={() => handleCategorySelect(cat)}
                        />
                    ))}
                </div>
            </main>

            {/* Role Picker Sheet */}
            <AnimatePresence>
                {showRolePicker && selectedCat && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRolePicker(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-[#0D0D0D] border-t border-[#1A1A1A] rounded-t-[40px] p-8 z-[101] pb-16 max-w-lg mx-auto"
                        >
                            <div className="w-12 h-1.5 bg-[#1A1A1A] rounded-full mx-auto mb-10" />

                            <div className="flex items-center gap-4 mb-2">
                                <span className="text-3xl" style={{ textShadow: `0 0 20px ${selectedCat.accent}66` }}>
                                    {selectedCat.emoji}
                                </span>
                                <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: selectedCat.accent }}>
                                    You selected {selectedCat.label}
                                </span>
                            </div>
                            <div className="w-full h-[1px] bg-[#1A1A1A] mb-8" />

                            <h3 className="text-3xl font-syne font-bold mb-8">I am a...</h3>

                            <div className="space-y-4">
                                <RoleOption
                                    title={CATEGORY_CONFIG[selectedCat.key as CategoryKey].providerLabel}
                                    tagline="Showcase my services/profile"
                                    icon="👤"
                                    accent={selectedCat.accent}
                                    onClick={() => handleRoleSelect('provider')}
                                />

                                <RoleOption
                                    title={CATEGORY_CONFIG[selectedCat.key as CategoryKey].seekerLabel}
                                    tagline="Find and connect with others"
                                    icon="🏢"
                                    accent={selectedCat.accent}
                                    onClick={() => handleRoleSelect('seeker')}
                                />

                                <button
                                    onClick={() => router.push('/feed')}
                                    className="w-full py-5 border border-[#1A1A1A] rounded-2xl font-bold uppercase tracking-widest text-[10px] text-[--text-muted] hover:text-white hover:border-white transition-all"
                                >
                                    → Browse as Guest
                                </button>
                            </div>

                            <div className="mt-8 text-center text-sm text-[--text-muted]">
                                Already have an account? <Link href="/auth/login" className="text-white font-bold underline decoration-[#FF0069]">Login</Link>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;700&display=swap');
                
                body {
                    background: #050505;
                    font-family: 'DM Sans', sans-serif;
                }

                .font-syne {
                    font-family: 'Syne', sans-serif;
                }

                .category-card:hover img {
                    filter: brightness(0.7);
                    transform: scale(1.05);
                }

                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}

function CategoryCard({ category, isSelected, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`category-card relative aspect-[1/1.1] rounded-[24px] overflow-hidden cursor-pointer border border-[#1A1A1A] transition-all duration-300 group ${isSelected ? 'scale-[0.98]' : ''
                }`}
        >
            {/* Background image */}
            <img
                src={`/${category.image}`}
                alt={category.label}
                className="absolute inset-0 w-full h-full object-cover brightness-[0.4] transition-all duration-500"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <div className="text-3xl mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1 origin-left">
                    {category.emoji}
                </div>
                <div className="font-syne font-bold text-xl leading-tight text-white mb-1">
                    {category.label}
                </div>
                <div className="text-[10px] text-[--text-muted] font-medium tracking-wide">
                    {category.tagline}
                </div>
            </div>

            {/* Selection Glow Border */}
            <div
                className={`absolute inset-0 border-2 rounded-[24px] transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                    }`}
                style={{
                    borderColor: category.accent,
                    boxShadow: `inset 0 0 30px ${category.accent}33`
                }}
            />
        </div>
    );
}

function RoleOption({ title, tagline, icon, accent, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-5 p-5 bg-[#141414] border border-[#1A1A1A] rounded-2xl hover:border-[#333] transition-all group relative overflow-hidden"
        >
            <div className="w-12 h-12 rounded-xl bg-[#0d0d0d] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div className="text-left">
                <div className="font-bold text-lg leading-tight mb-1 group-hover:text-white transition-colors">
                    {title}
                </div>
                <div className="text-xs text-[--text-muted]">
                    {tagline}
                </div>
            </div>

            <div
                className="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: accent }}
            >
                <span className="text-xl">→</span>
            </div>
        </button>
    );
}
