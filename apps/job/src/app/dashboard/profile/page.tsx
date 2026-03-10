'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase-config';
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

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { categoryConfig, accentColor } = useCategory();
    const [profile, setProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<ProfileTab>('videos');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/register?from=profile');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            // Use onSnapshot for live updates
            const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
                if (snap.exists()) setProfile(snap.data());
            });
            return () => unsub();
        }
    }, [user]);

    if (loading || !user || !profile) return <ProfileSkeleton />;

    return (
        <div style={{ background: '#FFFFFF', minHeight: '100dvh', paddingBottom: 80, color: '#0A0A0A' }}>

            {/* ── HEADER SECTION (TikTok style) ── */}
            <div style={{ padding: '20px 16px', textAlign: 'center', background: '#F8F8F8', borderBottom: '1px solid #E5E5E5' }}>

                {/* Avatar */}
                <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 12px' }}>
                    <img
                        src={user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.uid}
                        alt={profile.name}
                        style={{
                            width: 88, height: 88, borderRadius: '50%',
                            border: `3px solid ${accentColor}`,
                            objectFit: 'cover',
                        }}
                    />
                </div>

                {/* Name */}
                <h1 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 20, color: '#0A0A0A', margin: '0 0 4px' }}>
                    {profile.name || user.displayName}
                </h1>

                {/* Category + Role badges - Clickable to change */}
                <div
                    onClick={() => router.push('/auth/onboarding?mode=change')}
                    style={{
                        display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap',
                        cursor: 'pointer'
                    }}
                    title="Change Category"
                >
                    <span style={{
                        background: `${accentColor}22`, color: accentColor,
                        border: `1px solid ${accentColor}`, borderRadius: 999,
                        padding: '3px 12px', fontSize: 11, fontFamily: 'DM Sans', fontWeight: 700,
                    }}>
                        {categoryConfig?.emoji} {categoryConfig?.label}
                    </span>
                    <span style={{
                        background: profile.role?.toLowerCase() === 'employer' ? '#00C85315' : `${accentColor}22`,
                        color: profile.role?.toLowerCase() === 'employer' ? '#00C853' : accentColor,
                        border: profile.role?.toLowerCase() === 'employer' ? '1px solid #00C853' : `1px solid ${accentColor}`,
                        borderRadius: 999, padding: '3px 12px',
                        fontSize: 11, fontFamily: 'DM Sans', fontWeight: 700,
                    }}>
                        {(() => {
                            const uiR = profile.uiRole;
                            if (uiR === 'provider') return categoryConfig?.providerLabel;
                            if (uiR === 'seeker') return categoryConfig?.seekerLabel;
                            // Fallback: use roleKey from Firestore
                            const roleKey = profile.role || '';
                            const providerKeys = ['job_seeker', 'doctor', 'teacher', 'presenting', 'helper', 'lawyer', 'agent', 'freelancer'];
                            return providerKeys.includes(roleKey) ? categoryConfig?.providerLabel : categoryConfig?.seekerLabel;
                        })()}
                    </span>
                </div>

                {/* Stats row — Following | Followers | Likes */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 16 }}>
                    {[
                        { label: 'Following', value: profile.following?.length || 0 },
                        { label: 'Followers', value: profile.followers?.length || 0 },
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
                        onClick={() => setActiveTab(tab.key as ProfileTab)}
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
                    onClick={() => { auth.signOut(); router.push('/'); }}
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
