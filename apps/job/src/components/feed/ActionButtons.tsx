'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    doc, updateDoc, increment, onSnapshot, arrayUnion, arrayRemove,
    getDoc, addDoc, collection, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { useAuth } from '@/hooks/useAuth';
import { useFeedToast } from '@/components/ui/FeedToast';
import { Heart, Bookmark, Send, MoreVertical, Check } from 'lucide-react';
import { createNotification } from '@/lib/createNotification';
import { followUser, unfollowUser, checkIsFollowing } from '@/lib/followSystem';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionButtonsProps {
    videoId: string;
    videoUserId?: string | null;
    videoUserPhoto?: string | null;
    videoUserRole?: string | null;
    likes?: number;
    saves?: number;
    shares?: number;
    onConnect?: () => void;
    onNotInterested?: () => void;
    connectLabel?: string;
    mode?: 'video' | 'bar';
}

// Format numbers: 1200 → 1.2K
const fmt = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n || 0);
};

// Shared icon drop-shadow — visible on ALL video types (TikTok/Insta style)
const ICON_SHADOW = 'drop-shadow(0px 1px 6px rgba(0,0,0,0.9)) drop-shadow(0px 0px 12px rgba(0,0,0,0.7))';
const TEXT_SHADOW = '0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.7)';

import { likeVideo, unlikeVideo, checkIsLiked } from '@/lib/likeSystem';

