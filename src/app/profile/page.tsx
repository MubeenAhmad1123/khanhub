'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/layout/auth/ProtectedRoute';
import Image from 'next/image';
import Link from 'next/link';

export default function ProfilePage() {
    const { user } = useAuth();

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-success-50 py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border-2 border-white/50 p-8 md:p-12 mb-8">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Profile Picture */}
                            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-primary-200 shadow-xl">
                                {user?.photoURL ? (
                                    <Image
                                        src={user.photoURL}
                                        alt={`${user.displayName || 'User'}'s Profile Account Picture`}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-5xl">
                                        {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="font-display font-bold text-3xl md:text-4xl text-neutral-900 mb-2">
                                    {user?.displayName || 'User'}
                                </h1>
                                <p className="text-neutral-600 text-lg mb-4">{user?.email}</p>
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                    <span className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                                        ✓ Verified Account
                                    </span>
                                    <span className="px-4 py-2 bg-success-100 text-success-700 rounded-full text-sm font-semibold">
                                        Active Member
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Account Information */}
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border-2 border-white/50 p-6">
                            <h2 className="font-display font-bold text-xl text-neutral-900 mb-4 flex items-center gap-2">
                                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Account Information
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Display Name</label>
                                    <p className="text-neutral-900 font-medium mt-1">{user?.displayName || 'Not set'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Email</label>
                                    <p className="text-neutral-900 font-medium mt-1">{user?.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">User ID</label>
                                    <p className="text-neutral-900 font-mono text-sm mt-1 break-all">{user?.uid}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border-2 border-white/50 p-6">
                            <h2 className="font-display font-bold text-xl text-neutral-900 mb-4 flex items-center gap-2">
                                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Quick Actions
                            </h2>
                            <div className="space-y-3">
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-3 px-4 py-3 bg-primary-50 hover:bg-primary-100 rounded-xl transition-all duration-300 group"
                                >
                                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                    <span className="font-semibold text-neutral-700 group-hover:text-neutral-900">Go to Dashboard</span>
                                </Link>
                                <Link
                                    href="/donate"
                                    className="flex items-center gap-3 px-4 py-3 bg-success-50 hover:bg-success-100 rounded-xl transition-all duration-300 group"
                                >
                                    <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    <span className="font-semibold text-neutral-700 group-hover:text-neutral-900">Make a Donation</span>
                                </Link>
                                <Link
                                    href="/"
                                    className="flex items-center gap-3 px-4 py-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-all duration-300 group"
                                >
                                    <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    <span className="font-semibold text-neutral-700 group-hover:text-neutral-900">Back to Home</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Info Notice */}
                    <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="font-bold text-blue-900 mb-1">Profile Information</h3>
                                <p className="text-blue-800 text-sm">
                                    Your profile information is synced with your Google account. To update your name or photo, please update your Google account settings.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
