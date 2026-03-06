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
            <header className="px-6 pt-12 pb-16 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        fontFamily: 'Syne', fontWeight: 900,
                        fontSize: 'clamp(36px, 6vw, 72px)',
                        color: '#fff', lineHeight: 1.1, margin: 0,
                        marginBottom: 16
                    }}
                >
                    Find Your<br />
                    <span className="text-[#FF0069] italic">Perfect Match.</span>
                </motion.h1>
                <div className="w-32 h-1 bg-[#FF0069] mb-8" />
                <p className="text-[--text-muted] max-w-md text-lg leading-relaxed mb-4">
                    Video-first platform connecting people across 8 industries in Pakistan.
                </p>
                <p className="font-bold uppercase tracking-widest text-[#888] font-sans" style={{ fontSize: 'clamp(14px, 1.5vw, 16px)' }}>
                    Select your industry to begin
                </p>
            </header>

            {/* Category Grid */}
            <main className="px-6 pb-24 max-w-7xl mx-auto w-full flex flex-col items-center">
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
                    width: '100%', maxWidth: 800,
                }} className="category-grid">
                    {HOMEPAGE_CATEGORIES.map((cat) => (
                        <div
                            key={cat.key}
                            onClick={() => handleCategorySelect(cat)}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                        >
                            <div style={{
                                width: 'clamp(70px, 10vw, 100px)', height: 'clamp(70px, 10vw, 100px)',
                                borderRadius: '50%', overflow: 'hidden',
                                border: `2px solid #1A1A1A`,
                                transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.2s',
                                position: 'relative', flexShrink: 0,
                            }}
                                className={`cat-circle ${selectedCat?.key === cat.key ? 'selected' : ''}`}
                            >
                                <img
                                    src={`/${cat.image}`} alt={cat.label}
                                    style={{
                                        width: '100%', height: '100%', objectFit: 'cover',
                                        filter: selectedCat?.key === cat.key ? 'brightness(0.8)' : 'brightness(0.6)',
                                        transition: 'filter 0.3s, transform 0.4s',
                                    }}
                                />
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                                    {cat.emoji}
                                </div>
                            </div>
                            <span style={{
                                fontFamily: 'DM Sans', fontWeight: 600, fontSize: 12,
                                color: selectedCat?.key === cat.key ? cat.accent : '#888',
                                textAlign: 'center', transition: 'color 0.3s', lineHeight: 1.2,
                            }}>
                                {cat.label}
                            </span>
                        </div>
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

                }
                
                @media (max-width: 480px) {
                    .category-grid {
                        grid-template-columns: repeat(4, 1fr) !important;
                        gap: 12px !important;
                    }
                }
                .cat-circle.selected {
                    border-color: var(--accent) !important;
                    box-shadow: 0 0 20px rgba(255,0,105,0.4);
                    transform: scale(1.05);
                }
                .cat-circle:hover {
                    border-color: var(--accent) !important;
                    transform: scale(1.05);
                }
                .cat-circle:hover img {
                    filter: brightness(0.8) !important;
                }
            `}</style>
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
