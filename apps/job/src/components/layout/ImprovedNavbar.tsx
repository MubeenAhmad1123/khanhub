'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export default function ImprovedNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const handleLogout = async () => {
        try {
            const { signOut } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase/config');

            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const isActive = (path: string) => pathname === path;

    // Don't show navbar on auth pages
    if (pathname?.startsWith('/auth')) {
        return null;
    }

    // Navigation items based on path and user role
    const getNavItems = () => {
        // If on the landing page, show a more general menu
        if (pathname === '/') {
            return [
                { name: 'Home', path: '/', icon: '🏠' },
                { name: 'Browse Jobs', path: '/search', icon: '🔍' },
                { name: 'For Employers', path: '/auth/register', icon: '🏢' },
            ];
        }

        if (!user) {
            return [
                { name: 'Home', path: '/', icon: '🏠' },
                { name: 'Browse Jobs', path: '/search', icon: '🔍' },
            ];
        }

        // Context-aware navigation
        if (pathname?.startsWith('/admin') && user.role === 'admin') {
            return [
                { name: 'Stats', path: '/admin', icon: '📊' },
                { name: 'Payments', path: '/admin/payments', icon: '💰' },
                { name: 'Jobs', path: '/admin/jobs', icon: '✅' },
                { name: 'Users', path: '/admin/users', icon: '👥' },
            ];
        }

        if (pathname?.startsWith('/employer') || user.role === 'employer') {
            return [
                { name: 'Dashboard', path: '/employer/dashboard', icon: '📊' },
                { name: 'Post Job', path: '/employer/post-job', icon: '➕' },
                { name: 'My Jobs', path: '/employer/jobs', icon: '💼' },
                { name: 'Applications', path: '/employer/applications', icon: '📋' },
            ];
        }

        // Default or Seeker
        return [
            { name: 'Dashboard', path: '/dashboard', icon: '📊' },
            { name: 'Find Jobs', path: '/search', icon: '🔍' },
            { name: 'Applications', path: '/dashboard/applications', icon: '📝' },
            { name: 'Profile', path: '/dashboard/profile', icon: '👤' },
        ];
    };

    const navItems = getNavItems();

    return (
        <nav className="bg-white shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href={user ? (user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer/dashboard' : '/dashboard') : '/'} className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-teal-600">KhanHub</h1>
                        {user?.role === 'admin' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                                ADMIN
                            </span>
                        )}
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${isActive(item.path)
                                    ? 'bg-teal-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="mr-1">{item.icon}</span>
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Right Side - Auth Buttons or Profile */}
                    <div className="hidden md:flex items-center gap-4">
                        {loading ? (
                            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">
                                        {user.email?.[0].toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                                        <p className="text-xs text-gray-500 capitalize">
                                            {user.role?.replace('_', ' ')}
                                        </p>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {showProfileMenu && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                                        {user.role === 'admin' && (
                                            <Link
                                                href="/admin"
                                                className="block px-4 py-2 text-purple-600 font-bold hover:bg-purple-50"
                                                onClick={() => setShowProfileMenu(false)}
                                            >
                                                🔐 Admin Portal
                                            </Link>
                                        )}
                                        {user.role === 'job_seeker' && (
                                            <>
                                                <Link
                                                    href="/dashboard/profile"
                                                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                                                    onClick={() => setShowProfileMenu(false)}
                                                >
                                                    👤 My Profile
                                                </Link>
                                                <Link
                                                    href="/dashboard/premium"
                                                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                                                    onClick={() => setShowProfileMenu(false)}
                                                >
                                                    💎 Upgrade Premium
                                                </Link>
                                            </>
                                        )}
                                        {user.role === 'employer' && (
                                            <Link
                                                href="/employer/profile"
                                                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                                                onClick={() => setShowProfileMenu(false)}
                                            >
                                                🏢 Company Profile
                                            </Link>
                                        )}
                                        <div className="border-t border-gray-200 my-2"></div>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setShowProfileMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                                        >
                                            🚪 Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link
                                    href="/auth/login"
                                    className="px-6 py-2 text-teal-600 font-medium hover:bg-teal-50 rounded-lg transition-colors"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-md"
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showMobileMenu ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {showMobileMenu && (
                    <div className="md:hidden py-4 border-t border-gray-200">
                        <div className="space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => setShowMobileMenu(false)}
                                    className={`block px-4 py-2 rounded-lg font-medium ${isActive(item.path)
                                        ? 'bg-teal-600 text-white'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="mr-2">{item.icon}</span>
                                    {item.name}
                                </Link>
                            ))}
                        </div>

                        {/* Mobile Auth Buttons */}
                        {!user && (
                            <div className="mt-4 space-y-2 pt-4 border-t border-gray-200">
                                <Link
                                    href="/auth/login"
                                    onClick={() => setShowMobileMenu(false)}
                                    className="block text-center px-4 py-2 border border-teal-600 text-teal-600 font-medium rounded-lg hover:bg-teal-50"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/auth/register"
                                    onClick={() => setShowMobileMenu(false)}
                                    className="block text-center px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}

                        {/* Mobile Logout */}
                        {user && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="px-4 py-2 text-sm text-gray-600">
                                    Logged in as: <strong>{user.email}</strong>
                                </div>
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setShowMobileMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    🚪 Logout
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}