'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { calculateProfileStrength } from '@/lib/services/pointsSystem';
import { updateUserProfile } from '@/lib/firebase/auth';
import { Loader2, Check, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

// Import Modular Sections
import PersonalInfoSection from './components/PersonalInfoSection';
import ProfessionalSummarySection from './components/ProfessionalSummarySection';
import WorkHistorySection from './components/WorkHistorySection';
import SkillsSection from './components/SkillsSection';
import EducationSection from './components/EducationSection';
import ProjectsSection from './components/ProjectsSection';
import LanguagesSection from './components/LanguagesSection';
import JobPreferencesSection from './components/JobPreferencesSection';

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading, updateProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [animatedStrength, setAnimatedStrength] = useState(0);

    // Fetch and Sync Strength
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }
        if (user) {
            setLoading(false);
            const strength = calculateProfileStrength(user as any);
            setTimeout(() => setAnimatedStrength(strength), 500);
        }
    }, [user, authLoading, router]);

    const handleSaveSection = async (data: any) => {
        if (!user) return;
        try {
            await updateProfile({
                profile: {
                    ...(user.profile || {}),
                    ...data
                }
            } as any);
        } catch (error) {
            console.error('Save section error:', error);
            throw error;
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Candidate Profile...</p>
                </div>
            </div>
        );
    }

    const profile = (user?.profile || {}) as any;

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header Section */}
                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Verified Candidate Portal</span>
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">My Portfolio</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-tight">Manage your professional identity and attract top employers</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/upload-video"
                            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">🎬</span>
                            Manage Video Resume
                        </Link>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 items-start">

                    {/* Main Content (8 Sections) */}
                    <div className="lg:col-span-8 space-y-8">
                        <PersonalInfoSection
                            profile={profile as any}
                            onSave={handleSaveSection}
                        />

                        <ProfessionalSummarySection
                            profile={profile as any}
                            onSave={handleSaveSection}
                        />

                        <WorkHistorySection
                            profile={profile as any}
                            onSave={handleSaveSection}
                        />

                        <SkillsSection
                            profile={profile as any}
                            onSave={handleSaveSection}
                        />

                        <EducationSection
                            profile={profile as any}
                            onSave={handleSaveSection}
                        />

                        <ProjectsSection
                            profile={profile as any}
                            onSave={handleSaveSection}
                        />

                        <LanguagesSection
                            profile={profile as any}
                            onSave={handleSaveSection}
                        />

                        <JobPreferencesSection
                            profile={profile as any}
                            onSave={handleSaveSection}
                        />
                    </div>

                    {/* Sidebar: Completion Tracker & Info */}
                    <div className="lg:col-span-4 space-y-8 sticky top-8">

                        {/* Completion Tracker */}
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-500/5 border border-slate-100 p-8 md:p-10">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Profile Strength</h3>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-end justify-between mb-3">
                                    <span className="text-6xl font-black text-blue-600 italic tracking-tighter">{animatedStrength}%</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Power Level</span>
                                </div>
                                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-blue-500/30"
                                        style={{ width: `${animatedStrength}%` }}
                                    />
                                </div>
                            </div>

                            <ul className="space-y-4">
                                {[
                                    { label: 'Identity & contact', complete: !!(profile.fullName && profile.phone), points: 25 },
                                    { label: 'Intro Video (Mandatory)', complete: !!(profile.videoUrl || profile.videoResume), points: 30 },
                                    { label: 'Work Experience', complete: !!(profile.experience && profile.experience.length > 0), points: 15 },
                                    { label: 'Education Details', complete: !!(profile.education && profile.education.length > 0), points: 10 },
                                    { label: 'Skills & Bio', complete: !!(profile.skills?.length && profile.bio), points: 10 },
                                    { label: 'Projects / Languages', complete: !!(profile.projects?.length || profile.languages?.length), points: 10 },
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all
                                                ${item.complete ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-100 text-slate-200"}
                                            `}>
                                                <Check className={`w-3 h-3 stroke-[4] ${item.complete ? 'scale-110' : 'scale-0'} transition-transform`} />
                                            </div>
                                            <span className={`text-[11px] font-bold uppercase tracking-tight ${item.complete ? "text-slate-900" : "text-slate-400"}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-300">+{item.points}%</span>
                                    </li>
                                ))}
                            </ul>

                            {animatedStrength < 100 && (
                                <div className="mt-10 p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                                    <p className="text-[11px] text-blue-700 font-bold leading-relaxed uppercase tracking-wide italic">
                                        "A 100% profile gets 8x more interview requests from verified companies."
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Privacy & Trusted Info */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                            <Sparkles className="w-8 h-8 text-blue-400 mb-4" />
                            <h3 className="text-lg font-black uppercase tracking-tighter italic mb-3">Privacy Guard</h3>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                                Your contact details are hidden by default. They are only shared with employers after you've accepted a connection request or applied for a job.
                            </p>
                            <div className="flex items-center gap-3 py-4 border-t border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-emerald-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">ISO 27001 Encrypted Data</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
