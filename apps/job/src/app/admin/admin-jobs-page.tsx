'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Job } from '@/types/job';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, CheckCircle, XCircle, Plus, Eye, Edit2, Trash2 } from 'lucide-react';

export default function AdminJobsPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'closed'>('pending');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.role === 'admin') {
            loadJobs();
        }
    }, [user, filter]);

    const loadJobs = async () => {
        try {
            setLoadingJobs(true);
            const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            let jobsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Job[];

            // Filter jobs based on selected filter
            if (filter !== 'all') {
                jobsList = jobsList.filter(job => job.status === filter);
            }

            setJobs(jobsList);
        } catch (error) {
            console.error('Error loading jobs:', error);
            alert('Failed to load jobs');
        } finally {
            setLoadingJobs(false);
        }
    };

    const handleApprove = async (jobId: string) => {
        if (!confirm('Approve this job posting?')) return;

        setProcessing(true);
        try {
            await updateDoc(doc(db, 'jobs', jobId), {
                status: 'active',
            });

            alert('Job approved successfully!');
            loadJobs();
        } catch (error) {
            console.error('Error approving job:', error);
            alert('Failed to approve job');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (jobId: string) => {
        const reason = prompt('Rejection reason:');
        if (!reason) return;

        setProcessing(true);
        try {
            await updateDoc(doc(db, 'jobs', jobId), {
                status: 'closed',
                rejectionReason: reason,
            });

            alert('Job rejected successfully!');
            loadJobs();
        } catch (error) {
            console.error('Error rejecting job:', error);
            alert('Failed to reject job');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (jobId: string) => {
        if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return;

        setProcessing(true);
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'jobs', jobId));

            alert('Job deleted successfully!');
            loadJobs();
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        } finally {
            setProcessing(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            </div>
        );
    }

    const stats = {
        total: jobs.length,
        pending: jobs.filter(j => j.status === 'pending').length,
        active: jobs.filter(j => j.status === 'active').length,
        closed: jobs.filter(j => j.status === 'closed').length,
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 mb-2">Job Management</h1>
                        <p className="text-gray-600">Review, approve, and manage job postings</p>
                    </div>
                    <Link
                        href="/admin/post-job"
                        className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 shadow-lg"
                    >
                        <Plus className="h-5 w-5" />
                        Post New Job
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <p className="text-gray-600 text-sm font-medium mb-1">Total Jobs</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <p className="text-gray-600 text-sm font-medium mb-1">Pending Review</p>
                        <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <p className="text-gray-600 text-sm font-medium mb-1">Active Jobs</p>
                        <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <p className="text-gray-600 text-sm font-medium mb-1">Closed</p>
                        <p className="text-3xl font-bold text-red-600">{stats.closed}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                    <div className="flex gap-4">
                        {(['all', 'pending', 'active', 'closed'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${filter === f
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Jobs List */}
                {loadingJobs ? (
                    <div className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
                    </div>
                ) : jobs.length > 0 ? (
                    <div className="space-y-4">
                        {jobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                onDelete={handleDelete}
                                processing={processing}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <p className="text-gray-500">No jobs found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function JobCard({ job, onApprove, onReject, onDelete, processing }: any) {
    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        active: 'bg-green-100 text-green-800',
        closed: 'bg-red-100 text-red-800',
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
                            {job.status}
                        </span>
                    </div>
                    <p className="text-gray-600 mb-2">{job.company}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>📍 {job.location}</span>
                        <span>💰 Rs. {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()}</span>
                        <span>⏰ {job.type}</span>
                        <span>📂 {job.category}</span>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-gray-700 line-clamp-2">{job.description}</p>
            </div>

            {job.status === 'pending' ? (
                <div className="flex gap-3">
                    <Link
                        href={`/job/${job.id}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                    >
                        <Eye className="h-4 w-4" />
                        View Details
                    </Link>
                    <button
                        onClick={() => onReject(job.id)}
                        disabled={processing}
                        className="px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                    >
                        <XCircle className="h-4 w-4" />
                        Reject
                    </button>
                    <button
                        onClick={() => onApprove(job.id)}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium flex items-center gap-2"
                    >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                    </button>
                </div>
            ) : (
                <div className="flex gap-3">
                    <Link
                        href={`/job/${job.id}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                    >
                        <Eye className="h-4 w-4" />
                        View
                    </Link>
                    <button
                        onClick={() => onDelete(job.id)}
                        disabled={processing}
                        className="px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}