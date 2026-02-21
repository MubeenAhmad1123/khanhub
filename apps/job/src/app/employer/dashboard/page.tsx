'use client';

import {
    LayoutDashboard,
    Video,
    Users,
    Bell,
    Settings,
    Home,
    Plus,
    Building2,
    CheckCircle2,
    CreditCard,
    ArrowRight,
    Briefcase,
    Search,
    Loader2,
    Clock,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { User } from '@/types/user';

export default function EmployerDashboard() {
    const { user, loading } = useAuth();
    const [userData, setUserData] = useState<User | null>(null);
    const [revealCount, setRevealCount] = useState(0);
    const [hasSubmittedPayment, setHasSubmittedPayment] = useState(false);
    const [checkingPayment, setCheckingPayment] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                setUserData(doc.data() as User);
            }
        });

        const checkPayment = async () => {
            try {
                const paymentRef = doc(db, 'payments', user.uid);
                const paymentSnap = await getDoc(paymentRef);
                setHasSubmittedPayment(paymentSnap.exists() && paymentSnap.data()?.status === 'pending');
            } catch (err) {
                console.error('Error checking payment status:', err);
            } finally {
                setCheckingPayment(false);
            }
        };

        checkPayment();

        // Real-time connections count
        const connQ = query(collection(db, 'connections'), where('employerId', '==', user.uid));
        const unsubscribeConn = onSnapshot(connQ, (snap: any) => {
            setRevealCount(snap.size);
        });

        return () => { unsubscribe(); unsubscribeConn(); };
    }, [user?.uid]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
        );
    }

    const sidebarLinks = [
        { href: '/employer/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { href: '/employer/my-videos', label: 'Company Videos', icon: <Video className="w-5 h-5" /> },
        { href: '/employer/connections', label: 'Contact Reveals', icon: <Users className="w-5 h-5" /> },
        { href: '/employer/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
        { href: '/employer/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFF] flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col flex-shrink-0 sticky top-0 h-screen">
                <div className="p-6">
                    <Link href="/" className="flex items-center gap-2 mb-10">
                        <div className="w-8 h-8 bg-[#F97316] rounded-lg flex items-center justify-center transition-transform hover:scale-110">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-black text-[#0F172A] tracking-tight">
                            KhanHub<span className="text-[#F97316]">Hiring</span>
                        </span>
                    </Link>

                    <nav className="space-y-1">
                        {sidebarLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                    link.href === '/employer/dashboard'
                                        ? "bg-orange-50 text-[#F97316]"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                {link.icon}
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Back to</p>
                        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-[#1B4FD8] transition-colors">
                            <Home className="w-4 h-4" />
                            Main Portal
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-10">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                        <div>
                            <h1 className="text-3xl font-black text-[#0F172A]">Corporate Dashboard</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider">Employer</span>
                                <span className="text-slate-400 text-sm font-medium">
                                    {(userData as any)?.companyName || (userData as any)?.displayName || 'Company'} • {(userData as any)?.industry || 'General'}
                                </span>
                            </div>
                        </div>
                        <Link
                            href="/browse"
                            className="bg-white border border-slate-200 px-6 py-3 rounded-full text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                        >
                            Find Candidates
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Status Card Logic */}
                    <div className="mb-8">


                        {/* 1. Pitch Video Under Review */}
                        {userData?.profile_status === 'video_submitted' && (
                            <div className="bg-yellow-50 border border-yellow-100 rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Loader2 className="w-10 h-10 text-yellow-600 animate-spin" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-xl font-bold text-yellow-900 mb-2">Company Video Under Review</h2>
                                    <p className="text-yellow-700 text-sm opacity-90 leading-relaxed max-w-lg">
                                        Your company pitch video is currently being reviewed by our team.
                                        Once approved, it will be visible to all candidates on your profile.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 1b. Pitch Video Pending */}
                        {userData?.profile_status !== 'video_submitted' &&
                            !userData?.profile?.videoResume && (
                                <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Plus className="w-10 h-10 text-blue-600" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h2 className="text-xl font-bold text-blue-900 mb-2">Pitch Your Company</h2>
                                        <p className="text-blue-700 text-sm opacity-90 leading-relaxed mb-6 max-w-lg">
                                            Upload a "Life at {(userData as any)?.companyName || 'Company'}" video to showcase your culture
                                            and attract higher quality candidates.
                                        </p>
                                        <Link
                                            href="/dashboard/video"
                                            className="inline-flex items-center gap-2 px-8 py-4 bg-[#1B4FD8] text-white rounded-full font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                                        >
                                            <Plus className="w-5 h-5 mr-1" />
                                            Post Company Pitch
                                        </Link>
                                    </div>
                                </div>
                            )}

                        {/* 1c. Account Fully Active */}
                        {userData?.profile?.videoResume && userData?.profile_status === 'active' && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-xl font-bold text-emerald-900 mb-2">Hiring Account Active</h2>
                                    <p className="text-emerald-700 text-sm opacity-90 leading-relaxed">
                                        Your company profile is verified. You can now browse all candidates
                                        and connect with them directly.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                        {[
                            { label: 'Candidates Viewed', value: '0', icon: <Search className="w-5 h-5 text-blue-600" /> },
                            { label: 'Reveals Requested', value: revealCount.toString(), icon: <Users className="w-5 h-5 text-orange-600" /> },
                            { label: 'Video Pitches', value: '0', icon: <Briefcase className="w-5 h-5 text-purple-600" /> }
                        ].map((stat, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                        {stat.icon}
                                    </div>
                                    <span className="text-2xl font-black text-[#0F172A]">{stat.value}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Bottom CTA Card */}
                    <div className="bg-[#0F172A] p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Users className="w-32 h-32 text-orange-500" />
                        </div>
                        <div className="relative z-10 text-center md:text-left">
                            <h3 className="text-2xl font-bold text-white mb-2">Discover New Talent</h3>
                            <p className="text-slate-400 mb-8 max-w-sm mx-auto md:mx-0">
                                Watch video introductions from over 10,000 verified candidates across Pakistan.
                            </p>
                            <Link
                                href="/browse"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#F97316] text-white rounded-full font-bold hover:scale-105 transition-all shadow-lg shadow-orange-500/20"
                            >
                                Start Discovery
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}