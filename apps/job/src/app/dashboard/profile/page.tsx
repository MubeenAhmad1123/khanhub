'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { calculateProfileStrength, getProfileImprovementSteps } from '@/lib/services/pointsSystem';
import { updateUserProfile } from '@/lib/firebase/auth';
import { Loader2, AlertTriangle, CheckCircle2, Settings2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [animatedStrength, setAnimatedStrength] = useState(0);
    const { refreshProfile } = useAuth();

    // Auth check
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [authLoading, user, router]);

    // Fetch profile and sync strength
    useEffect(() => {
        if (!user) return;

        const fetchAndSyncProfile = async () => {
            try {
                setLoading(true);
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase/firebase-config');

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setProfile(userData);

                    // Sync strength if mismatch
                    const currentStrength = userData.profile?.profileStrength || 0;
                    const calculatedStrength = calculateProfileStrength(userData as any);

                    if (currentStrength !== calculatedStrength) {
                        console.log(`♻️ Syncing profile strength on profile page: ${currentStrength}% -> ${calculatedStrength}%`);
                        await updateUserProfile(user.uid, {
                            profile: {
                                profileStrength: calculatedStrength
                            }
                        } as any);
                        // Update local state to reflect change immediately
                        setProfile((prev: any) => ({
                            ...prev,
                            profile: {
                                ...(prev?.profile || {}),
                                profileStrength: calculatedStrength
                            }
                        }));
                    }
                }
            } catch (error) {
                console.error('Fetch profile error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndSyncProfile();
    }, [user]);

    // Simplified Profile Strength Calculation (Prompt 4)
    const stats = {
        hasBasicInfo: !!(profile?.profile?.fullName && profile?.profile?.phone),
        hasIndustry: !!(profile?.industry && profile?.subcategory),
        isVideoApproved: profile?.admin_status === 'approved' || (profile?.profile?.videoResume && profile?.profile_status === 'active'),
        hasBioLong: (profile?.profile?.bio?.length || 0) >= 50,
        hasSkillsMin: (profile?.profile?.skills?.length || 0) >= 3,
    };

    const strengthPoints = (
        (stats.hasBasicInfo ? 25 : 0) +
        (stats.hasIndustry ? 20 : 0) +
        (stats.isVideoApproved ? 35 : 0) +
        (stats.hasBioLong ? 10 : 0) +
        (stats.hasSkillsMin ? 10 : 0)
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedStrength(strengthPoints);
        }, 300);
        return () => clearTimeout(timer);
    }, [strengthPoints]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                    <p className="text-gray-600 mt-2">Manage your profile and boost your visibility to employers</p>
                </div>


                {/* Action Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Link
                        href="/dashboard/video"
                        className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100 hover:border-blue-200 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                🎬
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-black text-slate-900 uppercase tracking-tighter italic">My Video</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase truncate">View or Update Intro</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/profile/edit"
                        className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100 hover:border-teal-200 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                ✏️
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-black text-slate-900 uppercase tracking-tighter italic">Edit Profile</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase truncate">Update your details</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/connections"
                        className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100 hover:border-orange-200 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                🔗
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-black text-slate-900 uppercase tracking-tighter italic">My Connections</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase truncate">
                                    {profile?.connections_count || 0} active connections
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Profile Information (Left 2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10">
                            <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase mb-8">Profile Information</h2>

                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Full Name</label>
                                        <p className="text-slate-900 font-bold text-lg">
                                            {profile?.profile?.fullName || profile?.displayName || 'Not provided'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Email Address</label>
                                        <p className="text-slate-900 font-bold text-lg">{user?.email}</p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Industry (Read-only)</label>
                                        <p className="text-blue-600 font-black text-lg uppercase italic tracking-tighter">
                                            {profile?.industry || 'General'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Subcategory (Read-only)</label>
                                        <p className="text-blue-600 font-black text-lg uppercase italic tracking-tighter">
                                            {profile?.subcategory || (
                                                <Link href="/dashboard/profile/edit" className="text-orange-500 hover:underline">Select Now →</Link>
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Phone Number</label>
                                        <p className="text-slate-900 font-bold text-lg">
                                            {profile?.profile?.phone || 'Not provided'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">🔒 Only visible to connected employers</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Location</label>
                                        <p className="text-slate-900 font-bold text-lg">
                                            {profile?.profile?.location || 'Not provided'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">🔒 Only visible to connected employers</p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Years of Experience</label>
                                        <p className="text-slate-900 font-bold text-lg">
                                            {profile?.profile?.yearsOfExperience !== undefined
                                                ? `${profile.profile.yearsOfExperience} years`
                                                : 'Not provided'}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Professional Bio</label>
                                    <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 italic">
                                        "{profile?.profile?.bio || 'Introduce yourself to employers...'}"
                                    </p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Skills & Expertise</label>
                                    {profile?.profile?.skills && profile.profile.skills.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {profile.profile.skills.map((skill: string, index: number) => (
                                                <span
                                                    key={index}
                                                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-sm font-medium italic">No skills listed yet.</p>
                                    )}
                                </div>

                                <div className="pt-8">
                                    <Link
                                        href="/dashboard/profile/edit"
                                        className="inline-flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <Settings2 className="w-5 h-5" />
                                        Update Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Profile Strength Checklist (Right 1/3) */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Profile Strength</h3>

                            <div className="mb-8">
                                <div className="flex items-end justify-between mb-2">
                                    <span className="text-4xl font-black text-blue-600 italic tracking-tighter">{animatedStrength}%</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Strength</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${animatedStrength}%` }}
                                    />
                                </div>
                            </div>

                            <ul className="space-y-4">
                                {[
                                    { label: 'Basic Info (Name, Phone)', complete: stats.hasBasicInfo, points: 25 },
                                    { label: 'Industry & Subcategory', complete: stats.hasIndustry, points: 20 },
                                    { label: 'Approved Intro Video', complete: stats.isVideoApproved, points: 35 },
                                    { label: 'Bio (Min 50 chars)', complete: stats.hasBioLong, points: 10 },
                                    { label: 'Skills (Min 3)', complete: stats.hasSkillsMin, points: 10 },
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors",
                                                item.complete ? "bg-green-100 border-green-500 text-green-600" : "bg-white border-slate-200"
                                            )}>
                                                {item.complete && <Check className="w-3 h-3 stroke-[4]" />}
                                            </div>
                                            <span className={cn(
                                                "text-[11px] font-bold uppercase tracking-tight",
                                                item.complete ? "text-slate-900" : "text-slate-400"
                                            )}>{item.label}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-300">+{item.points}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-orange-50 rounded-[2.5rem] p-8 border border-orange-100">
                            <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4">Privacy Note</h3>
                            <p className="text-[11px] text-orange-800 font-bold leading-relaxed uppercase tracking-wide">
                                Your phone number and location are only revealed to employers after you mutually agree to connect.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}