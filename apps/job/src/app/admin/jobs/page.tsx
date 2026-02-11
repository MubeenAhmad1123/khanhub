'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { Loader2, CheckCircle, XCircle, Clock, Briefcase, MapPin, DollarSign, Phone, Trash2, Eye } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string | { min: number; max: number }; // Handle both formats!
    phone?: string;
    description: string;
    companyLogo?: string;
    employerId: string;
    employerEmail: string;
    status: 'pending' | 'active' | 'rejected';
    type: string;
    category: string;
    views: number;
    applicationsCount: number;
    createdAt: any;
    postedAt?: string;
    rejectionReason?: string;
    reviewedBy?: string;
    reviewedAt?: any;
}

export default function AdminJobsPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    const loadJobs = useCallback(async () => {
        try {
            setLoadingJobs(true);

            let q;
            if (filter === 'all') {
                q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
            } else {
                q = query(
                    collection(db, 'jobs'),
                    where('status', '==', filter),
                    orderBy('createdAt', 'desc')
                );
            }

            const snapshot = await getDocs(q);
            const jobsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as any),
            })) as Job[];

            setJobs(jobsList);
        } catch (error: any) {
            console.error('Error loading jobs:', error);
            if (error.code === 'failed-precondition' || error.message?.includes('index')) {
                alert('Firestore index required. Creating index... Please click the link in console.');
                console.error('Index URL:', error.message);
            } else {
                alert('Failed to load jobs');
            }
        } finally {
            setLoadingJobs(false);
        }
    }, [filter]);

    useEffect(() => {
        if (user?.role === 'admin') {
            loadJobs();
        }
    }, [user, loadJobs]);

    const handleApprove = async (job: Job) => {
        if (!confirm(`Approve job "${job.title}" from ${job.company}?`)) return;

        setProcessing(true);
        try {
            await updateDoc(doc(db, 'jobs', job.id), {
                status: 'active',
                reviewedBy: user?.uid,
                reviewedAt: serverTimestamp(),
            });

            alert('✅ Job approved and is now live!');
            loadJobs();
        } catch (error) {
            console.error('Error approving job:', error);
            alert('Failed to approve job');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (job: Job) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        setProcessing(true);
        try {
            await updateDoc(doc(db, 'jobs', job.id), {
                status: 'rejected',
                rejectionReason: reason,
                reviewedBy: user?.uid,
                reviewedAt: serverTimestamp(),
            });

            alert('❌ Job rejected.');
            loadJobs();
        } catch (error) {
            console.error('Error rejecting job:', error);
            alert('Failed to reject job');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (job: Job) => {
        if (!confirm(`Delete job "${job.title}"? This cannot be undone!`)) return;

        setProcessing(true);
        try {
            await deleteDoc(doc(db, 'jobs', job.id));
            alert('🗑️ Job deleted successfully');
            loadJobs();
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        } finally {
            setProcessing(false);
        }
    };

    // Helper function to format salary (handles both old and new formats)
    const formatSalary = (salary: string | { min: number; max: number }): string => {
        if (typeof salary === 'string') {
            // New format: already a string
            return salary;
        } else if (salary && typeof salary === 'object') {
            // Old format: object with min/max
            if (salary.min === 0 && salary.max === 0) {
                return 'Negotiable';
            }
            return `Rs. ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}`;
        }
        return 'Not specified';
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
        rejected: jobs.filter(j => j.status === 'rejected').length,
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-gray-900 mb-2">Job Management</h1>
                    <p className="text-gray-600">Review, approve, and manage all job postings</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Jobs"
                        value={stats.total}
                        icon={<Briefcase className="h-6 w-6" />}
                        color="blue"
                    />
                    <StatCard
                        title="Pending"
                        value={stats.pending}
                        icon={<Clock className="h-6 w-6" />}
                        color="yellow"
                    />
                    <StatCard
                        title="Active"
                        value={stats.active}
                        icon={<CheckCircle className="h-6 w-6" />}
                        color="green"
                    />
                    <StatCard
                        title="Rejected"
                        value={stats.rejected}
                        icon={<XCircle className="h-6 w-6" />}
                        color="red"
                    />
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex flex-wrap gap-4">
                        <FilterButton
                            label="All"
                            count={stats.total}
                            active={filter === 'all'}
                            onClick={() => setFilter('all')}
                        />
                        <FilterButton
                            label="Pending"
                            count={stats.pending}
                            active={filter === 'pending'}
                            onClick={() => setFilter('pending')}
                            color="yellow"
                        />
                        <FilterButton
                            label="Active"
                            count={stats.active}
                            active={filter === 'active'}
                            onClick={() => setFilter('active')}
                            color="green"
                        />
                        <FilterButton
                            label="Rejected"
                            count={stats.rejected}
                            active={filter === 'rejected'}
                            onClick={() => setFilter('rejected')}
                            color="red"
                        />
                    </div>
                </div>

                {/* Jobs List */}
                {loadingJobs ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No jobs found</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {jobs.map(job => (
                            <div key={job.id} className="bg-white rounded-xl shadow-md p-6">
                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Company Logo */}
                                    {job.companyLogo && (
                                        <div className="lg:w-24 lg:h-24 w-full h-32">
                                            <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-gray-200">
                                                <Image
                                                    src={job.companyLogo}
                                                    alt={job.company}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Job Info */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                                                <p className="text-lg text-gray-700 font-semibold">{job.company}</p>
                                                <p className="text-sm text-gray-600">{job.employerEmail}</p>
                                            </div>
                                            <span className={`px-4 py-2 rounded-full text-sm font-medium ${job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                job.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <span className="text-gray-500 block text-xs">Location</span>
                                                    <p className="font-semibold">{job.location}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <span className="text-gray-500 block text-xs">Salary</span>
                                                    <p className="font-semibold">{formatSalary(job.salary)}</p>
                                                </div>
                                            </div>
                                            {job.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <span className="text-gray-500 block text-xs">Contact</span>
                                                        <p className="font-semibold">{job.phone}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Eye className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <span className="text-gray-500 block text-xs">Applications</span>
                                                    <p className="font-semibold">{job.applicationsCount || 0}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {job.description && job.description !== 'No description provided' && (
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <span className="text-xs text-gray-500 font-semibold">Description:</span>
                                                <p className="text-sm mt-1">{job.description}</p>
                                            </div>
                                        )}

                                        {job.rejectionReason && (
                                            <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-500">
                                                <span className="text-xs text-red-600 font-semibold">Rejection Reason:</span>
                                                <p className="text-sm text-red-800">{job.rejectionReason}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
                                    {job.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleReject(job)}
                                                disabled={processing}
                                                className="flex-1 px-6 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                                            >
                                                <XCircle className="h-5 w-5" />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleApprove(job)}
                                                disabled={processing}
                                                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle className="h-5 w-5" />
                                                Approve
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={() => handleDelete(job)}
                                        disabled={processing}
                                        className="px-6 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium flex items-center gap-2"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                        Delete
                                    </button>

                                    <Link
                                        href={`/job/${job.id}`}
                                        target="_blank"
                                        className="px-6 py-3 border-2 border-teal-300 text-teal-600 rounded-lg hover:bg-teal-50 font-medium flex items-center gap-2"
                                    >
                                        <Eye className="h-5 w-5" />
                                        View
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: any) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        green: 'bg-green-50 text-green-600',
        red: 'bg-red-50 text-red-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className={`inline-flex p-3 rounded-lg mb-4 ${colorClasses[color]}`}>
                {icon}
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

function FilterButton({ label, count, active, onClick, color = 'teal' }: any) {
    const activeColors = {
        teal: 'bg-teal-600 text-white',
        yellow: 'bg-yellow-500 text-white',
        green: 'bg-green-600 text-white',
        red: 'bg-red-600 text-white',
    };

    return (
        <button
            onClick={onClick}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${active
                ? activeColors[color]
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
        >
            {label} ({count})
        </button>
    );
}