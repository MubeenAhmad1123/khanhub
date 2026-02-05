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
    const urgency = getDeadlineUrgency(job.deadline);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="bg-white border rounded-lg p-8 mb-6">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                    {/* Company Logo */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {job.company.logo ? (
                            <Image
                                src={job.company.logo}
                                alt={job.company.name}
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
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                        <Link href={`/companies/${job.company.id}`}>
                            <p className="text-xl text-gray-600 font-medium hover:text-blue-600 transition-colors mb-4">
                                {job.company.name}
                            </p>
                        </Link>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getJobTypeBadge(job.type)}`}>
                                {job.type.replace('-', ' ').toUpperCase()}
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
                            <div className="flex items-center gap-2 text-gray-700">
                                <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                <span>{job.location}</span>
                                {job.isRemote && <span className="text-green-600 font-medium">(Remote)</span>}
                            </div>
                            {job.salary && (
                                <div className="flex items-center gap-2 text-gray-700">
                                    <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    <span className="font-semibold text-green-600">
                                        {formatSalaryRange(job.salary.min, job.salary.max, job.salary.period)}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-700">
                                <Clock className="h-5 w-5 text-gray-600 flex-shrink-0" />
                                <span>Posted {formatPostedDate(job.postedAt)}</span>
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
                                    Deadline: {formatDeadline(job.deadline)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                                <Users className="h-5 w-5 text-gray-600 flex-shrink-0" />
                                <span>{job.vacancies} {job.vacancies === 1 ? 'position' : 'positions'} available</span>
                            </div>
                            {job.applicationCount !== undefined && (
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Briefcase className="h-5 w-5 text-gray-600 flex-shrink-0" />
                                    <span>{job.applicationCount} applicants so far</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex md:flex-col gap-2">
                        <button
                            onClick={() => onSave?.(job.id)}
                            className={`p-3 rounded-lg transition-colors ${isSaved
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 border'
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
                <div className="mt-6 flex gap-3">
                    <button className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                        Apply Now
                    </button>
                    <Link
                        href={`/companies/${job.company.id}`}
                        className="px-6 py-3 border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
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
                            <p className="text-red-700 text-sm">This job closes on {job.deadline.toLocaleDateString()}. Apply soon!</p>
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
                    <div className="bg-white border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="h-6 w-6 text-blue-600" />
                            <h2 className="text-2xl font-bold text-gray-900">Responsibilities</h2>
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

                    {/* Requirements */}
                    <div className="bg-white border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="h-6 w-6 text-blue-600" />
                            <h2 className="text-2xl font-bold text-gray-900">Requirements</h2>
                        </div>
                        <ul className="space-y-2">
                            {job.requirements.map((requirement, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">{requirement}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Qualifications */}
                    <div className="bg-white border rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="h-6 w-6 text-purple-600" />
                            <h2 className="text-2xl font-bold text-gray-900">Qualifications</h2>
                        </div>
                        <ul className="space-y-2">
                            {job.qualifications.map((qualification, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">{qualification}</span>
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
                    <div className="bg-white border rounded-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Required Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {job.skills.map((skill, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-700 font-medium rounded-lg text-sm"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Company Information */}
                <div className="space-y-6">
                    <div className="bg-white border rounded-lg p-6 sticky top-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">About the Company</h2>

                        <div className="mb-4">
                            <p className="text-gray-700 leading-relaxed">{job.company.description}</p>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-start gap-2">
                                <Building2 className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Industry</p>
                                    <p className="font-semibold text-gray-900">{job.company.industry}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Users className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Company Size</p>
                                    <p className="font-semibold text-gray-900">{job.company.size} employees</p>
                                </div>
                            </div>
                            {job.company.founded && (
                                <div className="flex items-start gap-2">
                                    <Calendar className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Founded</p>
                                        <p className="font-semibold text-gray-900">{job.company.founded}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-2">
                                <MapPin className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Location</p>
                                    <p className="font-semibold text-gray-900">{job.company.location}</p>
                                </div>
                            </div>
                            {job.company.website && (
                                <div className="flex items-start gap-2">
                                    <Globe className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Website</p>
                                        <a
                                            href={job.company.website}
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

                        {job.company.benefits && job.company.benefits.length > 0 && (
                            <>
                                <h3 className="font-bold text-gray-900 mb-2">Company Benefits</h3>
                                <ul className="space-y-1">
                                    {job.company.benefits.map((benefit, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="bg-white border rounded-lg p-6 mt-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Apply?</h2>
                <p className="text-gray-600 mb-4">
                    Don't miss this opportunity! Submit your application before the deadline.
                </p>
                <button className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    Apply for this Position
                </button>
            </div>
        </div>
    );
}
