'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
    LogOut, User, Users, Settings, LayoutDashboard,
    Search, Briefcase, PlusCircle, BookmarkCheck,
    Shield, Menu, X, ChevronDown, Sparkles, Bell
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import GoogleTranslateWidget from '@/components/ui/GoogleTranslateWidget';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NavItem {
    name: string;
    path: string;
    icon: React.ReactNode;
}

// ─── NotificationBell (co-located, unexported) ────────────────────────────────
function NotificationBell() {
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = useCallback(async (notification: any) => {
        if (!notification.is_read) await markAsRead(notification.id);
        setIsOpen(false);
    }, [markAsRead]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                <Bell className="w-5 h-5" />
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
                                    className={`px-4 py-3 border-b border-gray-50 last:border-none cursor-pointer hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!notification.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                                        <div>
                                            <p className={`text-sm ${!notification.is_read ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
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

// ─── Avatar Helper ────────────────────────────────────────────────────────────
function Avatar({ avatarUrl, email, size = 'sm' }: { avatarUrl?: string | null; email?: string; size?: 'sm' | 'lg' }) {
    const [imgError, setImgError] = useState(false);
    const dim = size === 'lg' ? 'w-12 h-12' : 'w-8 h-8 lg:w-9 lg:h-9';
    const textSize = size === 'lg' ? 'text-lg' : 'text-xs lg:text-sm';
    const imgSize = size === 'lg' ? 48 : 36;
    const fallbackLetter = email?.[0]?.toUpperCase() ?? '?';

    return (
        <div className={`relative flex-shrink-0 ${dim}`}>
            {avatarUrl && !imgError ? (
                <Image
                    src={avatarUrl}
                    alt="Profile"
                    width={imgSize}
                    height={imgSize}
                    className={`${dim} rounded-full object-cover border border-gray-100 shadow-sm bg-white`}
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className={`${dim} rounded-full bg-blue-600 flex items-center justify-center text-white font-black ${textSize} shadow-sm`}>
                    {fallbackLetter}
                </div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
        </div>
    );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function ImprovedNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    // FIX: Removed unused `hasPaymentApproved` destructure
    const { user, loading } = useAuth();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // ── Logout ────────────────────────────────────────────────────────────────
    // FIX: Wrapped in useCallback to prevent recreation on every render
    const handleLogout = useCallback(async () => {
        try {
            const { signOut } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase/firebase-config');
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }, [router]);

    // ── Close profile menu on outside click ───────────────────────────────────
    useEffect(() => {
        if (!showProfileMenu) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showProfileMenu]);

    // ── Close menus on route change ───────────────────────────────────────────
    useEffect(() => {
        setShowProfileMenu(false);
        setShowMobileMenu(false);
    }, [pathname]);

    // ── Lock body scroll when mobile drawer is open ───────────────────────────
    useEffect(() => {
        document.body.style.overflow = showMobileMenu ? 'hidden' : '';
        document.body.style.touchAction = showMobileMenu ? 'none' : '';
        return () => {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        };
    }, [showMobileMenu]);

    // ── Derived user info ─────────────────────────────────────────────────────
    const isCompany = user?.role === 'employer';
    const companyData = (user as any)?.companyProfile || (user as any)?.company;
    const avatarUrl = isCompany
        ? (companyData?.logoUrl || companyData?.logo || user?.photoURL)
        : user?.photoURL;
    const displayName = isCompany
        ? (companyData?.companyName || companyData?.name || user?.displayName || user?.email?.split('@')[0])
        : (user?.displayName || user?.email?.split('@')[0]);
    const displayRole =
        user?.role === 'employer' ? 'COMPANY' :
        user?.role === 'admin' ? 'ADMIN' : 'CANDIDATE';

    // FIX: useMemo prevents nav items array being recreated on every render
    const navItems: NavItem[] = useMemo(() => {
        if (!user || pathname === '/') {
            return [
                { name: 'Browse Videos', path: '/browse', icon: <Search className="w-4 h-4" /> },
                { name: 'How It Works', path: '#how-it-works', icon: <PlusCircle className="w-4 h-4" /> },
                { name: 'Categories', path: '#categories', icon: <Briefcase className="w-4 h-4" /> },
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
                { name: 'Post Job', path: '/employer/post-job', icon: <PlusCircle className="w-4 h-4" /> },
                { name: 'Candidates', path: '/browse', icon: <Users className="w-4 h-4" /> },
                { name: 'Reveals', path: '/employer/connections', icon: <BookmarkCheck className="w-4 h-4" /> },
                { name: 'Settings', path: '/employer/settings', icon: <Settings className="w-4 h-4" /> },
            ];
        }
        return [
            { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { name: 'Candidates', path: '/browse', icon: <Users className="w-4 h-4" /> },
            { name: 'My Video', path: '/dashboard/upload-video', icon: <PlusCircle className="w-4 h-4" /> },
            { name: 'Profile', path: '/dashboard/profile', icon: <User className="w-4 h-4" /> },
            { name: 'Settings', path: '/dashboard/settings', icon: <Settings className="w-4 h-4" /> },
        ];
    // FIX: pathname & user.role are correct dependencies (not the whole user object)
    }, [user, pathname]);

    const isActive = useCallback((path: string) => pathname === path, [pathname]);

    // ── Don't render on auth pages ────────────────────────────────────────────
    if (pathname?.startsWith('/auth')) return null;

    return (
        // FIX: Added role="navigation" and aria-label for accessibility
        <nav
            role="navigation"
            aria-label="Main navigation"
            className="sticky top-0 z-[100] w-full border-b border-gray-100 bg-white/80 backdrop-blur-md"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 lg:h-20">

                    {/* ── Left: Logo + Desktop Nav ─────────────────────────── */}
                    <div className="flex items-center gap-4">
                        <Link href={user?.role === 'admin' ? '/admin' : '/'} className="flex items-center gap-2">
                            <h1 className="text-xl lg:text-2xl font-black text-blue-600 tracking-tight italic">
                                KHAN HUB
                            </h1>
                        </Link>

                        <div className="hidden lg:flex items-center gap-0.5 ml-8">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`px-3 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 tracking-tight ${
                                        isActive(item.path)
                                            ? 'text-blue-600 bg-blue-50'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="opacity-70">{item.icon}</span>
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* ── Right: Actions ───────────────────────────────────── */}
                    <div className="flex items-center gap-2 lg:gap-3">
                        <GoogleTranslateWidget />

                        {/* FIX: Avoid rendering anything auth-related while loading
                            to prevent layout shift / flash of wrong state */}
                        {!loading && (
                            <>
                                {user ? (
                                    <div className="flex items-center gap-3 lg:gap-4">
                                        <NotificationBell />

                                        {/* Profile Dropdown */}
                                        <div className="relative" ref={profileMenuRef}>
                                            <button
                                                onClick={() => setShowProfileMenu(prev => !prev)}
                                                aria-expanded={showProfileMenu}
                                                aria-haspopup="true"
                                                className="flex items-center gap-2 lg:gap-3 p-1 lg:pl-1 lg:pr-3 lg:py-1 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group bg-white shadow-sm"
                                            >
                                                <Avatar avatarUrl={avatarUrl} email={user.email ?? undefined} size="sm" />

                                                <div className="hidden lg:flex flex-col items-start pr-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded text-orange-600 bg-orange-50 uppercase tracking-wider">
                                                            {displayRole}
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-800 max-w-[120px] truncate">
                                                            {displayName}
                                                        </span>
                                                    </div>
                                                </div>

                                                <ChevronDown className={`hidden lg:block w-4 h-4 text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Desktop Dropdown */}
                                            {showProfileMenu && (
                                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right hidden lg:block">
                                                    <div className="px-5 py-3 mb-1 border-b border-gray-50">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                                                        <p className="text-sm font-black text-gray-900 truncate">{user.email}</p>
                                                    </div>
                                                    <div className="p-2 space-y-1">
                                                        <Link
                                                            href="/dashboard"
                                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                        >
                                                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                                                        </Link>
                                                        <button
                                                            onClick={handleLogout}
                                                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <LogOut className="w-4 h-4" /> Log Out
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    // Not logged in — desktop only (mobile handled in drawer)
                                    <div className="hidden lg:flex items-center gap-2">
                                        <Link href="/auth/login" className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-blue-600">
                                            Log in
                                        </Link>
                                        <Link
                                            href="/auth/register"
                                            className="px-5 py-2.5 bg-[#F97316] text-white text-xs lg:text-sm font-black rounded-xl uppercase tracking-widest shadow-lg shadow-orange-500/10 active:scale-95"
                                        >
                                            Join Now
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setShowMobileMenu(true)}
                            aria-label="Open navigation menu"
                            className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Mobile Drawer ─────────────────────────────────────────────── */}
            {showMobileMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] lg:hidden animate-in fade-in duration-300"
                        onClick={() => setShowMobileMenu(false)}
                        aria-hidden="true"
                    />

                    {/* Drawer panel */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation menu"
                        className="fixed top-0 bottom-0 right-0 w-[280px] h-[100dvh] bg-white z-[160] lg:hidden shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h2 className="text-xl font-black text-blue-600 italic">KHAN HUB</h2>
                            <button
                                onClick={() => setShowMobileMenu(false)}
                                aria-label="Close navigation menu"
                                className="p-2 rounded-xl bg-slate-50 text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {user && (
                                <div className="mb-6 px-3 py-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100">
                                    <Avatar avatarUrl={avatarUrl} email={user.email ?? undefined} size="lg" />
                                    <div className="flex flex-col flex-1 overflow-hidden">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded text-orange-600 bg-orange-100 uppercase tracking-wider">
                                                {displayRole}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 truncate">{displayName}</span>
                                        <span className="text-xs text-slate-500 truncate">{user.email}</span>
                                    </div>
                                </div>
                            )}

                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => setShowMobileMenu(false)}
                                    className={`flex items-center gap-4 px-4 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                                        isActive(item.path)
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {item.icon}
                                    {item.name}
                                </Link>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-50 space-y-3 bg-white mt-auto">
                            {!user ? (
                                <>
                                    <Link
                                        onClick={() => setShowMobileMenu(false)}
                                        href="/auth/register"
                                        className="flex items-center justify-center gap-2 h-14 bg-[#F97316] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-500/20"
                                    >
                                        <PlusCircle className="w-5 h-5" />
                                        Upload My Video
                                    </Link>
                                    <Link
                                        onClick={() => setShowMobileMenu(false)}
                                        href="/auth/login"
                                        className="flex items-center justify-center gap-2 w-full h-14 bg-blue-50 text-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest"
                                    >
                                        Log In
                                    </Link>
                                </>
                            ) : (
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center gap-2 w-full h-14 bg-red-50 text-red-600 rounded-2xl font-black text-sm uppercase tracking-widest"
                                >
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