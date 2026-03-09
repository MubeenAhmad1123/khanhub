'use client';

import React from 'react';
import Link from 'next/link';

export default function HeroSection() {
    const freeStyle = { fontWeight: 900, color: '#FF0069', fontStyle: 'italic' as const };

    return (
        <section style={{
            padding: 'clamp(40px, 8vw, 100px) clamp(16px, 4vw, 48px)',
            textAlign: 'center',
            overflowX: 'hidden',
            background: '#fff',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <h1 style={{
                    fontFamily: 'Syne',
                    fontWeight: 900,
                    fontSize: 'clamp(24px, 6vw, 52px)',
                    color: '#0A0A0A',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    margin: '0 0 16px',
                }}>
                    Pakistan's First Video-First Connection Platform
                </h1>

                <h2 style={{
                    fontFamily: 'Syne',
                    fontWeight: 700,
                    fontSize: 'clamp(14px, 3.5vw, 20px)',
                    color: '#FF0069',
                    margin: '0 0 24px',
                }}>
                    Scroll. Watch. Connect.
                </h2>

                <p style={{
                    fontFamily: 'DM Sans',
                    fontSize: 'clamp(13px, 3vw, 16px)',
                    color: '#666',
                    lineHeight: 1.6,
                    maxWidth: 700,
                    margin: '0 auto 40px',
                }}>
                    JobReel bridges job seekers with employers, doctors with patients, teachers with students, lawyers with clients — and more. Show who you are in 60 seconds. No CVs. No forms. Just you.
                </p>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    maxWidth: 400,
                    margin: '0 auto',
                }}>
                    <Link href="/auth/register" style={{
                        width: '100%',
                        padding: 'clamp(12px, 3vw, 16px) clamp(20px, 4vw, 32px)',
                        background: '#FF0069',
                        color: '#fff',
                        borderRadius: 12,
                        fontFamily: 'Syne',
                        fontWeight: 700,
                        fontSize: 'clamp(13px, 3vw, 16px)',
                        textDecoration: 'none',
                        transition: 'transform 0.2s',
                    }}>
                        Start Watching — It's <span style={freeStyle}>FREE</span> →
                    </Link>

                    <Link href="/dashboard/upload-video" style={{
                        width: '100%',
                        padding: 'clamp(12px, 3vw, 16px) clamp(20px, 4vw, 32px)',
                        background: '#fff',
                        color: '#0A0A0A',
                        border: '2px solid #0A0A0A',
                        borderRadius: 12,
                        fontFamily: 'Syne',
                        fontWeight: 700,
                        fontSize: 'clamp(13px, 3vw, 16px)',
                        textDecoration: 'none',
                        transition: 'transform 0.2s',
                    }}>
                        Upload Your Video — <span style={freeStyle}>FREE</span>
                    </Link>
                </div>

                <p style={{
                    marginTop: 20,
                    fontSize: 12,
                    color: '#888',
                    fontFamily: 'DM Sans',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                }}>
                    <span>✓ Registration <span style={freeStyle}>FREE</span></span>
                    <span>✓ Video Upload <span style={freeStyle}>FREE</span></span>
                    <span>✓ 8 Industries</span>
                </p>
            </div>
        </section>
    );
}
