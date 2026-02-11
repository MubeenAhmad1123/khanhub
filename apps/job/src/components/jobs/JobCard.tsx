'use client';

import Link from 'next/link';
import { Job } from '@/types/job';
import { MapPin, Clock, DollarSign, Briefcase, Star } from 'lucide-react';
import { cn, formatSalaryRange, formatPostedDate, getJobTypeBadge } from '@/lib/utils';
import Image from 'next/image';
import { toDate } from '@/lib/firebase/firestore';
import RegisteredBadge from '@/components/ui/RegisteredBadge';

interface JobCardProps {
    job: Job;
    showMatchScore?: boolean;
}

export default function JobCard({ job, showMatchScore = false }: JobCardProps) {
    // Determine the date to show
    const postedDate = toDate(job.postedAt);

    // Handle inconsistent schema (salaryMin vs salary.min)
    const salaryMin = job.salaryMin ?? (job as any).salary?.min ?? 0;
    const salaryMax = job.salaryMax ?? (job as any).salary?.max ?? 0;

    // Handle inconsistent type field (employmentType vs type)
    const displayType = job.employmentType ?? (job as any).type ?? 'full-time';

    return (
        <Link
            href={`/job/${job.id}`}
            className="group bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full"
        >
            {/* Job Image/Logo Section */}
            <div className="relative h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
                {job.companyLogo ? (
                    <Image
                        src={job.companyLogo}
                        alt={job.companyName || 'Company'}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="bg-teal-50 w-full h-full flex items-center justify-center">
                        <Briefcase className="h-12 w-12 text-teal-200" />
                    </div>
                )}

                {/* Status Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                    {job.isFeatured && (
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                            Featured
                        </span>
                    )}
                    {job.isPremium && (
                        <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                            Premium
                        </span>
                    )}
                </div>

                {/* Match Score */}
                {showMatchScore && job.matchScore !== undefined && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-teal-500 flex items-center gap-1 shadow-sm">
                        <Star className="h-3 w-3 text-teal-500 fill-teal-500" />
                        <span className="text-teal-700 font-bold text-xs">{job.matchScore}%</span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col flex-1">
                <div className="mb-4">
                    <h3 className="text-xl font-black text-slate-800 group-hover:text-teal-600 transition-colors line-clamp-1">
                        {job.title}
                    </h3>
                    <div className="flex items-center gap-2">
                        <p className="text-slate-500 text-sm font-medium">{job.companyName || (job as any).company}</p>
                        {(job as any).isEmployerVerified && (
                            <RegisteredBadge size={16} />
                        )}
                    </div>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-teal-500" />
                        <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <DollarSign className="h-4 w-4 text-teal-500" />
                        <span className="font-semibold">
                            {salaryMin > 0 || salaryMax > 0
                                ? formatSalaryRange(salaryMin, salaryMax)
                                : 'Salary Undisclosed'}
                        </span>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        getJobTypeBadge(displayType)
                    )}>
                        {displayType.replace('-', ' ')}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <Clock className="h-3 w-3" />
                        {formatPostedDate(postedDate)}
                    </div>
                </div>
            </div>
        </Link>
    );
}