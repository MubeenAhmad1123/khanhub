'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FileText, CheckCircle, XCircle, Clock, Eye, Loader2, Building2 } from 'lucide-react';
import { getJobsByStatus, updateJob } from '@/lib/firebase/firestore';
import { sendJobApprovalEmail } from '@/lib/services/emailService';
import { Job } from '@/types/job';

export default function AdminJobApprovalsPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [error, setError] = useState('');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            setAuthenticated(true);
            setError('');
            loadJobs();
        } else {
            setError('Invalid password');
        }
    };

    const loadJobs = async () => {
        try {
            const pendingJobs = await getJobsByStatus('pending');
            setJobs(pendingJobs);
            setLoading(false);
        } catch (err) {
            console.error('Error loading jobs:', err);
            setLoading(false);
        }
    };

    const handleApprove = async (job: Job) => {
        try {
            await updateJob(job.id, {
                status: 'approved',
                updatedAt: new Date(),
            });

            // Send approval email
            if (job.contactEmail) {
                await sendJobApprovalEmail(
                    job.contactEmail,
                    job.companyName,
                    job.title,
                    true
                );
            }

            // Refresh list
            loadJobs();
        } catch (err) {
            console.error('Error approving job:', err);
            alert('Failed to approve job');
        }
    };

    const handleReject = async (job: Job) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            await updateJob(job.id, {
                status: 'rejected',
                rejectionReason: reason,
                updatedAt: new Date(),
            });

            // Send rejection email with reason
            if (job.contactEmail) {
                await sendJobApprovalEmail(
                    job.contactEmail,
                    job.companyName,
                    job.title,
                    false,
                    reason
                );
            }

            // Refresh list
            loadJobs();
        } catch (err) {
            console.error('Error rejecting job:', err);
            alert('Failed to reject job');
        }
    };

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-jobs-neutral px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl">
                    <h2 className="text-2xl font-black text-jobs-dark mb-6 text-center">Admin Access</h2>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                placeholder="Enter admin password"
                                required
                            />
                        </div>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-jobs-primary text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-jobs-neutral p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-jobs-dark mb-2">Job Approvals</h1>
                        <p className="text-jobs-dark/60">Review and approve pending job postings</p>
                    </div>
                    <Link
                        href="/admin"
                        className="bg-gray-200 text-jobs-dark px-6 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
                    >
                        Back to Dashboard
                    </Link>
                </div>

                {/* Jobs List */}
                {jobs.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-16 text-center">
                        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-jobs-dark mb-2">All Caught Up!</h3>
                        <p className="text-jobs-dark/60">No pending job approvals</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {jobs.map((job) => (
                            <div key={job.id} className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                                <div className="flex items-start gap-6 mb-6">
                                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        {job.companyLogo ? (
                                            <Image
                                                src={job.companyLogo}
                                                alt={job.companyName}
                                                width={64}
                                                height={64}
                                                className="w-full h-full rounded-xl"
                                            />
                                        ) : (
                                            <Building2 className="h-8 w-8 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-black text-jobs-dark mb-2">{job.title}</h3>
                                        <p className="text-lg font-bold text-jobs-dark/70 mb-3">{job.companyName}</p>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                                {job.employmentType.toUpperCase()}
                                            </span>
                                            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                                                {job.category}
                                            </span>
                                            <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full">
                                                {job.city}, {job.location}
                                            </span>
                                        </div>

                                        <p className="text-jobs-dark/80 mb-4 leading-relaxed line-clamp-3">{job.description}</p>

                                        {/* Job Details Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl">
                                            <div>
                                                <div className="text-xs font-bold text-gray-500 mb-1">Experience Level</div>
                                                <div className="text-sm font-bold text-jobs-dark">{job.experienceLevel}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-500 mb-1">Min Experience</div>
                                                <div className="text-sm font-bold text-jobs-dark">{job.minExperience} years</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-500 mb-1">Salary Range</div>
                                                <div className="text-sm font-bold text-jobs-dark">
                                                    Rs. {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-500 mb-1">Deadline</div>
                                                <div className="text-sm font-bold text-jobs-dark">
                                                    {job.applicationDeadline instanceof Date
                                                        ? job.applicationDeadline.toLocaleDateString()
                                                        : (job.applicationDeadline as any)?.toDate?.().toLocaleDateString() || 'N/A'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Required Skills */}
                                        {job.requiredSkills.length > 0 && (
                                            <div className="mt-4">
                                                <div className="text-xs font-bold text-gray-500 mb-2">Required Skills</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {job.requiredSkills.map((skill, index) => (
                                                        <span key={index} className="px-3 py-1 bg-jobs-primary/10 text-jobs-primary text-xs font-bold rounded-full">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Contact Info */}
                                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                                            <div className="text-xs font-bold text-yellow-700 mb-2">Company Contact</div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-yellow-900">
                                                <div>Email: {job.contactEmail || 'N/A'}</div>
                                                <div>Phone: {job.contactPhone || 'N/A'}</div>
                                                <div>Location: {job.location}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 pt-6 border-t">
                                    <Link
                                        href={`/job/${job.id}`}
                                        target="_blank"
                                        className="flex items-center gap-2 px-6 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition"
                                    >
                                        <Eye className="h-5 w-5" />
                                        Preview
                                    </Link>
                                    <button
                                        onClick={() => handleApprove(job)}
                                        className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition"
                                    >
                                        <CheckCircle className="h-5 w-5" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(job)}
                                        className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition"
                                    >
                                        <XCircle className="h-5 w-5" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
