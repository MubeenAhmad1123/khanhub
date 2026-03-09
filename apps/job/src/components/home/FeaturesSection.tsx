'use client';

import React from 'react';

const features = [
    {
        emoji: "🎬",
        title: "Video Profiles That Speak",
        description: "Forget boring text CVs. Upload a short video and let people see the real you. Works for jobs, services, professionals — every industry."
    },
    {
        emoji: "📱",
        title: "TikTok-Style Feed",
        description: "Scroll through a full-screen feed of professionals. Swipe up to see more. Tap to connect. It's that fast."
    },
    {
        emoji: "🌉",
        title: "Bridge Across 8 Industries",
        description: "Jobs, Healthcare, Education, Marriage, Domestic Help, Legal, Real Estate, IT & Tech — all in one app, all in Pakistan."
    },
    {
        emoji: "🔓",
        title: "Simple & Transparent",
        description: "Signing up is FREE. Uploading your video is FREE. Pay only Rs. 1,000 when you want to unlock someone's contact — no hidden fees, ever."
    },
];

export default function FeaturesSection() {
    const freeStyle = { fontWeight: 900, color: '#FF0069', fontStyle: 'italic' as const };

    return (
        <section style={{
            width: '100%',
            overflowX: 'hidden',
            padding: 'clamp(32px, 6vw, 80px) clamp(16px, 4vw, 32px)',
            background: '#fff',
        }}>
            <div style={{
                maxWidth: 560,
                margin: '0 auto',
                width: '100%',
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 12,
                    maxWidth: 560,
                    margin: '0 auto',
                }}>
                    {features.map((feature, i) => (
                        <div key={i} style={{
                            background: '#F8F8F8',
                            border: '1px solid #E5E5E5',
                            borderRadius: 16,
                            padding: 'clamp(14px, 3vw, 24px)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }}>
                            <div style={{
                                fontSize: 32,
                                marginBottom: 16,
                            }}>
                                {feature.emoji}
                            </div>
                            <h3 style={{
                                fontFamily: 'Syne',
                                fontWeight: 700,
                                fontSize: 'clamp(13px, 3vw, 16px)',
                                color: '#0A0A0A',
                                marginBottom: 0,
                            }}>
                                {feature.title}
                            </h3>
                            <p style={{
                                fontFamily: 'DM Sans',
                                fontSize: 'clamp(11px, 2.5vw, 13px)',
                                color: '#555',
                                lineHeight: 1.6,
                                margin: 0,
                            }}>
                                {feature.description.split('FREE').map((part, index, array) => (
                                    <React.Fragment key={index}>
                                        {part}
                                        {index < array.length - 1 && <span style={freeStyle}>FREE</span>}
                                    </React.Fragment>
                                ))}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

