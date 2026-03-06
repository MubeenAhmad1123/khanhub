'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, increment, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

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
    const [liked, setLiked] = useState(false);

    const handleAvatarTap = () => {
        if (!videoUserId) return;
        router.push(`/profile/${videoUserRole || 'user'}/${videoUserId}`);
    };
    const [saved, setSaved] = useState(false);
    const [localLikes, setLocalLikes] = useState(likes);

    const formatCount = (count: number) => {
        if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
        return count;
    };

    const handleLike = async () => {
        setLiked(!liked);
        setLocalLikes(prev => liked ? prev - 1 : prev + 1);
        if (!videoId.startsWith('placeholder')) {
            await updateDoc(doc(db, 'videos', videoId), {
                likes: increment(liked ? -1 : 1),
                likedBy: liked
                    ? arrayRemove(user?.uid)
                    : arrayUnion(user?.uid)
            });
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,           // ← gap between buttons
        }}>
            {/* PROFILE AVATAR — top of action buttons (TikTok style) */}
            <div style={{ position: 'relative', marginBottom: 4 }}>
                <div
                    onClick={handleAvatarTap}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid #fff',
                        cursor: 'pointer',
                    }}>
                    <img
                        src={videoUserPhoto || '/default-avatar.png'}
                        alt="uploader"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                {/* Follow + button below avatar */}
                <div
                    onClick={onConnect}
                    style={{
                        position: 'absolute',
                        bottom: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 18, height: 18,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: '#fff', fontWeight: 700,
                        cursor: 'pointer',
                    }}>
                    +
                </div>
            </div>

            {/* LIKE */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <button
                    onClick={handleLike}
                    style={{
                        width: 44, height: 44,       // ← reduced from ~56 to 44
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                        transition: 'transform 0.1s',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? '#FF0069' : 'none'}
                        stroke={liked ? '#FF0069' : 'white'} strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>
                <span style={{ color: '#fff', fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600 }}>
                    {formatCount(localLikes)}
                </span>
            </div>

            {/* SAVE */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <button
                    onClick={() => setSaved(!saved)}
                    style={{
                        width: 44, height: 44,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? '#fff' : 'none'}
                        stroke="white" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                </button>
                <span style={{ color: '#fff', fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600 }}>
                    {formatCount(saves)}
                </span>
            </div>

            {/* SHARE */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <button style={{
                    width: 44, height: 44,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="white" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
                <span style={{ color: '#fff', fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600 }}>
                    Share
                </span>
            </div>

            {/* THREE DOTS */}
            <button style={{
                width: 44, height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                color: '#fff', fontSize: 18,
            }}>
                ···
            </button>
        </div>
    );
}
