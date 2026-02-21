'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { LogOut, User, Users, Settings, LayoutDashboard, Search, Briefcase, PlusCircle, BookmarkCheck, Shield, Menu, X, ChevronDown, Sparkles } from 'lucide-react';
import RegisteredBadge from '@/components/ui/RegisteredBadge';
import { useNotifications } from '@/hooks/useNotifications';

export default function ImprovedNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, hasPaymentApproved } = useAuth();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        try {
            const { signOut } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase/firebase-config');

            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileMenu]);

    // Close dropdown on navigation
    useEffect(() => {
        setShowProfileMenu(false);
        setShowMobileMenu(false);
    }, [pathname]);

    const isActive = (path: string) => pathname === path;

    // Don't show navbar on auth pages
    if (pathname?.startsWith('/auth')) {
        return null;
    }

    // Navigation items based on path and user role
    const getNavItems = () => {
        if (!user || pathname === '/') {
            return [
                { name: 'Browse Videos', path: '/browse', icon: <Search className="w-4 h-4" /> },
                { name: 'How It Works', path: '#how-it-works', icon: <PlusCircle className="w-4 h-4" /> },
                { name: 'Industries', path: '#industries', icon: <Briefcase className="w-4 h-4" /> },
            ];
        }

        if (user.role === 'admin') {
            return [
                { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'Payments', path: '/admin/payments', icon: <Sparkles className="w-4 h-4" /> },
                { name: 'Users', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
                { name: 'Analytics', path: '/admin/analytics', icon: <Shield className="w-4 h-4" /> },
                { name: 'Browse', path: '/browse', icon: <Search className="w-4 h-4" /> },
            ];
        }

        if (pathname?.startsWith('/employer') || user.role === 'employer') {
            return [
                { name: 'Dashboard', path: '/employer/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'My Videos', path: '/dashboard/video', icon: <PlusCircle className="w-4 h-4" /> },
                { name: 'Browse Candidates', path: '/browse', icon: <BookmarkCheck className="w-4 h-4" /> },
            ];
        }

        // Seeker Dashboard
        return [
            { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { name: 'Browse Videos', path: '/browse', icon: <Search className="w-4 h-4" /> },
            { name: 'My Video', path: '/dashboard/video', icon: <BookmarkCheck className="w-4 h-4" /> },
            { name: 'Profile', path: '/dashboard/profile', icon: <User className="w-4 h-4" /> },
        ];
    };

    const navItems = getNavItems();

    return (
        <nav className="sticky top-0 z-[100] w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 lg:h-20">
                    {/* Left: Mobile Menu Toggle & Logo */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowMobileMenu(true)}
                            className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <Link href={user?.role === 'admin' ? '/admin' : '/'} className="flex items-center gap-2">
                            <h1 className="text-xl lg:text-2xl font-black text-blue-600 tracking-tight italic">
                                KhanHub<span className="text-slate-900">Jobs</span>
                            </h1>
                        </Link>

                        {/* Desktop: Nav Links */}
                        <div className="hidden lg:flex items-center gap-1 ml-8">
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${active ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                    >
                                        {item.icon}
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Profile & Actions */}
                    <div className="flex items-center gap-3">
                        {!loading && user && (
                            <div className="flex items-center gap-3 lg:gap-4">
                                <NotificationBell />

                                <div className="relative" ref={profileMenuRef}>
                                    <button
                                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                                        className="flex items-center gap-2 p-1 lg:pl-1.5 lg:pr-2 lg:py-1.5 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group"
                                    >
                                        <div className="relative">
                                            {user.photoURL ? (
                                                <Image
                                                    src={user.photoURL}
                                                    alt="Profile"
                                                    width={32}
                                                    height={32}
                                                    className="w-8 h-8 lg:w-9 lg:h-9 rounded-full object-cover border border-gray-100 shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs lg:text-sm shadow-sm">
                                                    {user.email?.[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                                        </div>
                                        <ChevronDown className="hidden lg:block w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform duration-200" />
                                    </button>

                                    {/* Desktop Profile Dropdown */}
                                    {showProfileMenu && (
                                        <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right hidden lg:block">
                                            <div className="px-5 py-3 mb-1 border-b border-gray-50">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                                                <p className="text-sm font-black text-gray-900 truncate">{user.email}</p>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                                                </Link>
                                                <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                                                    <LogOut className="w-4 h-4" /> Log Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!loading && !user && (
                            <div className="flex items-center gap-2">
                                <Link href="/auth/login" className="hidden sm:block px-4 py-2 text-sm font-bold text-gray-500 hover:text-blue-600">
                                    Log in
                                </Link>
                                <Link href="/auth/register" className="px-5 py-2.5 bg-[#F97316] text-white text-xs lg:text-sm font-black rounded-xl uppercase tracking-widest shadow-lg shadow-orange-500/10 active:scale-95">
                                    Join Now
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Drawer */}
            {showMobileMenu && (
                <>
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] lg:hidden animate-in fade-in duration-300"
                        onClick={() => setShowMobileMenu(false)}
                    />
                    <div className="fixed inset-y-0 left-0 w-[280px] bg-white z-[160] lg:hidden shadow-2xl flex flex-col animate-in slide-in-from-left duration-500">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h2 className="text-xl font-black text-blue-600 italic">KhanHub</h2>
                            <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl bg-slate-50 text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {user && (
                                <div className="mb-6 px-2 py-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black">
                                        {user.email?.[0].toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{user.email}</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role}</span>
                                    </div>
                                </div>
                            )}

                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => setShowMobileMenu(false)}
                                    className={`flex items-center gap-4 px-4 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${isActive(item.path) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {item.icon}
                                    {item.name}
                                </Link>
                            ))}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-slate-50 space-y-3">
                            {!user ? (
                                <Link href="/auth/register" className="flex items-center justify-center gap-2 h-14 bg-[#F97316] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-500/20">
                                    <PlusCircle className="w-5 h-5" />
                                    Upload My Video
                                </Link>
                            ) : (
                                <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full h-14 bg-red-50 text-red-600 rounded-2xl font-black text-sm uppercase tracking-widest">
                                    <LogOut className="w-5 h-5" />
                                    Sign Out
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </nav>
    );
}

function NotificationBell() {
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification: any) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-all focus:outline-none"
            >
                <div className="w-6 h-6 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                </div>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[110] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {unreadCount} New
                            </span>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`px-4 py-3 border-b border-gray-50 last:border-none cursor-pointer hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!notification.is_read ? 'bg-blue-500' : 'bg-transparent'
                                            }`} />
                                        <div>
                                            <p className={`text-sm ${!notification.is_read ? 'font-bold text-gray-900' : 'text-gray-600'
                                                }`}>
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {notification.created_at?.toDate
                                                    ? new Date(notification.created_at.toDate()).toLocaleDateString()
                                                    : 'Just now'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                No notifications yet
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
