'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Briefcase, Clock, DollarSign, Bookmark, Building2 } from 'lucide-react';
import { Job } from '@/types/job';
import {
    formatSalaryRange,
    formatPostedDate,
    formatDeadline,
    getJobTypeBadge,
    getCategoryLabel,
    getDeadlineUrgency,
} from '@/lib/utils';

interface JobCardProps {
    job: Job;
    onSave?: (jobId: string) => void;
    isSaved?: boolean;
}

export default function JobCard({ job, onSave, isSaved = false }: JobCardProps) {
    const urgency = getDeadlineUrgency(job.deadline);

    return (
        <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-all duration-300 group">
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
                            <h3 className="text-lg font-bold text-gray-900 mb-1 hover:text-blue-600 transition-colors line-clamp-2">
                                {job.title}
                            </h3>
                        </Link>
                        <Link href={`/companies/${job.company.id}`}>
                            <p className="text-gray-600 font-medium hover:text-blue-600 transition-colors">
                                {job.company.name}
                            </p>
                        </Link>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={() => onSave?.(job.id)}
                    className={`p-2 rounded-full transition-colors ${isSaved
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                >
                    <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getJobTypeBadge(job.type)}`}>
                    {job.type.replace('-', ' ').toUpperCase()}
                </span>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    {getCategoryLabel(job.category)}
                </span>
                {job.isFeatured && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        ⭐ FEATURED
                    </span>
                )}
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {job.shortDescription}
            </p>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{job.city}, {job.province}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{job.experienceLevel} level</span>
                </div>
                {job.salary && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2">
                        <DollarSign className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium text-green-600">
                            {formatSalaryRange(job.salary.min, job.salary.max, job.salary.period)}
                        </span>
                    </div>
                )}
            </div>

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
                className="mt-4 w-full py-2 bg-blue-600 text-white text-center font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
            >
                View Details & Apply
            </Link>
        </div>
    );
}