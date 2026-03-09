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
            padding: 'clamp(40px, 8vw, 60px) clamp(16px, 4vw, 48px)',
            background: '#fff',
            borderBottom: '1px solid #f1f5f9',
        }}>
            <div style={{
                maxWidth: 1000,
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 16,
            }} className="md:grid-cols-4 lg:flex lg:justify-between lg:gap-32">
                {stats.map((stat, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{
                            fontFamily: 'Syne',
                            fontWeight: 900,
                            fontSize: 'clamp(22px, 6vw, 48px)',
                            color: '#FF0069',
                            lineHeight: 1,
                            marginBottom: 4,
                        }}>
                            {stat.value}
                        </div>
                        <div style={{
                            fontFamily: 'DM Sans',
                            fontWeight: 700,
                            fontSize: 'clamp(11px, 2.5vw, 14px)',
                            color: '#666',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            {stat.label.includes('FREE') ? (
                                <>
                                    {stat.label.split('FREE')[0]}
                                    <span style={{ fontWeight: 900, fontStyle: 'italic', color: '#FF0069' }}>FREE</span>
                                    {stat.label.split('FREE')[1]}
                                </>
                            ) : stat.label}
                        </div>
                    </div>
                ))}
            </div>
            <style jsx>{`
                @media (min-width: 768px) {
                    div {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }
            `}</style>
        </section>
    );
}
