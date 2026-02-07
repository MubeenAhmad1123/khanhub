'use client';

import JobCard from './JobCard';

interface Job {
    id: string;
    title: string;
    companyName: string;
    companyLogo?: string;
    location: string;
    employmentType: string;
    salaryMin: number;
    salaryMax: number;
    category: string;
    requiredSkills?: string[];
    createdAt: any;
    applicationsCount?: number;
    featured?: boolean;
    matchScore?: number;
}

interface JobGridProps {
    jobs: Job[];
    showMatchScore?: boolean;
    columns?: 2 | 3 | 4;
}

export default function JobGrid({ jobs, showMatchScore = false, columns = 3 }: JobGridProps) {
    const gridCols = {
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };

    if (!jobs || jobs.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500 text-lg font-medium">No jobs found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your search criteria</p>
            </div>
        );
    }

    return (
        <div className={`grid ${gridCols[columns]} gap-6`}>
            {jobs.map((job) => (
                <JobCard key={job.id} job={job} showMatchScore={showMatchScore} />
            ))}
        </div>
    );
}