'use client';

import {
    LayoutDashboard,
    Video,
    Users,
    Bell,
    Settings,
    Home,
    Plus,
    Play,
    Info,
    CheckCircle2,
    Clock,
    CreditCard,
    ArrowRight,
    Loader2,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { User } from '@/types/user';

export default function JobSeekerDashboard() {
    const { user, loading } = useAuth();
    const [userData, setUserData] = useState<User | null>(null);
    const [stats, setStats] = useState({
        videosWatched: 0,
        connectionsMade: 0,
        profileViews: 0
    });
    const [hasSubmittedPayment, setHasSubmittedPayment] = useState(false);
    const [checkingPayment, setCheckingPayment] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as User;
                setUserData(data);
                // In a real app, we'd also fetch stats here or from a separate collection
                setStats(prev => ({
                    ...prev,
                    videosWatched: data.premiumJobsViewed || 0,
                }));
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
        const connQ = query(collection(db, 'connections'), where('seekerId', '==', user.uid), where('status', '==', 'approved'));
        const unsubscribeConn = onSnapshot(connQ, (snap: any) => {
            setStats(prev => ({ ...prev, connectionsMade: snap.size }));
        });

        return () => { unsubscribe(); unsubscribeConn(); };
    }, [user?.uid]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const sidebarLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { href: '/dashboard/video', label: 'My Video', icon: <Video className="w-5 h-5" /> },
        { href: '/dashboard/connections', label: 'Reveals', icon: <Users className="w-5 h-5" /> },
        { href: '/dashboard/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
        { href: '/dashboard/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    ];

    // Determine Status for UI
    const isPaymentPending = userData?.paymentStatus === 'pending' || userData?.profile_status === 'payment_pending';
    const isVideoPending = userData?.profile_status === 'video_pending' || (userData?.video_upload_enabled && !userData?.profile?.videoResume);
    const isVideoSubmitted = (userData as any)?.profile_status === 'video_submitted';
    const isActive = userData?.profile_status === 'active';
    const isIncomplete = !userData?.profile_status || userData?.profile_status === 'incomplete'; // Default state

    return (
        <div className="min-h-screen bg-[#F8FAFF] flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col flex-shrink-0 sticky top-0 h-screen">
                <div className="p-6">
                    <Link href="/" className="flex items-center gap-2 mb-10">
                        <div className="w-8 h-8 bg-[#1B4FD8] rounded-lg flex items-center justify-center">
                            <Video className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-black text-[#0F172A] tracking-tight">
                            KhanHub<span className="text-[#1B4FD8]">Jobs</span>
                        </span>
                    </Link>

                    <nav className="space-y-1">
                        {sidebarLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                    link.href === '/dashboard'
                                        ? "bg-blue-50 text-[#1B4FD8]"
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
                            <h1 className="text-3xl font-black text-[#0F172A]">Welcome back, {userData?.displayName || 'Job Seeker'}!</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">Candidate</span>
                                <span className="text-slate-400 text-sm font-medium">
                                    {userData?.industry || 'General'} • {userData?.subcategory || 'N/A'}
                                </span>
                            </div>
                        </div>
                        <Link
                            href="/browse"
                            className="bg-white border border-slate-200 px-6 py-3 rounded-full text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                        >
                            Explore Videos
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Status Cards Logic */}
                    <div className="mb-8">


                        {/* 2. Video Pending (Upload Needed) - NOW FREE */}
                        {isVideoPending && (
                            <div className="bg-purple-50 border border-purple-100 rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
                                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Video className="w-10 h-10 text-purple-600" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-xl font-bold text-purple-900 mb-2">Upload Your Introduction (FREE)</h2>
                                    <p className="text-purple-700 text-sm opacity-90 leading-relaxed mb-6 max-w-lg">
                                        Record or upload a 60-second video to introduce yourself to employers. It's completely free to upload!
                                    </p>
                                    <Link
                                        href="/dashboard/video"

                                        className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-full font-bold shadow-lg shadow-purple-500/20 hover:scale-105 transition-all"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Upload Video
                                    </Link>
                                </div>
                            </div>
                        )}



                        {/* 3. Video Submitted (Under Review) */}
                        {isVideoSubmitted && (
                            <div className="bg-yellow-50 border border-yellow-100 rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
                                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Loader2 className="w-10 h-10 text-yellow-600 animate-spin" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-xl font-bold text-yellow-900 mb-2">Video Under Review</h2>
                                    <p className="text-yellow-700 text-sm opacity-90 leading-relaxed">
                                        Your video is currently being processed and reviewed by our team.
                                        This involves AI moderation and quality checks. You'll be notified once it's live.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 4. Active */}
                        {isActive && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-xl font-bold text-emerald-900 mb-2">Your Profile is Active</h2>
                                    <p className="text-emerald-700 text-sm opacity-90 leading-relaxed">
                                        Great job! Your video is live and searchable by employers.
                                        Keep your profile updated for the best results.
                                    </p>
                                </div>
                                <div className="px-6 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">
                                    Live
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                        {[
                            { label: 'Videos Watched', value: stats.videosWatched.toString(), icon: <Play className="w-5 h-5 text-blue-600" /> },
                            { label: 'Connections Made', value: stats.connectionsMade.toString(), icon: <Users className="w-5 h-5 text-orange-600" /> },
                            { label: 'Profile Views', value: stats.profileViews.toString(), icon: <Clock className="w-5 h-5 text-purple-600" /> }
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
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-blue-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                            <Info className="w-32 h-32 text-blue-600" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold text-[#0F172A] mb-2">Ready to explore?</h3>
                            <p className="text-slate-500 mb-8 max-w-sm">
                                Browse thousands of company pitch videos and find the workplace that matches your energy.
                            </p>
                            <Link
                                href="/browse"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#0F172A] text-white rounded-full font-bold hover:scale-105 transition-all"
                            >
                                Start Browsing
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}