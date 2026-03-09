'use client';

import React from 'react';

const stats = [
    { value: "8", label: "Industries Covered" },
    { value: "100%", label: "FREE to Register" },
    { value: "60s", label: "To Upload Your Video" },
    { value: "PKR 1,000", label: "To Unlock a Contact" },
];

export default function StatsSection() {
    return (
        <section style={{
            width: '100%',
            overflowX: 'hidden',
            padding: 'clamp(32px, 6vw, 80px) clamp(16px, 4vw, 32px)',
            background: '#fff',
            borderBottom: '1px solid #f1f5f9',
        }}>
            <div style={{
                maxWidth: 480,
                margin: '0 auto',
                width: '100%',
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12,
                    maxWidth: 340,
                    margin: '0 auto',
                }}>
                    {stats.map((stat, i) => (
                        <div key={i} style={{
                            background: '#F8F8F8',
                            border: '1px solid #E5E5E5',
                            borderRadius: 12,
                            padding: 'clamp(12px, 3vw, 20px)',
                            textAlign: 'center',
                        }}>
                            <div style={{
                                fontFamily: 'Syne',
                                fontWeight: 900,
                                fontSize: 'clamp(18px, 5vw, 32px)',
                                color: '#FF0069',
                            }}>
                                {stat.value}
                            </div>
                            <div style={{
                                fontFamily: 'DM Sans',
                                fontSize: 'clamp(10px, 2.2vw, 12px)',
                                color: '#666',
                                marginTop: 4,
                            }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

