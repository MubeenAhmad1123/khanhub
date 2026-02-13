'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { LogOut, User, Settings, LayoutDashboard, Search, Briefcase, PlusCircle, BookmarkCheck, Shield, Menu, X, ChevronDown, Sparkles } from 'lucide-react';

export default function ImprovedNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();
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
                { name: 'Browse Jobs', path: '/search', icon: <Search className="w-4 h-4" /> },
                { name: 'For Employers', path: '/auth/register?role=employer', icon: <Briefcase className="w-4 h-4" /> },
            ];
        }

        if (pathname?.startsWith('/admin') && user.role === 'admin') {
            return [
                { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'Payments', path: '/admin/payments', icon: <Sparkles className="w-4 h-4" /> },
                { name: 'Jobs', path: '/admin/jobs', icon: <BookmarkCheck className="w-4 h-4" /> },
            ];
        }

        if (pathname?.startsWith('/employer') || user.role === 'employer') {
            return [
                { name: 'Dashboard', path: '/employer/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'Post Job', path: '/employer/post-job', icon: <PlusCircle className="w-4 h-4" /> },
                { name: 'Applications', path: '/employer/applications', icon: <BookmarkCheck className="w-4 h-4" /> },
            ];
        }

        // Seeker Dashboard
        return [
            { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { name: 'Find Jobs', path: '/search', icon: <Search className="w-4 h-4" /> },
            { name: 'Applications', path: '/dashboard/applications', icon: <BookmarkCheck className="w-4 h-4" /> },
            { name: 'Profile', path: '/dashboard/profile', icon: <User className="w-4 h-4" /> },
        ];
    };

    const navItems = getNavItems();

    return (
        <nav className="sticky top-0 z-[100] w-full border-b border-gray-100 bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 sm:h-20">
                    {/* Logo - Always goes to Home */}
                    <div className="flex items-center gap-8">
                        <Link href="/" className="group flex items-center gap-2">
                            <h1 className="text-2xl font-black text-teal-600 tracking-tight">
                                KhanHub
                            </h1>
                        </Link>

                        {/* Desktop Links */}
                        <div className="hidden lg:flex items-center gap-1">
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                const isDashboard = item.name === 'Dashboard';

                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${active
                                            ? isDashboard
                                                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                                                : 'text-teal-600'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                    >
                                        {item.icon}
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin"></div>
                        ) : user ? (
                            <div className="relative" ref={profileMenuRef}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowProfileMenu(!showProfileMenu);
                                    }}
                                    className="flex items-center gap-3 pl-1.5 pr-2 py-1.5 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 focus:outline-none group"
                                    aria-expanded={showProfileMenu}
                                >
                                    <div className="relative">
                                        {user.photoURL ? (
                                            <Image
                                                src={user.photoURL}
                                                alt="Profile"
                                                width={36}
                                                height={36}
                                                className="w-9 h-9 rounded-full object-cover border border-gray-100 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-black text-sm border border-gray-100 shadow-sm">
                                                {user.email ? user.email[0].toUpperCase() : '?'}
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>

                                    <div className="hidden md:flex flex-col items-start leading-tight">
                                        <span className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                                            {user.email}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            {user.role?.replace('_', ' ') || 'User'}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Profile Dropdown */}
                                {showProfileMenu && (
                                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-[110]">
                                        <div className="px-5 py-3 mb-1 border-b border-gray-50">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                                            <p className="text-sm font-black text-gray-900 truncate">{user.email}</p>
                                        </div>

                                        <div className="border-t border-gray-50 my-1"></div>

                                        <div className="p-2 space-y-1">
                                            <Link
                                                href={user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer/dashboard' : '/dashboard'}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                                            >
                                                <LayoutDashboard className="w-4 h-4 text-gray-400" />
                                                My Dashboard
                                            </Link>
                                            <Link
                                                href={user.role === 'employer' ? '/employer/profile' : '/dashboard/profile'}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                                            >
                                                <User className="w-4 h-4 text-gray-400" />
                                                Profile Settings
                                            </Link>
                                        </div>

                                        <div className="p-2 mt-1 border-t border-gray-50">
                                            <button
                                                onClick={() => {
                                                    handleLogout();
                                                    setShowProfileMenu(false);
                                                }}
                                                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Log Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/auth/login"
                                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-teal-600 transition-colors"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="px-5 py-2.5 bg-gray-900 hover:bg-teal-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-gray-200 active:scale-95"
                                >
                                    Join Now
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                            aria-label="Toggle menu"
                        >
                            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {showMobileMenu && (
                <div className="lg:hidden bg-white border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
                    <div className="px-4 py-6 space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all ${isActive(item.path)
                                        ? 'bg-teal-50 text-teal-700'
                                        : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {item.icon}
                                    {item.name}
                                </Link>
                            ))}
                        </div>

                        {!user && (
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                                <Link
                                    href="/auth/login"
                                    className="flex items-center justify-center h-12 rounded-xl text-sm font-bold text-gray-700 border border-gray-200"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="flex items-center justify-center h-12 rounded-xl text-sm font-bold text-white bg-teal-600"
                                >
                                    Join Now
                                </Link>
                            </div>
                        )}

                        {user && (
                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 w-full px-4 py-4 rounded-xl text-base font-bold text-red-600 bg-red-50"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Sign Out from Device
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
