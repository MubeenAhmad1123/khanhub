import Link from 'next/link';
import { Job } from '@/types/job';
import { formatSalary, formatPostedDate } from '@/lib/utils';
import MatchScoreBadge from './MatchScoreBadge';

interface JobCardProps {
    job: Job;
    matchScore?: number;
}

export default function JobCard({ job, matchScore }: JobCardProps) {
    return (
        <Link href={`/job/${job.id}`}>
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border border-gray-200 h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 mb-1 hover:text-teal-600">
                            {job.title}
                        </h3>
                        <p className="text-gray-600 text-sm">{job.companyName}</p>
                    </div>
                    {job.isFeatured && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded">
                            ⭐ Featured
                        </span>
                    )}
                </div>

                {/* Match Score */}
                {matchScore !== undefined && (
                    <div className="mb-4">
                        <MatchScoreBadge score={matchScore} />
                    </div>
                )}

                {/* Job Details */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📍</span>
                        <span>{job.location}{job.isRemote && ' (Remote)'}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">💼</span>
                        <span className="capitalize">{job.employmentType.replace('-', ' ')}</span>
                    </div>

                    {job.showSalary && (
                        <div className="flex items-center text-sm text-gray-600">
                            <span className="mr-2">💰</span>
                            <span>
                                {formatSalary(job.salaryMin, job.salaryPeriod)} - {formatSalary(job.salaryMax, job.salaryPeriod)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Skills */}
                {job.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {job.requiredSkills.slice(0, 3).map((skill, index) => (
                            <span
                                key={index}
                                className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded"
                            >
                                {skill}
                            </span>
                        ))}
                        {job.requiredSkills.length > 3 && (
                            <span className="text-xs text-gray-500">
                                +{job.requiredSkills.length - 3} more
                            </span>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
                    <span>{formatPostedDate(job.postedAt instanceof Date ? job.postedAt : job.postedAt.toDate())}</span>
                    <span>{job.applicantCount} applicants</span>
                </div>
            </div>
        </Link>
    );
}