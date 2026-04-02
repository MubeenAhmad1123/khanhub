'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
    LogOut, User, Users, Settings, LayoutDashboard,
    Search, Briefcase, PlusCircle, BookmarkCheck,
    Shield, Menu, X, ChevronDown, Sparkles, Bell
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useCategory } from '@/context/CategoryContext';
import { CATEGORY_CONFIG, CategoryKey, CategoryConfig } from '@/lib/categories';
import { motion, AnimatePresence } from 'framer-motion';
import { useClickOutside } from '@/hooks/useClickOutside';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NavItem {
    name: string;
    path: string;
    icon: React.ReactNode;
}

interface ImprovedNavbarProps {
    onMenuOpen: () => void;
}

// ─── NotificationBell (navigates to notifications page) ────────────────────────────────
function NotificationBell() {
    const { unreadCount } = useNotifications();
    const router = useRouter();

    return (
        <button
            onClick={() => router.push('/notifications')}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            className="relative flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100 transition-all focus:outline-none"
            style={{ minWidth: 40, minHeight: 40 }}
        >
            <Bell className="w-6 h-6" style={{ width: 24, height: 24 }} />
            {unreadCount > 0 && (
                <span 
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full"
                    style={{ minWidth: 20, minHeight: 20, padding: 2 }}
                >
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
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
export default function ImprovedNavbar({ onMenuOpen }: ImprovedNavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();
    const { activeCategory, categoryConfig, setCategory } = useCategory();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Category Switcher state
    const [showSwitcher, setShowSwitcher] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);
    const switcherTriggerRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    useClickOutside([switcherRef, switcherTriggerRef], () => setShowSwitcher(false), showSwitcher);

    const isFeed = pathname === '/feed' || pathname.startsWith('/feed');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Search state
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!searchOpen) return;
        const handler = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                setSearchOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [searchOpen]);

    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [searchOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchOpen(false);
        setSearchQuery('');
    };

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

    useEffect(() => {
        setShowProfileMenu(false);
    }, [pathname]);

    // Derived user info
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
                { name: 'Analytics', path: '/admin/analytics', icon: <Shield className="w-4 h-4" /> },
                { name: 'Browse', path: '/browse', icon: <Search className="w-4 h-4" /> },
            ];
        }
        if (user.role === 'employer') {
            return [
                { name: 'Dashboard', path: '/employer/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'Candidates', path: '/browse', icon: <Users className="w-4 h-4" /> },
            ];
        }
        return [
            { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { name: 'My Video', path: '/dashboard/upload-video', icon: <PlusCircle className="w-4 h-4" /> },
        ];
    }, [user, pathname]);

    if (pathname?.startsWith('/auth')) return null;

    return (
        <>
        <nav
            role="navigation"
            aria-label="Main navigation"
            className={`sticky top-0 z-[100] w-full transition-all duration-300 ${
                isFeed 
                    ? 'bg-transparent border-transparent' 
                    : 'bg-white/80 backdrop-blur-md border-b border-gray-100'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 lg:h-20">

                    {/* Left: Logo */}
                    <div className="flex items-center gap-4">
                        <Link href={user?.role === 'admin' ? '/admin' : '/'} className="flex items-center gap-2">
                            <h1 className="text-xl lg:text-2xl font-black text-blue-600 tracking-tight italic">
                                KHAN HUB
                            </h1>
                        </Link>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 lg:gap-3">
                        {/* Category Dropdown */}
                        <div className="relative">
                            <motion.button
                                ref={switcherTriggerRef}
                                onClick={() => {
                                    if (!showSwitcher && switcherTriggerRef.current) {
                                        const rect = switcherTriggerRef.current.getBoundingClientRect();
                                        setDropdownPos({
                                            top: rect.bottom + 8,
                                            left: Math.max(8, Math.min(rect.left, window.innerWidth - 256)),
                                        });
                                    }
                                    setShowSwitcher(!showSwitcher);
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border min-h-[40px]"
                                style={{
                                    background: isFeed ? 'rgba(255,255,255,0.1)' : 'rgba(37,99,235,0.05)',
                                    borderColor: isFeed ? 'rgba(255,255,255,0.2)' : 'rgba(37,99,235,0.1)',
                                }}
                            >
                                <span 
                                    className="text-[11px] font-black uppercase tracking-wider"
                                    style={{ color: isFeed ? '#fff' : '#2563eb' }}
                                >
                                {categoryConfig?.emoji || '🎯'} {categoryConfig?.label || 'All'}
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} style={{ color: isFeed ? '#fff' : '#2563eb' }} />
                            </motion.button>

                            <AnimatePresence>
                                {showSwitcher && (
                                    <motion.div
                                        ref={switcherRef}
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        style={{
                                            position: 'fixed',
                                            top: dropdownPos.top,
                                            left: dropdownPos.left,
                                            minWidth: '240px',
                                            zIndex: 1000,
                                        }}
                                        className="bg-white border border-gray-100 rounded-3xl shadow-2xl p-3"
                                    >
                                        <div className="px-5 py-3 border-b border-gray-50 mb-2">
                                            <span className="text-[12px] font-black text-gray-400 uppercase tracking-wider">Select Category</span>
                                        </div>
                                        {(Object.entries(CATEGORY_CONFIG) as [CategoryKey, CategoryConfig][]).map(([key, config]) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    setShowSwitcher(false);
                                                    setCategory(key as CategoryKey);
                                                }}
                                                className={`flex items-center gap-3 w-full p-2.5 rounded-2xl transition-all ${activeCategory === key ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                                            >
                                                <span className="text-lg">{config.emoji}</span>
                                                <span className="text-xs font-black uppercase tracking-wider">{config.label}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Search */}
                        <div ref={searchContainerRef} className="relative flex items-center">
                            <AnimatePresence>
                                {searchOpen && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 200, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="bg-gray-100 rounded-full flex items-center mr-2 overflow-hidden"
                                    >
                                        <form onSubmit={handleSearch} className="flex w-full items-center px-4">
                                            <input
                                                ref={searchInputRef}
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                placeholder="Search..."
                                                className="bg-transparent border-none outline-none text-sm py-2 w-full text-gray-900"
                                            />
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <button
                                onClick={() => searchOpen && searchQuery ? handleSearch({ preventDefault: () => {} } as any) : setSearchOpen(!searchOpen)}
                                className={`p-2 rounded-full transition-all ${isFeed ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <Search className="w-5 h-5 lg:w-6 lg:h-6" />
                            </button>
                        </div>

                        {/* Auth / Profile */}
                        {mounted && !loading && (
                            <>
                                {user ? (
                                    <div className="flex items-center gap-3">
                                        <NotificationBell />
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                                className={`flex items-center gap-2 p-1 lg:pr-3 rounded-full border transition-all ${isFeed ? 'bg-white/10 border-white/20' : 'bg-white border-gray-100'}`}
                                            >
                                                <Avatar avatarUrl={avatarUrl} email={user.email ?? undefined} size="sm" />
                                                <span className={`hidden lg:block text-sm font-bold ${isFeed ? 'text-white' : 'text-gray-800'}`}>
                                                    {displayName}
                                                </span>
                                                <ChevronDown className={`hidden lg:block w-4 h-4 ${isFeed ? 'text-white/70' : 'text-gray-400'} ${showProfileMenu ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {showProfileMenu && (
                                                    <>
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            onClick={() => setShowProfileMenu(false)}
                                                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
                                                        />
                                                        <motion.div
                                                            initial={{ x: '100%' }}
                                                            animate={{ x: 0 }}
                                                            exit={{ x: '100%' }}
                                                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                                            className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-[1001] flex flex-col border-l border-gray-100"
                                                        >
                                                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                                                <h2 className="text-xl font-black text-gray-900">Profile</h2>
                                                                <button onClick={() => setShowProfileMenu(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                                                    <X className="w-5 h-5 text-gray-500" />
                                                                </button>
                                                            </div>

                                                            <div className="flex-1 overflow-y-auto p-6">
                                                                <div className="flex flex-col items-center mb-8">
                                                                    <Avatar avatarUrl={avatarUrl} email={user.email ?? undefined} size="lg" />
                                                                    <h3 className="mt-4 text-lg font-black text-gray-900">{displayName}</h3>
                                                                    <p className="text-sm font-bold text-gray-400">{user.email}</p>
                                                                    <span className="mt-2 px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 uppercase tracking-widest">{displayRole}</span>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3 mb-8">
                                                                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase">Referrals</p>
                                                                        <p className="text-xl font-black text-blue-600">{(user as any)?.referralCount || 0}</p>
                                                                    </div>
                                                                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase">Videos</p>
                                                                        <p className="text-xl font-black text-orange-600">{(user as any)?.videoUploadCount || 0}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    {navItems.map(item => (
                                                                        <Link
                                                                            key={item.path}
                                                                            href={item.path}
                                                                            onClick={() => setShowProfileMenu(false)}
                                                                            className="flex items-center gap-3 p-4 rounded-xl text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all"
                                                                        >
                                                                            {item.icon}
                                                                            {item.name}
                                                                        </Link>
                                                                    ))}
                                                                </div>

                                                                <div className="mt-8 p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white">
                                                                    <h4 className="text-sm font-black mb-1">REFER A FRIEND</h4>
                                                                    <p className="text-xs opacity-70 mb-4 font-bold">Earn free uploads by referring others.</p>
                                                                    <button 
                                                                        onClick={() => {
                                                                            const code = (user as any)?.referralCode || '';
                                                                            navigator.clipboard.writeText(`${window.location.origin}/auth/register?ref=${code}`);
                                                                            alert('Referral link copied!');
                                                                        }}
                                                                        className="w-full py-2 bg-white text-blue-700 rounded-full text-[11px] font-black uppercase hover:scale-105 transition-transform"
                                                                    >
                                                                        Copy Link
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="p-6 border-t border-gray-50">
                                                                <button
                                                                    onClick={handleLogout}
                                                                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-black uppercase hover:bg-red-600 hover:text-white transition-all"
                                                                >
                                                                    <LogOut className="w-4 h-4" /> Log Out
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="hidden lg:flex items-center gap-2">
                                        <Link href="/auth/login" className={`px-4 py-2 text-sm font-bold ${isFeed ? 'text-white' : 'text-gray-500'}`}>Log in</Link>
                                        <Link href="/auth/register" className="px-5 py-2.5 bg-orange-500 text-white text-sm font-black rounded-xl uppercase shadow-lg">Join Now</Link>
                                    </div>
                                )}
                            </>
                        )}

                        <button onClick={onMenuOpen} className={`lg:hidden p-2 rounded-xl ${isFeed ? 'text-white' : 'text-gray-600'}`}>
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        </>
    );
}