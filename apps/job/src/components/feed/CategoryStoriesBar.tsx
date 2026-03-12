'use client';

import { useRef, useEffect } from 'react';
import { useCategory } from '@/context/CategoryContext';
import type { CategoryKey } from '@/lib/categories';

const CATEGORIES = [
    { key: 'jobs',        label: 'Jobs',        emoji: '💼', accent: '#FF0069' },
    { key: 'healthcare',  label: 'Healthcare',  emoji: '🏥', accent: '#00C896' },
    { key: 'education',   label: 'Education',   emoji: '🎓', accent: '#FFD600' },
    { key: 'marriage',    label: 'Marriage',    emoji: '💍', accent: '#FF6B9D' },
    { key: 'legal',       label: 'Legal',       emoji: '⚖️', accent: '#4A90D9' },
    { key: 'realestate',  label: 'Real Estate', emoji: '🏠', accent: '#7638FA' },
    { key: 'transport',   label: 'Transport',   emoji: '🚛', accent: '#FF8C00' },
    { key: 'travel',      label: 'Travel',      emoji: '✈️', accent: '#00BFFF' },
    { key: 'agriculture', label: 'Agriculture', emoji: '🌾', accent: '#4CAF50' },
    { key: 'sellbuy',     label: 'Sell & Buy',  emoji: '🛍️', accent: '#FF5722' },
];

interface CategoryStoriesBarProps {
    onCategoryChange: () => void;
}

export function CategoryStoriesBar({ onCategoryChange }: CategoryStoriesBarProps) {
    const { activeCategory, setActiveCategory } = useCategory();
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

    const handleCategoryTap = (catKey: string) => {
        setActiveCategory(catKey as CategoryKey);
        sessionStorage.removeItem('feed_last_index');
        onCategoryChange();
    };

    return (
        <div style={{
            padding: '10px 0 12px 0',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            position: 'relative',
            zIndex: 25,
        }}>
            <div
                ref={scrollRef}
                style={{
                    display: 'flex',
                    gap: 14,
                    overflowX: 'scroll',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                    paddingLeft: 14,
                    paddingRight: 14,
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
                                gap: 6,
                                cursor: 'pointer',
                            }}
                        >
                            {/* Circle */}
                            <div style={{
                                width: 58,
                                height: 58,
                                borderRadius: '50%',
                                padding: 2,
                                background: isActive
                                    ? `linear-gradient(135deg, ${cat.accent}, #7638FA)`
                                    : 'rgba(255,255,255,0.15)',
                                transition: 'all 0.25s ease',
                                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                boxShadow: isActive ? `0 0 16px ${cat.accent}88` : 'none',
                                flexShrink: 0,
                            }}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    background: isActive
                                        ? 'rgba(0,0,0,0.28)'
                                        : 'rgba(255,255,255,0.08)',
                                    border: '2px solid rgba(255,255,255,0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 24,
                                    transition: 'background 0.25s',
                                }}>
                                    {cat.emoji}
                                </div>
                            </div>

                            {/* Label */}
                            <span style={{
                                fontSize: 10,
                                fontFamily: 'DM Sans, sans-serif',
                                fontWeight: isActive ? 700 : 400,
                                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                                textAlign: 'center',
                                maxWidth: 58,
                                lineHeight: 1.2,
                                transition: 'color 0.25s',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                letterSpacing: isActive ? '0.3px' : '0px',
                            }}>
                                {cat.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
