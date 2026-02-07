'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Briefcase, Clock, DollarSign, Bookmark, Building2, Mail, Phone } from 'lucide-react';
import { Job } from '@/types/job';
import {
    formatSalaryRange,
    formatPostedDate,
    formatDeadline,
    getJobTypeBadge,
    getCategoryLabel,
    getDeadlineUrgency,
} from '@/lib/utils';
import BlurredContent from '@/components/premium/BlurredContent';
import MatchScoreBadge from './MatchScoreBadge';
import PremiumBadge from '@/components/premium/PremiumBadge';

interface JobCardProps {
    job: Job;
    onSave?: (jobId: string) => void;
    isSaved?: boolean;
    isPremium?: boolean;
    matchScore?: number;
}

export default function JobCard({ job, onSave, isSaved = false, isPremium = false, matchScore }: JobCardProps) {
    const urgency = getDeadlineUrgency(job.deadline);

    return (
        <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-all duration-300 group relative">
            {/* Premium Badge */}
            {job.featured && (
                <div className="absolute top-4 right-4">
                    <PremiumBadge />
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                    {/* Company Logo */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {job.company.logo ? (
                            <Image
                                src={job.company.logo}
                                alt={job.company.name}
                                width={48}
                                height={48}
                                className="rounded-lg"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <Building2 className="h-6 w-6 text-gray-400" />
                        )}
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                        <Link href={`/job/${job.id}`}>
                            <h3 className="text-lg font-extrabold text-jobs-dark mb-1 hover:text-jobs-primary transition-colors line-clamp-2">
                                {job.title}
                            </h3>
                        </Link>
                        <BlurredContent isPremium={isPremium}>
                            <Link href={`/companies/${job.company.id}`}>
                                <p className="text-jobs-dark/60 font-bold text-sm hover:text-jobs-primary transition-colors">
                                    {job.company.name}
                                </p>
                            </Link>
                        </BlurredContent>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={() => onSave?.(job.id)}
                    className={`p-2 rounded-full transition-all ${isSaved
                        ? 'text-jobs-primary bg-jobs-primary/10 shadow-sm'
                        : 'text-gray-300 hover:text-jobs-primary hover:bg-jobs-primary/5'
                        }`}
                >
                    <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                </button>
            </div>

            {/* Badges & Match Score */}
            <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getJobTypeBadge(job.type)}`}>
                    {job.type.replace('-', ' ').toUpperCase()}
                </span>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    {getCategoryLabel(job.category)}
                </span>
                {matchScore !== undefined && (
                    <MatchScoreBadge score={matchScore} />
                )}
                {job.locationType === 'remote' && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        🏠 REMOTE
                    </span>
                )}
            </div>

            {/* Description */}
            <p className="text-jobs-dark/70 text-sm mb-4 line-clamp-2 leading-relaxed">
                {job.shortDescription}
            </p>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-jobs-dark/60">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-jobs-primary" />
                    <span className="truncate uppercase tracking-tight">{job.city}, {job.province}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-jobs-dark/60">
                    <Briefcase className="h-4 w-4 flex-shrink-0 text-jobs-primary" />
                    <span className="truncate uppercase tracking-tight">{job.experienceLevel} level</span>
                </div>
                {job.salary && (
                    <div className="flex items-center gap-2 text-sm font-black text-jobs-primary col-span-2 bg-jobs-primary/5 p-2 rounded-xl border border-jobs-primary/10">
                        <DollarSign className="h-4 w-4 flex-shrink-0" />
                        <span>
                            {formatSalaryRange(job.salary.min, job.salary.max, job.salary.period)}
                        </span>
                    </div>
                )}
            </div>

            {/* Contact Info (Blurred for non-premium) */}
            <BlurredContent isPremium={isPremium}>
                <div className="bg-gray-50 p-3 rounded-xl mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-jobs-dark/70">
                        <Mail className="h-4 w-4 text-jobs-primary" />
                        <span>{job.companyEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-jobs-dark/70">
                        <Phone className="h-4 w-4 text-jobs-primary" />
                        <span>{job.companyPhone}</span>
                    </div>
                </div>
            </BlurredContent>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatPostedDate(job.postedAt)}</span>
                    </div>
                    {job.applicationCount !== undefined && (
                        <span>{job.applicationCount} applicants</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span
                        className={`text-xs font-semibold ${urgency === 'urgent'
                            ? 'text-red-600'
                            : urgency === 'moderate'
                                ? 'text-orange-600'
                                : 'text-gray-600'
                            }`}
                    >
                        {formatDeadline(job.deadline)}
                    </span>
                </div>
            </div>

            {/* View Details Button - Shows on Hover */}
            <Link
                href={`/job/${job.id}`}
                className="mt-4 w-full py-3 bg-jobs-accent text-white text-center font-black rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-jobs-accent/30 active:scale-95 hidden sm:block"
            >
                View Details & Apply
            </Link>
        </div>
    );
}