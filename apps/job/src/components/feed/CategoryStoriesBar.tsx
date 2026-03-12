'use client';

import { useRef, useEffect, useState } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CATEGORY_CONFIG, type CategoryKey } from '@/lib/categories';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';

const CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    key: key as CategoryKey,
    label: config.label,
    emoji: config.emoji,
    accent: config.accent,
    imageUrl: config.imageUrl,
    providerLabel: config.providerLabel,
    seekerLabel: config.seekerLabel,
    providerDescription: config.providerDescription,
    seekerDescription: config.seekerDescription,
}));

interface CategoryStoriesBarProps {
    onCategoryChange: () => void;
}

export function CategoryStoriesBar({ onCategoryChange }: CategoryStoriesBarProps) {
    const { activeCategory, setActiveCategory, setActiveRole } = useCategory();
    const [selectingCat, setSelectingCat] = useState<CategoryKey | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-slide animation — slow drift right then back
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        let direction = 1;
        let pos = 0;
        const maxScroll = container.scrollWidth - container.clientWidth;

        const interval = setInterval(() => {
            pos += direction * 0.5;
            if (pos >= maxScroll) direction = -1;
            if (pos <= 0) direction = 1;
            container.scrollLeft = pos;
        }, 16);

        const pause = () => clearInterval(interval);
        container.addEventListener('touchstart', pause, { passive: true });
        container.addEventListener('mousedown', pause);

        return () => {
            clearInterval(interval);
            container.removeEventListener('touchstart', pause);
            container.removeEventListener('mousedown', pause);
        };
    }, []);

    const handleCategoryTap = (catKey: CategoryKey) => {
        setSelectingCat(catKey);
    };

    const handleRoleSelect = (role: 'provider' | 'seeker') => {
        if (!selectingCat) return;
        
        setActiveCategory(selectingCat);
        setActiveRole(role);
        
        // Use sessionStorage to signal the feed to reset to index 0 and "For You" tab
        sessionStorage.setItem('feed_reset_requested', 'true');
        sessionStorage.removeItem('feed_last_index');
        
        setSelectingCat(null);
        onCategoryChange();
    };

    return (
        <div style={{
            padding: '10px 16px',
            background: 'transparent',    // ← NOT white, NOT solid
            position: 'relative',
            zIndex: 25,
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
        }} className="scrollbar-hide" ref={scrollRef}>
            {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.key;
                return (
                    <button
                        key={cat.key}
                        onClick={() => handleCategoryTap(cat.key)}
                        style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '6px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        {/* Circle with accent border */}
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '50%',
                            border: `2px solid ${isActive
                                ? cat.accent
                                : 'rgba(255,255,255,0.4)'}`,
                            padding: '2px',
                            background: 'rgba(0,0,0,0.3)',   // ← dark translucent, NOT white
                            transition: 'all 0.25s ease',
                            transform: isActive ? 'scale(1.1)' : 'scale(1)',
                        }}>
                            <div style={{
                                width: '100%', height: '100%',
                                borderRadius: '50%', background: 'rgba(0,0,0,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '22px'
                            }}>
                                {cat.emoji}
                            </div>
                        </div>
                        {/* Label — white text, visible on dark video */}
                        <span style={{
                            fontSize: '10px', fontWeight: 500,
                            color: isActive ? cat.accent : '#FFFFFF',
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                            whiteSpace: 'nowrap',
                            fontFamily: 'DM Sans, sans-serif',
                        }}>
                            {cat.label}
                        </span>
                    </button>
                );
            })}

            {/* Role Selection Overlay */}
            <AnimatePresence>
                {selectingCat && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1000,
                            background: 'rgba(255,255,255,0.98)',
                            backdropFilter: 'blur(20px)',
                            display: 'flex',
                            flexDirection: 'column',
                            color: '#0A0A0A',
                            padding: '24px',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
                            <button 
                                onClick={() => setSelectingCat(null)}
                                style={{
                                    background: '#F0F0F0', border: 'none', borderRadius: '50%',
                                    width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#888' }}>
                                Step 1 of 2
                            </span>
                            <div style={{ width: 40 }} /> {/* Spacer */}
                        </div>

                        {/* Title */}
                        <div style={{ textAlign: 'center', marginBottom: 48 }}>
                            <h2 style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Poppins', marginBottom: 8, letterSpacing: '-0.5px' }}>
                                Who are you?
                            </h2>
                            <p style={{ fontSize: 15, color: '#666', fontWeight: 500 }}>
                                Select your role in {CATEGORY_CONFIG[selectingCat].label}
                            </p>
                        </div>

                        {/* Options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '0 auto', width: '100%' }}>
                            {[
                                { 
                                    id: 'provider', 
                                    label: CATEGORY_CONFIG[selectingCat].providerLabel, 
                                    desc: CATEGORY_CONFIG[selectingCat].providerDescription 
                                },
                                { 
                                    id: 'seeker', 
                                    label: CATEGORY_CONFIG[selectingCat].seekerLabel, 
                                    desc: CATEGORY_CONFIG[selectingCat].seekerDescription 
                                }
                            ].map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => handleRoleSelect(role.id as any)}
                                    style={{
                                        background: '#FFFFFF',
                                        border: '1.5px solid #EEE',
                                        borderRadius: '24px',
                                        padding: '24px',
                                        textAlign: 'left',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 20,
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'pointer',
                                    }}
                                    className="role-option-btn"
                                >
                                    <div style={{
                                        width: 52, height: 52, borderRadius: '18px',
                                        background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 24, flexShrink: 0
                                    }}>
                                        {role.id === 'provider' ? '👔' : '🔍'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{role.label}</div>
                                        <div style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>{role.desc}</div>
                                    </div>
                                    <div style={{ 
                                        width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #EEE',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'transparent'
                                    }}>
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer Info */}
                        <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 12, color: '#AAA', padding: '20px' }}>
                            You can change this anytime from your profile settings.
                        </div>

                        <style>{`
                            .role-option-btn:active {
                                transform: scale(0.97);
                                border-color: var(--accent) !important;
                                background-color: #F8F9FA !important;
                            }
                            .role-option-btn:active div:last-child {
                                background: var(--accent);
                                border-color: var(--accent) !important;
                                color: white !important;
                            }
                        `}</style>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
