'use client';

import { useRef, useEffect, useState } from 'react';
import { useCategory } from '@/context/CategoryContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { CategoryKey } from '@/lib/categories';

const CATEGORIES = [
    { key: 'jobs', label: 'Jobs', emoji: '💼', image: '/jobs.webp', accent: '#FF0069' },
    { key: 'healthcare', label: 'Healthcare', emoji: '🏥', image: '/healthcare.webp', accent: '#00C896' },
    { key: 'education', label: 'Education', emoji: '🎓', image: '/education (2).webp', accent: '#FFD600' },
    { key: 'marriage', label: 'Marriage', emoji: '💍', image: '/marraige.webp', accent: '#FF6B9D' },
    { key: 'legal', label: 'Legal', emoji: '⚖️', image: '/translation.webp', accent: '#4A90D9' },
    { key: 'realestate', label: 'Real Estate', emoji: '🏠', image: '/real-estate.webp', accent: '#7638FA' },
    { key: 'transport', label: 'Transport', emoji: '🚛', image: '/jobs.webp', accent: '#FF8C00' },
    { key: 'travel', label: 'Travel', emoji: '✈️', image: '/jobs.webp', accent: '#00BFFF' },
    { key: 'agriculture', label: 'Agriculture', emoji: '🌾', image: '/jobs.webp', accent: '#4CAF50' },
    { key: 'sellbuy', label: 'Sell & Buy', emoji: '🛍️', image: '/healthcare.webp', accent: '#FF5722' },
];

// Role labels per category
const ROLE_OPTIONS: Record<string, { provider: string; seeker: string }> = {
    jobs: { provider: 'Job Seeker', seeker: 'Employer' },
    healthcare: { provider: 'Doctor', seeker: 'Patient' },
    education: { provider: 'Teacher', seeker: 'Student' },
    marriage: { provider: 'Presenting', seeker: 'Looking' },
    legal: { provider: 'Lawyer', seeker: 'Client' },
    realestate: { provider: 'Agent', seeker: 'Buyer' },
    transport: { provider: 'Driver', seeker: 'Passenger' },
    travel: { provider: 'Agency', seeker: 'Traveler' },
    agriculture: { provider: 'Farmer', seeker: 'Buyer' },
    sellbuy: { provider: 'Seller', seeker: 'Buyer' },
};

interface CategoryStoriesBarProps {
    onCategoryChange: () => void; // called after category+role set — triggers feed refresh
}

