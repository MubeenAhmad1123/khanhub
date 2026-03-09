'use client';

import React from 'react';
import { MapPin, ShieldCheck, Zap } from 'lucide-react';

interface VideoOverlayProps {
    data: {
        title: string;
        badge: string;
        field1?: string;
        field2?: string;
        location: string;
        userPhoto?: string;
        userName?: string;
    };
}

export function VideoOverlay({ data }: VideoOverlayProps) {
    return (
        <div className="w-full px-4 pb-2 pointer-events-none">
            {/* Uploader avatar + name */}
            {(data.userPhoto || data.userName) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {data.userPhoto && (
                        <img
                            src={data.userPhoto}
                            style={{
                                width: 32, height: 32, borderRadius: '50%',
                                border: '1.5px solid rgba(255,255,255,0.8)',
                                objectFit: 'cover', flexShrink: 0,
                            }}
                        />
                    )}
                    {data.userName && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'DM Sans' }}>
                            {data.userName}
                        </div>
                    )}
                </div>
            )}
            {/* Badge — color based on role intent */}
            {(() => {
                const b = data.badge?.toLowerCase() || '';
                const isProf = b === 'employer' || b === 'hiring' || b === 'doctor' || b === 'teacher' || b === 'lawyer' || b === 'agent' || b === 'freelancer';
                return (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: isProf ? '#00C853' : 'var(--accent)',
                        padding: '2px 8px', borderRadius: 999,
                        marginBottom: 6,
                    }}>
                        <span style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: isProf ? '#fff' : '#000',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontFamily: 'Poppins'
                        }}>
                            {data.badge}
                        </span>
                    </div>
                );
            })()}


            {/* Title — REDUCED from 24px to 17px */}
            <h3 style={{
                fontFamily: 'Poppins',
                fontWeight: 700,
                fontSize: 17,
                color: '#fff',
                margin: '0 0 4px',
                lineHeight: 1.3,
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                maxWidth: '85%',
            }}>
                {data.title}
            </h3>

            {/* Fields — smaller */}
            {data.field1 && (
                <p style={{
                    fontSize: 13,         // ← was 14px
                    color: 'rgba(255,255,255,0.85)',
                    margin: '0 0 2px',
                    fontFamily: 'DM Sans',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    {data.field1}
                </p>
            )}

            {data.field2 && (
                <p style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.7)',
                    margin: '0 0 6px',
                    fontFamily: 'DM Sans',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                    {data.field2}
                </p>
            )}

            {/* Location + Verified — smaller */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {data.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.8)' }}>
                        <span style={{ fontSize: 11 }}>📍</span>
                        <span style={{ fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {data.location}
                        </span>
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#00C853' }}>
                    <span style={{ fontSize: 11 }}>✓</span>
                    <span style={{ fontSize: 10, fontFamily: 'Poppins', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Verified
                    </span>
                </div>

            </div>
        </div>
    );
}
