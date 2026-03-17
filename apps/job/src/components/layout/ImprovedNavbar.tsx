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
import HamburgerDrawer from '@/components/layout/HamburgerDrawer';
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
    const profileMenuRef = useRef<HTMLDivElement>(null);

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
        // drawer closes itself via HamburgerDrawer's onClose
    }, [pathname]);

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

                    {/* ── Left: Logo + Desktop Nav ─────────────────────────── */}
                    <div className="flex items-center gap-4">
                        <Link href={user?.role === 'admin' ? '/admin' : '/'} className="flex items-center gap-2">
                            <h1 className="text-xl lg:text-2xl font-black text-blue-600 tracking-tight italic">
                                KHAN HUB
                            </h1>
                        </Link>

                    </div>

                    {/* ── Right: Actions ───────────────────────────────────── */}
                    <div className="flex items-center gap-2 lg:gap-3">
                        {/* Category Dropdown (Left of Search) */}
                        <div className="relative">
                            <motion.button
                                ref={switcherTriggerRef}
                                onClick={() => {
                                    if (!showSwitcher && switcherTriggerRef.current) {
                                        const rect = switcherTriggerRef.current.getBoundingClientRect();
                                        const dropdownWidth = 240; 
                                        let leftPos = rect.left;
                                        if (leftPos + dropdownWidth > window.innerWidth - 16) {
                                            leftPos = window.innerWidth - dropdownWidth - 16;
                                        }
                                        if (leftPos < 8) leftPos = 8;
                                        setDropdownPos({
                                            top: rect.bottom + 8,
                                            left: leftPos,
                                        });
                                    }
                                    setShowSwitcher(!showSwitcher);
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border min-h-[40px]"
                                style={{
                                    background: isFeed 
                                        ? `${categoryConfig?.accent || '#FF0069'}20` 
                                        : `${categoryConfig?.accent || '#FF0069'}10`,
                                    borderColor: isFeed 
                                        ? 'rgba(255,255,255,0.3)' 
                                        : `${categoryConfig?.accent || '#FF0069'}40`,
                                }}
                            >
                                <span 
                                    className="text-[11px] font-black uppercase tracking-wider"
                                    style={{ color: isFeed ? '#fff' : categoryConfig?.accent || '#FF0069' }}
                                >
                                {categoryConfig?.emoji || '🎯'} {categoryConfig?.label || 'All'}
                                </span>
                                <motion.div
                                    animate={{ rotate: showSwitcher ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown 
                                        className="w-3.5 h-3.5" 
                                        style={{ color: isFeed ? '#fff' : categoryConfig?.accent || '#FF0069' }} 
                                    />
                                </motion.div>
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
                                            minWidth: '200px',
                                            width: 'max-content',
                                            maxWidth: '240px',
                                            zIndex: 9999,
                                        }}
                                        className="bg-white border border-[#E5E5E5] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-3 grid grid-cols-1 gap-1 overflow-hidden"
                                    >
                                        <div className="px-5 py-3 border-b border-[#F0F0F0] mb-2">
                                            <span className="text-[12px] font-black text-slate-400 uppercase tracking-wider">Select Category</span>
                                        </div>
                                        {(Object.entries(CATEGORY_CONFIG) as [CategoryKey, CategoryConfig][]).map(([key, config]) => (
                                            <motion.button
                                                key={key}
                                                onClick={() => {
                                                    setShowSwitcher(false);
                                                    setCategory(key as CategoryKey);
                                                }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all whitespace-nowrap ${activeCategory === key
                                                    ? 'text-[#0A0A0A]'
                                                    : 'hover:bg-black/5 text-[#444444]'
                                                    }`}
                                                style={{
                                                    background: activeCategory === key ? `${config.accent}15` : 'transparent',
                                                    border: activeCategory === key ? `1px solid ${config.accent}40` : '1px solid transparent',
                                                }}
                                            >
                                                <motion.div 
                                                    className="w-8 h-8 rounded-full flex items-center justify-center"
                                                    style={{
                                                        background: `${config.accent}20`,
                                                    }}
                                                    whileHover={{ scale: 1.1 }}
                                                >
                                                    <span className="text-lg">{config.emoji}</span>
                                                </motion.div>
                                                <span className="text-[10px] font-black font-poppins uppercase tracking-wider text-[#0A0A0A] whitespace-nowrap">{config.label}</span>
                                                {activeCategory === key && (
                                                    <motion.div 
                                                        className="ml-auto w-2 h-2 rounded-full" 
                                                        style={{ background: config.accent }}
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                                    />
                                                )}
                                            </motion.button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div ref={searchContainerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          {/* Animated search bar */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden',
                            width: searchOpen ? '200px' : '0px',
                            opacity: searchOpen ? 1 : 0,
                            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
                            background: '#F5F5F5',
                            borderRadius: '20px',
                            marginRight: searchOpen ? '8px' : '0px',
                          }}>
                            <form onSubmit={handleSearch} style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                              <input
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Escape' && (setSearchOpen(false), setSearchQuery(''))}
                                placeholder="Search..."
                                style={{
                                  flex: 1,
                                  padding: '7px 14px',
                                  background: 'transparent',
                                  border: 'none',
                                  outline: 'none',
                                  fontSize: '14px',
                                  color: '#0A0A0A',
                                  fontFamily: 'inherit',
                                }}
                              />
                              {searchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setSearchQuery('')}
                                  style={{
                                    background: 'none', border: 'none',
                                    cursor: 'pointer', padding: '0 8px',
                                    color: '#888', fontSize: '16px', lineHeight: 1,
                                  }}
                                >
                                  ×
                                </button>
                              )}
                            </form>
                          </div>

                          {/* Search icon button */}
                          <button
                            onClick={() => {
                              if (searchOpen && searchQuery.trim()) {
                                router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
                                setSearchOpen(false);
                                setSearchQuery('');
                              } else {
                                setSearchOpen(prev => !prev);
                              }
                            }}
                            style={{
                              background: searchOpen ? '#FF0069' : 'none',
                              border: 'none',
                              borderRadius: '50%',
                              width: '36px', height: '36px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'background 0.2s ease',
                              flexShrink: 0,
                            }}
                            aria-label="Search"
                          >
                            <Search size={18} color={searchOpen ? '#fff' : '#555'} />
                          </button>
                        </div>

                        {/* FIX: Avoid rendering anything auth-related while loading or before mounting
                            to prevent layout shift / flash of wrong state / hydration errors */}
                        {mounted && !loading && (
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
                            onClick={onMenuOpen}
                            aria-label="Open navigation menu"
                            className={`lg:hidden p-2 rounded-xl active:scale-95 transition-all ${isFeed ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

        </nav>
        </>
    );
}