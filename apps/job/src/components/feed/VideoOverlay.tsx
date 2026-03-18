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
    const title = overlay.title || data.title || '';
    const field1 = overlay.field1 || data.field1;
    const field2 = overlay.field2 || data.field2;
    const location = overlay.location || data.location || data.city || '';
    const userPhoto = overlay.userPhoto || data.userPhoto;
    const userName = overlay.userName || data.userName;
    const userId = data?.userId;

    const roleLabel = resolveRoleLabel(data);
    const category = data?.category || '';
    const catConfig = category ? getCatConfig(category) : null;

    // Check if user is verified
    const isVerified = data?.isVerified || data?.verified || false;

    const handleConnectClick = () => {
        if (userId) {
            router.push(`/profile/landing/${userId}`);
        }
    };

    return (
        <div 
            className="w-full px-4 pb-2 pointer-events-none"
            style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}
        >
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

            {/* Category pill + Role badge + Contact Button — side by side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {/* Contact Button Moved Here */}
                {userId && (
                    <motion.button
                        initial="rest"
                        whileHover="hover"
                        animate="rest"
                        whileTap={{ scale: 0.95 }}
                        onClick={handleConnectClick}
                        style={{
                            background: '#4169E1',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '10px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            boxShadow: '0 4px 15px rgba(65, 105, 225, 0.3)',
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {/* SVG Wrapper with bobbing animation */}
                        <motion.div 
                            variants={{
                                rest: { x: 0, rotate: 0, scale: 1 },
                                hover: { 
                                    x: 55, 
                                    rotate: 45, 
                                    scale: 1.2,
                                    transition: { type: 'spring', stiffness: 300, damping: 20 }
                                }
                            }}
                            style={{
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 2,
                            }}
                        >
                            <motion.svg 
                                animate={{ 
                                    y: [0, -2, 0] 
                                }}
                                transition={{ 
                                    duration: 1.5, 
                                    repeat: Infinity, 
                                    ease: "easeInOut" 
                                }}
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                width={20} 
                                height={20}
                            >
                                <path fill="none" d="M0 0h24v24H0z" />
                                <path fill="currentColor" d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z" />
                            </motion.svg>
                        </motion.div>
                        
                        <motion.span 
                            variants={{
                                rest: { x: 0, opacity: 1 },
                                hover: { x: 100, opacity: 0 }
                            }}
                            style={{ 
                                color: '#fff', 
                                fontSize: '14px', 
                                fontWeight: 700, 
                                fontFamily: 'Poppins',
                                whiteSpace: 'nowrap',
                                zIndex: 1,
                            }}
                        >
                            Contact
                        </motion.span>
                    </motion.button>
                )}

                {/* Category pill - Hidden as per user request to show only role */}
                {/* catConfig && (
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
                ) */}
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
