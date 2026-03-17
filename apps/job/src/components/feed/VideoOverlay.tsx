'use client';

import React from 'react';
import Image from 'next/image';
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
    const overlay = data?.overlayData || {};
    const title = overlay.title || data.title || '';
    const field1 = overlay.field1 || data.field1;
    const field2 = overlay.field2 || data.field2;
    const location = overlay.location || data.location || data.city || '';
    const userPhoto = overlay.userPhoto || data.userPhoto;
    const userName = overlay.userName || data.userName;

    const roleLabel = resolveRoleLabel(data);
    const category = data?.category || '';
    const catConfig = category ? getCatConfig(category) : null;

    // Check if user is verified
    const isVerified = data?.isVerified || data?.verified || false;

    return (
        <div className="w-full px-4 pb-2 pointer-events-none">
            {/* Uploader avatar + name + contact icon */}
            {(userPhoto || userName) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {userPhoto && (
                        <Image
                            src={userPhoto}
                            alt={userName || 'User profile'}
                            width={32}
                            height={32}
                            style={{
                                borderRadius: '50%',
                                border: '1.5px solid rgba(255,255,255,0.8)',
                                objectFit: 'cover', flexShrink: 0,
                                width: 32, height: 32
                            }}
                        />
                    )}
                    {userName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'DM Sans' }}>
                                {userName}
                            </div>
                            {/* Contact/Message icon - appears next to username */}
                            <span style={{ 
                                fontSize: 12, 
                                display: 'flex', 
                                alignItems: 'center',
                                color: '#fff',
                                background: 'rgba(255,255,255,0.2)',
                                borderRadius: '50%',
                                width: 18,
                                height: 18,
                                justifyContent: 'center',
                            }} title="Contact">
                                💬
                            </span>
                            {/* Verified badge */}
                            {isVerified && (
                                <span style={{ 
                                    fontSize: 10, 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    color: '#00C853',
                                }} title="Verified">
                                    ✓
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Category pill + Role badge — side by side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {catConfig && (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        padding: '3px 8px', borderRadius: 999,
                    }}>
                        <span style={{ fontSize: 10 }}>{catConfig.emoji}</span>
                        <span style={{
                            fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.9)',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            fontFamily: 'Poppins'
                        }}>
                            {catConfig.label}
                        </span>
                    </span>
                )}
                {roleLabel && (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: catConfig ? `${catConfig.accent}DD` : '#FF0069DD',
                        padding: '3px 8px', borderRadius: 999,
                    }}>
                        <span style={{
                            fontSize: 9, fontWeight: 800,
                            color: '#fff',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            fontFamily: 'Poppins'
                        }}>
                            {roleLabel}
                        </span>
                    </span>
                )}
            </div>

            {/* Title */}
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
                {title}
            </h3>

            {/* Fields */}
            {field1 && (
                <p style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.85)',
                    margin: '0 0 2px',
                    fontFamily: 'DM Sans',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: catConfig?.accent || 'var(--accent)', flexShrink: 0 }} />
                    {field1}
                </p>
            )}
            {field2 && (
                <p style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.7)',
                    margin: '0 0 6px',
                    fontFamily: 'DM Sans',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                    {field2}
                </p>
            )}

            {/* Location + Verified */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.8)' }}>
                        <span style={{ fontSize: 11 }}>📍</span>
                        <span style={{ fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {location}
                        </span>
                    </div>
                )}
                {isVerified && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#00C853' }}>
                        <span style={{ fontSize: 11 }}>✓</span>
                        <span style={{ fontSize: 10, fontFamily: 'Poppins', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Verified
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
