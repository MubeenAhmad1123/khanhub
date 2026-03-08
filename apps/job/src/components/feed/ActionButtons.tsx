'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
    doc, updateDoc, increment, arrayRemove, arrayUnion,
    getDoc, addDoc, collection, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { useFeedToast } from '@/components/ui/FeedToast';

interface ActionButtonsProps {
    videoUserId?: string;
    videoUserPhoto?: string;
    videoUserRole?: string;
    onConnect: () => void;
    connectLabel: string;
    likes: number;
    saves: number;
    shares: number;
    videoId: string;
}

export function ActionButtons({
    videoUserId, videoUserPhoto, videoUserRole,
    onConnect, connectLabel,
    likes, saves, shares, videoId
}: ActionButtonsProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { showToast } = useFeedToast();
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [localLikes, setLocalLikes] = useState(likes);
    const [localSaves, setLocalSaves] = useState(saves);
    const [showMenu, setShowMenu] = useState(false);

    const isPlaceholder = !videoId || videoId.startsWith('placeholder') || videoId.startsWith('manual_');
    const isRealUser = videoUserId && !videoUserId.startsWith('placeholder') && !videoUserId.startsWith('manual_') && !videoUserId.startsWith('ph-') && videoUserId !== 'undefined' && videoUserId.length >= 10;

    // Check if already liked/saved on mount
    useEffect(() => {
        if (!user || isPlaceholder) return;
        const checkStatus = async () => {
            const snap = await getDoc(doc(db, 'videos', videoId));
            if (snap.exists()) {
                const data = snap.data();
                const likedBy: string[] = data.likedBy || [];
                setLiked(likedBy.includes(user.uid));
                setLocalLikes(data.likes || 0);
            }
        };
        checkStatus();
    }, [videoId, user, isPlaceholder]);

    useEffect(() => {
        if (!user || isPlaceholder) return;
        const userSnap = (user as any).savedVideos;
        if (userSnap && Array.isArray(userSnap)) {
            setSaved(userSnap.includes(videoId));
        }
    }, [videoId, user, isPlaceholder]);

    const formatCount = (count: number) => {
        if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
        return count;
    };

    const handleAvatarTap = () => {
        if (!isRealUser) {
            showToast('🎬 Demo video — no profile available');
            return;
        }
        router.push(`/profile/${videoUserRole || 'user'}/${videoUserId}`);
    };

    const handleLike = async () => {
        if (!user) {
            router.push('/auth/register?from=feed');
            return;
        }
        if (isPlaceholder) {
            setLiked(!liked);
            setLocalLikes(prev => liked ? prev - 1 : prev + 1);
            return;
        }
        const newLiked = !liked;
        setLiked(newLiked);
        setLocalLikes(prev => newLiked ? prev + 1 : prev - 1);
        await updateDoc(doc(db, 'videos', videoId), {
            likes: increment(newLiked ? 1 : -1),
            likedBy: newLiked ? arrayUnion(user.uid) : arrayRemove(user.uid),
        });
        await updateDoc(doc(db, 'users', user.uid), {
            likedVideos: newLiked ? arrayUnion(videoId) : arrayRemove(videoId),
        });
    };

    const handleSave = async () => {
        if (!user) {
            router.push('/auth/register?from=feed');
            return;
        }
        if (isPlaceholder) {
            setSaved(!saved);
            return;
        }
        const newSaved = !saved;
        setSaved(newSaved);
        setLocalSaves(prev => newSaved ? prev + 1 : prev - 1);
        await updateDoc(doc(db, 'users', user.uid), {
            savedVideos: newSaved ? arrayUnion(videoId) : arrayRemove(videoId),
        });
        await updateDoc(doc(db, 'videos', videoId), {
            saves: increment(newSaved ? 1 : -1),
        });
    };

    const menuOptions = [
        { icon: '🚩', label: 'Report', sublabel: 'Flag inappropriate content', action: 'report', color: '#FF3B30' },
        { icon: '🚫', label: 'Not Interested', sublabel: 'See less content like this', action: 'not_interested', color: '#0A0A0A' },
        { icon: '🔗', label: 'Copy Link', sublabel: 'Share this profile link', action: 'copy_link', color: '#0A0A0A' },
    ];

    const handleMenuAction = async (action: string) => {
        setShowMenu(false);
        switch (action) {
            case 'report':
                if (user && !isPlaceholder) {
                    await addDoc(collection(db, 'reports'), {
                        videoId,
                        reportedBy: user.uid,
                        reportedAt: serverTimestamp(),
                        type: 'video',
                        status: 'pending',
                    });
                    showToast('Report submitted. Thank you.');
                } else {
                    router.push('/auth/register?from=report');
                }
                break;
            case 'not_interested':
                const hidden = JSON.parse(localStorage.getItem('jobreel_hidden_videos') || '[]');
                hidden.push(videoId);
                localStorage.setItem('jobreel_hidden_videos', JSON.stringify(hidden));
                showToast("Got it. You'll see less like this.");
                break;
            case 'copy_link':
                const link = `${window.location.origin}/profile/${videoUserRole || 'user'}/${videoUserId}`;
                navigator.clipboard.writeText(link).then(() => showToast('Link copied!'));
                break;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

            {/* PROFILE AVATAR */}
            <div style={{ position: 'relative', marginBottom: 4 }}>
                <div
                    onClick={handleAvatarTap}
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        overflow: 'hidden', border: '2px solid #000',
                        cursor: 'pointer',
                    }}>
                    <img
                        src={videoUserPhoto || '/default-avatar.svg'}
                        alt="uploader"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <div
                    onClick={onConnect}
                    style={{
                        position: 'absolute', bottom: -8, left: '50%',
                        transform: 'translateX(-50%)',
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: '#fff', fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    +
                </div>
            </div>

            {/* LIKE */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <button
                    onClick={handleLike}
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.05)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', backdropFilter: 'blur(8px)',
                        transition: 'transform 0.1s',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? '#FF0069' : 'none'}
                        stroke={liked ? '#FF0069' : '#000'} strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>
                <span style={{ color: '#000', fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600 }}>
                    {formatCount(localLikes)}
                </span>
            </div>

            {/* SAVE */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <button
                    onClick={handleSave}
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.05)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', backdropFilter: 'blur(8px)',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? '#000' : 'none'}
                        stroke="#000" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                </button>
                <span style={{ color: '#000', fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600 }}>
                    {formatCount(localSaves)}
                </span>
            </div>

            {/* SHARE */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <button
                    onClick={() => {
                        const link = `${window.location.origin}/profile/${videoUserRole || 'user'}/${videoUserId}`;
                        navigator.clipboard.writeText(link).then(() => showToast('Link copied!'));
                    }}
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.05)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', backdropFilter: 'blur(8px)',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
                <span style={{ color: '#000', fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600 }}>Share</span>
            </div>

            {/* THREE DOTS */}
            <>
                <button
                    onClick={() => setShowMenu(true)}
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.05)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', backdropFilter: 'blur(8px)',
                        color: '#000', letterSpacing: '2px', fontSize: 16,
                    }}
                >
                    ···
                </button>

                {showMenu && (
                    <>
                        <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 89 }} />
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
                            {menuOptions.map((opt) => (
                                <button
                                    key={opt.action}
                                    onClick={() => handleMenuAction(opt.action)}
                                    style={{
                                        width: '100%', padding: '14px 20px',
                                        background: 'none', border: 'none',
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        cursor: 'pointer', textAlign: 'left',
                                        borderBottom: '1px solid #F0F0F0',
                                    }}
                                >
                                    <span style={{ fontSize: 22 }}>{opt.icon}</span>
                                    <div>
                                        <div style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 15, color: opt.color }}>
                                            {opt.label}
                                        </div>
                                        <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#888', marginTop: 1 }}>
                                            {opt.sublabel}
                                        </div>
                                    </div>
                                </button>
                            ))}
                            <button
                                onClick={() => setShowMenu(false)}
                                style={{
                                    width: '100%', padding: '14px 20px',
                                    background: 'none', border: 'none',
                                    fontFamily: 'DM Sans', fontSize: 15, color: '#888',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </>
        </div>
    );
}
