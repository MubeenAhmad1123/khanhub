'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    doc, updateDoc, increment, arrayUnion, arrayRemove,
    getDoc, addDoc, collection, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { useAuth } from '@/hooks/useAuth';
import { useFeedToast } from '@/components/ui/FeedToast';
import { Heart, Bookmark, Send, MoreVertical } from 'lucide-react';

interface ActionButtonsProps {
    videoId: string;
    videoUserId?: string | null;
    videoUserPhoto?: string | null;
    videoUserRole?: string | null;
    likes?: number;
    saves?: number;
    shares?: number;
    onConnect?: () => void;
    connectLabel?: string;
}

// Format numbers: 1200 → 1.2K
const fmt = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n || 0);
};

// Shared icon drop-shadow — visible on ALL video types (TikTok/Insta style)
const ICON_SHADOW = 'drop-shadow(0px 1px 4px rgba(0,0,0,1)) drop-shadow(0px 0px 10px rgba(0,0,0,0.8))';
const TEXT_SHADOW = '0 1px 4px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.8)';

export function ActionButtons({
    videoId, videoUserId, videoUserPhoto, videoUserRole,
    likes = 0, saves = 0, shares = 0, onConnect
}: ActionButtonsProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { showToast } = useFeedToast();

    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [likeCount, setLikeCount] = useState(likes);
    const [saveCount, setSaveCount] = useState(saves);
    const [showMenu, setShowMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);

    const isPlaceholder = !videoId || videoId.startsWith('placeholder') || videoId.startsWith('manual_') || videoId.length < 10;
    const isRealUser = videoUserId && !videoUserId.startsWith('placeholder') && !videoUserId.startsWith('manual_') && !videoUserId.startsWith('ph-') && videoUserId !== 'undefined' && videoUserId.length >= 10;

    // Check liked/saved state on mount
    useEffect(() => {
        if (!user || isPlaceholder) return;
        getDoc(doc(db, 'videos', videoId)).then(snap => {
            if (!snap.exists()) return;
            const data = snap.data();
            setLiked((data.likedBy || []).includes(user.uid));
            setLikeCount(data.likes || 0);
            setSaveCount(data.saves || 0);
        });
        // Check saved list in user doc
        if (user && user.uid) {
            getDoc(doc(db, 'users', user.uid)).then(snap => {
                if (!snap.exists()) return;
                setSaved((snap.data().savedVideos || []).includes(videoId));
            });
        }
    }, [videoId, user, isPlaceholder]);

    const handleLike = async () => {
        if (!user) { router.push('/auth/register?from=feed'); return; }
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(p => newLiked ? p + 1 : p - 1);
        if (isPlaceholder) return;
        await updateDoc(doc(db, 'videos', videoId), {
            likes: increment(newLiked ? 1 : -1),
            likedBy: newLiked ? arrayUnion(user.uid) : arrayRemove(user.uid),
        });
        await updateDoc(doc(db, 'users', user.uid), {
            likedVideos: newLiked ? arrayUnion(videoId) : arrayRemove(videoId),
        });
    };

    const handleSave = async () => {
        if (!user) { router.push('/auth/register?from=feed'); return; }
        const newSaved = !saved;
        setSaved(newSaved);
        setSaveCount(p => newSaved ? p + 1 : p - 1);
        if (isPlaceholder) return;
        await updateDoc(doc(db, 'users', user.uid), {
            savedVideos: newSaved ? arrayUnion(videoId) : arrayRemove(videoId),
        });
        await updateDoc(doc(db, 'videos', videoId), {
            saves: increment(newSaved ? 1 : -1),
        });
        showToast(newSaved ? '🔖 Saved to favorites' : 'Removed from saved');
    };

    const handleAvatarTap = () => {
        if (!isRealUser) { showToast('🎬 Demo video — no profile'); return; }
        router.push(`/profile/${videoUserRole || 'user'}/${videoUserId}`);
    };

    const handleMenuAction = async (action: string) => {
        setShowMenu(false);
        switch (action) {
            case 'report':
                if (!user) { router.push('/auth/register?from=report'); return; }
                if (!isPlaceholder) {
                    await addDoc(collection(db, 'reports'), {
                        videoId, reportedBy: user.uid,
                        reportedAt: serverTimestamp(), type: 'video', status: 'pending',
                    });
                }
                showToast('🚩 Report submitted. Thank you.');
                break;
            case 'not_interested':
                const hidden = JSON.parse(localStorage.getItem('jobreel_hidden_videos') || '[]');
                hidden.push(videoId);
                localStorage.setItem('jobreel_hidden_videos', JSON.stringify(hidden));
                showToast("Got it. You'll see less of this.");
                break;
            case 'copy_link':
                const link = `${window.location.origin}/profile/${videoUserRole || 'user'}/${videoUserId}`;
                navigator.clipboard.writeText(link).then(() => showToast('🔗 Profile link copied!'));
                break;
        }
    };

    return (
        <>
            <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 20,
            }}>

                {/* ── AVATAR ── */}
                <div
                    onClick={handleAvatarTap}
                    style={{ position: 'relative', cursor: 'pointer' }}
                >
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid #fff',
                        filter: ICON_SHADOW,
                    }}>
                        <img
                            src={videoUserPhoto || `https://ui-avatars.com/api/?name=U&background=333&color=fff`}
                            alt="profile"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    {/* + badge */}
                    <div
                        onClick={(e) => { e.stopPropagation(); onConnect?.(); }}
                        style={{
                            position: 'absolute', bottom: -7, left: '50%',
                            transform: 'translateX(-50%)',
                            width: 18, height: 18, borderRadius: '50%',
                            background: 'var(--accent, #FF0069)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, color: '#fff', fontWeight: 800,
                            border: '1.5px solid #000',
                            filter: ICON_SHADOW,
                        }}
                    >
                        +
                    </div>
                </div>

                {/* ── LIKE ── */}
                <button onClick={handleLike} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    WebkitTapHighlightColor: 'transparent',
                }}>
                    <Heart
                        size={32}
                        fill={liked ? '#FF0069' : 'none'}
                        stroke={liked ? '#FF0069' : '#fff'}
                        strokeWidth={liked ? 0 : 2.5}
                        style={{ filter: ICON_SHADOW }}
                    />
                    <span style={{
                        color: '#fff', fontSize: 13,
                        fontFamily: 'DM Sans', fontWeight: 700,
                        textShadow: TEXT_SHADOW,
                    }}>
                        {fmt(likeCount)}
                    </span>
                </button>

                {/* ── SAVE ── */}
                <button onClick={handleSave} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    WebkitTapHighlightColor: 'transparent',
                }}>
                    <Bookmark
                        size={30}
                        fill={saved ? '#fff' : 'none'}
                        stroke="#fff"
                        strokeWidth={2.5}
                        style={{ filter: ICON_SHADOW }}
                    />
                    <span style={{
                        color: '#fff', fontSize: 13,
                        fontFamily: 'DM Sans', fontWeight: 700,
                        textShadow: TEXT_SHADOW,
                    }}>
                        {fmt(saveCount)}
                    </span>
                </button>

                {/* ── SHARE ── */}
                <button onClick={() => setShowShareMenu(true)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    WebkitTapHighlightColor: 'transparent',
                }}>
                    <Send
                        size={28}
                        stroke="#fff"
                        strokeWidth={2.5}
                        style={{ filter: ICON_SHADOW }}
                    />
                    <span style={{
                        color: '#fff', fontSize: 13,
                        fontFamily: 'DM Sans', fontWeight: 700,
                        textShadow: TEXT_SHADOW,
                    }}>
                        Share
                    </span>
                </button>

                {/* ── THREE DOTS ── */}
                <button onClick={() => setShowMenu(true)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    WebkitTapHighlightColor: 'transparent',
                }}>
                    <MoreVertical
                        size={26}
                        stroke="#fff"
                        strokeWidth={2.5}
                        style={{ filter: ICON_SHADOW }}
                    />
                </button>

            </div>

            {/* ── THREE DOTS MENU SHEET ── */}
            {showMenu && (
                <>
                    <div onClick={() => setShowMenu(false)} style={{
                        position: 'fixed', inset: 0, zIndex: 89,
                        background: 'rgba(0,0,0,0.4)',
                    }} />
                    <div style={{
                        position: 'fixed', bottom: 0, left: 0, right: 0,
                        background: '#fff', borderRadius: '20px 20px 0 0',
                        padding: '12px 0 40px', zIndex: 90,
                        maxWidth: 600, margin: '0 auto',
                        boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
                    }}>
                        <div style={{
                            width: 36, height: 4, borderRadius: 999,
                            background: '#E5E5E5', margin: '0 auto 16px',
                        }} />
                        {[
                            { icon: '🚩', label: 'Report', sub: 'Flag inappropriate content', action: 'report', color: '#FF3B30' },
                            { icon: '🚫', label: 'Not Interested', sub: 'See less like this', action: 'not_interested', color: '#0A0A0A' },
                            { icon: '🔗', label: 'Copy Link', sub: 'Share uploader profile', action: 'copy_link', color: '#0A0A0A' },
                        ].map(opt => (
                            <button key={opt.action} onClick={() => handleMenuAction(opt.action)} style={{
                                width: '100%', padding: '16px 20px',
                                background: 'none', border: 'none',
                                borderBottom: '1px solid #F0F0F0',
                                display: 'flex', alignItems: 'center', gap: 14,
                                cursor: 'pointer', textAlign: 'left',
                            }}>
                                <span style={{ fontSize: 24 }}>{opt.icon}</span>
                                <div>
                                    <div style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 15, color: opt.color }}>{opt.label}</div>
                                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#888', marginTop: 1 }}>{opt.sub}</div>
                                </div>
                            </button>
                        ))}
                        <button onClick={() => setShowMenu(false)} style={{
                            width: '100%', padding: '14px', background: 'none',
                            border: 'none', color: '#888',
                            fontFamily: 'DM Sans', fontSize: 14, cursor: 'pointer',
                        }}>
                            Cancel
                        </button>
                    </div>
                </>
            )}

            {/* ── ENHANCED SHARE MENU ── */}
            {showShareMenu && (
                <>
                    <div onClick={() => setShowShareMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.4)' }} />
                    <div style={{
                        position: 'fixed', bottom: 0, left: 0, right: 0,
                        background: '#fff', borderRadius: '20px 20px 0 0',
                        padding: '12px 16px 40px', zIndex: 100,
                        maxWidth: 600, margin: '0 auto',
                        boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
                    }}>
                        <div style={{ width: 36, height: 4, borderRadius: 999, background: '#E5E5E5', margin: '0 auto 16px' }} />

                        <h3 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, textAlign: 'center', marginBottom: 20 }}>Share Profile</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                            {[
                                {
                                    name: 'WhatsApp',
                                    icon: 'https://cdn-icons-png.flaticon.com/512/124/124034.png',
                                    link: `https://wa.me/?text=${encodeURIComponent(`${window.location.origin}/profile/${videoUserRole || 'user'}/${videoUserId}`)}`
                                },
                                {
                                    name: 'Facebook',
                                    icon: 'https://cdn-icons-png.flaticon.com/512/124/124010.png',
                                    link: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/profile/${videoUserRole || 'user'}/${videoUserId}`)}`
                                },
                                {
                                    name: 'LinkedIn',
                                    icon: 'https://cdn-icons-png.flaticon.com/512/174/174857.png',
                                    link: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/profile/${videoUserRole || 'user'}/${videoUserId}`)}`
                                },
                                {
                                    name: 'Copy',
                                    icon: 'https://cdn-icons-png.flaticon.com/512/1621/1621635.png',
                                    action: () => {
                                        const link = `${window.location.origin}/profile/${videoUserRole || 'user'}/${videoUserId}`;
                                        navigator.clipboard.writeText(link).then(() => showToast('🔗 Link copied!'));
                                        setShowShareMenu(false);
                                    }
                                }
                            ].map((platform) => (
                                <div
                                    key={platform.name}
                                    onClick={() => {
                                        if (platform.action) {
                                            platform.action();
                                        } else {
                                            window.open(platform.link, '_blank');
                                            setShowShareMenu(false);
                                        }
                                    }}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                                >
                                    <div style={{ width: 50, height: 50, borderRadius: 12, overflow: 'hidden', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={platform.icon} alt={platform.name} style={{ width: '60%', height: '60%', objectFit: 'contain' }} />
                                    </div>
                                    <span style={{ fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, color: '#666' }}>{platform.name}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowShareMenu(false)}
                            style={{
                                width: '100%', padding: '14px', borderRadius: 12,
                                background: '#F5F5F5', color: '#0A0A0A', border: 'none',
                                fontFamily: 'DM Sans', fontWeight: 700, fontSize: 15, cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </>
            )}
        </>
    );
}
