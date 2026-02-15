'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Clock, CheckCircle, XCircle, Eye, Loader2, Star, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getApplicationsByCandidate } from '@/lib/firebase/firestore';
import { JobApplication } from '@/types/application';
import { toDate } from '@/lib/firebase/firestore';

export default function ApplicationsTrackerPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth();
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'applied' | 'shortlisted' | 'rejected' | 'hired'>('all');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        const loadApplications = async () => {
            if (!user) return;

            try {
                const apps = await getApplicationsByCandidate(user.uid) as JobApplication[];
                // Sort by most recent first
                apps.sort((a, b) => {
                    const dateA = a.appliedAt instanceof Date ? a.appliedAt : (a.appliedAt as any).toDate();
                    const dateB = b.appliedAt instanceof Date ? b.appliedAt : (b.appliedAt as any).toDate();
                    return dateB.getTime() - dateA.getTime();
                });
                setApplications(apps);
                setLoading(false);

                // Self-healing: Check if application count matches user profile
                // We only update if the count in profile is LOWER than actual applications (to assume they used more)
                // OR if it's different and we trust the applications collection as source of truth.
                const currentCount = user.applicationsUsed || 0;
                const actualCount = apps.length;

                if (currentCount !== actualCount) {
                    console.log(`Syncing application count: Profile=${currentCount}, Actual=${actualCount}`);
                    const { updateUserProfile } = await import('@/lib/firebase/auth');
                    await updateUserProfile(user.uid, {
                        applicationsUsed: actualCount
                    });
                    // This will also trigger the profile strength recalculation due to our previous fix in auth.ts
                }
            } catch (err) {
                console.error('Error loading applications:', err);
                setLoading(false);
            }
        };

        if (user) {
            loadApplications();
        }
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    const filteredApplications = filter === 'all'
        ? applications
        : applications.filter(app => app.status === filter);

    const statusCounts = {
        all: applications.length,
        applied: applications.filter(a => a.status === 'applied').length,
        shortlisted: applications.filter(a => a.status === 'shortlisted').length,
        rejected: applications.filter(a => a.status === 'rejected').length,
        hired: applications.filter(a => a.status === 'hired').length,
    };

    return (
        <div className="min-h-screen bg-jobs-neutral py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-jobs-dark mb-2">My Applications</h1>
                    <p className="text-jobs-dark/60">Track the status of your job applications</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
                        <div className="text-2xl font-black text-jobs-dark">{statusCounts.all}</div>
                        <div className="text-xs text-jobs-dark/60">Total</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
                        <div className="text-2xl font-black text-yellow-600">{statusCounts.applied}</div>
                        <div className="text-xs text-jobs-dark/60">Applied</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
                        <div className="text-2xl font-black text-green-600">{statusCounts.shortlisted}</div>
                        <div className="text-xs text-jobs-dark/60">Shortlisted</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
                        <div className="text-2xl font-black text-red-600">{statusCounts.rejected}</div>
                        <div className="text-xs text-jobs-dark/60">Rejected</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
                        <div className="text-2xl font-black text-purple-600">{statusCounts.hired}</div>
                        <div className="text-xs text-jobs-dark/60">Hired</div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 mb-6 flex gap-2 overflow-x-auto">
                    {(['all', 'applied', 'shortlisted', 'rejected', 'hired'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`flex-1 whitespace-nowrap py-3 px-4 rounded-xl font-bold text-sm transition ${filter === status
                                ? 'bg-jobs-primary text-white shadow-md'
                                : 'text-jobs-dark/60 hover:bg-gray-50'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
                        </button>
                    ))}
                </div>

                {/* Applications List */}
                {filteredApplications.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-16 text-center">
                        <FileText className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-jobs-dark mb-2">
                            {filter === 'all' ? 'No Applications Yet' : `No ${filter} Applications`}
                        </h3>
                        <p className="text-jobs-dark/60 mb-6">
                            {filter === 'all'
                                ? "You haven't applied to any jobs yet"
                                : `You don't have any ${filter} applications`}
                        </p>
                        {filter === 'all' && (
                            <Link
                                href="/search"
                                className="inline-block bg-jobs-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition"
                            >
                                Browse Jobs
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredApplications.map((application) => (
                            <div
                                key={application.id}
                                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black text-jobs-dark mb-1">
                                            {application.jobTitle}
                                        </h3>
                                        <p className="text-sm font-bold text-jobs-dark/70 mb-3">
                                            {application.companyName}
                                        </p>

                                        <div className="flex items-center gap-4 text-sm text-jobs-dark/60 mb-3">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                <span>Applied {toDate(application.appliedAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4" />
                                                <span>Match Score: {application.matchScore}%</span>
                                            </div>
                                        </div>

                                        {/* Status Timeline */}
                                        <div className="flex items-center gap-2">
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${application.status === 'applied'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : application.status === 'shortlisted'
                                                    ? 'bg-green-100 text-green-800'
                                                    : application.status === 'rejected'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {application.status === 'applied' && <Clock className="h-3 w-3" />}
                                                {application.status === 'shortlisted' && <CheckCircle className="h-3 w-3" />}
                                                {application.status === 'rejected' && <XCircle className="h-3 w-3" />}
                                                {application.status === 'hired' && <Star className="h-3 w-3" />}
                                                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                            </div>

                                            {application.status === 'applied' && (
                                                <span className="text-xs text-jobs-dark/50">Under review by employer</span>
                                            )}
                                            {application.status === 'shortlisted' && (
                                                <span className="text-xs text-green-600">🎉 You've been shortlisted!</span>
                                            )}
                                            {application.status === 'hired' && (
                                                <span className="text-xs text-purple-600">🎊 Congratulations! You got the job!</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Cover Letter Preview */}
                                {application.coverLetter && (
                                    <div className="bg-gray-50 p-3 rounded-xl mb-3">
                                        <div className="text-xs font-bold text-gray-500 mb-1">Your Cover Letter</div>
                                        <p className="text-xs text-jobs-dark/70 line-clamp-2">
                                            {application.coverLetter}
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-3 border-t">
                                    <Link
                                        href={`/job/${application.jobId}`}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-200 transition"
                                    >
                                        <Eye className="h-4 w-4" />
                                        View Job
                                    </Link>

                                    {application.status === 'rejected' && (
                                        <Link
                                            href="/search"
                                            className="flex items-center gap-2 px-4 py-2 bg-jobs-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition"
                                        >
                                            Find Similar Jobs
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Box */}
                {!profile?.isPremium && (
                    <div className="mt-8 bg-gradient-to-r from-jobs-accent to-orange-600 p-6 rounded-3xl shadow-2xl text-white">
                        <h3 className="text-xl font-black mb-2">📈 Boost Your Success Rate</h3>
                        <p className="mb-4 text-white/90">
                            Premium members get unlimited applications and higher visibility to employers
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="text-sm">
                                <div className="font-bold">You've used</div>
                                <div className="text-2xl font-black">{profile?.applicationsUsed || 0}/10</div>
                                <div className="text-xs opacity-75">free applications</div>
                            </div>
                            <Link
                                href="/dashboard/premium"
                                className="ml-auto bg-white text-jobs-accent px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition"
                            >
                                Upgrade to Premium
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
