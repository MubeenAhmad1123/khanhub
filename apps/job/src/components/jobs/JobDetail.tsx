'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    MapPin, Briefcase, Clock, DollarSign, Building2, Users, Calendar,
    Bookmark, BookmarkCheck, Share2, Flag, ArrowLeft, CheckCircle2,
    XCircle, Loader2, Mail, Phone, Globe, Linkedin, Facebook, Twitter
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Job, SavedJob } from '@/types/job';
import { Application } from '@/types/application';
import { getDocument, updateDocument, incrementField, createDocument, queryDocuments, where } from '@/lib/firebase/firestore';
import { formatSalary, formatPostedDate, formatDeadline, getJobTypeBadge, getCategoryLabel } from '@/lib/utils';
import BlurredContent from '@/components/premium/BlurredContent';
import PremiumBadge from '@/components/premium/PremiumBadge';

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user: profile, firebaseUser: user, isPremium, hasPaymentApproved } = useAuth();

<<<<<<< HEAD
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [applying, setApplying] = useState(false);

    const jobId = params.id as string;

    useEffect(() => {
        if (jobId) {
            loadJob();
            if (user) {
                checkSavedStatus();
                checkApplicationStatus();
            }
        }
    }, [jobId, user]);

    const loadJob = async () => {
        try {
            setLoading(true);
            const jobData = await getDocument<Job>('jobs', jobId);

            if (!jobData) {
                router.push('/search');
                return;
            }
=======
export default function JobDetail({ job, onSave, isSaved = false }: JobDetailProps) {
    const deadlineDate = job.applicationDeadline instanceof Date
        ? job.applicationDeadline
        : job.applicationDeadline?.toDate() || new Date();
    const urgency = getDeadlineUrgency(deadlineDate);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="bg-white border rounded-lg p-8 mb-6">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                    {/* Company Logo */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {job.companyLogo ? (
                            <Image
                                src={job.companyLogo}
                                alt={job.companyName}
                                width={80}
                                height={80}
                                className="rounded-lg"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <Building2 className="h-10 w-10 text-gray-400" />
                        )}
                    </div>

                    {/* Job Title and Company Info */}
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-jobs-dark mb-2 tracking-tight">{job.title}</h1>
                        <Link href={`/companies/${job.employerId}`}>
                            <p className="text-xl text-jobs-dark/60 font-bold hover:text-jobs-primary transition-colors mb-4">
                                {job.companyName}
                            </p>
                        </Link>

                        {/* ... (omitted code) */}
                        {/* Right Column - Company Information */}
                        <div className="space-y-6">
                            <div className="bg-white border rounded-lg p-6 sticky top-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">About the Company</h2>

                                {/* Company details not available in Job type currently
                        {(job.company as any).description && (
                            <div className="mb-4">
                                <p className="text-gray-700 leading-relaxed">{(job.company as any).description}</p>
                            </div>
                        )}
                        */}

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-start gap-2">
                                        <Building2 className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-gray-500">Industry</p>
                                            <p className="font-semibold text-gray-900">N/A {/* job.company.industry */}</p>
                                        </div>
                                    </div>
                                    {/* 
                            {(job.company as any).size && (
                                <div className="flex items-start gap-2">
                                    <Users className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Company Size</p>
                                        <p className="font-semibold text-gray-900">{(job.company as any).size} employees</p>
                                    </div>
                                </div>
                            )}
                            */}
                                    {job.companyWebsite && (
                                        <div className="flex items-start gap-2">
                                            <Globe className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-gray-500">Website</p>
                                                <a
                                                    href={job.companyWebsite}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-semibold text-blue-600 hover:underline"
                                                >
                                                    Visit Website
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getJobTypeBadge(job.employmentType)}`}>
                                {job.employmentType.replace('-', ' ').toUpperCase()}
                            </span>
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                {getCategoryLabel(job.category)}
                            </span>
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                {job.experienceLevel.toUpperCase()} LEVEL
                            </span>
                            {job.isFeatured && (
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    ⭐ FEATURED
                                </span>
                            )}
                        </div>

                        {/* Key Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-jobs-dark/70 font-medium">
                                <MapPin className="h-5 w-5 text-jobs-primary flex-shrink-0" />
                                <span>{job.location}</span>
                                {job.isRemote && <span className="text-jobs-accent font-bold">(Remote)</span>}
                            </div>
                            {job.salaryMin && (
                                <div className="flex items-center gap-2 text-jobs-dark/70 font-medium">
                                    <DollarSign className="h-5 w-5 text-jobs-primary flex-shrink-0" />
                                    <span className="font-black text-jobs-primary">
                                        {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryPeriod === 'monthly' ? 'month' : 'year')}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-700">
                                <Clock className="h-5 w-5 text-gray-600 flex-shrink-0" />
                                <span>Posted {formatPostedDate(job.postedAt instanceof Date ? job.postedAt : job.postedAt.toDate())}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-red-600 flex-shrink-0" />
                                <span
                                    className={`font-semibold ${urgency === 'urgent'
                                        ? 'text-red-600'
                                        : urgency === 'moderate'
                                            ? 'text-orange-600'
                                            : 'text-gray-700'
                                        }`}
                                >
                                    Deadline: {formatDeadline(deadlineDate)}
                                </span>
                            </div>
                            {/* Vacancies not available in Job type
                            <div className="flex items-center gap-2 text-gray-700">
                                <Users className="h-5 w-5 text-gray-600 flex-shrink-0" />
                                <span>{job.vacancies} {job.vacancies === 1 ? 'position' : 'positions'} available</span>
                            </div>
                            */}
                            {job.applicantCount !== undefined && (
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Briefcase className="h-5 w-5 text-gray-600 flex-shrink-0" />
                                    <span>{job.applicantCount} applicants so far</span>
                                </div>
                            )}
                        </div>
                    </div>
>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b

            setJob(jobData);

<<<<<<< HEAD
            // Increment view count
            await incrementField('jobs', jobId, 'viewCount');
        } catch (error) {
            console.error('Error loading job:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkSavedStatus = async () => {
        if (!user) return;

        try {
            const savedJobs = await queryDocuments<SavedJob>('saved_jobs', [
                where('userId', '==', user.uid),
                where('jobId', '==', jobId)
            ]);
            setIsSaved(savedJobs.length > 0);
        } catch (error) {
            console.error('Error checking saved status:', error);
        }
    };

    const checkApplicationStatus = async () => {
        if (!user) return;

        try {
            const applications = await queryDocuments<Application>('applications', [
                where('candidateId', '==', user.uid),
                where('jobId', '==', jobId)
            ]);
            setHasApplied(applications.length > 0);
        } catch (error) {
            console.error('Error checking application status:', error);
        }
    };

    const handleSaveJob = async () => {
        if (!user) {
            router.push(`/auth/login?redirect=/job/${jobId}`);
            return;
        }

        setSaving(true);
        try {
            if (isSaved) {
                // Remove from saved
                const savedJobs = await queryDocuments<SavedJob>('saved_jobs', [
                    where('userId', '==', user.uid),
                    where('jobId', '==', jobId)
                ]);
                if (savedJobs.length > 0) {
                    // Delete saved job record
                    await updateDocument('saved_jobs', savedJobs[0].id, { deleted: true });
                }
                setIsSaved(false);
            } else {
                // Add to saved
                await createDocument('saved_jobs', `${user.uid}_${jobId}`, {
                    userId: user.uid,
                    jobId: jobId,
                    jobTitle: job?.title,
                    companyName: job?.companyName,
                    location: job?.location,
                });
                setIsSaved(true);
            }
        } catch (error) {
            console.error('Error saving job:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleApply = () => {
        if (!user) {
            router.push(`/auth/login?redirect=/job/${jobId}`);
            return;
        }

        if (!hasPaymentApproved) {
            alert('Please complete payment verification before applying.');
            router.push('/auth/verify-payment');
            return;
        }

        router.push(`/job/${jobId}/apply`);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: job?.title,
                    text: `Check out this job at ${job?.companyName}`,
                    url: window.location.href
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-jobs-primary" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-black text-jobs-dark mb-4">Job not found</h2>
                    <Link href="/search" className="text-jobs-primary font-bold hover:underline">
                        Browse all jobs →
                    </Link>
                </div>
=======
                {/* Apply Button */}
                <div className="mt-8 flex gap-4">
                    <button className="flex-1 py-4 bg-jobs-accent text-white font-black rounded-xl hover:opacity-90 transition-all shadow-xl shadow-jobs-accent/20 active:scale-95">
                        Apply Now
                    </button>
                    <Link
                        href={`/companies/${job.employerId}`}
                        className="px-8 py-4 border-2 border-jobs-primary text-jobs-primary font-black rounded-xl hover:bg-jobs-primary hover:text-white transition-all active:scale-95 text-center"
                    >
                        View Company
                    </Link>
                </div>

                {/* Deadline Warning */}
                {urgency === 'urgent' && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-800 font-semibold">Application Deadline Approaching!</p>
                            <p className="text-red-700 text-sm">This job closes on {deadlineDate.toLocaleDateString()}. Apply soon!</p>
                        </div>
                    </div>
                )}
>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Link
                        href="/search"
                        className="inline-flex items-center gap-2 text-jobs-primary font-bold hover:gap-3 transition-all mb-6"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back to search
                    </Link>

                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Company Logo */}
                        <div className="flex-shrink-0">
                            {job.companyLogo ? (
                                <img
                                    src={job.companyLogo}
                                    alt={job.companyName}
                                    className="h-24 w-24 rounded-2xl object-cover border-2 border-gray-100"
                                />
                            ) : (
                                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-jobs-primary to-jobs-secondary flex items-center justify-center text-white font-black text-3xl">
                                    {job.companyName.charAt(0)}
                                </div>
                            )}
                        </div>

<<<<<<< HEAD
                        {/* Job Info */}
                        <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-black text-jobs-dark mb-2">
                                        {job.title}
                                    </h1>
                                    <p className="text-xl text-gray-600 font-bold mb-4">
                                        {job.companyName}
                                    </p>

                                    <div className="flex flex-wrap gap-3">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <MapPin className="h-4 w-4 text-jobs-primary" />
                                            <span className="font-semibold">{job.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Briefcase className="h-4 w-4 text-jobs-primary" />
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getJobTypeBadge(job.employmentType)}`}>
                                                {job.employmentType.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Clock className="h-4 w-4 text-jobs-primary" />
                                            <span className="font-semibold">{formatPostedDate(job.postedAt as Date)}</span>
                                        </div>
                                    </div>
                                </div>
=======


                    {/* Qualifications */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <Award className="h-6 w-6 text-jobs-accent" />
                            <h2 className="text-2xl font-black text-jobs-dark tracking-tight">Qualifications</h2>
                        </div>
                        <ul className="space-y-3">
                            {job.requiredQualifications.map((qualification, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-jobs-accent flex-shrink-0 mt-0.5" />
                                    <span className="text-jobs-dark/70 font-medium">{qualification}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b

                                {job.isFeatured && <PremiumBadge />}
                            </div>
<<<<<<< HEAD
=======
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {job.benefits.map((benefit, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Skills Required */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                        <h2 className="text-2xl font-black text-jobs-dark mb-6 tracking-tight">Required Skills</h2>
                        <div className="flex flex-wrap gap-3">
                            {job.requiredSkills.map((skill, index) => (
                                <span
                                    key={index}
                                    className="px-4 py-2 bg-jobs-primary/5 text-jobs-primary font-black rounded-xl text-sm border border-jobs-primary/10"
                                >
                                    {skill}
                                </span>
                            ))}
>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b
                        </div>
                    </div>
                </div>
            </div>

<<<<<<< HEAD
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Salary */}
                        <div className="bg-gradient-to-r from-jobs-primary to-jobs-secondary text-white rounded-2xl p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/80 font-semibold mb-1">Salary Range</p>
                                    <p className="text-3xl font-black">
                                        {formatSalary(job.salaryMin, job.salaryCurrency as 'month' | 'year')} - {formatSalary(job.salaryMax, job.salaryCurrency as 'month' | 'year')}
                                    </p>
                                </div>
                                <DollarSign className="h-16 w-16 text-white/20" />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-200">
                            <h2 className="text-xl font-black text-jobs-dark mb-4">Job Description</h2>
                            <div className="prose prose-gray max-w-none">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                    {job.description}
                                </p>
                            </div>
                        </div>

                        {/* Requirements */}
                        {job.requiredSkills && job.requiredSkills.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                                <h2 className="text-xl font-black text-jobs-dark mb-4">Required Skills</h2>
                                <div className="flex flex-wrap gap-2">
                                    {job.requiredSkills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-4 py-2 bg-jobs-primary/10 text-jobs-primary rounded-full text-sm font-bold"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Responsibilities */}
                        {job.responsibilities && job.responsibilities.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                                <h2 className="text-xl font-black text-jobs-dark mb-4">Responsibilities</h2>
                                <ul className="space-y-2">
                                    {job.responsibilities.map((responsibility, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-jobs-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">{responsibility}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Benefits */}
                        {job.benefits && job.benefits.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                                <h2 className="text-xl font-black text-jobs-dark mb-4">Benefits</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {job.benefits.map((benefit, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            <span className="text-gray-700 font-medium">{benefit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
=======
                {/* Right Column - Company Information */}
                {/* Right Column - Company Information */}
                <div className="space-y-6">
                    <div className="bg-white border rounded-lg p-6 sticky top-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">About the Company</h2>
                        <div className="text-gray-600">
                            <p>{job.companyName}</p>
                            {job.companyWebsite && (
                                <div className="mt-4 flex items-start gap-2">
                                    <Globe className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Website</p>
                                        <a
                                            href={job.companyWebsite}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-semibold text-blue-600 hover:underline"
                                        >
                                            Visit Website
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Apply Card */}
                        <div className="bg-white rounded-2xl p-6 border-2 border-jobs-primary sticky top-24">
                            {hasApplied ? (
                                <div className="text-center py-4">
                                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                    <p className="text-lg font-black text-jobs-dark mb-2">Already Applied</p>
                                    <p className="text-sm text-gray-600 mb-4">Check your dashboard for updates</p>
                                    <Link
                                        href="/dashboard/applications"
                                        className="block w-full py-3 bg-gray-100 text-jobs-dark text-center font-bold rounded-xl hover:bg-gray-200 transition-all"
                                    >
                                        View Application
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={handleApply}
                                        disabled={applying}
                                        className="w-full bg-jobs-accent text-white py-4 rounded-xl font-black text-lg hover:opacity-90 transition-all shadow-lg shadow-jobs-accent/30 active:scale-95 disabled:opacity-50 mb-3"
                                    >
                                        {applying ? 'Applying...' : 'Apply Now'}
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveJob}
                                            disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-jobs-dark font-bold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                                        >
                                            {isSaved ? (
                                                <>
                                                    <BookmarkCheck className="h-5 w-5" />
                                                    Saved
                                                </>
                                            ) : (
                                                <>
                                                    <Bookmark className="h-5 w-5" />
                                                    Save
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={handleShare}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-jobs-dark font-bold rounded-xl hover:bg-gray-200 transition-all"
                                        >
                                            <Share2 className="h-5 w-5" />
                                            Share
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Job Details */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-200">
                            <h3 className="text-lg font-black text-jobs-dark mb-4">Job Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Category</p>
                                    <p className="text-jobs-dark font-bold">{getCategoryLabel(job.category)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Experience Level</p>
                                    <p className="text-jobs-dark font-bold capitalize">{job.experienceLevel} Level</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Applicants</p>
                                    <p className="text-jobs-dark font-bold">{job.applicantCount || 0} applications</p>
                                </div>
                                {job.applicationDeadline && (
                                    <div>
                                        <p className="text-sm text-gray-600 font-medium mb-1">Application Deadline</p>
                                        <p className="text-jobs-dark font-bold">{formatDeadline(job.applicationDeadline as Date)}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Company Info */}
                        <BlurredContent isPremium={isPremium}>
                            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                                <h3 className="text-lg font-black text-jobs-dark mb-4">Company Contact</h3>
                                <div className="space-y-3">
                                    {job.contactEmail && (
                                        <div className="flex items-center gap-3">
                                            <Mail className="h-5 w-5 text-jobs-primary" />
                                            <span className="text-gray-700">{job.contactEmail}</span>
                                        </div>
                                    )}
                                    {job.contactPhone && (
                                        <div className="flex items-center gap-3">
                                            <Phone className="h-5 w-5 text-jobs-primary" />
                                            <span className="text-gray-700">{job.contactPhone}</span>
                                        </div>
                                    )}
                                    {job.companyWebsite && (
                                        <div className="flex items-center gap-3">
                                            <Globe className="h-5 w-5 text-jobs-primary" />
                                            <a href={job.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-jobs-primary hover:underline">
                                                Visit Website
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </BlurredContent>

                        {/* Report */}
                        <button className="w-full flex items-center justify-center gap-2 py-3 text-gray-500 hover:text-red-600 font-medium transition-colors">
                            <Flag className="h-4 w-4" />
                            Report this job
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}