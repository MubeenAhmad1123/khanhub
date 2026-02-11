'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Briefcase, MapPin, Building2, FileText, Video, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getJobById, createApplication } from '@/lib/firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { calculateMatchScore } from '@/lib/services/matchingAlgorithm';
import { awardPointsForJobApplication } from '@/lib/services/pointsSystem';
import { Job } from '@/types/job';
import MatchScoreBadge from '@/components/jobs/MatchScoreBadge';

export default function ApplyJobPage() {
    const router = useRouter();
    const params = useParams();
    const jobId = params.id as string;
    const { user, refreshProfile } = useAuth();

    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [matchScore, setMatchScore] = useState<number | null>(null);

    const [coverLetter, setCoverLetter] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // First refresh profile to get latest CV data
                if (refreshProfile) {
                    await refreshProfile();
                }

                const jobData = await getJobById(jobId) as Job | null;
                if (jobData) {
                    setJob(jobData);
                }
                setLoading(false);
            } catch (err) {
                console.error('Error loading page data:', err);
                setError('Failed to load job details');
                setLoading(false);
            }
        };

        if (jobId) {
            loadInitialData();
        }
    }, [jobId, refreshProfile]);

    const canApply = () => {
        if (!user) return { can: false, reason: 'Profile not loaded' };
        if (!user.paymentStatus || user.paymentStatus !== 'approved') return { can: false, reason: 'Registration payment pending approval' };
        if (!user.profile?.cvUrl) return { can: false, reason: 'Please upload your CV first' };
        if (!user.isPremium && user.applicationsUsed >= 10) {
            return { can: false, reason: 'Free application limit reached. Upgrade to premium for unlimited applications.' };
        }
        return { can: true };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !job) {
            setError('Please wait for the page to finish loading.');
            return;
        }

        const check = canApply();
        if (!check.can) {
            setError(check.reason || 'Cannot apply');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            // Robust validation of required fields
            const applicationData = {
                jobId: job.id,
                jobTitle: job.title || 'Untitled Job',
                employerId: job.employerId || '',
                companyName: job.companyName || 'Unknown Company',
                // Include both IDs for compatibility across different dashboards/queries
                jobSeekerId: user.uid,
                candidateId: user.uid,
                applicantName: user.displayName || 'Applicant',
                candidateName: user.displayName || 'Applicant',
                applicantEmail: user.email,
                applicantPhone: user.profile?.phone || '',
                applicantCvUrl: user.profile?.cvUrl || '',
                applicantVideoUrl: user.profile?.videoUrl || null,
                coverLetter: coverLetter.trim(),
                matchScore: matchScore || 0,
                status: 'applied',
                appliedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                salary: job.salaryMax || 0,
            };

            // Double check for any undefined required fields that might crash Firestore
            if (!applicationData.employerId) {
                console.warn('Warning: Job has no employerId. Falling back to job creator ID if available.');
                // @ts-ignore - job might have creatorId in some old records
                applicationData.employerId = (job as any).creatorId || '';
            }

            // Create application record
            await createApplication(applicationData);

            // Increment applicationsUsed count
            try {
                const { updateDocument, incrementField } = await import('@/lib/firebase/firestore');
                const COLLECTIONS = { USERS: 'users' }; // Inline if needed or import
                await incrementField('users', user.uid, 'applicationsUsed', 1);
            } catch (upErr) {
                console.warn('Non-critical: Failed to increment application count:', upErr);
            }

            // Post-submission actions (non-critical, wrapped in try-catch to avoid blocking success)
            try {
                // Award points
                await awardPointsForJobApplication(user.uid);
            } catch (pErr) {
                console.warn('Non-critical: Failed to award points:', pErr);
            }

            try {
                // Send confirmation email
                const { sendApplicationConfirmationEmail } = await import('@/lib/services/emailService');
                await sendApplicationConfirmationEmail(
                    user.email,
                    user.displayName || 'Applicant',
                    job.title,
                    job.companyName
                );
            } catch (err) {
                console.warn('Non-critical: Failed to send application confirmation email:', err);
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard/applications');
            }, 2000);
        } catch (err: any) {
            console.error('CRITICAL: Error submitting application:', err);
            // Log full error details to help debugging
            if (err.code) console.error('Firebase Error Code:', err.code);
            if (err.message) console.error('Firebase Error Message:', err.message);

            setError(`Failed to submit application: ${err.message || 'Please try again.'}`);
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-jobs-dark mb-2">Job Not Found</h2>
                    <p className="text-jobs-dark/60 mb-4">The job you're looking for doesn't exist or has been removed.</p>
                    <button
                        onClick={() => router.push('/search')}
                        className="bg-jobs-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90"
                    >
                        Browse Jobs
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-jobs-neutral">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl text-center">
                    <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-black text-jobs-dark mb-4">Application Submitted!</h2>
                    <p className="text-jobs-dark/70 mb-6">
                        Your application for <strong>{job.title}</strong> has been sent to {job.companyName}.
                    </p>
                    <p className="text-sm text-jobs-dark/60 mb-6">
                        Redirecting to your applications...
                    </p>
                </div>
            </div>
        );
    }

    const applicationCheck = canApply();

    return (
        <div className="min-h-screen bg-jobs-neutral py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Job Header */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 mb-6">
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
                            <h1 className="text-3xl font-black text-jobs-dark mb-2">{job.title}</h1>
                            <p className="text-lg font-bold text-jobs-dark/70">{job.companyName}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-jobs-dark/60">
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{job.city}, {job.location}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Briefcase className="h-4 w-4" />
                                    <span>{(job.employmentType || (job as any).type || 'full-time').replace('-', ' ').toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                        {matchScore !== null && (
                            <MatchScoreBadge score={matchScore} />
                        )}
                    </div>

                    <p className="text-jobs-dark/80 leading-relaxed text-sm line-clamp-3">{job.description}</p>
                </div>

                {/* Application Form */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                    <h2 className="text-2xl font-black text-jobs-dark mb-6">Submit Your Application</h2>

                    {!applicationCheck.can && (
                        <div className="bg-red-50 border border-red-100 p-6 rounded-xl mb-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-red-900 mb-1">Can't Apply</div>
                                    <div className="text-sm text-red-700">{applicationCheck.reason}</div>
                                    {applicationCheck.reason?.includes('premium') && (
                                        <Link
                                            href="/dashboard/premium"
                                            className="inline-block mt-3 bg-jobs-accent text-white px-6 py-2 rounded-xl font-bold text-sm hover:opacity-90"
                                        >
                                            Upgrade to Premium
                                        </Link>
                                    )}
                                    {applicationCheck.reason?.includes('CV') && (
                                        <Link
                                            href="/dashboard/profile/cv"
                                            className="inline-block mt-3 bg-jobs-primary text-white px-6 py-2 rounded-xl font-bold text-sm hover:opacity-90"
                                        >
                                            Upload CV
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Profile Summary */}
                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl mb-6">
                        <h3 className="font-bold text-blue-900 mb-3">Your Profile Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-blue-700 mb-1">CV Status</div>
                                <div className="font-bold text-blue-900 flex items-center gap-2">
                                    {user?.profile?.cvUrl ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            Uploaded
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                            Not uploaded
                                        </>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-blue-700 mb-1">Video Introduction</div>
                                <div className="font-bold text-blue-900 flex items-center gap-2">
                                    {user?.profile?.videoUrl ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            Uploaded
                                        </>
                                    ) : (
                                        <>
                                            <Video className="h-4 w-4 text-gray-400" />
                                            Optional
                                        </>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-blue-700 mb-1">Applications Used</div>
                                <div className="font-bold text-blue-900">
                                    {user?.applicationsUsed || 0} / {user?.isPremium ? '∞' : '10'}
                                </div>
                            </div>
                            <div>
                                <div className="text-blue-700 mb-1">Match Score</div>
                                <div className="font-bold text-blue-900">
                                    {matchScore !== null ? `${matchScore}%` : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Cover Letter (Optional)
                            </label>
                            <textarea
                                rows={8}
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary resize-none sm:text-sm"
                                placeholder="Explain why you're a great fit for this role..."
                            />
                            <p className="text-xs text-jobs-dark/50 mt-1">
                                Tip: Mention specific skills from the job requirements
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 bg-gray-200 text-jobs-dark py-4 rounded-xl font-bold hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !applicationCheck.can}
                                className="flex-1 bg-jobs-accent text-white py-4 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-jobs-accent/20"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-5 w-5" />
                                        Submit Application
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
