'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
    MapPin,
    Briefcase,
    Clock,
    DollarSign,
    Calendar,
    Building2,
    Users,
    Globe,
    CheckCircle,
    Target,
    Award,
    Heart,
    Share2,
    Bookmark,
    AlertCircle,
} from 'lucide-react';
import { Job } from '@/types/job';
import {
    formatSalaryRange,
    formatPostedDate,
    formatDeadline,
    getJobTypeBadge,
    getCategoryLabel,
    getDeadlineUrgency,
} from '@/lib/utils';

interface JobDetailProps {
    job: Job;
    onSave?: (jobId: string) => void;
    isSaved?: boolean;
}

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

                    {/* Action Buttons */}
                    <div className="flex md:flex-col gap-2">
                        <button
                            onClick={() => onSave?.(job.id)}
                            className={`p-3 rounded-xl transition-all ${isSaved
                                ? 'text-jobs-primary bg-jobs-primary/10 shadow-sm'
                                : 'text-gray-400 hover:text-jobs-primary hover:bg-jobs-primary/5 border border-gray-100 shadow-sm'
                                }`}
                            title={isSaved ? 'Saved' : 'Save job'}
                        >
                            <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                        <button
                            className="p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                            title="Share job"
                        >
                            <Share2 className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>

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
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Job Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Job Description */}
                    <div className="bg-white border rounded-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Description</h2>
                        <p className="text-gray-700 leading-relaxed">{job.description}</p>
                    </div>

                    {/* Responsibilities */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <Target className="h-6 w-6 text-jobs-primary" />
                            <h2 className="text-2xl font-black text-jobs-dark tracking-tight">Responsibilities</h2>
                        </div>
                        <ul className="space-y-2">
                            {job.responsibilities.map((responsibility, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">{responsibility}</span>
                                </li>
                            ))}
                        </ul>
                    </div>



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

                    {/* Benefits */}
                    {job.benefits && job.benefits.length > 0 && (
                        <div className="bg-white border rounded-lg p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Heart className="h-6 w-6 text-red-600" />
                                <h2 className="text-2xl font-bold text-gray-900">Benefits</h2>
                            </div>
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
                        </div>
                    </div>
                </div>

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
                    </div>
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="bg-jobs-primary border border-white/10 rounded-3xl p-10 mt-10 text-center relative overflow-hidden text-white shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,111,97,0.1),transparent)]"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-black mb-4 tracking-tight">Ready to Apply?</h2>
                    <p className="text-white/70 mb-8 font-medium max-w-lg mx-auto">
                        Don't miss this opportunity! Submit your application before the deadline.
                    </p>
                    <button className="px-12 py-4 bg-jobs-accent text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-2xl shadow-jobs-accent/30 active:scale-95 text-lg">
                        Apply for this Position
                    </button>
                </div>
            </div>
        </div>
    );
}
