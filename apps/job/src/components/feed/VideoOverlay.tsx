'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CATEGORY_CONFIG } from '@/lib/categories';

function getCatConfig(category: string) {
    return (CATEGORY_CONFIG as any)[category] || {
        label: category, emoji: '📹', accent: '#FF0069',
        providerLabel: 'Provider', seekerLabel: 'Seeker'
    };
}

function resolveRoleLabel(data: any): string {
    const badge = data?.overlayData?.badge || data?.badge || '';
    if (badge) return badge;
    if (!data?.category || !data?.userRole) return '';
    const cfg = getCatConfig(data.category);
    return data.userRole === 'provider' ? cfg.providerLabel : cfg.seekerLabel;
}

interface VideoOverlayProps {
    data: Record<string, any>;
}

export function VideoOverlay({ data }: VideoOverlayProps) {
    const router = useRouter();
    const overlay = data?.overlayData || {};

    const title       = data.title || overlay.title || 'Unavailable';
    const fatherName  = data.fatherName || '';
    const skills      = Array.isArray(data.skills) && data.skills.length > 0
                          ? data.skills
                          : (overlay.field1 ? [overlay.field1] : []);
    const salary      = data.salary || overlay.field2 || null;
    const experience  = data.experienceLevel || null;
    const company     = data.companyName || '';
    const city        = (data.city || overlay.location || '').trim();
    const intent      = data.intent || resolveRoleLabel(data) || '';

    const userPhoto   = overlay.userPhoto || data.userPhoto || null;
    const userName    = overlay.userName || data.userName || 'Member';
    const userId      = data?.userId;

    const category    = data?.category || '';
    const catConfig   = category ? getCatConfig(category) : null;
    const isVerified  = data?.isVerified || data?.verified || false;

    const handleConnectClick = () => {
        if (userId) router.push(`/profile/landing/${userId}`);
    };

    return (
        <div
            className="w-full px-4"
            style={{
                paddingBottom: '12px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 80%, transparent 100%)',
            }}
        >
            {/* ── Row 1: Name + Connect Button ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
            }}>
                {/* Name + Connect button directly beside it */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flex: 1,
                    minWidth: 0,
                }}>
                    <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#fff',
                        fontFamily: 'Poppins',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '120px',
                    }}>
                        {userName}
                    </span>
                    {isVerified && (
                        <span style={{ color: '#00C853', fontSize: 11, flexShrink: 0, marginLeft: -4 }}>✓</span>
                    )}

                    {userId && (
                        <motion.button
                            whileTap={{ scale: 0.93 }}
                            onClick={handleConnectClick}
                            style={{
                                background: '#FF0069',
                                border: 'none',
                                borderRadius: '16px',
                                padding: '3px 10px',
                                color: '#fff',
                                fontSize: 9,
                                fontWeight: 800,
                                fontFamily: 'Poppins',
                                cursor: 'pointer',
                                flexShrink: 0,
                                letterSpacing: '0.02em',
                                boxShadow: '0 2px 10px rgba(255,0,105,0.45)',
                                WebkitTapHighlightColor: 'transparent',
                            }}
                        >
                            Connect
                        </motion.button>
                    )}
                </div>
            </div>

            {/* ── Row 2: Role / Intent (e.g. 💼 Hiring / Jobs) ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                fontFamily: 'Poppins',
                textTransform: 'uppercase',
                marginBottom: 3,
            }}>
                <span>💼</span>
                <span>{intent || 'Job Seeker / Company'}</span>
            </div>

            {/* ── Row 3: Headline / Post Title (e.g. 🧠 Muslim Entrepreneur) ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                fontFamily: 'Poppins',
                marginBottom: 4,
                lineHeight: 1.2,
            }}>
                <span>🧠</span>
                <span>{title}</span>
            </div>

            {/* ── Row 4: Professional Metadata (Salary, Location, Experience) ── */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                marginBottom: 5,
                fontSize: 9.5,
                fontFamily: 'DM Sans',
                color: 'rgba(255,255,255,0.9)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ opacity: 0.8 }}>💰 Salary:</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{salary || 'Unavailable'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ opacity: 0.8 }}>📍 Location:</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{city || 'Unavailable'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ opacity: 0.8 }}>⏳ Experience:</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{experience || 'Unavailable'}</span>
                </div>
            </div>

            {/* ── Row 5: Skills pills (for professional identification) ── */}
            {skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {skills.slice(0, 4).map((skill: string, idx: number) => (
                        <span key={idx} style={{
                            background: 'rgba(255,255,255,0.1)',
                            padding: '1.5px 6px',
                            borderRadius: '4px',
                            fontSize: 9,
                            color: 'rgba(255,255,255,0.85)',
                            fontFamily: 'DM Sans',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                            {skill}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
