'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/layout/auth/ProtectedRoute';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-success-50 py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="font-display font-bold text-4xl text-neutral-900 mb-2">
                            Welcome back, {user?.displayName?.split(' ')[0] || 'User'}! 👋
                        </h1>
                        <p className="text-neutral-600 text-lg">
                            Here's what's happening with your KhanHub account
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        {/* Stat Card 1 */}
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border-2 border-white/50 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Total Donations</p>
                                    <p className="text-2xl font-bold text-neutral-900">PKR 0</p>
                                </div>
                            </div>
                        </div>

                        {/* Stat Card 2 */}
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border-2 border-white/50 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Account Status</p>
                                    <p className="text-2xl font-bold text-success-600">Active</p>
                                </div>
                            </div>
                        </div>

                        {/* Stat Card 3 */}
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border-2 border-white/50 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Member Since</p>
                                    <p className="text-2xl font-bold text-neutral-900">
                                        {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Quick Actions */}
                        <div className="lg:col-span-2 bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border-2 border-white/50 p-8">
                            <h2 className="font-display font-bold text-2xl text-neutral-900 mb-6">Quick Actions</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Link
                                    href="/donate"
                                    className="flex items-center gap-4 p-6 bg-gradient-to-br from-success-50 to-success-100 hover:from-success-100 hover:to-success-200 rounded-xl transition-all duration-300 group border-2 border-success-200 hover:border-success-300"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                        💝
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-900 mb-1">Make a Donation</h3>
                                        <p className="text-sm text-neutral-600">Support our cause</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/departments"
                                    className="flex items-center gap-4 p-6 bg-gradient-to-br from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 rounded-xl transition-all duration-300 group border-2 border-primary-200 hover:border-primary-300"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                        🏢
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-900 mb-1">Explore Departments</h3>
                                        <p className="text-sm text-neutral-600">View all services</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/profile"
                                    className="flex items-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all duration-300 group border-2 border-blue-200 hover:border-blue-300"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                        👤
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-900 mb-1">View Profile</h3>
                                        <p className="text-sm text-neutral-600">Manage your account</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/contact"
                                    className="flex items-center gap-4 p-6 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl transition-all duration-300 group border-2 border-purple-200 hover:border-purple-300"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                        📞
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-900 mb-1">Contact Us</h3>
                                        <p className="text-sm text-neutral-600">Get in touch</p>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* User Profile Card */}
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border-2 border-white/50 p-8">
                            <h2 className="font-display font-bold text-2xl text-neutral-900 mb-6">Your Profile</h2>
                            <div className="flex flex-col items-center text-center">
                                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-primary-200 shadow-xl mb-4">
                                    {user?.photoURL ? (
                                        <Image
                                            src={user.photoURL}
                                            alt={user.displayName || 'User'}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-4xl">
                                            {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-xl text-neutral-900 mb-1">{user?.displayName || 'User'}</h3>
                                <p className="text-neutral-600 text-sm mb-4">{user?.email}</p>
                                <div className="space-y-2 w-full">
                                    <div className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-semibold">
                                        ✓ Verified Account
                                    </div>
                                    <div className="px-4 py-2 bg-success-100 text-success-700 rounded-lg text-sm font-semibold">
                                        Active Member
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notice */}
                    <div className="mt-8 bg-gradient-to-r from-primary-50 to-success-50 border-2 border-primary-200 rounded-2xl p-6">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="font-bold text-neutral-900 mb-1">Dashboard Under Development</h3>
                                <p className="text-neutral-700 text-sm">
                                    This dashboard is currently in development. More features like donation history, certificates, and activity tracking will be added soon!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
