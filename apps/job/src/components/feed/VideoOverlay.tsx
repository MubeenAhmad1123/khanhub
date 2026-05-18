'use client';

import React from 'react';
import Image from 'next/image';
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

    // ── Field resolution with explicit "not provided" fallbacks ──
    const title       = data.title || overlay.title || 'Untitled';
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

    // Shared "not provided" chip style
    const naStyle: React.CSSProperties = {
        color: 'rgba(255,255,255,0.4)',
        fontStyle: 'italic',
        fontWeight: 400,
    };

    return (
        <div
            className="w-full px-4"
            style={{
                paddingBottom: '16px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
            }}
        >
            {/* ── Row 1: Avatar + Name + Connect button ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
            }}>
                {/* Avatar */}
                {userPhoto ? (
                    <Image
                        src={userPhoto}
                        alt={userName}
                        width={38}
                        height={38}
                        style={{
                            borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.9)',
                            objectFit: 'cover',
                            width: 38,
                            height: 38,
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 16, flexShrink: 0,
                    }}>
                        👤
                    </div>
                )}

                {/* Name + father name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{
                            fontSize: 13, fontWeight: 700, color: '#fff',
                            fontFamily: 'Poppins',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: '140px',
                        }}>
                            {userName}
                        </span>
                        {isVerified && (
                            <span style={{ color: '#00C853', fontSize: 13, flexShrink: 0 }}>✓</span>
                        )}
                    </div>
                    {fatherName && (
                        <div style={{
                            fontSize: 10, color: 'rgba(255,255,255,0.55)',
                            fontFamily: 'DM Sans', marginTop: -1,
                        }}>
                            S/O {fatherName}
                        </div>
                    )}
                </div>

                {/* Connect button — always visible, solid style */}
                {userId && (
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={handleConnectClick}
                        style={{
                            background: '#FF0069',
                            border: 'none',
                            borderRadius: '20px',
                            padding: '7px 16px',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 800,
                            fontFamily: 'Poppins',
                            cursor: 'pointer',
                            flexShrink: 0,
                            letterSpacing: '0.02em',
                            boxShadow: '0 2px 12px rgba(255,0,105,0.45)',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        Connect
                    </motion.button>
                )}
            </div>

            {/* ── Row 2: Category + Intent badges ── */}
            {(catConfig || intent) && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {catConfig && (
                        <span style={{
                            background: 'rgba(0,0,0,0.45)',
                            backdropFilter: 'blur(4px)',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: 10, fontWeight: 700,
                            color: '#fff', fontFamily: 'Poppins',
                            textTransform: 'uppercase',
                            border: '1px solid rgba(255,255,255,0.12)',
                        }}>
                            {catConfig.emoji} {catConfig.label}
                        </span>
                    )}
                    {intent && (
                        <span style={{
                            background: catConfig?.accent || '#FF0069',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: 10, fontWeight: 700,
                            color: '#fff', fontFamily: 'Poppins',
                            textTransform: 'uppercase',
                        }}>
                            {intent}
                        </span>
                    )}
                </div>
            )}

            {/* ── Row 3: Title ── */}
            <h3 style={{
                fontFamily: 'Poppins', fontWeight: 700,
                fontSize: 16, color: '#fff',
                marginBottom: company ? 2 : 8,
                lineHeight: 1.25,
            }}>
                {title}
            </h3>
            {company && (
                <div style={{
                    color: 'rgba(255,255,255,0.75)', fontSize: 12,
                    marginBottom: 8, fontFamily: 'DM Sans', fontWeight: 500,
                }}>
                    at {company}
                </div>
            )}

            {/* ── Row 4: Salary + Experience — always shown ── */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 6, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'DM Sans' }}>
                    <span>💰</span>
                    {salary ? (
                        <span style={{ color: '#fff', fontWeight: 600 }}>{salary}</span>
                    ) : (
                        <span style={naStyle}>Not provided</span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'DM Sans' }}>
                    <span>⏳</span>
                    {experience ? (
                        <span style={{ color: '#fff', fontWeight: 600 }}>{experience}</span>
                    ) : (
                        <span style={naStyle}>Not provided</span>
                    )}
                </div>
            </div>

            {/* ── Row 5: Skills pills ── */}
            {skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {skills.slice(0, 4).map((skill: string, idx: number) => (
                        <span key={idx} style={{
                            background: 'rgba(255,255,255,0.1)',
                            padding: '2px 8px', borderRadius: '4px',
                            fontSize: 10, color: 'rgba(255,255,255,0.85)',
                            fontFamily: 'DM Sans',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                            {skill}
                        </span>
                    ))}
                </div>
            )}

            {/* ── Row 6: Location — always shown ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontFamily: 'DM Sans',
            }}>
                <span>📍</span>
                {city ? (
                    <span style={{
                        color: 'rgba(255,255,255,0.6)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        {city}
                    </span>
                ) : (
                    <span style={naStyle}>Not provided</span>
                )}
            </div>
        </div>
    );
}
