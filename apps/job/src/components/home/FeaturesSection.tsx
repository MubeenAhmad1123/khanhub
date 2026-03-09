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
            padding: 'clamp(40px, 8vw, 96px) clamp(16px, 4vw, 48px)',
            background: '#fff',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 32,
                }}>
                    {features.map((feature, i) => (
                        <div key={i} style={{
                            padding: 32,
                            borderRadius: 24,
                            background: '#f8fafc',
                            border: '1px solid #f1f5f9',
                        }}>
                            <div style={{
                                fontSize: 40,
                                marginBottom: 20,
                            }}>
                                {feature.emoji}
                            </div>
                            <h3 style={{
                                fontFamily: 'Syne',
                                fontWeight: 800,
                                fontSize: 'clamp(15px, 3.5vw, 20px)',
                                color: '#0A0A0A',
                                marginBottom: 12,
                            }}>
                                {feature.title}
                            </h3>
                            <p style={{
                                fontFamily: 'DM Sans',
                                fontSize: 'clamp(12px, 2.5vw, 15px)',
                                color: '#666',
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
