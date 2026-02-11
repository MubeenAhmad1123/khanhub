'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Briefcase,
    Users,
    Clock,
    TrendingUp,
    Plus,
    FileText,
    Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmployerDashboard } from '@/hooks/useEmployerRealtime';
import JobCard from '@/components/jobs/JobCard';

export default function EmployerDashboardPage() {
    const router = useRouter();
    const { user, loading, isEmployer } = useAuth();

    // ✨ REAL-TIME HOOK - Automatically updates when admin changes job status
    const {
        jobs: allJobs,
        applications,
        recentJobs,
        stats,
        loading: fetchingData,
        error,
    } = useEmployerDashboard(user?.uid);

    // Payment Status Logic
    const [showPaymentStatusChange, setShowPaymentStatusChange] = useState(false);
    const [paymentStatusMessage, setPaymentStatusMessage] = useState('');

    useEffect(() => {
        if (!user?.uid) return;

        let unsubscribe: (() => void) | undefined;
        let isMounted = true;

        const setupPaymentListener = async () => {
            // Listen to payment status changes in real-time
            const { doc, onSnapshot } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/firebase-config');

            if (!isMounted) return;

            const paymentsQuery = doc(db, 'payments', user.uid);

            unsubscribe = onSnapshot(paymentsQuery, async (snapshot: any) => {
                if (snapshot.exists()) {
                    const paymentData = snapshot.data();
                    const newStatus = paymentData.status;

                    // If status changed, show notification
                    if (user.paymentStatus !== newStatus) {
                        if (newStatus === 'approved') {
                            setPaymentStatusMessage('🎉 Your payment has been approved! You can now start hiring.');
                            setShowPaymentStatusChange(true);

                            // Refresh to get updated claims
                            window.location.reload();
                        } else if (newStatus === 'rejected') {
                            setPaymentStatusMessage('❌ Your payment was rejected. Reason: ' + (paymentData.rejectionReason || 'Contact support.'));
                            setShowPaymentStatusChange(true);

                            setTimeout(() => {
                                router.push('/auth/verify-payment');
                            }, 5000);
                        }
                    }
                }
            });
        };

        setupPaymentListener();

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
        };
    }, [user?.uid, user?.paymentStatus, router]);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/auth/login');
            } else if (!isEmployer) {
                router.push('/dashboard');
            }
        }
    }, [loading, user, isEmployer, router]);

    if (loading || !user || (fetchingData && recentJobs.length === 0)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-jobs-neutral">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-jobs-primary mx-auto mb-4" />
                    <p className="text-jobs-dark/60 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-jobs-neutral">
                <div className="text-center">
                    <p className="text-red-600 font-medium">Error: {error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-jobs-primary text-white rounded-lg"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const PaymentStatusBanner = () => {
        if (showPaymentStatusChange) {
            return (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5">
                    <div className={`max-w-md rounded-xl shadow-2xl p-6 ${user?.paymentStatus === 'approved' || paymentStatusMessage.includes('approved')
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                        }`}>
                        <div className="flex items-start gap-4">
                            <span className="text-2xl">🔔</span>
                            <div>
                                <h3 className="font-bold text-lg mb-1">Status Updated!</h3>
                                <p className="text-sm">{paymentStatusMessage}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-jobs-neutral py-8 px-4">
            <PaymentStatusBanner />
            <div className="max-w-7xl mx-auto">
                {/* Payment Pending Banner */}
                {user?.paymentStatus === 'pending' && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-8 shadow-md">
                        <div className="flex items-start gap-4">
                            <Clock className="h-8 w-8 text-yellow-600 flex-shrink-0 animate-pulse" />
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-yellow-900 mb-2">
                                    ⏳ Verification In Progress
                                </h3>
                                <p className="text-yellow-800 mb-2">
                                    Your payment is being verified by our team. You can browse the dashboard but job posts will remain pending until approved.
                                </p>
                                <p className="text-sm font-semibold text-yellow-800">
                                    Expected time: Within 30 minutes
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Rejected Banner */}
                {user?.paymentStatus === 'rejected' && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-8 shadow-md">
                        <div className="flex items-start gap-4">
                            <span className="text-2xl">❌</span>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-red-900 mb-2">
                                    Payment Rejected
                                </h3>
                                <p className="text-red-800 mb-4">
                                    Your payment verification failed. Please try again.
                                </p>
                                <Link
                                    href="/auth/verify-payment"
                                    className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700"
                                >
                                    Resubmit Payment
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-jobs-dark mb-2">
                        Welcome to your Company Dashboard, {user.company?.name || user.displayName}! 🏢
                    </h1>
                    <p className="text-jobs-dark/60">
                        Manage your HR profile, post jobs, and find top talent.
                        {/* Real-time indicator */}
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live Updates
                        </span>
                    </p>
                    {(!user.company?.name || !user.company?.description) && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📋</span>
                                <div>
                                    <p className="font-bold text-blue-900">Complete your HR Profile</p>
                                    <p className="text-sm text-blue-700">
                                        Add company details to attract more candidates.
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/employer/profile"
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
                            >
                                Setup Now
                            </Link>
                        </div>
                    )}
                </div>

                {/* Quick Post Button */}
                <div className="mb-8">
                    <Link
                        href="/employer/post-job"
                        className="inline-flex items-center gap-2 bg-jobs-accent text-white px-8 py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-jobs-accent/30"
                    >
                        <Plus className="h-5 w-5" />
                        Post a New Job
                    </Link>
                </div>

                {/* Stats Grid - Updates in real-time */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <Briefcase className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">{stats.activeJobs}</div>
                        <div className="text-sm text-jobs-dark/60">Active Jobs</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-green-100 p-3 rounded-xl">
                                <Users className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">
                            {stats.totalApplications}
                        </div>
                        <div className="text-sm text-jobs-dark/60">Total Applications</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-yellow-100 p-3 rounded-xl">
                                <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">{stats.pendingReview}</div>
                        <div className="text-sm text-jobs-dark/60">Pending Review</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">{stats.totalViews}</div>
                        <div className="text-sm text-jobs-dark/60">Total Views</div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Recent Jobs */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-jobs-dark">
                                    Recent Job Postings
                                </h2>
                                <Link
                                    href="/employer/jobs"
                                    className="text-sm font-bold text-jobs-primary hover:underline"
                                >
                                    View All
                                </Link>
                            </div>

                            {recentJobs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {recentJobs.map((job) => (
                                        <JobCard key={job.id} job={job} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4">No job postings yet</p>
                                    <Link
                                        href="/employer/post-job"
                                        className="inline-flex items-center gap-2 bg-jobs-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
                                    >
                                        <Plus className="h-5 w-5" />
                                        Post Your First Job
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Recent Applications */}
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-jobs-dark">
                                    Recent Applications
                                </h2>
                                <Link
                                    href="/employer/applications"
                                    className="text-sm font-bold text-jobs-primary hover:underline"
                                >
                                    View All
                                </Link>
                            </div>

                            {applications.length > 0 ? (
                                <div className="space-y-3">
                                    {applications.slice(0, 5).map((app) => (
                                        <div
                                            key={app.id}
                                            className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-jobs-primary transition-colors"
                                        >
                                            <div>
                                                <p className="font-bold text-jobs-dark">
                                                    {app.applicantName}
                                                </p>
                                                <p className="text-sm text-jobs-dark/60">
                                                    {app.jobTitle}
                                                </p>
                                            </div>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-bold ${app.status === 'applied'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : app.status === 'shortlisted'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {app.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">Applications will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Quick Actions & Tips */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                            <h3 className="font-black text-jobs-dark mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link
                                    href="/employer/post-job"
                                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-jobs-primary hover:bg-jobs-primary/5 transition-all"
                                >
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <Plus className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <span className="font-bold text-jobs-dark text-sm">Post New Job</span>
                                </Link>

                                <Link
                                    href="/employer/applications"
                                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
                                >
                                    <div className="bg-green-100 p-2 rounded-lg">
                                        <Users className="h-5 w-5 text-green-600" />
                                    </div>
                                    <span className="font-bold text-jobs-dark text-sm">
                                        View Applications
                                    </span>
                                </Link>

                                <Link
                                    href="/employer/profile"
                                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all"
                                >
                                    <div className="bg-purple-100 p-2 rounded-lg">
                                        <FileText className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <span className="font-bold text-jobs-dark text-sm">
                                        Edit Company Profile
                                    </span>
                                </Link>
                            </div>
                        </div>

                        {/* Tips Card */}
                        <div className="bg-gradient-to-br from-jobs-primary to-blue-600 p-6 rounded-3xl shadow-lg text-white">
                            <h3 className="font-black mb-4">💡 Hiring Tips</h3>
                            <div className="space-y-3 text-sm">
                                <p>✓ Write clear, detailed job descriptions</p>
                                <p>✓ List specific skills and requirements</p>
                                <p>✓ Offer competitive salaries</p>
                                <p>✓ Respond to applications quickly</p>
                                <p>✓ Use match scores to find best candidates</p>
                            </div>
                        </div>

                        {/* Commission Info */}
                        <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100">
                            <h3 className="font-black text-yellow-900 mb-3">📊 Commission Structure</h3>
                            <p className="text-sm text-yellow-800 mb-3">
                                When you hire a candidate through our platform:
                            </p>
                            <div className="bg-white p-4 rounded-xl">
                                <div className="text-2xl font-black text-jobs-accent">50%</div>
                                <div className="text-xs text-jobs-dark/60">of first month salary</div>
                            </div>
                            <p className="text-xs text-yellow-700 mt-3">
                                You'll receive an invoice after marking a candidate as hired
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}