'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Job } from '@/types/job';
import { getActiveJobs } from '@/lib/firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import {
    Clock, CheckCircle, AlertCircle, Briefcase, TrendingUp,
    FileText, Star, Loader2, RefreshCw, XCircle, Bell
} from 'lucide-react';
import RegisteredBadge from '@/components/ui/RegisteredBadge';
import MatchedJobCard from '@/components/jobs/MatchedJobCard';

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading, refreshProfile } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [matchedJobs, setMatchedJobs] = useState<any[]>([]); // Jobs with match scores
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [timeElapsed, setTimeElapsed] = useState<string>('');
    const [paymentSubmittedAt, setPaymentSubmittedAt] = useState<Date | null>(null);
    const [showPaymentStatusChange, setShowPaymentStatusChange] = useState(false);
    const [paymentStatusMessage, setPaymentStatusMessage] = useState('');
    const [animatedStrength, setAnimatedStrength] = useState(0);

    // Real-time payment status listener
    useEffect(() => {
        if (!user?.uid) return;

        // Listen to payment status changes in real-time
        const paymentsQuery = doc(db, 'payments', user.uid);

        const unsubscribe = onSnapshot(paymentsQuery, async (snapshot) => {
            if (snapshot.exists()) {
                const paymentData = snapshot.data();
                const newStatus = paymentData.status;

                // If status changed, show notification and refresh user profile
                if (user.paymentStatus !== newStatus) {
                    if (newStatus === 'approved') {
                        setPaymentStatusMessage('🎉 Your payment has been approved! You can now apply to jobs.');
                        setShowPaymentStatusChange(true);

                        // Play success sound (optional)
                        const audio = new Audio('/sounds/success.mp3');
                        audio.play().catch(() => { });

                        // Refresh user profile to update payment status
                        await refreshProfile();

                        setTimeout(() => {
                            setShowPaymentStatusChange(false);
                        }, 8000);
                    } else if (newStatus === 'rejected') {
                        setPaymentStatusMessage('❌ Your payment was rejected. Reason: ' + (paymentData.rejectionReason || 'Please contact support.'));
                        setShowPaymentStatusChange(true);

                        // Refresh user profile
                        await refreshProfile();

                        setTimeout(() => {
                            setShowPaymentStatusChange(false);
                            router.push('/auth/verify-payment');
                        }, 8000);
                    }
                }
            }
        }, (error) => {
            console.error('Error listening to payment status:', error);
        });

        return () => unsubscribe();
    }, [user?.uid, user?.paymentStatus, refreshProfile, router]);

    const fetchPaymentSubmissionTime = useCallback(async () => {
        if (!user?.uid) return;

        try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/firebase-config');
            const { toDate } = await import('@/lib/firebase/firestore');

            const paymentDoc = await getDoc(doc(db, 'payments', user.uid));
            if (paymentDoc.exists()) {
                const data = paymentDoc.data();
                if (data.submittedAt) {
                    setPaymentSubmittedAt(toDate(data.submittedAt));
                }
            }
        } catch (error) {
            console.error('Error fetching payment time:', error);
        }
    }, [user?.uid]);

    const loadJobs = useCallback(async () => {
        try {
            setLoadingJobs(true);
            const { getApprovedJobs } = await import('@/lib/firebase/firestore');
            const { rankJobsByMatch, getCategoryIcon } = await import('@/lib/services/jobMatching');
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/firebase-config');

            // Get all approved jobs
            const jobsList = await getApprovedJobs(20) as Job[];

            // Get user profile for matching
            const userDoc = await getDoc(doc(db, 'users', user!.uid));
            const userProfile = userDoc.data()?.profile;

            if (userProfile) {
                // Calculate matches and rank jobs
                const matches = rankJobsByMatch(jobsList, userProfile, 8);

                // Attach match data to jobs
                const jobsWithMatches = matches.map(match => {
                    const job = jobsList.find(j => j.id === match.jobId);
                    return {
                        ...job,
                        matchScore: match.matchScore,
                        matchReasons: match.matchReasons,
                        skillsMatched: match.skillsMatched,
                        categoryIcon: getCategoryIcon(job!.category),
                    };
                });

                setMatchedJobs(jobsWithMatches);
            } else {
                // No profile, show generic jobs
                setJobs(jobsList.slice(0, 8));
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setLoadingJobs(false);
        }
    }, [user]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
            return;
        }

        if (!loading && user && !user.onboardingCompleted) {
            router.push('/auth/onboarding');
            return;
        }

        if (!loading && user && user.paymentStatus === 'pending' && !paymentSubmittedAt) {
            fetchPaymentSubmissionTime();
        }

        if (!loading && user && user.role === 'employer') {
            router.push('/employer/dashboard');
        }
    }, [user, loading, router, paymentSubmittedAt, fetchPaymentSubmissionTime]);

    useEffect(() => {
        if (user) {
            loadJobs();

            // Animation for profile strength
            const strength = user.profile?.profileStrength || 0;
            if (strength > 0) {
                const timer = setTimeout(() => {
                    setAnimatedStrength(strength);
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [user, loadJobs]);

    // Auto-refresh profile every 30 seconds when payment is pending
    useEffect(() => {
        if (user?.paymentStatus === 'pending') {
            const interval = setInterval(async () => {
                await refreshProfile();
            }, 30000); // 30 seconds

            return () => clearInterval(interval);
        }
    }, [user?.paymentStatus, refreshProfile]);

    // Timer for elapsed time since payment submission
    useEffect(() => {
        if (paymentSubmittedAt && user?.paymentStatus === 'pending') {
            const updateTimer = () => {
                const now = new Date();
                const diff = now.getTime() - paymentSubmittedAt.getTime();
                const minutes = Math.floor(diff / 60000);

                if (minutes < 1) {
                    setTimeElapsed('Just now');
                } else if (minutes < 30) {
                    setTimeElapsed(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
                } else if (minutes < 60) {
                    setTimeElapsed('About 30 minutes ago');
                } else {
                    const hours = Math.floor(minutes / 60);
                    setTimeElapsed(`${hours} hour${hours > 1 ? 's' : ''} ago`);
                }
            };

            updateTimer();
            const interval = setInterval(updateTimer, 60000); // Update every minute

            return () => clearInterval(interval);
        }
    }, [paymentSubmittedAt, user?.paymentStatus]);

    const handleManualRefresh = async () => {
        await refreshProfile();
        alert('Profile refreshed! Your payment status is: ' + user?.paymentStatus);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!user) return null;

    // Payment Status Notification Banner
    const PaymentStatusBanner = () => {
        if (showPaymentStatusChange) {
            return (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5">
                    <div className={`max-w-md rounded-xl shadow-2xl p-6 ${user.paymentStatus === 'approved'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                        }`}>
                        <div className="flex items-start gap-4">
                            <Bell className="h-6 w-6 flex-shrink-0 animate-bounce" />
                            <div>
                                <h3 className="font-bold text-lg mb-1">Payment Status Updated!</h3>
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
        <div className="min-h-screen bg-gray-50">
            <PaymentStatusBanner />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Payment Pending Banner */}
                {user.paymentStatus === 'pending' && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-8 shadow-md">
                        <div className="flex items-start gap-4">
                            <Clock className="h-8 w-8 text-yellow-600 flex-shrink-0 animate-pulse" />
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                    ⏳ Payment Under Review
                                </h3>
                                <p className="text-yellow-800 mb-3">
                                    Your payment proof is being verified by our team. You can browse jobs, but applications are disabled until approval.
                                </p>
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="font-semibold">Submitted:</span>
                                        <span className="bg-yellow-100 px-3 py-1 rounded-full">{timeElapsed}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="font-semibold">Expected Approval:</span>
                                        <span className="bg-yellow-100 px-3 py-1 rounded-full">Within 30 minutes</span>
                                    </div>
                                    <button
                                        onClick={handleManualRefresh}
                                        className="ml-auto flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Check Status
                                    </button>
                                </div>
                                <p className="text-xs text-yellow-700 mt-3">
                                    💡 Your status updates automatically. You'll be notified immediately when approved!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Rejected Banner */}
                {user.paymentStatus === 'rejected' && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-8 shadow-md">
                        <div className="flex items-start gap-4">
                            <XCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-red-900 mb-2">
                                    Payment Rejected
                                </h3>
                                <p className="text-red-800 mb-4">
                                    Your payment verification was unsuccessful. Please submit a new payment proof.
                                </p>
                                <Link
                                    href="/auth/verify-payment"
                                    className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                    Resubmit Payment
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Welcome Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-4xl font-black text-gray-900">
                            Welcome back, {user.displayName || user.email?.split('@')[0]}! 👋
                        </h1>
                        {user.paymentStatus === 'approved' && (
                            <RegisteredBadge size={32} showText />
                        )}
                    </div>
                    <p className="text-gray-600">
                        {user.paymentStatus === 'approved'
                            ? 'You are a verified member! Browse and apply to jobs.'
                            : 'Browse jobs while we verify your payment'}
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={<Briefcase className="h-6 w-6" />}
                        title="Applications Sent"
                        value={user.applicationsUsed || 0}
                        color="blue"
                        subtitle={user.isPremium ? 'Unlimited' : `${10 - (user.applicationsUsed || 0)} remaining`}
                    />
                    <StatCard
                        icon={<TrendingUp className="h-6 w-6" />}
                        title="Profile Strength"
                        value={`${user.profile?.profileStrength || 0}%`}
                        color="teal"
                        subtitle={
                            <div className="mt-2">
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="bg-teal-500 h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${animatedStrength}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] mt-1 text-gray-400">Target 100%</p>
                            </div>
                        }
                    />
                    <StatCard
                        icon={<Star className="h-6 w-6" />}
                        title="Rewards Points"
                        value={user.points || 0}
                        color="purple"
                        subtitle="Earn more points"
                    />
                    <StatCard
                        icon={<FileText className="h-6 w-6" />}
                        title="CV Uploaded"
                        value={user.profile?.cvUrl ? '✓' : '✗'}
                        color={user.profile?.cvUrl ? 'green' : 'gray'}
                        subtitle={user.profile?.cvUrl ? 'Ready' : 'Upload now'}
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Link
                        href="/search"
                        className="bg-gradient-to-br from-teal-500 to-teal-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-4 rounded-xl">
                                <Briefcase className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Browse All Jobs</h3>
                                <p className="text-teal-50 text-sm">Explore thousands of opportunities</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/profile"
                        className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-4 rounded-xl">
                                <FileText className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Complete Profile</h3>
                                <p className="text-purple-50 text-sm">Increase your visibility</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/applications"
                        className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-4 rounded-xl">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">My Applications</h3>
                                <p className="text-blue-50 text-sm">Track your progress</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Recommended Jobs */}
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                {matchedJobs.length > 0 ? (
                                    <>
                                        <span>🎯</span>
                                        <span>Jobs Perfect for You</span>
                                        <span className="text-sm font-normal bg-teal-100 text-teal-700 px-3 py-1 rounded-full">
                                            Personalized
                                        </span>
                                    </>
                                ) : (
                                    'Recommended Jobs'
                                )}
                            </h2>
                            {matchedJobs.length > 0 && (
                                <p className="text-sm text-gray-600 mt-1">
                                    Based on your skills, location, and experience
                                </p>
                            )}
                        </div>
                        <Link href="/search" className="text-teal-600 hover:text-teal-700 font-medium">
                            View All →
                        </Link>
                    </div>

                    {loadingJobs ? (
                        <div className="text-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
                        </div>
                    ) : matchedJobs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {matchedJobs.map((job) => (
                                <MatchedJobCard key={job.id} job={job} />
                            ))}
                        </div>
                    ) : jobs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {jobs.map((job) => (
                                <JobCard key={job.id} job={job} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl shadow">
                            <p className="text-gray-500">No jobs available at the moment</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, title, value, color, subtitle }: any) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        teal: 'bg-teal-50 text-teal-600',
        purple: 'bg-purple-50 text-purple-600',
        green: 'bg-green-50 text-green-600',
        gray: 'bg-gray-50 text-gray-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className={`inline-flex p-3 rounded-lg mb-4 ${colorClasses[color]}`}>
                {icon}
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
    );
}

function JobCard({ job }: { job: Job }) {
    return (
        <Link
            href={`/job/${job.id}`}
            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 hover:scale-105"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">{job.title}</h3>
                    <p className="text-gray-600 text-sm">{job.companyName}</p>
                </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>💰</span>
                    <span>
                        {(job.salaryMin && job.salaryMax)
                            ? `Rs. ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`
                            : 'Salary not specified'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span>⏰</span>
                    <span className="capitalize">{job.employmentType}</span>
                </div>
            </div>
        </Link>
    );
}