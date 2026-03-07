'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { useAuth } from '@/hooks/useAuth';
import { useCategory } from '@/context/CategoryContext';
import { ArrowLeft, MapPin, ShieldCheck, Lock } from 'lucide-react';
import { RevealContactSheet } from '@/components/feed/RevealContactSheet';

export default function UserProfilePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { accentColor } = useCategory();

    const [profile, setProfile] = useState<any>(null);
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'videos' | 'info'>('videos');
    const [contactRevealed, setContactRevealed] = useState(false);
    const [showRevealSheet, setShowRevealSheet] = useState(false);
    const [isPlaceholderUser, setIsPlaceholderUser] = useState(false);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        const isPlaceholderId = (
            String(id).startsWith('placeholder-') ||
            String(id).startsWith('manual_') ||
            String(id).startsWith('ph-') ||
            String(id) === 'undefined' ||
            String(id) === 'null' ||
            id.length < 10
        );

        if (isPlaceholderId) {
            setIsPlaceholderUser(true);
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                console.log(`[Profile Page] Fetching user profile for ID: ${id}`);
                const userSnap = await getDoc(doc(db, 'users', id as string));
                if (userSnap.exists()) {
                    console.log('[Profile Page] Profile found successfully:', userSnap.data());
                    setProfile(userSnap.data());
                } else {
                    console.warn(`[Profile Page] User document does not exist for ID: ${id}`);
                    setProfile(null);
                    return; // No need to fetch videos if user doesn't exist
                }

                // Fetch videos in a separate try-catch so it doesn't wipe profile if index is missing
                try {
                    console.log('[Profile Page] Fetching user videos...');
                    // User requested to see the index link in console, so revert to the full query
                    const vidsSnap = await getDocs(query(
                        collection(db, 'videos'),
                        where('userId', '==', id),
                        where('is_live', '==', true),
                        orderBy('createdAt', 'desc')
                    ));

                    const userVideos = vidsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
                    console.log(`[Profile Page] Fetched ${userVideos.length} videos`);
                    setVideos(userVideos);
                } catch (vidErr: any) {
                    console.error('🔥 [Profile Page] Error fetching videos. IF THIS SAYS MISSING INDEX, COPY THE LINK BELOW:');
                    console.error(vidErr.message || vidErr);
                    setVideos([]); // Just show no videos, but keep the profile intact
                }

            } catch (err: any) {
                console.error('❌ [Profile Page] Error fetching profile:', err.message || err);
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    const getCategoryConfig = (cat: string) => {
        const configs: Record<string, { label: string; emoji: string; accent: string }> = {
            jobs: { label: 'Jobs', emoji: '💼', accent: '#FF0069' },
            healthcare: { label: 'Healthcare', emoji: '🏥', accent: '#00C896' },
            education: { label: 'Education', emoji: '🎓', accent: '#FFD600' },
            marriage: { label: 'Marriage', emoji: '💍', accent: '#FF6B9D' },
            domestic: { label: 'Domestic', emoji: '🏠', accent: '#FF8C42' },
            legal: { label: 'Legal', emoji: '⚖️', accent: '#4A90D9' },
            realestate: { label: 'Real Estate', emoji: '🏗️', accent: '#7638FA' },
            it: { label: 'IT & Tech', emoji: '💻', accent: '#00E5FF' },
        };
        return configs[cat] || { label: cat, emoji: '👤', accent: '#FF0069' };
    };

    const getThumbnail = (video: any) => {
        if (video.thumbnailUrl) return video.thumbnailUrl;
        if (video.cloudinaryUrl) {
            return video.cloudinaryUrl
                .replace('/upload/', '/upload/so_0,w_400,h_711,c_fill,q_80/')
                .replace('.mp4', '.jpg').replace('.webm', '.jpg').replace('.mov', '.jpg');
        }
        if (video.youtubeId || video.videoId) {
            return `https://img.youtube.com/vi/${video.youtubeId || video.videoId}/mqdefault.jpg`;
        }
        return '';
    };

    const openVideo = (index: number) => {
        sessionStorage.setItem('feed_start_index', String(index));
        sessionStorage.setItem('feed_user_filter', id as string);
        router.push('/feed');
    };

    const formatCount = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return String(n || 0);
    };

    if (loading) {
        return (
            <div style={{ background: '#fff', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #FF0069', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            </div>
        );
    }

    if (isPlaceholderUser) {
        return (
            <div style={{
                background: '#fff', minHeight: '100dvh',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: 24, textAlign: 'center', gap: 16,
                maxWidth: 400, margin: '0 auto',
            }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        position: 'absolute', top: 16, left: 16,
                        background: 'none', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        gap: 6, color: '#333', fontFamily: 'DM Sans', fontSize: 14,
                    }}
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <div style={{
                    background: '#FFF3E0', border: '1px solid #FFB74D',
                    borderRadius: 999, padding: '4px 14px',
                    fontSize: 11, color: '#E65100',
                    fontFamily: 'DM Sans', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                    Demo Content
                </div>

                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: '#F0F0F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36,
                }}>
                    🎬
                </div>

                <div>
                    <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: '#0A0A0A', margin: '0 0 8px' }}>
                        Demo Video
                    </h2>
                    <p style={{ color: '#888', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                        This is a sample video shown while the platform is being set up.
                        Real user profiles will appear once people start uploading videos.
                    </p>
                </div>

                <button
                    onClick={() => router.push('/feed')}
                    style={{
                        background: '#FF0069', color: '#fff',
                        border: 'none', borderRadius: 10,
                        padding: '12px 28px',
                        fontFamily: 'Syne', fontWeight: 700,
                        fontSize: 14, cursor: 'pointer',
                        marginTop: 8,
                    }}
                >
                    Back to Feed
                </button>
            </div>
        );
    }

    if (!loading && !profile && !isPlaceholderUser) {
        return (
            <div style={{
                background: '#fff', minHeight: '100dvh',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 16, padding: 24,
            }}>
                <button onClick={() => router.back()} style={{
                    position: 'absolute', top: 16, left: 16,
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: '#333',
                    fontFamily: 'DM Sans', fontSize: 14,
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div style={{ fontSize: 48 }}>👤</div>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: '#0A0A0A', margin: 0 }}>
                    Profile not found
                </h3>
                <p style={{ color: '#888', fontFamily: 'DM Sans', fontSize: 13, margin: 0 }}>
                    This user may have deleted their account.
                </p>
                <button onClick={() => router.push('/feed')} style={{
                    background: '#FF0069', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '10px 24px',
                    fontFamily: 'Syne', fontWeight: 700, cursor: 'pointer',
                }}>
                    Back to Feed
                </button>
            </div>
        );
    }

    const catConfig = getCategoryConfig(profile.category);
    const isOwnProfile = currentUser?.uid === id;

    // Redirect to own profile if viewing self
    if (isOwnProfile) {
        router.push('/dashboard/profile');
        return null;
    }

    return (
        <div style={{
            background: '#fff',
            minHeight: '100dvh',
            paddingBottom: 80,
            maxWidth: 600,
            margin: '0 auto',
            borderLeft: '1px solid #eee',
            borderRight: '1px solid #eee'
        }}>

            {/* ── TOP BAR ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)', zIndex: 10,
                borderBottom: '1px solid #eee',
            }}>
                <button onClick={() => router.back()} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#0A0A0A', display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: 'DM Sans', fontSize: 14,
                }}>
                    <ArrowLeft size={20} /> Back
                </button>
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#0A0A0A' }}>
                    {profile.name?.split(' ')[0] || 'Profile'}
                </span>
                <div style={{ width: 60 }} /> {/* spacer */}
            </div>

            {/* ── HEADER SECTION ── */}
            <div style={{ padding: '24px 16px 0', textAlign: 'center' }}>

                {/* Avatar */}
                <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 12px' }}>
                    <div style={{
                        width: 90, height: 90, borderRadius: '50%',
                        padding: 3,
                        background: `linear-gradient(135deg, ${catConfig.accent}, #7638FA)`,
                    }}>
                        <img
                            src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'U')}&background=eee&color=000&size=90`}
                            alt={profile.name}
                            style={{
                                width: '100%', height: '100%',
                                borderRadius: '50%', objectFit: 'cover',
                                border: '3px solid #fff',
                            }}
                        />
                    </div>
                    {/* Verified badge */}
                    {profile.isVerified && (
                        <div style={{
                            position: 'absolute', bottom: 2, right: 2,
                            width: 22, height: 22, borderRadius: '50%',
                            background: catConfig.accent,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid #fff',
                        }}>
                            <ShieldCheck size={12} color="#fff" strokeWidth={2.5} />
                        </div>
                    )}
                </div>

                {/* Name */}
                <h1 style={{
                    fontFamily: 'Syne', fontWeight: 800, fontSize: 20,
                    color: '#0A0A0A', margin: '0 0 6px',
                }}>
                    {profile.name}
                </h1>

                {/* Category + Role badges */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{
                        background: `${catConfig.accent}15`,
                        color: catConfig.accent,
                        border: `1px solid ${catConfig.accent}`,
                        borderRadius: 999, padding: '3px 12px',
                        fontSize: 11, fontFamily: 'DM Sans', fontWeight: 700,
                    }}>
                        {catConfig.emoji} {catConfig.label}
                    </span>
                    <span style={{
                        background: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0',
                        borderRadius: 999, padding: '3px 12px',
                        fontSize: 11, fontFamily: 'DM Sans', fontWeight: 500,
                    }}>
                        {profile.role === 'provider'
                            ? (profile.jobTitle || profile.specialization || profile.roleTitle || 'Provider')
                            : (profile.role === 'seeker' ? 'Seeker' : profile.role)
                        }
                    </span>
                    {profile.city && (
                        <span style={{
                            background: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0',
                            borderRadius: 999, padding: '3px 10px',
                            fontSize: 11, fontFamily: 'DM Sans', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                            <MapPin size={10} /> {profile.city}
                        </span>
                    )}
                </div>

                {/* Bio */}
                {profile.bio && (
                    <p style={{
                        color: '#aaa', fontSize: 13, fontFamily: 'DM Sans',
                        lineHeight: 1.5, margin: '0 auto 12px',
                        maxWidth: 280,
                    }}>
                        {profile.bio}
                    </p>
                )}

                {/* Stats row */}
                <div style={{
                    display: 'flex', justifyContent: 'center',
                    gap: 32, margin: '12px 0 16px',
                }}>
                    {[
                        { label: 'Videos', value: videos.length },
                        { label: 'Followers', value: profile.followers?.length || 0 },
                        { label: 'Following', value: profile.following?.length || 0 },
                    ].map((stat) => (
                        <div key={stat.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: '#0A0A0A' }}>
                                {formatCount(stat.value)}
                            </div>
                            <div style={{ fontSize: 11, color: '#888888', fontFamily: 'DM Sans' }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action buttons: Follow + Connect */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                    <button style={{
                        padding: '10px 28px', borderRadius: 8,
                        background: catConfig.accent, border: 'none',
                        color: '#fff', fontFamily: 'Syne', fontWeight: 700,
                        fontSize: 14, cursor: 'pointer',
                        boxShadow: `0 0 20px ${catConfig.accent}44`,
                    }}>
                        Follow
                    </button>
                    <button
                        onClick={() => setShowRevealSheet(true)}
                        style={{
                            padding: '10px 28px', borderRadius: 8,
                            background: 'transparent',
                            border: `1px solid ${catConfig.accent}`,
                            color: catConfig.accent,
                            fontFamily: 'Syne', fontWeight: 700,
                            fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        🔓 Connect
                    </button>
                </div>
            </div>

            {/* ── TAB BAR ── */}
            <div style={{
                display: 'flex', borderBottom: '1px solid #E5E5E5',
                position: 'sticky', top: 49, background: '#fff', zIndex: 9,
            }}>
                {[
                    { key: 'videos', icon: '⊞' },
                    { key: 'info', icon: '👤' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        style={{
                            flex: 1, padding: '12px 0',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 20,
                            borderBottom: activeTab === tab.key
                                ? `2px solid ${catConfig.accent}`
                                : '2px solid transparent',
                            transition: 'border-color 0.2s',
                            color: activeTab === tab.key ? catConfig.accent : '#888888',
                        }}
                    >
                        {tab.icon}
                    </button>
                ))}
            </div>

            {/* ── VIDEOS GRID TAB ── */}
            {activeTab === 'videos' && (
                <>
                    {videos.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
                            <p style={{ color: '#444', fontFamily: 'DM Sans', fontSize: 14 }}>No videos yet</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 2,
                        }}>
                            {videos.map((video, i) => (
                                <div
                                    key={video.id}
                                    onClick={() => openVideo(i)}
                                    style={{
                                        aspectRatio: '9/16',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        background: '#eee',
                                    }}
                                >
                                    {getThumbnail(video) ? (
                                        <img
                                            src={getThumbnail(video)}
                                            loading="lazy"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 24 }}>
                                            ▶
                                        </div>
                                    )}
                                    {/* View count */}
                                    <div style={{
                                        position: 'absolute', bottom: 4, left: 4,
                                        background: 'rgba(0,0,0,0.7)',
                                        color: '#fff', fontSize: 10,
                                        padding: '1px 5px', borderRadius: 3,
                                        fontFamily: 'DM Sans', fontWeight: 600,
                                    }}>
                                        ▶ {formatCount(video.views || 0)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── INFO TAB (LinkedIn sections) ── */}
            {activeTab === 'info' && (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Skills */}
                    {profile.skills?.length > 0 && (
                        <Section title="Skills" accent={catConfig.accent}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {profile.skills.map((skill: string, i: number) => (
                                    <span key={i} style={{
                                        background: `${catConfig.accent}15`,
                                        color: catConfig.accent,
                                        border: `1px solid ${catConfig.accent}33`,
                                        borderRadius: 999, padding: '4px 12px',
                                        fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600,
                                    }}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Experience */}
                    {profile.experience?.length > 0 && (
                        <Section title="Experience" accent={catConfig.accent}>
                            {profile.experience.map((exp: any, i: number) => (
                                <div key={i} style={{
                                    padding: '12px 0',
                                    borderBottom: i < profile.experience.length - 1 ? '1px solid #eee' : 'none',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ color: '#0A0A0A', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14 }}>
                                                {exp.role}
                                            </div>
                                            <div style={{ color: '#888888', fontFamily: 'DM Sans', fontSize: 13, marginTop: 2 }}>
                                                🏢 {exp.company}
                                            </div>
                                        </div>
                                        <div style={{ color: '#555', fontSize: 11, fontFamily: 'DM Sans', textAlign: 'right' }}>
                                            {exp.startYear} — {exp.endYear || 'Present'}
                                        </div>
                                    </div>
                                    {exp.description && (
                                        <p style={{ color: '#444444', fontSize: 12, fontFamily: 'DM Sans', marginTop: 6, lineHeight: 1.5 }}>
                                            {exp.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </Section>
                    )}

                    {/* Education */}
                    {profile.education?.length > 0 && (
                        <Section title="Education" accent={catConfig.accent}>
                            {profile.education.map((edu: any, i: number) => (
                                <div key={i} style={{
                                    padding: '10px 0',
                                    borderBottom: i < profile.education.length - 1 ? '1px solid #E5E5E5' : 'none',
                                }}>
                                    <div style={{ color: '#0A0A0A', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14 }}>
                                        🎓 {edu.institution}
                                    </div>
                                    <div style={{ color: '#666666', fontSize: 12, fontFamily: 'DM Sans', marginTop: 2 }}>
                                        {edu.degree} {edu.field && `• ${edu.field}`}
                                    </div>
                                    <div style={{ color: '#888888', fontSize: 11, fontFamily: 'DM Sans', marginTop: 2 }}>
                                        {edu.startYear} — {edu.endYear}
                                    </div>
                                </div>
                            ))}
                        </Section>
                    )}

                    {/* Contact — LOCKED until paid */}
                    <Section title="Contact" accent={catConfig.accent}>
                        {contactRevealed ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {profile.phone && (
                                    <a href={`tel:${profile.phone}`} style={{
                                        color: catConfig.accent, fontFamily: 'DM Sans',
                                        fontSize: 15, fontWeight: 600, textDecoration: 'none',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                        📞 {profile.phone}
                                    </a>
                                )}
                                {profile.email && (
                                    <a href={`mailto:${profile.email}`} style={{
                                        color: '#aaa', fontFamily: 'DM Sans',
                                        fontSize: 13, textDecoration: 'none',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                        ✉️ {profile.email}
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                <Lock size={28} color="#AAAAAA" style={{ marginBottom: 8 }} />
                                <p style={{ color: '#888888', fontSize: 12, fontFamily: 'DM Sans', margin: '0 0 12px' }}>
                                    Contact info is hidden. Pay Rs. 1,000 to unlock.
                                </p>
                                <button
                                    onClick={() => setShowRevealSheet(true)}
                                    style={{
                                        background: catConfig.accent,
                                        border: 'none', color: '#fff',
                                        padding: '10px 24px', borderRadius: 8,
                                        fontFamily: 'Syne', fontWeight: 700,
                                        fontSize: 13, cursor: 'pointer',
                                        boxShadow: `0 0 16px ${catConfig.accent}44`,
                                    }}
                                >
                                    🔓 Unlock Contact — Rs. 1,000
                                </button>
                            </div>
                        )}
                    </Section>

                    {/* Empty state if no info at all */}
                    {!profile.skills?.length && !profile.experience?.length && !profile.education?.length && (
                        <div style={{ padding: '32px 0', textAlign: 'center' }}>
                            <p style={{ color: '#444', fontFamily: 'DM Sans', fontSize: 13 }}>
                                No additional info added yet.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <RevealContactSheet
                isOpen={showRevealSheet}
                onClose={() => setShowRevealSheet(false)}
                targetName={profile.name || 'User'}
                userId={id as string}
            />
        </div>
    );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
    return (
        <div style={{
            background: '#F8F8F8',
            border: '1px solid #E5E5E5',
            borderRadius: 14,
            padding: '14px 16px',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 12,
                borderBottom: '1px solid #eee',
                paddingBottom: 10,
            }}>
                <div style={{ width: 3, height: 14, background: accent, borderRadius: 999 }} />
                <h3 style={{
                    fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
                    color: '#0A0A0A', margin: 0, textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                }}>
                    {title}
                </h3>
            </div>
            {children}
        </div>
    );
}
