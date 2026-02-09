'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    MapPin, Briefcase, Clock, DollarSign, Building2, Users, Calendar,
    Bookmark, BookmarkCheck, Share2, Flag, ArrowLeft, CheckCircle2,
    XCircle, Loader2, Mail, Phone, Globe, Linkedin, Facebook, Twitter, Award, AlertCircle, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Job, SavedJob } from '@/types/job';
import { Application } from '@/types/application';
import { getDocument, updateDocument, incrementField, createDocument, queryDocuments, where } from '@/lib/firebase/firestore';
import { formatSalary, formatPostedDate, formatDeadline, getJobTypeBadge, getCategoryLabel } from '@/lib/utils';
import BlurredContent from '@/components/premium/BlurredContent';
import PremiumBadge from '@/components/premium/PremiumBadge';
import Image from 'next/image';

interface JobDetailProps {
    job: Job;
    isSaved?: boolean;
    onSave?: () => void;
}

export default function JobDetail({ job, onSave, isSaved: initialIsSaved = false }: JobDetailProps) {
    const { profile, firebaseUser: user, isPremium, hasPaymentApproved } = useAuth();
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [hasApplied, setHasApplied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [applying, setApplying] = useState(false);

    const checkSavedStatus = useCallback(async () => {
        if (!user) return;
        try {
            const savedJobs = await queryDocuments<SavedJob>('saved_jobs', [
                where('userId', '==', user.uid),
                where('jobId', '==', job.id)
            ]);
            setIsSaved(savedJobs.length > 0);
        } catch (error) {
            console.error('Error checking saved status:', error);
        }
    }, [user, job.id]);

    const checkApplicationStatus = useCallback(async () => {
        if (!user) return;
        try {
            const applications = await queryDocuments<Application>('applications', [
                where('candidateId', '==', user.uid),
                where('jobId', '==', job.id)
            ]);
            setHasApplied(applications.length > 0);
        } catch (error) {
            console.error('Error checking application status:', error);
        }
    }, [user, job.id]);

    useEffect(() => {
        if (user && job.id) {
            checkSavedStatus();
            checkApplicationStatus();
        }
    }, [user, job.id, checkSavedStatus, checkApplicationStatus]);

    const handleSaveJob = async () => {
        if (!user) {
            window.location.href = `/auth/login?redirect=/job/${job.id}`;
            return;
        }

        setSaving(true);
        try {
            if (isSaved) {
                const savedJobs = await queryDocuments<SavedJob>('saved_jobs', [
                    where('userId', '==', user.uid),
                    where('jobId', '==', job.id)
                ]);
                if (savedJobs.length > 0) {
                    await updateDocument('saved_jobs', savedJobs[0].id, { deleted: true });
                }
                setIsSaved(false);
            } else {
                await createDocument('saved_jobs', `${user.uid}_${job.id}`, {
                    userId: user.uid,
                    jobId: job.id,
                    jobTitle: job.title,
                    companyName: job.companyName,
                    location: job.location,
                });
                setIsSaved(true);
            }
            if (onSave) onSave();
        } catch (error) {
            console.error('Error saving job:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleApply = () => {
        if (!user) {
            window.location.href = `/auth/login?redirect=/job/${job.id}`;
            return;
        }

        if (!hasPaymentApproved) {
            alert('Please complete payment verification before applying.');
            window.location.href = '/auth/verify-payment';
            return;
        }

        window.location.href = `/job/${job.id}/apply`;
    };

    const handleShare = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: job.title,
                    text: `Check out this job at ${job.companyName}`,
                    url: window.location.href
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    const deadlineValue = (job as any).applicationDeadline || (job as any).deadline;
    const deadlineDate = deadlineValue instanceof Date
        ? deadlineValue
        : (deadlineValue as any)?.toDate ? (deadlineValue as any).toDate() : new Date(deadlineValue as any);

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
                                <Image
                                    src={job.companyLogo}
                                    alt={job.companyName}
                                    width={96}
                                    height={96}
                                    className="h-24 w-24 rounded-2xl object-cover border-2 border-gray-100"
                                />
                            ) : (
                                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-jobs-primary to-jobs-secondary flex items-center justify-center text-white font-black text-3xl">
                                    {job.companyName.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Job Info */}
                        <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-black text-jobs-dark mb-2 tracking-tight">
                                        {job.title}
                                    </h1>
                                    <p className="text-xl text-gray-600 font-bold mb-4">
                                        {job.companyName}
                                    </p>

                                    <div className="flex flex-wrap gap-3">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <MapPin className="h-4 w-4 text-jobs-primary" />
                                            <span className="font-semibold">{job.location}</span>
                                            {job.isRemote && <span className="text-jobs-accent font-bold">(Remote)</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Briefcase className="h-4 w-4 text-jobs-primary" />
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getJobTypeBadge(job.employmentType)}`}>
                                                {job.employmentType.replace('-', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Clock className="h-4 w-4 text-jobs-primary" />
                                            <span className="font-semibold">{formatPostedDate(job.postedAt as any)}</span>
                                        </div>
                                    </div>
                                </div>
                                {job.isFeatured && <PremiumBadge />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Salary */}
                        {job.salaryMin && (
                            <div className="bg-gradient-to-r from-jobs-primary to-jobs-secondary text-white rounded-2xl p-6 shadow-lg shadow-jobs-primary/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white/80 font-semibold mb-1">Salary Range</p>
                                        <p className="text-3xl font-black">
                                            Rs. {job.salaryMin.toLocaleString()} - {job.salaryMax?.toLocaleString()} / {job.salaryPeriod === 'monthly' ? 'month' : 'year'}
                                        </p>
                                    </div>
                                    <DollarSign className="h-16 w-16 text-white/20" />
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                            <h2 className="text-2xl font-black text-jobs-dark mb-6 tracking-tight">Job Description</h2>
                            <div className="prose prose-gray max-w-none">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                    {job.description}
                                </p>
                            </div>
                        </div>

                        {/* Qualifications / Requirements */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <Award className="h-6 w-6 text-jobs-accent" />
                                <h2 className="text-2xl font-black text-jobs-dark tracking-tight">Qualifications & Requirements</h2>
                            </div>
                            <ul className="space-y-3">
                                {job.requiredQualifications?.map((req, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <CheckCircle className="h-5 w-5 text-jobs-accent flex-shrink-0 mt-0.5" />
                                        <span className="text-jobs-dark/70 font-medium">{req}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Responsibilities */}
                        {job.responsibilities && job.responsibilities.length > 0 && (
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                <h2 className="text-2xl font-black text-jobs-dark mb-6 tracking-tight">Responsibilities</h2>
                                <ul className="space-y-3">
                                    {job.responsibilities.map((responsibility, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-jobs-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700 font-medium">{responsibility}</span>
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
                            </div>
                        </div>

                        {/* Benefits */}
                        {job.benefits && job.benefits.length > 0 && (
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                <h2 className="text-2xl font-black text-jobs-dark mb-6 tracking-tight">Benefits</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {job.benefits.map((benefit, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-green-50/50 rounded-xl border border-green-100">
                                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                            <span className="text-gray-700 font-semibold">{benefit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Apply Card */}
                        <div className="bg-white rounded-3xl p-8 border-2 border-jobs-primary sticky top-24 shadow-xl shadow-jobs-primary/5">
                            {hasApplied ? (
                                <div className="text-center py-4">
                                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                    <p className="text-lg font-black text-jobs-dark mb-2">Already Applied</p>
                                    <p className="text-sm text-gray-600 mb-6">Check your dashboard for current application status</p>
                                    <Link
                                        href="/dashboard/applications"
                                        className="block w-full py-4 bg-gray-100 text-jobs-dark text-center font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                                    >
                                        View Application
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={handleApply}
                                        disabled={applying}
                                        className="w-full bg-jobs-accent text-white py-5 rounded-2xl font-black text-xl hover:opacity-90 transition-all shadow-lg shadow-jobs-accent/30 active:scale-95 disabled:opacity-50 mb-4"
                                    >
                                        {applying ? 'Applying...' : 'Apply Now'}
                                    </button>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleSaveJob}
                                            disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-100 text-jobs-dark font-black rounded-2xl hover:bg-gray-200 transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            {isSaved ? (
                                                <>
                                                    <BookmarkCheck className="h-5 w-5 text-jobs-primary" />
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
                                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-100 text-jobs-dark font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                                        >
                                            <Share2 className="h-5 w-5" />
                                            Share
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Job Details Card */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-black text-jobs-dark mb-4">Job Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500 font-bold mb-1 uppercase tracking-wider">Category</p>
                                    <p className="text-jobs-dark font-black">{getCategoryLabel(job.category)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-bold mb-1 uppercase tracking-wider">Experience Level</p>
                                    <p className="text-jobs-dark font-black capitalize">{job.experienceLevel} Level</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-bold mb-1 uppercase tracking-wider">Applicants</p>
                                    <p className="text-jobs-dark font-black">{job.applicantCount || 0} applications</p>
                                </div>
                                {job.applicationDeadline && (
                                    <div>
                                        <p className="text-sm text-gray-500 font-bold mb-1 uppercase tracking-wider">Deadline</p>
                                        <p className="text-jobs-dark font-black">{formatDeadline(deadlineDate)}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Company Info */}
                        <BlurredContent isPremium={isPremium}>
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-black text-jobs-dark mb-4">Company Details</h3>
                                <div className="space-y-4">
                                    <p className="text-jobs-dark font-bold">{job.companyName}</p>
                                    <div className="space-y-3">
                                        {job.contactEmail && (
                                            <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                                                <Mail className="h-4 w-4 text-jobs-primary" />
                                                <span>{job.contactEmail}</span>
                                            </div>
                                        )}
                                        {job.contactPhone && (
                                            <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                                                <Phone className="h-4 w-4 text-jobs-primary" />
                                                <span>{job.contactPhone}</span>
                                            </div>
                                        )}
                                        {job.companyWebsite && (
                                            <div className="flex items-center gap-3 text-sm font-medium">
                                                <Globe className="h-4 w-4 text-jobs-primary" />
                                                <a href={job.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-jobs-primary hover:underline">
                                                    Visit Website
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </BlurredContent>

                        {/* Report */}
                        <button className="w-full flex items-center justify-center gap-2 py-4 text-gray-400 hover:text-red-600 font-bold transition-colors">
                            <Flag className="h-4 w-4" />
                            Report this Job Posting
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}