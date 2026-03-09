'use client';

import React from 'react';
import Link from 'next/link';

export default function FinalCTA() {
    const freeStyle = { fontWeight: 900, color: '#FF0069', fontStyle: 'italic' as const };

    return (
        <section style={{
            width: '100%',
            overflowX: 'hidden',
            padding: 'clamp(32px, 6vw, 80px) clamp(16px, 4vw, 32px)',
            background: '#0A0A0A',
            textAlign: 'center',
            color: '#fff',
        }}>
            <div style={{
                maxWidth: 480,
                margin: '0 auto',
                width: '100%',
            }}>
                <h2 style={{
                    fontFamily: 'Syne',
                    fontWeight: 900,
                    fontSize: 'clamp(22px, 5.5vw, 36px)',
                    lineHeight: 1.1,
                    marginBottom: 20,
                }}>
                    Ready to Be Found?
                </h2>

                <p style={{
                    fontFamily: 'DM Sans',
                    fontSize: 'clamp(12px, 2.8vw, 15px)',
                    color: '#aaa',
                    maxWidth: '90%',
                    margin: '0 auto 40px',
                    lineHeight: 1.6,
                }}>
                    Join thousands of professionals across Pakistan already using video to connect faster.
                </p>

                <Link href="/auth/register" style={{
                    display: 'inline-block',
                    width: '100%',
                    maxWidth: 400,
                    padding: 'clamp(14px, 3vw, 18px) 24px',
                    background: '#fff',
                    color: '#0A0A0A',
                    borderRadius: 16,
                    fontFamily: 'Syne',
                    fontWeight: 800,
                    fontSize: 'clamp(14px, 3vw, 16px)',
                    textDecoration: 'none',
                    marginBottom: 20,
                    transition: 'transform 0.2s',
                }}>
                    Create Your <span style={freeStyle}>FREE</span> Profile →
                </Link>

                <p style={{
                    fontSize: 12,
                    color: '#666',
                    fontFamily: 'DM Sans',
                    margin: 0,
                }}>
                    No credit card. No subscription. Just upload and go.
                </p>
            </div>
        </section>
    );
}

