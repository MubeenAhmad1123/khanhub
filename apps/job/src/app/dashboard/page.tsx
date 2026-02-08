'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRecentJobs } from '@/hooks/useJobs';
import JobCard from '@/components/jobs/JobCard';

export default function JobSeekerDashboard() {
    const router = useRouter();
    const { user, loading, isAuthenticated, hasPaymentApproved } = useAuth();
    const { jobs, loading: jobsLoading } = useRecentJobs(6);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/auth/login');
        }
    }, [loading, isAuthenticated, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    if (user.role === 'employer') {
        router.push('/employer/dashboard');
        return null;
    }

    if (user.role === 'admin') {
        router.push('/admin');
        return null;
    }

    if (!hasPaymentApproved) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Payment Pending</h2>
                    <p className="text-gray-600 mb-6">We're reviewing your payment (usually &lt; 30 min)</p>
                    <Link
                        href="/auth/verify-payment"
                        className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700"
                    >
                        Check Status
                    </Link>
                </div>
            </div>
        );
    }

    const profileStrength = user.profile?.profileStrength || 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user.displayName}! 👋</h1>
                            <p className="text-gray-600 mt-1">
                                {user.isPremium ? '💎 Premium Member' : `🎁 Free Plan: ${10 - (user.applicationsUsed || 0)} applications remaining`}
                            </p>
                        </div>
                        {!user.isPremium && (
                            <Link
                                href="/dashboard/premium"
                                className="bg-gradient-to-r from-amber-400 to-amber-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                            >
                                ✨ Upgrade for Unlimited
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-gray-600 text-sm mb-1">Profile Strength</div>
                        <div className="flex items-center gap-3">
                            <div className="text-3xl font-bold text-teal-600">{profileStrength}%</div>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${profileStrength}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-gray-600 text-sm mb-1">Applications</div>
                        <div className="text-3xl font-bold text-gray-800">{user.applicationsUsed}</div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-gray-600 text-sm mb-1">Points</div>
                        <div className="text-3xl font-bold text-purple-600">{user.points}</div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-gray-600 text-sm mb-1">Status</div>
                        <div className="text-xl font-bold">
                            {user.isPremium ? (
                                <span className="text-amber-600">✨ Premium</span>
                            ) : (
                                <span className="text-gray-600">Free</span>
                            )}
                        </div>
                    </div>
                </div>

                {profileStrength < 80 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
                        <div className="flex items-start gap-4">
                            <div className="text-3xl">💡</div>
                            <div>
                                <h3 className="font-bold text-yellow-800 mb-2">Complete your profile!</h3>
                                <p className="text-yellow-700 text-sm mb-4">Employers prefer complete profiles.</p>
                                <Link
                                    href="/dashboard/profile"
                                    className="inline-block bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-700"
                                >
                                    Complete Profile
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Recommended Jobs</h2>
                        <Link href="/search" className="text-teal-600 hover:text-teal-700 font-semibold">
                            View All →
                        </Link>
                    </div>

                    {jobsLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No jobs found</div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {jobs.map((job) => (
                                <JobCard key={job.id} job={job} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Link href="/dashboard/profile" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                        <div className="text-4xl mb-4">👤</div>
                        <h3 className="font-bold text-gray-800 mb-2">My Profile</h3>
                        <p className="text-gray-600 text-sm">Update CV, skills & experience</p>
                    </Link>

                    <Link href="/dashboard/applications" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                        <div className="text-4xl mb-4">📋</div>
                        <h3 className="font-bold text-gray-800 mb-2">Applications</h3>
                        <p className="text-gray-600 text-sm">Track your job applications</p>
                    </Link>

                    <Link href="/dashboard/saved-jobs" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                        <div className="text-4xl mb-4">❤️</div>
                        <h3 className="font-bold text-gray-800 mb-2">Saved Jobs</h3>
                        <p className="text-gray-600 text-sm">Your wishlist</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}