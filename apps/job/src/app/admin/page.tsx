'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';

export default function AdminDashboard() {
    const router = useRouter();
    const { user, loading, refreshProfile } = useAuth();
    const { getDashboardData } = useAdmin();
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [isVerifyingRole, setIsVerifyingRole] = useState(true);
    const [verificationError, setVerificationError] = useState(false);

    useEffect(() => {
        const verifyRole = async () => {
            if (loading) return;

            console.log('Dashboard: Verifying role...', user?.role);

            if (user?.role === 'admin') {
                setIsVerifyingRole(false);
                setVerificationError(false);
                return;
            }

            // Not admin yet. Try an active refresh.
            if (user) {
                console.log('Dashboard: Not admin yet. Attempting forced refresh...');
                await refreshProfile();

                // Show error if still not admin after refresh
                setTimeout(() => {
                    if (user?.role !== 'admin') {
                        console.log('Dashboard: Still not admin after refresh.');
                        setVerificationError(true);
                        setIsVerifyingRole(false);
                    } else {
                        setIsVerifyingRole(false);
                        setVerificationError(false);
                    }
                }, 2000);
            } else {
                console.log('Dashboard: No user found, redirecting to login.');
                router.push('/admin/login');
            }
        };

        verifyRole();
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.role === 'admin' && !isVerifyingRole) { // Only load data if user is admin and role is verified
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        try {
            const data = await getDashboardData();
            setDashboardData(data);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setDataLoading(false);
        }
    };

    if (loading || isVerifyingRole) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-2xl font-bold text-white mb-2">Verifying Administrative Access</h2>
                    <p className="text-slate-400">Please wait while we secure your session...</p>
                </div>
            </div>
        );
    }

    if (verificationError || !user || user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                    <div className="text-5xl mb-6">🛑</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h2>
                    <p className="text-slate-600 mb-8">
                        Your account ({user?.email}) does not have administrative privileges.
                        If you just promoted this account, please wait a moment and try again.
                    </p>
                    <div className="space-y-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition"
                        >
                            🔄 Retry Verification
                        </button>
                        <div className="border-t border-gray-100 my-4 pt-4">
                            <p className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-widest">Wrong Role? Switch Now:</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={async () => {
                                        if (!user?.uid) return;
                                        const { doc, updateDoc } = await import('firebase/firestore');
                                        const { db } = await import('@/lib/firebase/config');
                                        await updateDoc(doc(db, 'users', user.uid), { role: 'job_seeker' });
                                        window.location.href = '/dashboard';
                                    }}
                                    className="bg-jobs-primary/10 text-jobs-primary py-2 rounded-lg font-bold text-xs hover:bg-jobs-primary/20 transition"
                                >
                                    🎯 I am a Seeker
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!user?.uid) return;
                                        const { doc, updateDoc } = await import('firebase/firestore');
                                        const { db } = await import('@/lib/firebase/config');
                                        await updateDoc(doc(db, 'users', user.uid), { role: 'employer' });
                                        window.location.href = '/employer/dashboard';
                                    }}
                                    className="bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-xs hover:bg-blue-100 transition"
                                >
                                    🏢 I am a Hiring Person
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                const { signOut } = await import('firebase/auth');
                                const { auth } = await import('@/lib/firebase/config');
                                await signOut(auth);
                                router.push('/auth/login');
                            }}
                            className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition"
                        >
                            🚪 Logout & Switch Account
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (dataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-teal-100">Manage your job portal</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Pending Actions Alert */}
                {dashboardData?.pendingActions && (
                    (dashboardData.pendingActions.paymentsToReview > 0 ||
                        dashboardData.pendingActions.jobsToReview > 0) && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">⚠️</div>
                                <div>
                                    <h3 className="font-bold text-yellow-800 mb-2">Pending Actions Required</h3>
                                    <div className="flex gap-6 text-sm text-yellow-700">
                                        {dashboardData.pendingActions.paymentsToReview > 0 && (
                                            <span>{dashboardData.pendingActions.paymentsToReview} payments to review</span>
                                        )}
                                        {dashboardData.pendingActions.jobsToReview > 0 && (
                                            <span>{dashboardData.pendingActions.jobsToReview} jobs to approve</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                )}

                {/* Stats Grid */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                        <div className="text-gray-600 text-sm mb-1">Total Users</div>
                        <div className="text-3xl font-bold text-gray-800">
                            {dashboardData?.summary?.totalUsers || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            {dashboardData?.summary?.totalJobSeekers || 0} job seekers, {dashboardData?.summary?.totalEmployers || 0} employers
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
                        <div className="text-gray-600 text-sm mb-1">Active Jobs</div>
                        <div className="text-3xl font-bold text-gray-800">
                            {dashboardData?.summary?.activeJobs || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            {dashboardData?.summary?.pendingJobs || 0} pending approval
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
                        <div className="text-gray-600 text-sm mb-1">Applications</div>
                        <div className="text-3xl font-bold text-gray-800">
                            {dashboardData?.summary?.totalApplications || 0}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-amber-500">
                        <div className="text-gray-600 text-sm mb-1">Total Revenue</div>
                        <div className="text-3xl font-bold text-gray-800">
                            Rs. {(dashboardData?.summary?.totalRevenue || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            {dashboardData?.summary?.totalPlacements || 0} placements
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Link
                        href="/admin/payments"
                        className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="text-5xl">💳</div>
                            <div>
                                <h3 className="font-bold text-gray-800 mb-1">Payments</h3>
                                <p className="text-sm text-gray-600">
                                    {dashboardData?.pendingActions?.paymentsToReview || 0} pending
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/admin/jobs"
                        className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="text-5xl">📋</div>
                            <div>
                                <h3 className="font-bold text-gray-800 mb-1">Job Approvals</h3>
                                <p className="text-sm text-gray-600">
                                    {dashboardData?.pendingActions?.jobsToReview || 0} pending
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/admin/users"
                        className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="text-5xl">👥</div>
                            <div>
                                <h3 className="font-bold text-gray-800 mb-1">Users</h3>
                                <p className="text-sm text-gray-600">Manage all users</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Additional Actions */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Link
                        href="/admin/placements"
                        className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                    >
                        <div className="text-4xl mb-4">🎯</div>
                        <h3 className="font-bold text-gray-800 mb-2">Placements</h3>
                        <p className="text-gray-600 text-sm">Track commissions</p>
                    </Link>

                    <Link
                        href="/admin/analytics"
                        className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                    >
                        <div className="text-4xl mb-4">📊</div>
                        <h3 className="font-bold text-gray-800 mb-2">Analytics</h3>
                        <p className="text-gray-600 text-sm">View insights</p>
                    </Link>

                    <Link
                        href="/employer/post-job"
                        className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg shadow hover:shadow-lg transition p-6"
                    >
                        <div className="text-4xl mb-4">➕</div>
                        <h3 className="font-bold mb-2">Post Job</h3>
                        <p className="text-teal-100 text-sm">Admin can post directly</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}