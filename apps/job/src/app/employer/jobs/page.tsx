'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEmployerJobs } from '@/hooks/useEmployerRealtime';
import { formatSalaryRange } from '@/lib/utils';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import Link from 'next/link';

export default function EmployerJobsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'closed'>('all');

    // ✨ REAL-TIME HOOK - Updates automatically when admin changes job status
    const { jobs, loading, error, stats } = useEmployerJobs(user?.uid, filter);

    // Auth check
    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'employer')) {
            router.push('/auth/login');
        }
    }, [authLoading, user, router]);

    const handleCloseJob = async (jobId: string) => {
        if (!confirm('Are you sure you want to close this job posting?')) return;

        try {
            await updateDoc(doc(db, 'jobs', jobId), {
                status: 'closed',
                closedAt: new Date(),
            });

            alert('Job closed successfully');
            // No need to manually update state - real-time listener handles it!
        } catch (error) {
            console.error('Close job error:', error);
            alert('Failed to close job');
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading jobs...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600">Error: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Job Postings</h1>
                        <p className="text-gray-600 mt-2">
                            Manage your job postings and view applications
                            {/* Real-time indicator */}
                            <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Live
                            </span>
                        </p>
                    </div>
                    <Link
                        href="/employer/post-job"
                        className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium"
                    >
                        + Post New Job
                    </Link>
                </div>

                {/* Stats - Updates in real-time */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500">Total Jobs</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500">
                        <p className="text-sm text-green-700">Active</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">{stats.active}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg shadow p-6 border-l-4 border-yellow-500">
                        <p className="text-sm text-yellow-700">Pending Approval</p>
                        <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.pending}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg shadow p-6 border-l-4 border-gray-500">
                        <p className="text-sm text-gray-700">Closed</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.closed}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow mb-6 p-4">
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            All ({stats.total})
                        </button>
                        <button
                            onClick={() => setFilter('active')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'active'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Active ({stats.active})
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'pending'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Pending ({stats.pending})
                        </button>
                        <button
                            onClick={() => setFilter('closed')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'closed'
                                ? 'bg-gray-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Closed ({stats.closed})
                        </button>
                    </div>
                </div>

                {/* Jobs List */}
                {jobs.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="text-6xl mb-4">💼</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs posted yet</h3>
                        <p className="text-gray-600 mb-6">Start by creating your first job posting</p>
                        <Link
                            href="/employer/post-job"
                            className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium"
                        >
                            Post Your First Job
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {jobs.map((job) => (
                            <div key={job.id} className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                                        <p className="text-gray-600 mt-1">{job.location}</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Posted:{' '}
                                            {job.postedAt
                                                ? new Date(
                                                    (job.postedAt as any).toDate
                                                        ? (job.postedAt as any).toDate()
                                                        : job.postedAt
                                                ).toLocaleDateString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${job.status === 'active'
                                            ? 'bg-green-100 text-green-800'
                                            : job.status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}
                                    >
                                        {job.status === 'active' && '✓ Active'}
                                        {job.status === 'pending' && '⏳ Pending'}
                                        {job.status === 'closed' && 'Closed'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Type</p>
                                        <p className="text-gray-900 capitalize">
                                            {(job.employmentType || (job as any).type || 'full-time').replace('_', ' ')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Salary</p>
                                        <p className="text-gray-900">
                                            {formatSalaryRange(job.salaryMin, job.salaryMax)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Applications</p>
                                        <p className="text-gray-900 font-semibold">
                                            {job.applicantCount || 0}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Views</p>
                                        <p className="text-gray-900 font-semibold">{job.viewCount || 0}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Link
                                        href={`/employer/applications?jobId=${job.id}`}
                                        className="px-4 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-medium"
                                    >
                                        View Applications
                                    </Link>
                                    <Link
                                        href={`/job/${job.id}`}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        View Job
                                    </Link>
                                    {job.status === 'active' && (
                                        <button
                                            onClick={() => handleCloseJob(job.id)}
                                            className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                                        >
                                            Close Job
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}