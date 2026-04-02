'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CATEGORY_CONFIG } from '@/lib/categories';

// Helper: resolve badge label from video doc
function resolveBadge(data: any): string {
    // overlayData.badge is the human-readable role set at upload time
    return data?.overlayData?.badge || data?.badge || '';
}

// Helper: get category config safely
function getCatConfig(category: string) {
    return (CATEGORY_CONFIG as any)[category] || { label: category, emoji: '📹', accent: '#FF0069', providerLabel: 'Provider', seekerLabel: 'Seeker' };
}

// Helper: role label from category + userRole
function resolveRoleLabel(data: any): string {
    const badge = resolveBadge(data);
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
    const title = data.title || overlay.title || 'Untitled';
    const fatherName = data.fatherName || '';
    const skills = data.skills || overlay.field1 || []; // skills is an array now
    const salary = data.salary || overlay.field2 || '';
    const experience = data.experienceLevel || '';
    const company = data.companyName || '';
    const city = data.city || overlay.location || 'Unknown';
    const intent = data.intent || resolveRoleLabel(data) || '';
    
    const userPhoto = overlay.userPhoto || data.userPhoto;
    const userName = overlay.userName || data.userName || 'Member';
    const userId = data?.userId;

    const category = data?.category || '';
    const catConfig = category ? getCatConfig(category) : null;
    const isVerified = data?.isVerified || data?.verified || false;

    const handleConnectClick = () => {
        if (userId) {
            router.push(`/profile/landing/${userId}`);
        }
    };

    return (
        <div className="w-full px-4" style={{ paddingBottom: '16px', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
            {/* Header: User Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                {userPhoto ? (
                    <Image
                        src={userPhoto}
                        alt={userName}
                        width={36}
                        height={36}
                        style={{
                            borderRadius: '50%',
                            border: '1.5px solid rgba(255,255,255,0.9)',
                            objectFit: 'cover',
                            width: 36, height: 36
                        }}
                    />
                ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                        👤
                    </div>
                )}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Poppins' }}>{userName}</span>
                        {isVerified && <span style={{ color: '#00C853', fontSize: 12 }}>✓</span>}
                    </div>
                    {fatherName && (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'DM Sans', marginTop: -2 }}>
                            S/O {fatherName}
                        </div>
                    )}
                </div>

                <div style={{ marginLeft: 'auto' }}>
                    {userId && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleConnectClick}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '12px',
                                padding: '6px 14px',
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: 'Poppins',
                                cursor: 'pointer'
                            }}
                        >
                            Connect
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Badges: Category & Intent */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {catConfig && (
                    <span style={{
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#fff',
                        fontFamily: 'Poppins',
                        textTransform: 'uppercase',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {catConfig.emoji} {catConfig.label}
                    </span>
                )}
                {intent && (
                    <span style={{
                        background: catConfig?.accent || '#FF0069',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#fff',
                        fontFamily: 'Poppins',
                        textTransform: 'uppercase'
                    }}>
                        {intent}
                    </span>
                )}
            </div>

            {/* Title & Company */}
            <h3 style={{
                fontFamily: 'Poppins',
                fontWeight: 700,
                fontSize: 18,
                color: '#fff',
                marginBottom: company ? 2 : 8,
                lineHeight: 1.2
            }}>
                {title}
            </h3>
            {company && (
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 8, fontFamily: 'DM Sans', fontWeight: 500 }}>
                    at {company}
                </div>
            )}

            {/* Details: Salary & Experience */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                {salary && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 12, fontFamily: 'DM Sans' }}>
                        <span>💰</span>
                        <span style={{ fontWeight: 600 }}>{salary}</span>
                    </div>
                )}
                {experience && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 12, fontFamily: 'DM Sans' }}>
                        <span>⏳</span>
                        <span style={{ fontWeight: 600 }}>{experience}</span>
                    </div>
                )}
            </div>

            {/* Skills Pills */}
            {Array.isArray(skills) && skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {skills.map((skill: string, idx: number) => (
                        <span key={idx} style={{
                            background: 'rgba(255,255,255,0.1)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.9)',
                            fontFamily: 'DM Sans',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {skill}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer: Location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'DM Sans' }}>
                <span>📍</span>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{city}</span>
            </div>
        </div>
    );
}
