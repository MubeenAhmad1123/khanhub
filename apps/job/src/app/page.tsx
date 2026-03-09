'use client';

import React, { useState, useEffect } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CategoryKey, CATEGORY_CONFIG, CategoryConfig } from '@/lib/categories';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase-config';

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

import HeroSection from '@/components/home/HeroSection';
import StatsSection from '@/components/home/StatsSection';
import CategorySection from '@/components/home/CategorySection';
import FeaturesSection from '@/components/home/FeaturesSection';
import WhoIsThisFor from '@/components/home/WhoIsThisFor';
import FinalCTA from '@/components/home/FinalCTA';

export default function HomePage() {
    const { setCategory, setRole } = useCategory();
    const [selectedCat, setSelectedCat] = useState<any>(null);
    const [showRolePicker, setShowRolePicker] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const saved = localStorage.getItem('jobreel_guest_prefs');
        if (saved) {
            router.replace('/feed');
        }
    }, [router]);

    const handleCategorySelect = (category: any) => {
        setSelectedCat(category);
        setCategory(category.key as CategoryKey);
        setShowRolePicker(true);
    };

    const handleRoleSelect = (role: 'provider' | 'seeker') => {
        setRole(role);
        localStorage.setItem('jobreel_guest_prefs', JSON.stringify({
            category: selectedCat.key,
            role: role,
            selectedAt: Date.now(),
        }));

        if (auth.currentUser) {
            updateDoc(doc(db, 'users', auth.currentUser.uid), {
                category: selectedCat.key,
                role: role,
                updatedAt: serverTimestamp(),
            }).catch(() => { });
        }

        setShowRolePicker(false);
        router.push('/feed');
    };

    return (
        <div style={{ overflowX: 'hidden', width: '100%' }} className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] font-poppins">

            {/* Navbar */}
            <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full relative z-50">
                <div className="flex items-center gap-2">
                    <span className="font-poppins font-black text-2xl tracking-tighter italic">
                        <span className="text-[#FF0069]">JOB</span><span className="text-[#0A0A0A]">REEL</span>
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/auth/login" className="text-sm font-bold uppercase tracking-widest text-[#333333] hover:text-[#FF0069] transition-colors">
                        Login
                    </Link>
                    <Link href="/auth/register" className="bg-[#FF0069] text-white px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-[#D00055] transition-all">
                        Start →
                    </Link>
                </div>
            </nav>

            <main style={{ overflowX: 'hidden', width: '100%', background: '#fff' }}>
                <HeroSection />
                <StatsSection />
                <CategorySection onSelect={handleCategorySelect} />
                <FeaturesSection />
                <WhoIsThisFor />
                <FinalCTA />
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
                            className="fixed bottom-0 left-0 right-0 bg-[#FFFFFF] border-t border-[#E5E5E5] text-[#0A0A0A] rounded-t-[40px] p-8 z-[101] pb-16 max-w-lg mx-auto"
                        >
                            <div className="w-12 h-1.5 bg-[#E5E5E5] rounded-full mx-auto mb-10" />

                            <div className="flex items-center gap-4 mb-2">
                                <span className="text-3xl" style={{ textShadow: `0 0 20px ${selectedCat.accent}66` }}>
                                    {selectedCat.emoji}
                                </span>
                                <span className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: selectedCat.accent }}>
                                    You selected {selectedCat.label}
                                </span>
                            </div>
                            <div className="w-full h-[1px] bg-[#E5E5E5] mb-8" />

                            <h3 className="text-3xl font-poppins font-bold mb-8">I am a...</h3>

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
                                    className="w-full py-5 border border-[#E5E5E5] rounded-2xl font-bold uppercase tracking-widest text-[10px] text-[#888888] hover:text-[#0A0A0A] hover:border-[#CCCCCC] transition-all"
                                >
                                    → Browse as Guest
                                </button>
                            </div>

                            <div className="mt-8 text-center text-sm text-[#666666]">
                                Already have an account? <Link href="/auth/login" className="text-[#0A0A0A] font-bold underline decoration-[#FF0069]">Login</Link>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>


            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
                
                body {
                    background: #FFFFFF;
                    font-family: 'Poppins', sans-serif;
                }

                .font-poppins {
                    font-family: 'Poppins', sans-serif;
                }

                .category-card:hover img {
                    filter: brightness(0.7);
                    transform: scale(1.05);
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

                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border-width: 0;
                }
            `}</style>

        </div>
    );
}


function RoleOption({ title, tagline, icon, accent, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-5 p-5 bg-[#F8F8F8] border border-[#E5E5E5] rounded-2xl hover:border-[#CCCCCC] transition-all group relative overflow-hidden"
        >
            <div className="w-12 h-12 rounded-xl bg-[#F0F0F0] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div className="text-left">
                <div className="font-bold text-lg leading-tight mb-1 text-[#0A0A0A] transition-colors">
                    {title}
                </div>
                <div className="text-xs text-[#666666]">
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
