'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    User,
    Settings,
    Shield,
    Users,
    LayoutDashboard,
    Bell,
    Search,
    LogOut,
    ExternalLink,
    ChevronRight,
    Fingerprint,
    Mail,
    Calendar
} from 'lucide-react';

export default function AdminPage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/signin');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-neutral-500 font-medium animate-pulse">Initializing Admin Dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex">
            {/* ── Sidebar ── */}
            <aside className="hidden lg:flex w-72 bg-white border-r border-neutral-200 flex-col sticky top-0 h-screen">
                <div className="p-8 border-b border-neutral-100">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform duration-500">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-display font-bold text-xl text-neutral-900">Admin<span className="text-primary-600">Hub</span></span>
                    </Link>
                </div>

                <nav className="flex-1 p-6 space-y-2">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4 ml-2">Navigation</div>
                    <Link href="/admin" className="flex items-center gap-3 px-4 py-3 bg-primary-50 text-primary-600 rounded-xl font-semibold transition-all shadow-sm">
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </Link>
                    <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 rounded-xl transition-all group">
                        <Users className="w-5 h-5 group-hover:text-primary-600 transition-colors" />
                        User Management
                    </Link>
                    <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 rounded-xl transition-all group">
                        <Settings className="w-5 h-5 group-hover:text-primary-600 transition-colors" />
                        System Settings
                    </Link>
                </nav>

                <div className="p-6 border-t border-neutral-100">
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-all group"
                    >
                        <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 min-w-0">
                {/* Header */}
                <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 px-6 sm:px-10 py-5">
                    <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
                        <div className="relative flex-1 max-w-md hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="relative p-2.5 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-all">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                            </button>
                            <div className="h-8 w-px bg-neutral-200" />
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-neutral-900 leading-none">{user.displayName || 'Admin User'}</p>
                                    <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider mt-1">Super Admin</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-neutral-200">
                                    {user.photoURL ? (
                                        <Image src={user.photoURL} alt="Admin" width={40} height={40} className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-primary-600 flex items-center justify-center text-white font-bold">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="px-6 sm:px-10 py-10 max-w-7xl mx-auto space-y-8">
                    {/* Welcome Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-display font-black text-neutral-900 tracking-tight">Admin Dashboard</h1>
                            <p className="text-neutral-500 font-medium">Welcome back, {user.displayName || 'Administrator'}. Here's what's happening.</p>
                        </div>
                        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 hover:bg-neutral-50 hover:shadow-sm transition-all">
                            View Website <ExternalLink className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Profile Overview Card */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2 space-y-8">
                            {/* Profile Info Card */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8">
                                    <div className="w-24 h-24 bg-primary-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                                </div>

                                <div className="relative flex flex-col md:flex-row gap-8 items-start md:items-center">
                                    <div className="relative w-32 h-32 rounded-[2rem] overflow-hidden shadow-2xl shadow-primary-500/10 ring-4 ring-white">
                                        {user.photoURL ? (
                                            <Image src={user.photoURL} alt="Profile" fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-4xl font-black">
                                                {user.email?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-neutral-900">{user.displayName || 'Administrative User'}</h2>
                                            <div className="flex items-center gap-2 mt-1 text-primary-600 font-bold text-xs uppercase tracking-widest">
                                                <Shield className="w-3.5 h-3.5" />
                                                Verified Administrator
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-primary-100 transition-colors">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                                    <Mail className="w-5 h-5 text-neutral-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] uppercase font-black text-neutral-400 tracking-widest mb-0.5">Email Address</p>
                                                    <p className="text-xs font-bold text-neutral-700 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-primary-100 transition-colors">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                                    <Fingerprint className="w-5 h-5 text-neutral-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] uppercase font-black text-neutral-400 tracking-widest mb-0.5">Admin UID</p>
                                                    <p className="text-xs font-bold text-neutral-700 truncate">{user.uid}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity Placeholder */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-100 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-neutral-900">System Activity</h3>
                                    <button className="text-xs font-bold text-primary-600 hover:underline">View History</button>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { action: 'Site address updated', meta: 'Address changed to Vehari campus', time: '2 mins ago', icon: '📍' },
                                        { action: 'Department metadata sync', meta: 'Renamed 14 departments', time: '1 hour ago', icon: '📂' },
                                        { action: 'Security check passed', meta: 'SSL and Firewall verified', time: '4 hours ago', icon: '🛡️' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-neutral-50 transition-colors group cursor-default border border-transparent hover:border-neutral-100">
                                            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                {item.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-neutral-900">{item.action}</h4>
                                                <p className="text-xs text-neutral-500 font-medium">{item.meta}</p>
                                            </div>
                                            <div className="text-[10px] font-bold text-neutral-400 whitespace-nowrap">{item.time}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Stats Sidebar */}
                        <div className="space-y-8">
                            <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-primary-500/20 relative overflow-hidden">
                                <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                                <div className="relative">
                                    <Calendar className="w-8 h-8 mb-4 text-white/60" />
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-1">Session Data</p>
                                    <h3 className="text-xl font-bold mb-6">Last Login</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                                            <span className="text-sm text-white/70">Last Login:</span>
                                            <span className="text-sm font-bold">{user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                                            <span className="text-sm text-white/70">Created:</span>
                                            <span className="text-sm font-bold">{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3">
                                            <span className="text-sm text-white/70">Auth Method:</span>
                                            <span className="text-xs font-black bg-white/20 px-2 py-1 rounded-md uppercase">Firebase</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-100 shadow-sm">
                                <h3 className="text-lg font-bold text-neutral-900 mb-6">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button className="p-4 rounded-3xl bg-neutral-50 border border-neutral-100 flex flex-col items-center gap-2 hover:bg-primary-50 hover:border-primary-100 transition-all group">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><Plus className="w-5 h-5 text-primary-600" /></div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Post Update</span>
                                    </button>
                                    <button className="p-4 rounded-3xl bg-neutral-50 border border-neutral-100 flex flex-col items-center gap-2 hover:bg-success-50 hover:border-success-100 transition-all group">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><FileText className="w-5 h-5 text-success-600" /></div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Export Logs</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Minimal helpers
function Plus({ className }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
}

function FileText({ className }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
