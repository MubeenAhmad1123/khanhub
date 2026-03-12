'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, query, where, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { useCategory } from '@/context/CategoryContext';

// Components
import VideosGrid from '@/components/profile/VideosGrid';
import SavedGrid from '@/components/profile/SavedGrid';
import SkillsSection from '@/components/profile/SkillsSection';
import ExperienceSection from '@/components/profile/ExperienceSection';
import EducationSection from '@/components/profile/EducationSection';

// Profile tabs — like TikTok
type ProfileTab = 'videos' | 'saved' | 'info';

const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
};

function ProfileSkeleton() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[--accent] border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { categoryConfig, accentColor } = useCategory();
    const [profile, setProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<ProfileTab>('videos');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/register?from=profile');
        }
    }, [user, authLoading, router]);

    const [postCount, setPostCount] = useState(0);

    useEffect(() => {
        if (user) {
            // Use onSnapshot for live updates
            const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
                if (snap.exists()) setProfile(snap.data());
            }, (error) => {
                console.warn('[Dashboard Profile] Snapshot error:', error.message);
            });
            return () => unsub();
        }
    }, [user]);

    // ── Fetch Post Count (Approved & Live Videos) ────────────────
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'videos'),
            where('userId', '==', user.uid),
            where('is_live', '==', true),
            where('admin_status', '==', 'approved')
        );
        const unsub = onSnapshot(q, (snap) => {
            setPostCount(snap.size);
        });
        return () => unsub();
    }, [user]);

    if (authLoading || !user || !profile) {
        return (
            <div style={{
                height: '100dvh', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: '#fff'
            }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: '3px solid #eee', borderTop: '3px solid #FF0069',
                    animation: 'spin 0.75s linear infinite'
                }} />
                <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ background: '#FFFFFF', minHeight: '100dvh', paddingBottom: 80, color: '#0A0A0A' }}>

            {/* ── HEADER SECTION (TikTok style) ── */}
            <div style={{ padding: '20px 16px', textAlign: 'center', background: '#F8F8F8', borderBottom: '1px solid #E5E5E5' }}>

                {/* Avatar */}
                <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 12px' }}>
                    <Image
                        src={user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.uid}
                        alt={profile.name || 'User avatar'}
                        width={88}
                        height={88}
                        style={{
                            borderRadius: '50%',
                            border: `3px solid ${accentColor}`,
                            objectFit: 'cover',
                        }}
                    />
                </div>

                {/* Name */}
                <h1 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 20, color: '#0A0A0A', margin: '0 0 16px' }}>
                    {profile.name || user.displayName}
                </h1>

                {/* Stats row — Following | Followers | Likes */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 16 }}>
                    {[
                        { label: 'Posts', value: postCount },
                        { label: 'Following', value: profile.followingCount || 0 },
                        { label: 'Followers', value: profile.followersCount || 0 },
                        { label: 'Likes', value: profile.totalLikes || 0 },
                    ].map((stat) => (
                        <div key={stat.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 18, color: '#0A0A0A' }}>
                                {formatCount(stat.value)}
                            </div>
                            <div style={{ fontSize: 11, color: '#888888', fontFamily: 'DM Sans' }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bio */}
                {profile.bio && (
                    <p style={{ color: '#aaa', fontSize: 13, fontFamily: 'DM Sans', lineHeight: 1.5, marginBottom: 12, maxWidth: 280, margin: '0 auto 12px' }}>
                        {profile.bio}
                    </p>
                )}

                {/* Edit Profile button */}
                <button
                    onClick={() => router.push('/dashboard/profile/edit')}
                    style={{
                        width: '100%', maxWidth: 280,
                        padding: '10px', borderRadius: 10,
                        background: 'transparent', color: '#0A0A0A',
                        border: '1px solid #E5E5E5', fontFamily: 'DM Sans',
                        fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}
                >
                    Edit Profile
                </button>

            </div>

            {/* ── TAB BAR (TikTok style) ── */}
            <div style={{
                display: 'flex', borderBottom: '1px solid #E5E5E5',
                position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 10,
            }}>
                {[
                    { key: 'videos', icon: '⊞', label: 'Videos' },
                    { key: 'saved', icon: '🔖', label: 'Saved' },
                    { key: 'info', icon: '👤', label: 'About' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => {
                            if (tab.key === 'info') {
                                router.push('/dashboard/profile/edit');
                            } else {
                                setActiveTab(tab.key as ProfileTab);
                            }
                        }}
                        style={{
                            flex: 1, padding: '12px 0',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: activeTab === tab.key ? accentColor : '#BBBBBB',
                            borderBottom: activeTab === tab.key ? `2px solid ${accentColor}` : '2px solid transparent',
                            fontSize: 18, transition: 'color 0.2s',
                        }}
                    >
                        {tab.icon}
                    </button>
                ))}
            </div>

            {/* ── TAB CONTENT ── */}

            <div className="max-w-2xl mx-auto min-h-[40vh]">
                {/* Videos grid — 3 col like TikTok */}
                {activeTab === 'videos' && (
                    <VideosGrid
                        uid={user.uid}
                        onVideoTap={(i) => {
                            sessionStorage.setItem('feed_start_index', String(i));
                            router.push('/feed');
                        }}
                    />
                )}

                {/* Saved videos grid */}
                {activeTab === 'saved' && (
                    <SavedGrid
                        savedIds={profile.savedVideos || []}
                        onVideoTap={(i) => {
                            sessionStorage.setItem('feed_start_index', String(i));
                            router.push('/feed');
                        }}
                    />
                )}

                {/* LinkedIn-style info sections */}
                {activeTab === 'info' && (
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <SkillsSection user={profile} accentColor={accentColor} />
                        <ExperienceSection user={profile} accentColor={accentColor} />
                        <EducationSection user={profile} accentColor={accentColor} />
                    </div>
                )}
            </div>

            {/* Sign Out */}
            <div style={{ padding: '24px 16px 0', borderTop: 'none' }}>
                <button
                    onClick={() => { db.app.options.projectId; /* Hack to use db if needed */ router.push('/'); }}
                    style={{
                        width: '100%', padding: '12px',
                        background: 'transparent', border: '1px solid #FF0069',
                        color: '#FF0069', borderRadius: 10,
                        fontFamily: 'DM Sans', fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}
