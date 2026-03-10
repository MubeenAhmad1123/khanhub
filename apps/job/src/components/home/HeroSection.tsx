'use client';

import React from 'react';
import Link from 'next/link';

export default function HeroSection() {
    const freeStyle = { fontWeight: 900, color: '#FF0069', fontStyle: 'italic' as const };

    return (
        <section style={{
            width: '100%',
            overflowX: 'hidden',
            padding: 'clamp(32px, 6vw, 80px) clamp(16px, 4vw, 32px)',
            textAlign: 'center',
            background: '#fff',
        }}>
            <div style={{
                maxWidth: 480,
                margin: '0 auto',
                width: '100%',
            }}>
                <h1 style={{
                    fontFamily: 'Poppins',
                    fontWeight: 800,
                    fontSize: 'clamp(22px, 5vw, 44px)',
                    color: '#0A0A0A',
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    margin: '0 0 16px',
                }}>
                    Pakistan's First Video-First Connection Platform
                </h1>

                <h2 style={{
                    fontFamily: 'Poppins',
                    fontWeight: 700,
                    fontSize: 'clamp(14px, 3vw, 20px)',
                    color: '#FF0069',
                    margin: '0 0 24px',
                    letterSpacing: '0.05em',
                }}>
                    Scroll. Watch. Connect.
                </h2>

                <p style={{
                    fontFamily: 'Poppins',
                    fontSize: 'clamp(12px, 2.8vw, 15px)',
                    color: '#666',
                    lineHeight: 1.6,
                    maxWidth: '90%',
                    margin: '0 auto 40px',
                }}>
                    KHAN HUB bridges workers with hiring companies, grooms with brides, property agents with buyers, and sellers with buyers. Show who you are in 60 seconds. No CVs. No forms. Just you.
                </p>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',   // ALWAYS column
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    maxWidth: 360,
                    margin: '20px auto 0',
                }}>
                    <Link href="/auth/register" style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: '#FF0069',
                        color: '#fff',
                        borderRadius: 12,
                        fontFamily: 'Poppins',
                        fontWeight: 700,
                        fontSize: 'clamp(13px, 3vw, 15px)',
                        textDecoration: 'none',
                        transition: 'transform 0.2s',
                    }}>
                        Start Watching — It's <span style={freeStyle}>FREE</span> →
                    </Link>

                    <Link href="/dashboard/upload-video" style={{
                        width: '100%',
                        padding: '13px 20px',
                        background: '#fff',
                        color: '#0A0A0A',
                        border: '2px solid #0A0A0A',
                        borderRadius: 12,
                        fontFamily: 'Poppins',
                        fontWeight: 700,
                        fontSize: 'clamp(13px, 3vw, 15px)',
                        textDecoration: 'none',
                        transition: 'transform 0.2s',
                    }}>
                        Upload Your Video — <span style={freeStyle}>FREE</span>
                    </Link>
                </div>

                <p style={{
                    marginTop: 10,
                    fontSize: 'clamp(10px, 2.2vw, 12px)',
                    color: '#888',
                    fontFamily: 'Poppins',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                }}>

                    <span>✓ Registration <span style={freeStyle}>FREE</span></span>
                    <span>✓ Video Upload <span style={freeStyle}>FREE</span></span>
                    <span>✓ 6 Categories</span>
                </p>
            </div>
        </section>
    );
}

