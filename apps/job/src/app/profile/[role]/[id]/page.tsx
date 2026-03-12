'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, getDocs, collection, query, where, orderBy, onSnapshot, setDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { useCategory } from '@/context/CategoryContext';
import { ArrowLeft, MapPin, ShieldCheck, Lock, Phone, Mail, MessageCircle, Navigation, ExternalLink, X } from 'lucide-react';
import { createNotification } from '@/lib/createNotification';
import { RevealContactSheet } from '@/components/feed/RevealContactSheet';
import { useFeedToast } from '@/components/ui/FeedToast';
import Image from 'next/image';

export default function UserProfilePage() {

    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { accentColor } = useCategory();
    const { showToast } = useFeedToast();

    const [profile, setProfile] = useState<any>(null);
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [authUser, setAuthUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'videos' | 'info' > ('videos');
    const [contactRevealed, setContactRevealed] = useState(false);
    const [checkingUnlock, setCheckingUnlock] = useState(true);
    const [showRevealSheet, setShowRevealSheet] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [isPlaceholderUser, setIsPlaceholderUser] = useState(false);

    // Followers state
    const [isFollowing, setIsFollowing] = useState(false);
    const [followingLoading, setFollowingLoading] = useState(false);

    // DP Zoom state
    const [showDPZoom, setShowDPZoom] = useState(false);

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
                    // Try 1: approved + is_live
                    let vidsSnap = await getDocs(query(
                        collection(db, 'videos'),
                        where('userId', '==', id),
                        where('admin_status', '==', 'approved'),
                        orderBy('createdAt', 'desc')
                    ));

                    if (vidsSnap.docs.length > 0) {
                        setVideos(vidsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
                    } else {
                        // Fallback 2: just userId, no filters
                        try {
                            const fallback2 = await getDocs(query(
                                collection(db, 'videos'),
                                where('userId', '==', id),
                                orderBy('createdAt', 'desc')
                            ));
                            if (fallback2.docs.length > 0) {
                                setVideos(fallback2.docs.map(d => ({ id: d.id, ...d.data() } as any)));
                            } else {
                                // Fallback 3: no orderBy (handles missing index)
                                const fallback3 = await getDocs(query(
                                    collection(db, 'videos'),
                                    where('userId', '==', id)
                                ));
                                setVideos(fallback3.docs.map(d => ({ id: d.id, ...d.data() } as any)));
                            }
                        } catch {
                            // Fallback 3 on inner error
                            const fallback3 = await getDocs(query(
                                collection(db, 'videos'),
                                where('userId', '==', id)
                            ));
                            setVideos(fallback3.docs.map(d => ({ id: d.id, ...d.data() } as any)));
                        }
                    }
                } catch (vidErr: any) {
                    console.error('[Profile Page] Error fetching videos:', vidErr.message || vidErr);
                    setVideos([]);
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

    useEffect(() => {
        if (!id) {
            setCheckingUnlock(false);
            return;
        }

        // Use onAuthStateChanged directly — this waits for Firebase Auth
        // to fully initialize before checking. Fixes the race condition where
        // currentUser from useAuth() is null during hydration.
        const auth = getAuth();
        let unsubscribeSnapshot: (() => void) | null = null;
        let unsubFollow: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            setAuthUser(firebaseUser);
            setAuthLoading(false);

            // Clean up any previous snapshot listener
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (!firebaseUser) {
                // Auth loaded — user is genuinely not logged in
                console.log('[Unlock Check] User not logged in');
                setContactRevealed(false);
                setCheckingUnlock(false);
                return;
            }

            console.log('[Unlock Check] Auth ready. Buyer UID:', firebaseUser.uid);
            console.log('[Unlock Check] Target profile ID:', id);

            // 1. Follow Status Listener
            const followDocId = `${firebaseUser.uid}_${id}`;
            unsubFollow = onSnapshot(doc(db, 'follows', followDocId), (snap) => {
                setIsFollowing(snap.exists());
            }, (error) => {
                console.warn('[Profile Follow] Snapshot error:', error.message);
            });

            // 2. Contact Unlock Listener
            unsubscribeSnapshot = onSnapshot(
                doc(db, 'users', firebaseUser.uid),
                (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        const unlockedContacts = data.unlockedContacts || {};
                        console.log('[Unlock Check] unlockedContacts:', unlockedContacts);
                        const isUnlocked = Object.prototype.hasOwnProperty.call(unlockedContacts, id);
                        console.log('[Unlock Check] isUnlocked:', isUnlocked);
                        setContactRevealed(isUnlocked);
                    } else {
                        console.log('[Unlock Check] Buyer user doc does not exist');
                        setContactRevealed(false);
                    }
                    setCheckingUnlock(false);
                },
                (error) => {
                    console.error('[Unlock Check] Snapshot error:', error);
                    setCheckingUnlock(false);
                }
            );
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            if (unsubFollow) unsubFollow();
        };
    }, [id]);

    const getCategoryConfig = (cat: string) => {
        const configs: Record<string, { label: string; emoji: string; accent: string }> = {
            jobs: { label: 'Jobs', emoji: '💼', accent: '#FF0069' },
            healthcare: { label: 'Healthcare', emoji: '🏥', accent: '#00C896' },
            education: { label: 'Education', emoji: '🎓', accent: '#FFD600' },
            marriage: { label: 'Marriage', emoji: '💍', accent: '#FF6B9D' },
            legal: { label: 'Legal', emoji: '⚖️', accent: '#4A90D9' },
            realestate: { label: 'Real Estate', emoji: '🏠', accent: '#7638FA' },
            transport: { label: 'Transport', emoji: '🚛', accent: '#FF8C00' },
            travel: { label: 'Travel', emoji: '✈️', accent: '#00BFFF' },
            agriculture: { label: 'Agriculture', emoji: '🌾', accent: '#4CAF50' },
            sellbuy: { label: 'Sell & Buy', emoji: '🛍️', accent: '#FF5722' },
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

    if (authLoading) {
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
                    <h2 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 20, color: '#0A0A0A', margin: '0 0 8px' }}>
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
                        fontFamily: 'Poppins', fontWeight: 700,
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
                <h3 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 18, color: '#0A0A0A', margin: 0 }}>
                    Profile not found
                </h3>
                <p style={{ color: '#888', fontFamily: 'DM Sans', fontSize: 13, margin: 0 }}>
                    This user may have deleted their account.
                </p>
                <button onClick={() => router.push('/feed')} style={{
                    background: '#FF0069', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '10px 24px',
                    fontFamily: 'Poppins', fontWeight: 700, cursor: 'pointer',
                }}>
                    Back to Feed
                </button>
            </div>
        );
    }

    const catConfig = getCategoryConfig(profile.category);
    const isOwnProfile = authUser?.uid === id;

    // Redirect to own profile if viewing self
    if (isOwnProfile) {
        router.push('/dashboard/profile');
        return null;
    }


    // ... (inside UserProfilePage)

    return (
        <div style={{
            background: '#fff',
            minHeight: '100dvh',
            paddingBottom: 80,
            width: '100%',
            maxWidth: 600,
            margin: '0 auto',
            borderLeft: '1px solid #eee',
            borderRight: '1px solid #eee',
            overflowX: 'hidden',
        }}>

            {/* ── TOP BAR ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'clamp(10px, 2vw, 16px) 16px',
                position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)', zIndex: 10,
                borderBottom: '1px solid #eee',
            }}>
                <button onClick={() => router.back()} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#0A0A0A', display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: 'DM Sans', fontSize: 'clamp(12px, 3vw, 14px)',
                }}>
                    <ArrowLeft size={20} /> Back
                </button>
                <h1 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 'clamp(14px, 3.5vw, 16px)', color: '#0A0A0A', margin: 0 }}>
                    {profile.name?.split(' ')[0] || 'Profile'}
                </h1>
                <div style={{ width: 60 }} />
            </div>

            {/* ── HEADER SECTION ── */}
            <div style={{ padding: 'clamp(20px, 5vw, 40px) 16px 0', textAlign: 'center' }}>

                {/* Avatar */}
                <div style={{ position: 'relative', width: 'clamp(80px, 20vw, 100px)', height: 'clamp(80px, 20vw, 100px)', margin: '0 auto 16px' }}>
                    <div style={{
                        width: '100%', height: '100%', borderRadius: '50%',
                        padding: 3,
                        background: `linear-gradient(135deg, ${catConfig.accent}, #7638FA)`,
                        position: 'relative',
                    }}>
                        <Image
                            src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'U')}&background=eee&color=000&size=200`}
                            alt={profile.name}
                            width={100}
                            height={100}
                            onClick={() => setShowDPZoom(true)}
                            style={{
                                width: '100%', height: '100%',
                                borderRadius: '50%', objectFit: 'cover',
                                border: '3px solid #fff',
                                cursor: 'pointer',
                            }}
                        />
                    </div>
                    {/* Verified badge */}
                    {profile.isVerified && (
                        <div style={{
                            position: 'absolute', bottom: 4, right: 4,
                            width: 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)', borderRadius: '50%',
                            background: '#00C853',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid #fff',
                            zIndex: 2,
                        }}>
                            <ShieldCheck size={14} color="#fff" strokeWidth={2.5} />
                        </div>

                    )}
                </div>

                {/* Name */}
                <h2 style={{
                    fontFamily: 'Poppins', fontWeight: 900, fontSize: 'clamp(20px, 6vw, 28px)',
                    color: '#0A0A0A', margin: '0 0 8px',
                    lineHeight: 1.1,
                }}>
                    {profile.name}
                </h2>

                {/* Category + Role badges */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                    <span style={{
                        background: `${catConfig.accent}15`,
                        color: catConfig.accent,
                        border: `1px solid ${catConfig.accent}`,
                        borderRadius: 999, padding: 'clamp(4px, 1vw, 6px) clamp(12px, 3vw, 16px)',
                        fontSize: 'clamp(10px, 2.5vw, 12px)', fontFamily: 'Poppins', fontWeight: 700,
                    }}>
                        {catConfig.emoji} {catConfig.label}
                    </span>

                    <span style={{
                        background: profile.role?.toLowerCase() === 'company' ? '#00C85315' : `${catConfig.accent}15`,
                        color: profile.role?.toLowerCase() === 'company' ? '#00C853' : catConfig.accent,
                        border: profile.role?.toLowerCase() === 'company' ? '1px solid #00C853' : `1px solid ${catConfig.accent}`,
                        borderRadius: 999, padding: 'clamp(4px, 1vw, 6px) clamp(12px, 3vw, 16px)',
                        fontSize: 'clamp(10px, 2.5vw, 12px)', fontFamily: 'Poppins', fontWeight: 700,
                    }}>
                        {(() => {
                            const uiR = profile.uiRole;
                            const roles: Record<string, { provider: string; seeker: string }> = {
                                jobs: { provider: 'Job Seeker', seeker: 'Company' },
                                healthcare: { provider: 'Doctor', seeker: 'Patient' },
                                education: { provider: 'Teacher', seeker: 'Student' },
                                marriage: { provider: 'Presenting', seeker: 'Looking' },
                                legal: { provider: 'Lawyer', seeker: 'Client' },
                                realestate: { provider: 'Agent', seeker: 'Buyer' },
                                transport: { provider: 'Driver', seeker: 'Passenger' },
                                travel: { provider: 'Agency', seeker: 'Traveler' },
                                agriculture: { provider: 'Farmer', seeker: 'Buyer' },
                                sellbuy: { provider: 'Seller', seeker: 'Buyer' },
                            };
                            const catRoles = roles[profile.category as string] || { provider: 'Provider', seeker: 'Seeker' };

                            if (uiR === 'provider') return catRoles.provider;
                            if (uiR === 'seeker') return catRoles.seeker;

                            // Fallback: use roleKey from Firestore
                            const roleKey = profile.role || '';
                            const providerKeys = ['worker', 'groom', 'agent', 'seller', 'teacher', 'doctor', 'freelancer'];
                            return providerKeys.includes(roleKey) ? catRoles.provider : catRoles.seeker;
                        })()}
                    </span>

                    {profile.city && (
                        <span style={{
                            background: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0',
                            borderRadius: 999, padding: 'clamp(4px, 1vw, 6px) clamp(10px, 2.5vw, 14px)',
                            fontSize: 'clamp(10px, 2.5vw, 12px)', fontFamily: 'DM Sans', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            <MapPin size={12} /> {profile.city}
                        </span>
                    )}
                </div>

                {/* Bio */}
                {profile.bio && (
                    <p style={{
                        color: '#666', fontSize: 'clamp(13px, 3vw, 15px)', fontFamily: 'DM Sans',
                        lineHeight: 1.6, margin: '0 auto 20px',
                        maxWidth: 320,
                    }}>
                        {profile.bio}
                    </p>
                )}

                {/* Stats row */}
                <div style={{
                    display: 'flex', justifyContent: 'center',
                    gap: 'clamp(20px, 8vw, 48px)', margin: '16px 0 24px',
                }}>
                    {[
                        { label: 'Posts', value: videos.filter((v: any) => v.admin_status === 'approved' && v.is_live !== false).length },
                        { label: 'Followers', value: profile.followers?.length || 0 },
                        { label: 'Following', value: profile.following?.length || 0 },
                    ].map((stat) => (
                        <div key={stat.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Poppins', fontWeight: 900, fontSize: 'clamp(18px, 5vw, 24px)', color: '#0A0A0A' }}>
                                {formatCount(stat.value)}
                            </div>
                            <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#888', fontFamily: 'DM Sans', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action buttons: Follow + Connect */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24, padding: '0 16px' }}>
                    <button
                        onClick={async () => {
                            if (!authUser) { router.push('/auth/login'); return; }
                            setFollowingLoading(true);
                            try {
                                const followDocId = `${currentUser.uid}_${id}`;
                                const followRef = doc(db, 'follows', followDocId);
                                const targetUserRef = doc(db, 'users', id as string);
                                const currentUserRef = doc(db, 'users', currentUser.uid);

                                if (isFollowing) {
                                    await deleteDoc(followRef);
                                    await updateDoc(targetUserRef, {
                                        followers: arrayRemove(currentUser.uid)
                                    });
                                    await updateDoc(currentUserRef, {
                                        following: arrayRemove(id)
                                    });
                                } else {
                                    await setDoc(followRef, {
                                        followerId: currentUser.uid,
                                        followingId: id,
                                        createdAt: serverTimestamp()
                                    });
                                    await updateDoc(targetUserRef, {
                                        followers: arrayUnion(currentUser.uid)
                                    });
                                    await updateDoc(currentUserRef, {
                                        following: arrayUnion(id)
                                    });

                                    // Create Notification
                                    await createNotification(
                                        id as string,
                                        'follow',
                                        'New Follower',
                                        `${currentUser.displayName || 'Someone'} started following you`,
                                        currentUser.uid
                                    );
                                }
                                showToast(isFollowing ? `Unfollowed ${profile.name}` : `Following ${profile.name}`);
                            } catch (err) {
                                console.error('Follow error:', err);
                            } finally {
                                setFollowingLoading(false);
                            }
                        }}
                        disabled={followingLoading}
                        style={{
                            flex: 1, padding: '12px', borderRadius: 12,
                            background: isFollowing ? '#f0f0f0' : catConfig.accent,
                            border: 'none',
                            color: isFollowing ? '#666' : '#fff',
                            fontFamily: 'Poppins', fontWeight: 700,
                            fontSize: 'clamp(13px, 3.5vw, 15px)', cursor: 'pointer',
                            boxShadow: isFollowing ? 'none' : `0 8px 24px ${catConfig.accent}33`,
                            transition: 'all 0.2s',
                        }}
                    >
                        {followingLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
                    </button>
                    <button
                        onClick={() => contactRevealed ? setShowContactModal(true) : setShowRevealSheet(true)}
                        style={{
                            flex: 1, padding: '12px', borderRadius: 12,
                            background: contactRevealed ? catConfig.accent : 'transparent',
                            border: `2px solid ${catConfig.accent}`,
                            color: contactRevealed ? '#fff' : catConfig.accent,
                            fontFamily: 'Poppins', fontWeight: 700,
                            fontSize: 'clamp(13px, 3.5vw, 15px)', cursor: 'pointer',
                            boxShadow: contactRevealed ? `0 8px 24px ${catConfig.accent}33` : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        {checkingUnlock ? '...' : contactRevealed ? '📞 Contact' : '🔓 Connect'}
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
                            {videos.map((video, index) => (
                                <div
                                    key={video.id}
                                    onClick={() => openVideo(index)}

                                    style={{
                                        aspectRatio: '9/16',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        background: '#111',
                                        borderRadius: 8,
                                    }}
                                >
                                    {getThumbnail(video) ? (
                                        <Image
                                            src={getThumbnail(video).replace('mqdefault.jpg', 'hqdefault.jpg')}
                                            alt=""
                                            fill
                                            sizes="(max-width: 600px) 33vw, 200px"
                                            style={{ objectFit: 'cover' }}
                                            priority={index < 6}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 24 }}>
                                            ▶
                                        </div>
                                    )}
                                    {/* View count */}
                                    <div style={{
                                        position: 'absolute', bottom: 6, left: 6,
                                        background: 'rgba(0,0,0,0.6)',
                                        backdropFilter: 'blur(4px)',
                                        color: '#fff', fontSize: 10,
                                        padding: '2px 6px', borderRadius: 4,
                                        fontFamily: 'DM Sans', fontWeight: 700,
                                        display: 'flex', alignItems: 'center', gap: 3,
                                    }}>
                                        <span style={{ fontSize: 8 }}>▶</span> {formatCount(video.views || 0)}
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

                    {/* CONTACT SECTION */}
                    <div style={{
                        background: '#F8F8F8',
                        border: '1px solid #E5E5E5',
                        borderRadius: 14,
                        padding: '14px 16px',
                        marginTop: 12,
                    }}>
                        {/* Section header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            marginBottom: 12, borderBottom: '1px solid #E5E5E5', paddingBottom: 10,
                        }}>
                            <div style={{ width: 3, height: 14, background: catConfig.accent, borderRadius: 999 }} />
                            <h3 style={{
                                fontFamily: 'Poppins', fontWeight: 700, fontSize: 13,
                                color: '#0A0A0A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
                            }}>
                                Contact
                            </h3>
                        </div>

                        {checkingUnlock ? (
                            /* Still checking */
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                <div style={{
                                    width: 22, height: 22, borderRadius: '50%',
                                    border: `2px solid #E5E5E5`,
                                    borderTopColor: catConfig.accent,
                                    animation: 'spin 0.7s linear infinite',
                                    margin: '0 auto',
                                }} />
                            </div>

                        ) : contactRevealed ? (
                            /* ✅ UNLOCKED — show contact info */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: '#E8F5E9', borderRadius: 8, padding: '8px 12px',
                                }}>
                                    <span>🔓</span>
                                    <span style={{ color: '#2E7D32', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 }}>
                                        Contact Unlocked
                                    </span>
                                </div>

                                {/* Phone */}
                                {(profile.phone || profile.hrPhone) && (
                                    <a href={`tel:${profile.phone || profile.hrPhone}`} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 14px', background: '#fff',
                                        borderRadius: 10, border: '1px solid #E5E5E5', textDecoration: 'none',
                                    }}>
                                        <span style={{ fontSize: 22 }}>📞</span>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#888', fontFamily: 'DM Sans' }}>Phone</div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: 'DM Sans' }}>
                                                {profile.phone || profile.hrPhone}
                                            </div>
                                        </div>
                                    </a>
                                )}

                                {/* WhatsApp */}
                                {(profile.phone || profile.hrPhone) && (
                                    <a
                                        href={`https://wa.me/92${(profile.phone || profile.hrPhone).replace(/^0/, '').replace(/\D/g, '')}`}
                                        target="_blank" rel="noopener noreferrer"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '12px 14px', background: '#F0FFF4',
                                            borderRadius: 10, border: '1px solid #B2DFDB', textDecoration: 'none',
                                        }}
                                    >
                                        <span style={{ fontSize: 22 }}>💬</span>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#888', fontFamily: 'DM Sans' }}>WhatsApp</div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: 'DM Sans' }}>
                                                {profile.phone || profile.hrPhone}
                                            </div>
                                        </div>
                                    </a>
                                )}

                                {/* Email */}
                                {profile.email && (
                                    <a href={`mailto:${profile.email}`} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 14px', background: '#fff',
                                        borderRadius: 10, border: '1px solid #E5E5E5', textDecoration: 'none',
                                    }}>
                                        <span style={{ fontSize: 22 }}>✉️</span>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#888', fontFamily: 'DM Sans' }}>Email</div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: 'DM Sans' }}>
                                                {profile.email}
                                            </div>
                                        </div>
                                    </a>
                                )}

                                {/* Location */}
                                {(profile.companyLocation || profile.city) && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 14px', background: '#fff',
                                        borderRadius: 10, border: '1px solid #E5E5E5',
                                    }}>
                                        <span style={{ fontSize: 22 }}>📍</span>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#888', fontFamily: 'DM Sans' }}>Location</div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: 'DM Sans' }}>
                                                {profile.companyLocation || profile.city}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Website */}
                                {profile.website && (
                                    <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 14px', background: '#fff',
                                        borderRadius: 10, border: '1px solid #E5E5E5', textDecoration: 'none',
                                    }}>
                                        <span style={{ fontSize: 22 }}>🌐</span>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#888', fontFamily: 'DM Sans' }}>Website</div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: catConfig.accent, fontFamily: 'DM Sans' }}>
                                                {profile.website}
                                            </div>
                                        </div>
                                    </a>
                                )}
                            </div>

                        ) : (
                            /* 🔒 LOCKED */
                            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                                <p style={{ color: '#666', fontFamily: 'DM Sans', fontSize: 13, margin: '0 0 14px' }}>
                                    Pay Rs. 1,000 to unlock phone, email & location
                                </p>
                                <button
                                    onClick={() => setShowRevealSheet(true)}
                                    style={{
                                        width: '100%', padding: '13px',
                                        background: catConfig.accent, color: '#fff',
                                        border: 'none', borderRadius: 10,
                                        fontFamily: 'Poppins', fontWeight: 700,
                                        fontSize: 14, cursor: 'pointer',
                                        boxShadow: `0 4px 16px ${catConfig.accent}44`,
                                    }}
                                >
                                    🔓 Unlock Contact — Rs. 1,000
                                </button>
                            </div>
                        )}
                    </div>

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

            {/* ── CONTACT MODAL (shows when unlocked and button tapped) ── */}
            {showContactModal && (
                <div
                    onClick={() => setShowContactModal(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 300,
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: '20px 20px 0 0',
                            padding: '20px 20px 40px',
                            width: '100%',
                            maxWidth: 600,
                        }}
                    >
                        {/* Handle bar */}
                        <div style={{
                            width: 40, height: 4, background: '#E5E5E5',
                            borderRadius: 99, margin: '0 auto 20px',
                        }} />

                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            marginBottom: 20,
                        }}>
                            <img
                                src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'U')}&background=eee&color=000`}
                                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                                <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, color: '#0A0A0A' }}>
                                    {profile.name || profile.displayName}
                                </div>
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    background: '#E8F5E9', borderRadius: 99, padding: '2px 10px',
                                    fontSize: 11, color: '#2E7D32', fontFamily: 'DM Sans', fontWeight: 700,
                                }}>
                                    🔓 Contact Unlocked
                                </div>
                            </div>
                        </div>

                        {/* Contact rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                            {(profile.phone || profile.hrPhone) && (
                                <a href={`tel:${profile.phone || profile.hrPhone}`} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '14px 16px', background: '#F8F8F8',
                                    borderRadius: 12, border: '1px solid #E5E5E5',
                                    textDecoration: 'none',
                                }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: `${catConfig.accent}15`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, flexShrink: 0,
                                    }}>📞</div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#888', fontFamily: 'DM Sans' }}>Phone</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: 'DM Sans' }}>
                                            {profile.phone || profile.hrPhone}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', color: catConfig.accent, fontSize: 18 }}>›</div>
                                </a>
                            )}

                            {(profile.phone || profile.hrPhone) && (
                                <a
                                    href={`https://wa.me/92${(profile.phone || profile.hrPhone).replace(/^0/, '').replace(/\D/g, '')}`}
                                    target="_blank" rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '14px 16px', background: '#F0FFF4',
                                        borderRadius: 12, border: '1px solid #C8E6C9',
                                        textDecoration: 'none',
                                    }}
                                >
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: '#25D36620',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, flexShrink: 0,
                                    }}>💬</div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#888', fontFamily: 'DM Sans' }}>WhatsApp</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: 'DM Sans' }}>
                                            {profile.phone || profile.hrPhone}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', color: '#25D366', fontSize: 18 }}>›</div>
                                </a>
                            )}

                            {profile.email && (
                                <a href={`mailto:${profile.email}`} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '14px 16px', background: '#F8F8F8',
                                    borderRadius: 12, border: '1px solid #E5E5E5',
                                    textDecoration: 'none',
                                }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: `${catConfig.accent}15`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, flexShrink: 0,
                                    }}>✉️</div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#888', fontFamily: 'DM Sans' }}>Email</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: 'DM Sans' }}>
                                            {profile.email}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', color: catConfig.accent, fontSize: 18 }}>›</div>
                                </a>
                            )}

                            {(profile.companyLocation || profile.city) && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '14px 16px', background: '#F8F8F8',
                                    borderRadius: 12, border: '1px solid #E5E5E5',
                                }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: `${catConfig.accent}15`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, flexShrink: 0,
                                    }}>📍</div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#888', fontFamily: 'DM Sans' }}>Location</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: 'DM Sans' }}>
                                            {profile.companyLocation || profile.city}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {profile.website && (
                                <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '14px 16px', background: '#F8F8F8',
                                    borderRadius: 12, border: '1px solid #E5E5E5',
                                    textDecoration: 'none',
                                }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: `${catConfig.accent}15`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, flexShrink: 0,
                                    }}>🌐</div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#888', fontFamily: 'DM Sans' }}>Website</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: catConfig.accent, fontFamily: 'DM Sans' }}>
                                            {profile.website}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', color: catConfig.accent, fontSize: 18 }}>›</div>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <RevealContactSheet
                isOpen={showRevealSheet}
                onClose={() => setShowRevealSheet(false)}
                targetUserId={id as string}
                targetUserName={profile?.name || profile?.displayName || ''}
                category={profile?.category}
            />

            {/* DP Zoom Modal */}
            {showDPZoom && (
                <div
                    onClick={() => setShowDPZoom(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
                        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20, cursor: 'zoom-out'
                    }}
                >
                    <button
                        style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff' }}
                        onClick={() => setShowDPZoom(false)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'U')}&background=eee&color=000&size=400`}
                        style={{ maxWidth: '100%', maxHeight: '80dvh', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

        </div>
    );
}

function PendingPaymentChecker({
    buyerId, targetId, accent, onOpenSheet
}: {
    buyerId?: string
    targetId: string
    accent: string
    onOpenSheet: () => void
}) {
    const [paymentStatus, setPaymentStatus] = useState<'none' | 'pending' | 'rejected'>('none')

    useEffect(() => {
        if (!buyerId) return

        // Listen in real-time to this user's payment request for this target
        const q = query(
            collection(db, 'paymentRequests'),
            where('requestedBy', '==', buyerId),
            where('targetUserId', '==', targetId),
            where('status', 'in', ['pending', 'rejected'])
        )

        const unsubscribe = onSnapshot(q, (snap) => {
            if (snap.empty) {
                setPaymentStatus('none')
                return
            }
            // Get most recent
            const docs = snap.docs.sort((a, b) => b.data().createdAt?.seconds - a.data().createdAt?.seconds);
            const latest = docs[0].data()
            setPaymentStatus(latest.status as 'pending' | 'rejected')
        })

        return () => unsubscribe()
    }, [buyerId, targetId])

    if (paymentStatus === 'pending') {
        return (
            <div style={{
                background: '#FFF3E0', borderRadius: 12,
                padding: '16px', border: '1px solid #FFB74D',
            }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <p style={{
                    color: '#E65100', fontFamily: 'DM Sans',
                    fontWeight: 700, fontSize: 14, margin: '0 0 4px',
                }}>
                    Payment Under Review
                </p>
                <p style={{ color: '#BF360C', fontFamily: 'DM Sans', fontSize: 12, margin: 0 }}>
                    Admin will approve within 24 hours.
                    Contact info will appear here automatically.
                </p>
            </div>
        )
    }

    if (paymentStatus === 'rejected') {
        return (
            <>
                <div style={{
                    background: '#FFEBEE', borderRadius: 12,
                    padding: '12px', border: '1px solid #FFCDD2',
                    marginBottom: 12,
                }}>
                    <p style={{ color: '#C62828', fontFamily: 'DM Sans', fontSize: 13, margin: 0 }}>
                        ❌ Your previous payment was rejected.
                        Please resubmit with correct proof.
                    </p>
                </div>
                <button
                    onClick={onOpenSheet}
                    style={{
                        width: '100%', padding: '12px',
                        background: accent, color: '#fff',
                        border: 'none', borderRadius: 10,
                        fontFamily: 'Poppins', fontWeight: 700,
                        fontSize: 14, cursor: 'pointer',
                    }}
                >
                    🔓 Resubmit Payment — Rs. 1,000
                </button>
            </>
        )
    }

    // Default: not paid yet
    return (
        <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
            <p style={{ color: '#666', fontFamily: 'DM Sans', fontSize: 13, margin: '0 0 14px' }}>
                Pay Rs. 1,000 to unlock phone, email, WhatsApp & location
            </p>
            <button
                onClick={onOpenSheet}
                style={{
                    width: '100%', padding: '13px',
                    background: accent, color: '#fff',
                    border: 'none', borderRadius: 10,
                    fontFamily: 'Poppins', fontWeight: 700,
                    fontSize: 14, cursor: 'pointer',
                    boxShadow: `0 4px 16px ${accent}44`,
                }}
            >
                🔓 Unlock Contact — Rs. 1,000
            </button>
        </>
    )
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
    return (
        <div style={{
            background: '#F8F8F8',
            border: '1px solid #E5E5E5',
            borderRadius: 16,
            padding: 'clamp(12px, 3vw, 20px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 16,
                borderBottom: '1px solid #eee',
                paddingBottom: 12,
            }}>
                <div style={{ width: 4, height: 16, background: accent, borderRadius: 99 }} />
                <h3 style={{
                    fontFamily: 'Poppins', fontWeight: 800, fontSize: 'clamp(12px, 2.5vw, 14px)',
                    color: '#0A0A0A', margin: 0, textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                }}>
                    {title}
                </h3>
            </div>
            {children}
        </div>
    );
}
