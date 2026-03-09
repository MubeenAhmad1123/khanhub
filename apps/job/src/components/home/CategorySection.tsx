'use client';

import React from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CategoryKey } from '@/lib/categories';

const CATEGORIES = [
    { key: 'jobs', label: 'Jobs', emoji: '💼', image: '/jobs.webp', accent: '#FF0069' },
    { key: 'healthcare', label: 'Healthcare', emoji: '🏥', image: '/healthcare.webp', accent: '#00C896' },
    { key: 'it', label: 'IT & Tech', emoji: '💻', image: '/tech.webp', accent: '#00E5FF' },
    { key: 'education', label: 'Education', emoji: '🎓', image: '/education (2).webp', accent: '#FFD600' },
    { key: 'marriage', label: 'Marriage', emoji: '💍', image: '/marraige.webp', accent: '#FF6B9D' },
    { key: 'domestic', label: 'Domestic', emoji: '🏠', image: '/domestic help.webp', accent: '#FF8C42' },
    { key: 'legal', label: 'Legal', emoji: '⚖️', image: '/lawyer.webp', accent: '#4A90D9' },
    { key: 'realestate', label: 'Real Estate', emoji: '🏗️', image: '/real-estate.webp', accent: '#7638FA' },
];

interface CategorySectionProps {
    onSelect?: (category: any) => void;
}

export default function CategorySection({ onSelect }: CategorySectionProps) {

    return (
        <section style={{
            padding: 'clamp(40px, 8vw, 96px) clamp(16px, 4vw, 48px)',
            background: '#f8fafc',
            textAlign: 'center',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#FF0069',
                    fontFamily: 'DM Sans',
                    display: 'block',
                    marginBottom: 12,
                }}>
                    8 Industries. One Platform.
                </span>

                <h2 style={{
                    fontFamily: 'Syne',
                    fontWeight: 900,
                    fontSize: 'clamp(20px, 5vw, 40px)',
                    color: '#0A0A0A',
                    margin: '0 0 16px',
                }}>
                    Whatever You Need — We've Got a Category
                </h2>

                <p style={{
                    fontFamily: 'DM Sans',
                    fontSize: 'clamp(14px, 3vw, 16px)',
                    color: '#666',
                    maxWidth: 700,
                    margin: '0 auto 48px',
                    lineHeight: 1.6,
                }}>
                    Whether you're hiring, healing, teaching, or building — JobReel connects the right people through real videos. No middlemen. No guesswork.
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 'clamp(12px, 3vw, 24px)',
                }}>
                    {CATEGORIES.map((cat) => (
                        <div
                            key={cat.key}
                            onClick={() => onSelect?.(cat)}
                            style={{
                                background: '#fff',
                                padding: 'clamp(12px, 3vw, 24px)',
                                borderRadius: 20,
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 12,
                                transition: 'transform 0.2s, border-color 0.2s',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{
                                width: 'clamp(60px, 8vw, 80px)',
                                height: 'clamp(60px, 8vw, 80px)',
                                borderRadius: '50%',
                                background: `${cat.accent}10`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'clamp(28px, 6vw, 48px)',
                            }}>
                                {cat.emoji}
                            </div>
                            <span style={{
                                fontFamily: 'Syne',
                                fontWeight: 700,
                                fontSize: 'clamp(11px, 2.5vw, 15px)',
                                color: '#0A0A0A',
                            }}>
                                {cat.label}
                            </span>
                            <span style={{
                                color: cat.accent,
                                fontSize: 11,
                                fontWeight: 700,
                                fontFamily: 'DM Sans',
                            }}>
                                Watch Videos →
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
