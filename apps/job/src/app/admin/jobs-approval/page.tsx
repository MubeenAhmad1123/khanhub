'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    collection, getDocs, doc, updateDoc, serverTimestamp, query, where, orderBy, deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { Loader2, CheckCircle, XCircle, Clock, Eye, AlertCircle, Briefcase, MapPin, DollarSign, Phone } from 'lucide-react';
import Image from 'next/image';

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    phone: string;
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
    postedAt: string;
    rejectionReason?: string;
    reviewedBy?: string;
    reviewedAt?: any;
}

export default function AdminJobsApprovalPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('pending');
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        let unsubscribe: () => void;

        const setupListener = async () => {
            try {
                setLoadingJobs(true);
                const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase/firebase-config');

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

                unsubscribe = onSnapshot(q, (snapshot) => {
                    const jobsList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...(doc.data() as any),
                    })) as Job[];
                    setJobs(jobsList);
                    setLoadingJobs(false);
                }, (error) => {
                    console.error('Jobs listener error:', error);
                    setLoadingJobs(false);
                });

            } catch (error) {
                console.error('Error loading jobs:', error);
                setLoadingJobs(false);
            }
        };

        setupListener();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, filter]);

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
        } catch (error) {
            console.error('Error approving job:', error);
            alert('Failed to approve job');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedJob) return;
        if (!rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        setProcessing(true);
        try {
            await updateDoc(doc(db, 'jobs', selectedJob.id), {
                status: 'rejected',
                rejectionReason: rejectionReason,
                reviewedBy: user?.uid,
                reviewedAt: serverTimestamp(),
            });

            alert('❌ Job rejected. Employer will be notified.');
            setShowRejectModal(false);
            setSelectedJob(null);
            setRejectionReason('');
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
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        } finally {
            setProcessing(false);
        }
    };

    const openRejectModal = (job: Job) => {
        setSelectedJob(job);
        setShowRejectModal(true);
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
                    <h1 className="text-4xl font-black text-gray-900 mb-2">Job Approval</h1>
                    <p className="text-gray-600">Review and approve job postings</p>
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
                        title="Pending Review"
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
                            <JobCard
                                key={job.id}
                                job={job}
                                onApprove={handleApprove}
                                onReject={openRejectModal}
                                onDelete={handleDelete}
                                processing={processing}
                            />
                        ))}
                    </div>
                )}

                {/* Rejection Modal */}
                {showRejectModal && selectedJob && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Job</h2>
                            <p className="text-gray-600 mb-4">
                                Rejecting: <strong>{selectedJob.title}</strong> from <strong>{selectedJob.company}</strong>
                            </p>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter reason for rejection (required)"
                                rows={4}
                                className="w-full border-2 border-gray-300 rounded-lg p-3 mb-4 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none resize-none"
                            />
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setSelectedJob(null);
                                        setRejectionReason('');
                                    }}
                                    disabled={processing}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={processing || !rejectionReason.trim()}
                                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Rejecting...
                                        </>
                                    ) : (
                                        'Reject Job'
                                    )}
                                </button>
                            </div>
                        </div>
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

function JobCard({ job, onApprove, onReject, onDelete, processing }: any) {
    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        active: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
    };

    const statusIcons = {
        pending: <Clock className="h-5 w-5" />,
        active: <CheckCircle className="h-5 w-5" />,
        rejected: <XCircle className="h-5 w-5" />,
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
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
                        <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${statusColors[job.status]}`}>
                            {statusIcons[job.status]}
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
                                <p className="font-semibold">{job.salary}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <div>
                                <span className="text-gray-500 block text-xs">Contact</span>
                                <p className="font-semibold">{job.phone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            <div>
                                <span className="text-gray-500 block text-xs">Type</span>
                                <p className="font-semibold capitalize">{job.type}</p>
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
                            onClick={() => onReject(job)}
                            disabled={processing}
                            className="flex-1 px-6 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                        >
                            <XCircle className="h-5 w-5" />
                            Reject
                        </button>
                        <button
                            onClick={() => onApprove(job)}
                            disabled={processing}
                            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-5 w-5" />
                                    Approve & Publish
                                </>
                            )}
                        </button>
                    </>
                )}

                {(job.status === 'active' || job.status === 'rejected') && (
                    <button
                        onClick={() => onDelete(job)}
                        disabled={processing}
                        className="px-6 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium"
                    >
                        Delete Job
                    </button>
                )}
            </div>
        </div>
    );
}