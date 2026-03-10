'use client';

import React from 'react';
import { useCategory } from '@/context/CategoryContext';
import { CategoryKey } from '@/lib/categories';

const CATEGORIES = [
    { key: 'jobs', label: 'Jobs', image: '/jobs.webp', accent: '#FF0069' },
    { key: 'healthcare', label: 'Healthcare', image: '/healthcare.webp', accent: '#00C896' },
    { key: 'education', label: 'Education', image: '/education (2).webp', accent: '#FFD600' },
    { key: 'marriage', label: 'Marriage', image: '/marraige.webp', accent: '#FF6B9D' },
    { key: 'legal', label: 'Legal', image: '/translation.webp', accent: '#4A90D9' },
    { key: 'realestate', label: 'Real Estate', image: '/real-estate.webp', accent: '#7638FA' },
    { key: 'transport', label: 'Transport', image: '/jobs.webp', accent: '#FF8C00' },
    { key: 'travel', label: 'Travel & Tour', image: '/jobs.webp', accent: '#00BFFF' },
    { key: 'agriculture', label: 'Agriculture', image: '/jobs.webp', accent: '#4CAF50' },
    { key: 'sellbuy', label: 'Sell & Buy', image: '/healthcare.webp', accent: '#FF5722' },
];

interface CategorySectionProps {
    onSelect?: (category: any) => void;
}

export default function CategorySection({ onSelect }: CategorySectionProps) {

    return (
        <section style={{
            width: '100%',
            overflowX: 'hidden',
            padding: 'clamp(32px, 6vw, 80px) clamp(16px, 4vw, 32px)',
            background: '#f8fafc',
            textAlign: 'center',
        }}>
            <div style={{
                maxWidth: 480,
                margin: '0 auto',
                width: '100%',
            }}>
                <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#FF0069',
                    fontFamily: 'Poppins',
                    display: 'block',
                    marginBottom: 12,
                }}>
                    10 Categories. One Platform.
                </span>

                <h2 style={{
                    fontFamily: 'Poppins',
                    fontWeight: 900,
                    fontSize: 'clamp(20px, 5vw, 32px)',
                    color: '#0A0A0A',
                    margin: '0 0 16px',
                }}>
                    Whatever You Need — We've Got a Category
                </h2>

                <p style={{
                    fontFamily: 'Poppins',
                    fontSize: 'clamp(12px, 2.8vw, 15px)',
                    color: '#666',
                    maxWidth: '90%',
                    margin: '0 auto 40px',
                    lineHeight: 1.6,
                }}>
                    Whether you're hiring, healing, teaching, or building — KHAN HUB connects the right people through real videos. No middlemen. No guesswork.
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',  // 3 columns = 2 rows of 3
                    gap: 'clamp(12px, 3vw, 24px)',
                    maxWidth: 480,
                    margin: '0 auto',
                    padding: '0 16px',
                }}>
                    {CATEGORIES.map((cat) => (
                        <div
                            key={cat.key}
                            onClick={() => onSelect?.(cat)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer',
                            }}
                        >
                            {/* Circular image */}
                            <div style={{
                                width: 'clamp(64px, 16vw, 88px)',
                                height: 'clamp(64px, 16vw, 88px)',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: `2.5px solid ${cat.accent}`,
                                boxShadow: `0 0 0 3px ${cat.accent}22`,
                                flexShrink: 0,
                            }}>
                                <img
                                    src={cat.image}
                                    alt={cat.label}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            </div>

                            {/* Label */}
                            <span style={{
                                fontFamily: 'Poppins',
                                fontWeight: 600,
                                fontSize: 'clamp(10px, 2.5vw, 13px)',
                                color: '#0A0A0A',
                                textAlign: 'center',
                                lineHeight: 1.2,
                            }}>
                                {cat.label}
                            </span>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}
