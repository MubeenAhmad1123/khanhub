import Link from 'next/link';
import React from 'react';

// Matched Job Card Component with visual match score
export default function MatchedJobCard({ job }: { job: any }) {
    const matchColor = job.matchScore >= 80 ? 'green' : job.matchScore >= 60 ? 'blue' : 'yellow';

    return (
        <Link
            href={`/job/${job.id}`}
            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 hover:scale-105 relative overflow-hidden block"
        >
            {/* Match Score Badge */}
            <div className="absolute top-4 right-4">
                <div className={`
                    ${matchColor === 'green' ? 'bg-green-500' : matchColor === 'blue' ? 'bg-blue-500' : 'bg-yellow-500'}
                    text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg
                `}>
                    {job.matchScore}% Match
                </div>
            </div>

            {/* Category Icon */}
            <div className="text-4xl mb-3">{job.categoryIcon}</div>

            <div className="flex items-start justify-between mb-4 pr-20">
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">{job.title}</h3>
                    <p className="text-gray-600 text-sm">{job.companyName}</p>
                </div>
            </div>

            {/* Match Reasons */}
            {job.matchReasons && job.matchReasons.length > 0 && (
                <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                        {job.matchReasons.slice(0, 2).map((reason: string, idx: number) => (
                            <span
                                key={idx}
                                className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full"
                            >
                                ✓ {reason}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span className="truncate">{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>💰</span>
                    <span className="truncate">
                        {job.salaryMin && job.salaryMax
                            ? `Rs. ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`
                            : 'Salary not specified'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span>⏰</span>
                    <span className="capitalize truncate">{job.employmentType}</span>
                </div>
            </div>

            {/* Skills matched indicator */}
            {job.skillsMatched && job.skillsMatched.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                        <span className="font-semibold">{job.skillsMatched.length} of your skills match</span>
                    </p>
                </div>
            )}
        </Link>
    );
}
