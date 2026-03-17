'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, MapPin, Briefcase, GraduationCap, Award } from 'lucide-react';

interface UserProfile {
    uid: string;
    displayName?: string;
    name?: string;
    photoURL?: string;
    role?: string;
    category?: string;
    bio?: string;
    location?: string;
    companyName?: string;
    skills?: string[];
    experience?: any[];
    education?: any[];
    followerCount?: number;
    followingCount?: number;
    totalLikes?: number;
}

export default function ProfileLandingPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            if (!id) return;
            try {
                const snap = await getDoc(doc(db, 'users', id as string));
                if (snap.exists()) {
                    setProfile({ uid: snap.id, ...snap.data() } as UserProfile);
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, [id]);

    const handleRevealContact = () => {
        if (!currentUser) {
            router.push('/auth/login');
            return;
        }
        router.push(`/profile/${profile?.role || 'user'}/${id}`);
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #eee', borderTop: '3px solid #FF0069', animation: 'spin 0.75s linear infinite' }} />
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!profile) {
        return (
            <div style={{ minHeight: '100vh', background: '#fff', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Profile not found</p>
            </div>
        );
    }

    const isEmployer = profile.role === 'employer';

    return (
        <div style={{ minHeight: '100vh', background: '#fff', color: '#0A0A0A' }}>
            {/* Header */}
            <div style={{
                position: 'sticky', top: 0,
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #eee',
                padding: '16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 50
            }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#0A0A0A', cursor: 'pointer', padding: 8 }}>
                    <ArrowLeft size={24} />
                </button>
                <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Poppins' }}>
                    {isEmployer ? 'Company Profile' : 'Candidate Profile'}
                </span>
            </div>

            {/* Hero Section */}
            <div style={{ padding: '24px', textAlign: 'center' }}>
                {/* Avatar */}
                <div style={{
                    width: 120, height: 120, borderRadius: '50%', margin: '0 auto 16px',
                    border: '3px solid #FF0069', overflow: 'hidden', position: 'relative'
                }}>
                    {profile.photoURL ? (
                        <img src={profile.photoURL} alt={profile.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{
                            width: '100%', height: '100%', background: '#FF0069',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 48, fontWeight: 700, color: '#fff'
                        }}>
                            {(profile.displayName || profile.name || 'U')[0].toUpperCase()}
                        </div>
                    )}
                </div>

                {/* Name */}
                <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Poppins', marginBottom: 4, color: '#0A0A0A' }}>
                    {isEmployer ? profile.companyName : profile.displayName || profile.name}
                </h1>

                {/* Verified Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#00C853', marginBottom: 8 }}>
                    <span style={{ fontSize: 12 }}>✓</span>
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Verified</span>
                </div>

                {/* Location */}
                {profile.location && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#666', fontSize: 14 }}>
                        <MapPin size={14} />
                        <span>{profile.location}</span>
                    </div>
                )}

                {/* Stats */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#FF0069' }}>{profile.followerCount || 0}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Followers</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#FF0069' }}>{profile.followingCount || 0}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Following</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#FF0069' }}>{profile.totalLikes || 0}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Likes</div>
                    </div>
                </div>
            </div>

            {/* Connect Button */}
            <div style={{ padding: '0 24px', marginBottom: 24 }}>
                <button
                    onClick={handleRevealContact}
                    className="relative inline-flex h-12 active:scale-95 transition overflow-hidden rounded-lg p-[1px] focus:outline-none"
                    style={{ width: '100%' }}
                >
                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#e7029a_0%,#f472b6_50%,#bd5fff_100%)]">
                    </span>
                    <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-lg bg-white px-7 text-sm font-medium text-black backdrop-blur-3xl gap-2">
                        Reveal Contact
                        <svg stroke="currentColor" fill="currentColor" strokeWidth={0} viewBox="0 0 448 512" height="1em" width="1em">
                            <path d="M429.6 92.1c4.9-11.9 2.1-25.6-7-34.7s-22.8-11.9-34.7-7l-352 144c-14.2 5.8-22.2 20.8-19.3 35.8s16.1 25.8 31.4 25.8H224V432c0 15.3 10.8 28.4 25.8 31.4s30-5.1 35.8-19.3l144-352z" />
                        </svg>
                    </span>
                </button>
            </div>

            {/* Bio Section */}
            {profile.bio && (
                <div style={{ padding: '0 24px', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#FF0069' }}>About</h2>
                    <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6 }}>{profile.bio}</p>
                </div>
            )}

            {/* Skills Section (for candidates) */}
            {!isEmployer && profile.skills && profile.skills.length > 0 && (
                <div style={{ padding: '0 24px', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#FF0069', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Award size={18} /> Skills
                    </h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {profile.skills.map((skill: string, i: number) => (
                            <span key={i} style={{
                                padding: '6px 12px', background: 'rgba(255,0,105,0.1)',
                                border: '1px solid #FF0069', borderRadius: 20, fontSize: 13, color: '#0A0A0A'
                            }}>
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Experience Section */}
            {!isEmployer && profile.experience && profile.experience.length > 0 && (
                <div style={{ padding: '0 24px', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#FF0069', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Briefcase size={18} /> Experience
                    </h2>
                    {profile.experience.map((exp: any, i: number) => (
                        <div key={i} style={{ marginBottom: 16, paddingLeft: 16, borderLeft: '2px solid #eee' }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0A0A0A' }}>{exp.title || exp.position}</div>
                            <div style={{ fontSize: 13, color: '#666' }}>{exp.company} • {exp.duration}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Education Section */}
            {!isEmployer && profile.education && profile.education.length > 0 && (
                <div style={{ padding: '0 24px', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#FF0069', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <GraduationCap size={18} /> Education
                    </h2>
                    {profile.education.map((edu: any, i: number) => (
                        <div key={i} style={{ marginBottom: 16, paddingLeft: 16, borderLeft: '2px solid #eee' }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0A0A0A' }}>{edu.degree}</div>
                            <div style={{ fontSize: 13, color: '#666' }}>{edu.school} • {edu.year}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Company Info (for employers) */}
            {isEmployer && (
                <div style={{ padding: '0 24px', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#FF0069', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Briefcase size={18} /> Company Info
                    </h2>
                    <div style={{ background: '#f8f8f8', padding: 16, borderRadius: 12 }}>
                        <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6 }}>
                            {profile.bio || 'No company description available.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Bottom spacing */}
            <div style={{ height: 100 }} />
        </div>
    );
}
