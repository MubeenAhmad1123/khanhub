'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Eye, Download, CheckCircle, XCircle, Clock, Star, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getApplicationsByEmployer, updateApplication, createPlacement } from '@/lib/firebase/firestore';
import { Application } from '@/types/application';
import MatchScoreBadge from '@/components/jobs/MatchScoreBadge';

export default function EmployerApplicationsPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading, isEmployer } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'applied' | 'shortlisted' | 'rejected'>('all');

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/auth/login');
            } else if (!isEmployer) {
                router.push('/dashboard');
            }
        }
    }, [authLoading, user, isEmployer, router]);

    useEffect(() => {
        const loadApplications = async () => {
            if (!user) return;

            try {
                const apps = await getApplicationsByEmployer(user.uid) as Application[];
                setApplications(apps);
                setLoading(false);
            } catch (err) {
                console.error('Error loading applications:', err);
                setLoading(false);
            }
        };

        if (user) {
            loadApplications();
        }
    }, [user]);

    const handleStatusChange = async (applicationId: string, newStatus: Application['status']) => {
        try {
            await updateApplication(applicationId, {
                status: newStatus,
                updatedAt: new Date(),
            });

            // If hired, create a placement record
            if (newStatus === 'hired') {
                const app = applications.find(a => a.id === applicationId);
                if (app) {
                    // Extract salary - this is a simplified version
                    // In a real app, you'd have the actual agreed salary
                    // @ts-ignore - salary might be in metadata or specific field
                    const salary = app.salary || 50000; // Fallback

                    await createPlacement({
                        jobId: app.jobId,
                        jobTitle: app.jobTitle,
                        employerId: app.employerId,
                        employerName: (profile as any)?.companyName || (profile as any)?.name || 'Employer',
                        jobSeekerId: app.jobSeekerId,
                        jobSeekerName: app.applicantName,
                        firstMonthSalary: salary,
                        commissionAmount: salary * 0.5,
                        commissionStatus: 'pending',
                        hiredAt: new Date(),
                        commissionDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                        commissionPaidAt: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
            }

            // Update local state
            setApplications(apps =>
                apps.map(app =>
                    app.id === applicationId ? { ...app, status: newStatus } : app
                )
            );
        } catch (err) {
            console.error('Error updating application:', err);
            alert('Failed to update application status');
        }
    };

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
    };

    return (
        <div className="min-h-screen bg-jobs-neutral py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-jobs-dark mb-2">Applications</h1>
                    <p className="text-jobs-dark/60">Review and manage candidate applications</p>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 mb-6 flex gap-2">
                    {(['all', 'applied', 'shortlisted', 'rejected'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition ${filter === status
                                ? 'bg-jobs-primary text-white shadow-md'
                                : 'text-jobs-dark/60 hover:bg-gray-50'
                                }`}
                        >
                            {status === 'applied' ? 'Pending Review' : status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
                        </button>
                    ))}
                </div>

                {/* Applications List */}
                {filteredApplications.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-16 text-center">
                        <Users className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-jobs-dark mb-2">No Applications Yet</h3>
                        <p className="text-jobs-dark/60 mb-6">
                            {filter === 'all'
                                ? "You haven't received any applications yet"
                                : `No ${filter} applications`}
                        </p>
                        {filter === 'all' && (
                            <Link
                                href="/employer/post-job"
                                className="inline-block bg-jobs-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition"
                            >
                                Post a Job
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
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-black text-jobs-dark">
                                                {application.applicantName}
                                            </h3>
                                            <MatchScoreBadge score={application.matchScore} />
                                        </div>
                                        <p className="text-sm font-bold text-jobs-dark/70 mb-3">
                                            Applied for: {application.jobTitle}
                                        </p>
                                        <div className="flex flex-wrap gap-4 text-sm text-jobs-dark/60">
                                            <div className="flex items-center gap-1">
                                                <Mail className="h-4 w-4" />
                                                <span>{application.applicantEmail}</span>
                                            </div>
                                            {application.applicantPhone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="h-4 w-4" />
                                                    <span>{application.applicantPhone}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                <span>{application.appliedAt ? new Date((application.appliedAt as any).toDate ? (application.appliedAt as any).toDate() : application.appliedAt).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div>
                                        {application.status === 'applied' && (
                                            <span className="px-4 py-2 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                                                Pending Review
                                            </span>
                                        )}
                                        {application.status === 'shortlisted' && (
                                            <span className="px-4 py-2 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                                                Shortlisted
                                            </span>
                                        )}
                                        {application.status === 'rejected' && (
                                            <span className="px-4 py-2 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                                                Rejected
                                            </span>
                                        )}
                                        {application.status === 'hired' && (
                                            <span className="px-4 py-2 bg-purple-100 text-purple-800 text-xs font-bold rounded-full flex items-center gap-1">
                                                <Star className="h-3 w-3" />
                                                Hired
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Cover Letter */}
                                {application.coverLetter && (
                                    <div className="bg-gray-50 p-4 rounded-xl mb-4">
                                        <div className="text-xs font-bold text-gray-500 mb-2">Cover Letter</div>
                                        <p className="text-sm text-jobs-dark/80 leading-relaxed line-clamp-3">
                                            {application.coverLetter}
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-4">
                                    <a
                                        href={application.applicantCvUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-200 transition"
                                    >
                                        <Download className="h-4 w-4" />
                                        View CV
                                    </a>

                                    {application.applicantVideoUrl && (
                                        <a
                                            href={application.applicantVideoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-200 transition"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Watch Video
                                        </a>
                                    )}

                                    {application.status === 'applied' && (
                                        <>
                                            <button
                                                onClick={() => handleStatusChange(application.id!, 'shortlisted')}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold text-sm hover:bg-green-200 transition"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                Shortlist
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(application.id!, 'rejected')}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Reject
                                            </button>
                                        </>
                                    )}

                                    {application.status === 'shortlisted' && (
                                        <button
                                            onClick={() => handleStatusChange(application.id!, 'hired')}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-200 transition"
                                        >
                                            <Star className="h-4 w-4" />
                                            Mark as Hired
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
