'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

interface DashboardStats {
    totalPayments: number;
    pendingPayments: number;
    approvedPayments: number;
    rejectedPayments: number;
    totalJobs: number;
    pendingJobs: number;
    activeJobs: number;
    rejectedJobs: number;
    totalUsers: number;
    totalApplications: number;
}

export default function AdminDashboard() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalPayments: 0,
        pendingPayments: 0,
        approvedPayments: 0,
        rejectedPayments: 0,
        totalJobs: 0,
        pendingJobs: 0,
        activeJobs: 0,
        rejectedJobs: 0,
        totalUsers: 0,
        totalApplications: 0,
    });
    const [loading, setLoading] = useState(true);

    // Auth check
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/admin/login');
            return;
        }

        if (user.role !== 'admin') {
            router.push('/');
            return;
        }
    }, [user, authLoading, router]);

    // Real-time stats listeners
    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        console.log('🔄 Setting up real-time dashboard stats...');

        const unsubscribers: (() => void)[] = [];

        try {
            // Listen to ALL payments
            const paymentsUnsubscribe = onSnapshot(
                collection(db, 'payments'),
                (snapshot) => {
                    const payments = snapshot.docs.map(doc => doc.data());
                    setStats(prev => ({
                        ...prev,
                        totalPayments: payments.length,
                        pendingPayments: payments.filter(p => p.status === 'pending').length,
                        approvedPayments: payments.filter(p => p.status === 'approved').length,
                        rejectedPayments: payments.filter(p => p.status === 'rejected').length,
                    }));
                    console.log('✅ Payments stats updated:', payments.length, 'total');
                },
                (error) => {
                    console.error('❌ Error loading payments:', error);
                }
            );
            unsubscribers.push(paymentsUnsubscribe);

            // Listen to ALL jobs
            const jobsUnsubscribe = onSnapshot(
                collection(db, 'jobs'),
                (snapshot) => {
                    const jobs = snapshot.docs.map(doc => doc.data());
                    setStats(prev => ({
                        ...prev,
                        totalJobs: jobs.length,
                        pendingJobs: jobs.filter(j => j.status === 'pending').length,
                        activeJobs: jobs.filter(j => j.status === 'active').length,
                        rejectedJobs: jobs.filter(j => j.status === 'rejected').length,
                    }));
                    console.log('✅ Jobs stats updated:', jobs.length, 'total');
                },
                (error) => {
                    console.error('❌ Error loading jobs:', error);
                }
            );
            unsubscribers.push(jobsUnsubscribe);

            // Listen to ALL users
            const usersUnsubscribe = onSnapshot(
                collection(db, 'users'),
                (snapshot) => {
                    setStats(prev => ({
                        ...prev,
                        totalUsers: snapshot.size,
                    }));
                    console.log('✅ Users stats updated:', snapshot.size, 'total');
                },
                (error) => {
                    console.error('❌ Error loading users:', error);
                }
            );
            unsubscribers.push(usersUnsubscribe);

            // Listen to ALL applications
            const applicationsUnsubscribe = onSnapshot(
                collection(db, 'applications'),
                (snapshot) => {
                    setStats(prev => ({
                        ...prev,
                        totalApplications: snapshot.size,
                    }));
                    console.log('✅ Applications stats updated:', snapshot.size, 'total');
                },
                (error) => {
                    console.error('❌ Error loading applications:', error);
                }
            );
            unsubscribers.push(applicationsUnsubscribe);

            setLoading(false);

            // Cleanup all listeners
            return () => {
                console.log('🔌 Disconnecting dashboard listeners...');
                unsubscribers.forEach(unsub => unsub());
            };
        } catch (error) {
            console.error('❌ Error setting up dashboard:', error);
            setLoading(false);
        }
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">🛡️ Admin Dashboard</h1>
                            <p className="text-teal-100">Manage your job portal (Real-time)</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-teal-100">Logged in as</p>
                            <p className="font-semibold">{user?.email}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Quick Actions */}
                <div className="grid md:grid-cols-4 gap-4 mb-8">
                    <Link
                        href="/admin/payments"
                        className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition transform hover:scale-105"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-4xl">💰</span>
                            {stats.pendingPayments > 0 && (
                                <span className="bg-white text-yellow-600 text-xs font-bold px-2 py-1 rounded-full">
                                    {stats.pendingPayments} NEW
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold">Payments</h3>
                        <p className="text-yellow-100 text-sm">Review submissions</p>
                    </Link>

                    <Link
                        href="/admin/jobs"
                        className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition transform hover:scale-105"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-4xl">📋</span>
                            {stats.pendingJobs > 0 && (
                                <span className="bg-white text-green-600 text-xs font-bold px-2 py-1 rounded-full">
                                    {stats.pendingJobs} NEW
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold">Jobs</h3>
                        <p className="text-green-100 text-sm">Approve postings</p>
                    </Link>

                    <Link
                        href="/admin/users"
                        className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition transform hover:scale-105"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-4xl">👥</span>
                        </div>
                        <h3 className="text-xl font-bold">Users</h3>
                        <p className="text-purple-100 text-sm">Manage accounts</p>
                    </Link>

                    <Link
                        href="/admin/analytics"
                        className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition transform hover:scale-105"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-4xl">📊</span>
                        </div>
                        <h3 className="text-xl font-bold">Analytics</h3>
                        <p className="text-blue-100 text-sm">View insights</p>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Payment Stats */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-700">Payment Stats</h3>
                            <span className="text-2xl">💳</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total:</span>
                                <span className="font-bold text-gray-900">{stats.totalPayments}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-yellow-600">Pending:</span>
                                <span className="font-bold text-yellow-600">{stats.pendingPayments}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-green-600">Approved:</span>
                                <span className="font-bold text-green-600">{stats.approvedPayments}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-red-600">Rejected:</span>
                                <span className="font-bold text-red-600">{stats.rejectedPayments}</span>
                            </div>
                        </div>
                    </div>

                    {/* Job Stats */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-700">Job Stats</h3>
                            <span className="text-2xl">💼</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total:</span>
                                <span className="font-bold text-gray-900">{stats.totalJobs}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-yellow-600">Pending:</span>
                                <span className="font-bold text-yellow-600">{stats.pendingJobs}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-green-600">Active:</span>
                                <span className="font-bold text-green-600">{stats.activeJobs}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-red-600">Rejected:</span>
                                <span className="font-bold text-red-600">{stats.rejectedJobs}</span>
                            </div>
                        </div>
                    </div>

                    {/* User Stats */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-700">Users</h3>
                            <span className="text-2xl">👤</span>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-teal-600 mb-2">{stats.totalUsers}</div>
                            <p className="text-sm text-gray-600">Total Registered</p>
                        </div>
                    </div>

                    {/* Application Stats */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-700">Applications</h3>
                            <span className="text-2xl">📝</span>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-purple-600 mb-2">{stats.totalApplications}</div>
                            <p className="text-sm text-gray-600">Total Submitted</p>
                        </div>
                    </div>
                </div>

                {/* Pending Actions Alert */}
                {(stats.pendingPayments > 0 || stats.pendingJobs > 0) && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg shadow mb-8">
                        <div className="flex items-start">
                            <span className="text-3xl mr-4">⚠️</span>
                            <div className="flex-1">
                                <h3 className="font-bold text-yellow-900 text-lg mb-2">Action Required</h3>
                                <div className="space-y-1 text-yellow-800">
                                    {stats.pendingPayments > 0 && (
                                        <p>
                                            • <strong>{stats.pendingPayments}</strong> payment{stats.pendingPayments > 1 ? 's' : ''} waiting for review
                                        </p>
                                    )}
                                    {stats.pendingJobs > 0 && (
                                        <p>
                                            • <strong>{stats.pendingJobs}</strong> job{stats.pendingJobs > 1 ? 's' : ''} waiting for approval
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Links */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Quick Links</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Link
                            href="/admin/post-job"
                            className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition"
                        >
                            <span className="text-2xl mr-3">➕</span>
                            <div>
                                <p className="font-semibold text-gray-800">Post New Job</p>
                                <p className="text-xs text-gray-600">Create job posting</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin/placements"
                            className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition"
                        >
                            <span className="text-2xl mr-3">🎯</span>
                            <div>
                                <p className="font-semibold text-gray-800">Placements</p>
                                <p className="text-xs text-gray-600">Track commissions</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin/applications"
                            className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition"
                        >
                            <span className="text-2xl mr-3">📋</span>
                            <div>
                                <p className="font-semibold text-gray-800">All Applications</p>
                                <p className="text-xs text-gray-600">View submissions</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}