export function CategoryStoriesBar({ onCategoryChange }: CategoryStoriesBarProps) {
    const { activeCategory, setActiveCategory, setActiveRole } = useCategory();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Bottom sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [pendingCategory, setPendingCategory] = useState<string | null>(null);

    // Auto-slide animation — scrolls right then loops back
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        let direction = 1;
        let pos = 0;
        const maxScroll = container.scrollWidth - container.clientWidth;

        const interval = setInterval(() => {
            pos += direction * 0.6; // slow drift speed
            if (pos >= maxScroll) { direction = -1; }
            if (pos <= 0) { direction = 1; }
            container.scrollLeft = pos;
        }, 16); // ~60fps

        // Pause auto-slide on user touch
        const pause = () => clearInterval(interval);
        container.addEventListener('touchstart', pause, { passive: true });
        container.addEventListener('mousedown', pause);

        return () => {
            clearInterval(interval);
            container.removeEventListener('touchstart', pause);
            container.removeEventListener('mousedown', pause);
        };
    }, []);

    const handleCategoryTap = (catKey: string) => {
        setPendingCategory(catKey);
        setSheetOpen(true);
    };

    const handleRoleSelect = (role: 'provider' | 'seeker') => {
        if (!pendingCategory) return;
        setActiveCategory(pendingCategory as CategoryKey);
        setActiveRole(role);
        setSheetOpen(false);
        setPendingCategory(null);
        sessionStorage.removeItem('feed_last_index');
        onCategoryChange(); // signal VideoFeed to re-query and scroll to top
    };

    const pending = CATEGORIES.find(c => c.key === pendingCategory);

    return (
        <>
            {/* ── STORIES BAR ── */}
            <div style={{
                padding: '10px 0 10px 12px',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #E5E5E5',
                position: 'relative',
                zIndex: 25,
            }}>
                <div
                    ref={scrollRef}
                    style={{
                        display: 'flex',
                        gap: 12,
                        overflowX: 'scroll',
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch',
                        paddingRight: 12,
                        userSelect: 'none',
                    }}
                    className="scrollbar-hide"
                >
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat.key;
                        return (
                            <div
                                key={cat.key}
                                onClick={() => handleCategoryTap(cat.key)}
                                style={{
                                    flexShrink: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 5,
                                    cursor: 'pointer',
                                }}
                            >
                                {/* Circle card — like Instagram story */}
                                <div style={{
                                    width: 62,
                                    height: 62,
                                    borderRadius: '50%',
                                    padding: 2.5,
                                    background: isActive
                                        ? `linear-gradient(135deg, ${cat.accent}, #7638FA)`
                                        : '#CCCCCC',
                                    transition: 'background 0.3s, transform 0.2s',
                                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                                    flexShrink: 0,
                                }}>
                                    <div style={{
                                        width: '100%', height: '100%',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '2px solid #fff',
                                        position: 'relative',
                                    }}>
                                        {/* Background image */}
                                        <img
                                            src={cat.image}
                                            alt={cat.label}
                                            style={{
                                                width: '100%', height: '100%',
                                                objectFit: 'cover',
                                                filter: isActive ? 'brightness(0.75)' : 'brightness(0.5)',
                                                transition: 'filter 0.3s',
                                            }}
                                            draggable={false}
                                        />
                                        {/* Emoji overlay */}
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 22,
                                        }}>
                                            {cat.emoji}
                                        </div>
                                    </div>
                                </div>

                                {/* Label */}
                                <span style={{
                                    fontSize: 10,
                                    fontFamily: 'DM Sans',
                                    fontWeight: isActive ? 700 : 400,
                                    color: isActive ? cat.accent : '#0A0A0A',
                                    textAlign: 'center',
                                    maxWidth: 62,
                                    lineHeight: 1.2,
                                    transition: 'color 0.3s',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {cat.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── ROLE PICKER BOTTOM SHEET ── */}
            <AnimatePresence>
                {sheetOpen && pending && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSheetOpen(false)}
                            style={{
                                position: 'fixed', inset: 0,
                                background: 'rgba(255,255,255,0.7)',
                                zIndex: 90,
                                backdropFilter: 'blur(4px)',
                            }}
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            style={{
                                position: 'fixed', bottom: 0, left: 0, right: 0,
                                background: '#fff',
                                borderRadius: '20px 20px 0 0',
                                padding: '16px 20px 40px',
                                zIndex: 91,
                                maxWidth: 600,
                                margin: '0 auto',
                            }}
                        >
                            {/* Drag handle */}
                            <div style={{
                                width: 36, height: 4, borderRadius: 999,
                                background: '#ddd', margin: '0 auto 20px',
                            }} />

                            {/* Category header */}
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{ fontSize: 36, marginBottom: 6 }}>{pending.emoji}</div>
                                <h3 style={{
                                    fontFamily: 'Poppins', fontWeight: 800,
                                    fontSize: 20, color: '#000', margin: '0 0 4px',
                                }}>
                                    {pending.label}
                                </h3>
                                <p style={{ color: '#666', fontFamily: 'DM Sans', fontSize: 13, margin: 0 }}>
                                    I am a...
                                </p>
                            </div>

                            {/* Role options */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Provider option */}
                                <button
                                    onClick={() => handleRoleSelect('provider')}
                                    style={{
                                        width: '100%', padding: '16px 20px',
                                        background: '#f9f9f9',
                                        border: `1px solid ${pending.accent}44`,
                                        borderRadius: 14, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center',
                                        gap: 14, textAlign: 'left',
                                        transition: 'border-color 0.2s, background 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = pending.accent;
                                        e.currentTarget.style.background = `${pending.accent}11`;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = `${pending.accent}44`;
                                        e.currentTarget.style.background = '#f9f9f9';
                                    }}
                                >
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '50%',
                                        background: `${pending.accent}22`,
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: 20, flexShrink: 0,
                                    }}>
                                        {pending.key === 'dailywages' ? '👷' :
                                            pending.key === 'marriage' ? '💍' :
                                                pending.key === 'property' ? '🏠' :
                                                    pending.key === 'automobiles' ? '🚗' : '🙋'}
                                    </div>
                                    <div>
                                        <div style={{
                                            color: '#000', fontFamily: 'Poppins',
                                            fontWeight: 700, fontSize: 15,
                                        }}>
                                            {ROLE_OPTIONS[pending.key]?.provider}
                                        </div>
                                        <div style={{
                                            color: '#666', fontFamily: 'DM Sans', fontSize: 12, marginTop: 2,
                                        }}>
                                            {pending.key === 'dailywages' ? 'I am looking for daily work' :
                                                pending.key === 'marriage' ? 'I am looking for a partner' :
                                                    pending.key === 'property' ? 'I am selling or renting property' :
                                                        pending.key === 'automobiles' ? 'I am selling a vehicle' :
                                                            'I provide the service'}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', color: pending.accent, fontSize: 18 }}>›</div>
                                </button>

                                {/* Seeker option */}
                                <button
                                    onClick={() => handleRoleSelect('seeker')}
                                    style={{
                                        width: '100%', padding: '16px 20px',
                                        background: '#f9f9f9',
                                        border: '1px solid #eee',
                                        borderRadius: 14, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center',
                                        gap: 14, textAlign: 'left',
                                        transition: 'border-color 0.2s, background 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = '#ccc';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = '#eee';
                                    }}
                                >
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '50%',
                                        background: '#eee',
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: 20, flexShrink: 0,
                                    }}>
                                        {pending.key === 'dailywages' ? '🏢' :
                                            pending.key === 'marriage' ? '🤵' :
                                                pending.key === 'property' ? '🔑' :
                                                    pending.key === 'automobiles' ? '💰' : '🔍'}
                                    </div>
                                    <div>
                                        <div style={{
                                            color: '#000', fontFamily: 'Poppins',
                                            fontWeight: 700, fontSize: 15,
                                        }}>
                                            {ROLE_OPTIONS[pending.key]?.seeker}
                                        </div>
                                        <div style={{
                                            color: '#666', fontFamily: 'DM Sans', fontSize: 12, marginTop: 2,
                                        }}>
                                            {pending.key === 'dailywages' ? 'I want to hire workers' :
                                                pending.key === 'marriage' ? 'I am looking for a proposal' :
                                                    pending.key === 'property' ? 'I am looking to buy or rent' :
                                                        pending.key === 'automobiles' ? 'I am looking for a vehicle' :
                                                            'I need the service'}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', color: '#888', fontSize: 18 }}>›</div>
                                </button>
                            </div>

                            {/* Cancel */}
                            <button
                                onClick={() => setSheetOpen(false)}
                                style={{
                                    width: '100%', marginTop: 14,
                                    padding: '12px', background: 'none',
                                    border: 'none', color: '#666',
                                    fontFamily: 'DM Sans', fontSize: 13,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
