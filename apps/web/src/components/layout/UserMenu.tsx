// src/components/layout/UserMenu.tsx (CREATE THIS FILE)
'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

export default function UserMenu() {
    const { user, loading, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Loading state
    if (loading) {
        return <div className="w-10 h-10 rounded-full bg-neutral-200 animate-pulse" />;
    }

    // Not signed in
    if (!user) {
        return (
            <Link
                href="/auth/signin"
                className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In
            </Link>
        );
    }

    // Signed in - show profile dropdown
    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-all duration-300 group"
            >
                <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary-200 group-hover:border-primary-400 transition-all">
                    {user.photoURL ? (
                        <Image
                            src={user.photoURL}
                            alt={`${user.displayName || 'User'}'s Profile Picture`}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold">
                            {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-neutral-900 line-clamp-1">
                        {user.displayName || 'User'}
                    </p>
                    <p className="text-xs text-neutral-500 line-clamp-1">
                        {user.email}
                    </p>
                </div>
                <svg
                    className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border-2 border-neutral-100 overflow-hidden z-50">
                    {/* User Info */}
                    <div className="p-4 bg-gradient-to-br from-primary-50 to-white border-b border-neutral-100">
                        <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                                {user.photoURL ? (
                                    <Image src={user.photoURL} alt={`${user.displayName || 'User'}'s Profile Picture`} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
                                        {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-neutral-900 truncate">{user.displayName || 'User'}</p>
                                <p className="text-xs text-neutral-600 truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <Link href="/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors group" onClick={() => setIsOpen(false)}>
                            <svg className="w-5 h-5 text-neutral-400 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">My Profile</span>
                        </Link>
                        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors group" onClick={() => setIsOpen(false)}>
                            <svg className="w-5 h-5 text-neutral-400 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">Dashboard</span>
                        </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-neutral-100 py-2">
                        <button
                            onClick={() => {
                                signOut();
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-50 transition-colors group"
                        >
                            <svg className="w-5 h-5 text-neutral-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-sm font-medium text-neutral-700 group-hover:text-red-600">Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}