'use client';

import { Job } from '@/types/job';
import JobCard from './JobCard';

interface JobFiltersProps {
    jobs: Job[];
    isLoading?: boolean;
    emptyMessage?: string;
    onSaveJob?: (jobId: string) => void;
    savedJobIds?: string[];
}

export default function JobFilters({
    jobs,
    isLoading = false,
    emptyMessage = 'No jobs found',
    onSaveJob,
    savedJobIds = [],
}: JobFiltersProps) {
    // Loading State
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-white border rounded-lg p-6">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-full" />
                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Empty State
    if (jobs.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                    <svg
                        className="w-16 h-16 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {emptyMessage}
                </h3>
                <p className="text-gray-600 mb-6">
                    Try adjusting your filters or search terms
                </p>
            </div>
        );
    }

    // Jobs Grid
    return (
        <div>
            {/* Results Count */}
            <div className="mb-4">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{jobs.length}</span>{' '}
                    {jobs.length === 1 ? 'job' : 'jobs'}
                </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {jobs.map((job) => (
                    <JobCard
                        key={job.id}
                        job={{
                            id: job.id,
                            title: job.title,
                            companyName: job.company.name,
                            companyLogo: job.company.logo || undefined,
                            location: job.location,
                            employmentType: job.type,
                            salaryMin: job.salary?.min || 0,
                            salaryMax: job.salary?.max || 0,
                            category: job.category,
                            requiredSkills: job.requiredSkills || job.skills,
                            createdAt: job.createdAt,
                            applicationsCount: job.applicationCount,
                            featured: job.featured,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}