export function ActionButtons({
    videoId, videoUserId, videoUserPhoto, videoUserRole,
    likes = 0, saves = 0, shares = 0, onConnect, onNotInterested,
    mode = 'video'
}: ActionButtonsProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { showToast } = useFeedToast();

    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [following, setFollowing] = useState(false);
    const [likeCount, setLikeCount] = useState(likes);
    const [saveCount, setSaveCount] = useState(saves);
    const [showMenu, setShowMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [showReportReasons, setShowReportReasons] = useState(false);
    const [showNegativeFeedback, setShowNegativeFeedback] = useState(false);

    const isPlaceholder = !videoId || videoId.startsWith('placeholder') || videoId.startsWith('manual_') || videoId.length < 10;
    const isRealUser = videoUserId && !videoUserId.startsWith('placeholder') && !videoUserId.startsWith('manual_') && !videoUserId.startsWith('ph-') && videoUserId !== 'undefined' && videoUserId.length >= 10;

    // Real-time listener for LIKE COUNT
    useEffect(() => {
        if (isPlaceholder) return;
        const unsub = onSnapshot(doc(db, 'videos', videoId), (snap) => {
            if (snap.exists()) {
                setLikeCount(snap.data().likes || 0);
            }
        });
        return () => unsub();
    }, [videoId, isPlaceholder]);

    // Check liked/saved state on mount
    useEffect(() => {
        if (!user || isPlaceholder) return;
        
        // Check if liked
        checkIsLiked(user.uid, videoId).then(setLiked);

        // Check if following
        if (isRealUser && videoUserId) {
            checkIsFollowing(user.uid, videoUserId).then(setFollowing);
        }

        // Check saved list in user doc
        if (user && user.uid) {
            getDoc(doc(db, 'users', user.uid)).then(snap => {
                if (!snap.exists()) return;
                setSaved((snap.data().savedVideos || []).includes(videoId));
            });
        }
    }, [videoId, user, isPlaceholder]);

    const handleLike = async () => {
        if (!user?.uid) {
            showToast('Sign in to like videos');
            return;
        }
        const newLiked = !liked;
        
        // Optimistic UI
        setLiked(newLiked);
        setLikeCount(p => newLiked ? p + 1 : p - 1);

        if (isPlaceholder) return;

        try {
            if (newLiked) {
                await likeVideo(user.uid, videoId, videoUserId || '');
                if (isRealUser && videoUserId) {
                    await createNotification(
                        videoUserId,
                        'like',
                        'New Like',
                        `${user.displayName || 'Someone'} liked your video`,
                        videoId
                    );
                }
            } else {
                await unlikeVideo(user.uid, videoId, videoUserId || '');
            }
            showToast(newLiked ? '❤️ Liked' : 'Unliked');
        } catch (err) {
            console.error('Like error:', err);
            // Revert on error
            setLiked(!newLiked);
            setLikeCount(p => !newLiked ? p + 1 : p - 1);
        }
    };

    const handleSave = async () => {
        if (!user?.uid) {
            showToast('Sign in to save videos');
            return;
        }
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

    const handleFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user?.uid) {
            showToast('Sign in to follow creators');
            return;
        }
        if (!isRealUser || !videoUserId) {
            showToast('🎬 Cannot follow demo accounts');
            return;
        }

        const newFollowing = !following;
        setFollowing(newFollowing);

        try {
            if (newFollowing) {
                await followUser(user.uid, videoUserId);
                await createNotification(
                    videoUserId,
                    'follow',
                    'New Follower',
                    `${user.displayName || 'Someone'} started following you`,
                    'profile'
                );
                showToast('✅ Following');
            } else {
                await unfollowUser(user.uid, videoUserId);
                showToast('Unfollowed');
            }
        } catch (err) {
            console.error('Follow error:', err);
            setFollowing(!newFollowing);
        }
    };

    const handleMenuAction = async (action: string) => {
        switch (action) {
            case 'report':
                setShowMenu(false);
                setShowReportReasons(true);
                break;
            case 'not_interested':
                setShowMenu(false);
                // 1. Call callback to scroll feed immediately (Premium feel)
                onNotInterested?.();
                setShowNegativeFeedback(true);
                setTimeout(() => setShowNegativeFeedback(false), 1500);
                
                // 2. Save to Firestore for large scale usage/personalization
                if (user && !isPlaceholder) {
                    try {
                        await addDoc(collection(db, 'video_feedback'), {
                            videoId,
                            userId: user.uid,
                            action: 'not_interested',
                            timestamp: serverTimestamp(),
                        });
                    } catch (err) {
                        console.error('Feedback error:', err);
                    }
                }
                
                // 3. Persistent local storage for quick filtering
                const hidden = JSON.parse(localStorage.getItem('jobreel_hidden_videos') || '[]');
                if (!hidden.includes(videoId)) {
                    hidden.push(videoId);
                    localStorage.setItem('jobreel_hidden_videos', JSON.stringify(hidden));
                }
                
                showToast("Got it. You'll see less of this.");
                break;
            case 'interested':
                setShowMenu(false);
                if (!user) { router.push('/auth/register?from=interested'); return; }
                if (!isPlaceholder) {
                    await addDoc(collection(db, 'interests'), {
                        videoId,
                        userId: user.uid,
                        authorId: videoUserId || '',
                        createdAt: serverTimestamp(),
                    });
                    await updateDoc(doc(db, 'videos', videoId), {
                        interestedCount: increment(1)
                    });
                }
                showToast('✨ Added to interests!');
                break;
            case 'copy_link':
                setShowMenu(false);
                const link = `${window.location.origin}/feed?v=${videoId}`;
                navigator.clipboard.writeText(link).then(() => showToast('🔗 Video link copied!'));
                break;
        }
    };

    const submitReport = async (reason: string) => {
        setShowReportReasons(false);
        if (!user) { router.push('/auth/register?from=report'); return; }
        
        if (!isPlaceholder) {
            try {
                await addDoc(collection(db, 'reports'), {
                    videoId, 
                    reportedBy: user.uid,
                    reason,
                    reportedAt: serverTimestamp(), 
                    type: 'video', 
                    status: 'pending',
                });
            } catch (err) {
                console.error('Report error:', err);
            }
        }
        showToast('🚩 Thank you. Your report has been submitted.');
    };

    return (
        <>
            {mode === 'bar' ? (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    {/* ── SHARE ── */}
                    <button onClick={() => setShowShareMenu(true)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        WebkitTapHighlightColor: 'transparent',
                    }}>
                        <Send
                            size={24}
                            stroke="#fff"
                            strokeWidth={2.5}
                            style={{ filter: ICON_SHADOW }}
                        />
                        <span style={{
                            color: '#fff', fontSize: 11,
                            fontFamily: 'DM Sans', fontWeight: 700,
                            textShadow: TEXT_SHADOW,
                        }}>
                            Share
                        </span>
                    </button>

                    {/* ── THREE DOTS ── */}
                    <button onClick={() => setShowMenu(true)} style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 8,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        WebkitTapHighlightColor: 'transparent',
                    }}>
                        <MoreVertical
                            size={22}
                            stroke="#fff"
                            strokeWidth={2.5}
                            style={{ filter: ICON_SHADOW }}
                        />
                    </button>
                </div>
            ) : (
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
                            <Image
                                src={videoUserPhoto || `https://ui-avatars.com/api/?name=U&background=333&color=fff`}
                                alt="User profile"
                                width={48}
                                height={48}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                        {/* + / check badge */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={following ? 'check' : 'plus'}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                onClick={handleFollow}
                                style={{
                                    position: 'absolute', bottom: -7, left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: following ? '#00C853' : 'var(--accent, #FF0069)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, color: '#fff', fontWeight: 800,
                                    border: '1.5px solid #000',
                                    filter: ICON_SHADOW,
                                    zIndex: 2,
                                }}
                            >
                                {following ? <Check size={12} strokeWidth={4} /> : '+'}
                            </motion.div>
                        </AnimatePresence>
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
                </div>
            )}

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
                            { icon: '✨', label: 'Interested', sub: 'Add to your career interests', action: 'interested', color: '#7638FA' },
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

                        <h3 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 18, textAlign: 'center', marginBottom: 20 }}>Share Profile</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                            {[
                                {
                                    name: 'WhatsApp',
                                    icon: 'https://cdn-icons-png.flaticon.com/512/124/124034.png',
                                    link: `https://wa.me/?text=${encodeURIComponent(`${window.location.origin}/feed?v=${videoId}`)}`
                                },
                                {
                                    name: 'Facebook',
                                    icon: 'https://cdn-icons-png.flaticon.com/512/124/124010.png',
                                    link: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/feed?v=${videoId}`)}`
                                },
                                {
                                    name: 'LinkedIn',
                                    icon: 'https://cdn-icons-png.flaticon.com/512/174/174857.png',
                                    link: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/feed?v=${videoId}`)}`
                                },
                                {
                                    name: 'Copy',
                                    icon: 'https://cdn-icons-png.flaticon.com/512/1621/1621635.png',
                                    action: () => {
                                        const link = `${window.location.origin}/feed?v=${videoId}`;
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
                                        <Image
                                            src={platform.icon}
                                            alt={platform.name}
                                            width={30}
                                            height={30}
                                            style={{ width: '60%', height: '60%', objectFit: 'contain' }}
                                        />
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
            {/* ── REPORT REASONS MENU ── */}
            <AnimatePresence>
                {showReportReasons && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowReportReasons(false)} 
                            style={{ position: 'fixed', inset: 0, zIndex: 101, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} 
                        />
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{
                                position: 'fixed', bottom: 0, left: 0, right: 0,
                                background: '#fff', borderRadius: '24px 24px 0 0',
                                padding: '20px 0 calc(40px + env(safe-area-inset-bottom, 0px))', 
                                zIndex: 102,
                                maxWidth: 500, margin: '0 auto',
                                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
                            }}
                        >
                            <div style={{ width: 40, height: 5, borderRadius: 999, background: '#DDD', margin: '0 auto 20px' }} />
                            
                            <h3 style={{ textAlign: 'center', fontFamily: 'Poppins', fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Report Content</h3>
                            <p style={{ textAlign: 'center', fontSize: 13, color: '#666', marginBottom: 20, padding: '0 40px' }}>Why are you reporting this video?</p>

                            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 16px' }}>
                                {[
                                    'Inappropriate content',
                                    'Spam or misleading',
                                    'Offensive or hateful',
                                    'Harassment or bullying',
                                    'Intellectual property violation',
                                    'Other'
                                ].map((reason) => (
                                    <motion.button
                                        key={reason}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => submitReport(reason)}
                                        style={{
                                            width: '100%', padding: '16px',
                                            background: '#F8F9FA', border: 'none',
                                            borderRadius: '16px', marginBottom: 8,
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer', textAlign: 'left',
                                            fontFamily: 'DM Sans', fontWeight: 600,
                                            fontSize: 15, color: '#1A1A1A'
                                        }}
                                    >
                                        {reason}
                                        <span style={{ color: '#CCC' }}>→</span>
                                    </motion.button>
                                ))}
                            </div>

                            <button onClick={() => setShowReportReasons(false)} style={{
                                width: '100%', marginTop: 12, padding: '14px', background: 'none',
                                border: 'none', color: '#999',
                                fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            }}>
                                Cancel
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            {/* ── NEGATIVE FEEDBACK OVERLAY (Mobile/Desktop) ── */}
            <AnimatePresence>
                {showNegativeFeedback && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        style={{
                            position: 'fixed', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(0,0,0,0.8)',
                            padding: '30px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 200, pointerEvents: 'none',
                        }}
                    >
                        <div style={{ fontSize: 60 }}>🚫</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
