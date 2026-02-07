'use client';

import Link from 'next/link';
import { MapPin, Briefcase, Clock, DollarSign, BookmarkPlus, Bookmark, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface JobCardProps {
    job: {
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
    };
    showMatchScore?: boolean;
}

export default function JobCard({ job, showMatchScore = false }: JobCardProps) {
    const [isSaved, setIsSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const { user, isPremium } = useAuth();

    // Format salary
    const formatSalary = (min: number, max: number) => {
        const formatNumber = (num: number) => {
            if (num >= 100000) {
                return `${(num / 100000).toFixed(0)}L`;
            } else if (num >= 1000) {
                return `${(num / 1000).toFixed(0)}K`;
            }
            return num.toString();
        };

        return `Rs. ${formatNumber(min)} - ${formatNumber(max)}`;
    };

    // Format time ago
    const getTimeAgo = (date: any) => {
        if (!date) return 'Just now';

        const now = new Date();
        const posted = date.toDate ? date.toDate() : new Date(date);
        const diffInMs = now.getTime() - posted.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
        return `${Math.floor(diffInDays / 30)} months ago`;
    };

    // Handle save/unsave job
    const handleSaveJob = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        setSaving(true);

        try {
            // TODO: Implement save/unsave logic with Firestore
            // For now, just toggle the state
            setIsSaved(!isSaved);

            // In production, call API:
            // await fetch('/api/jobs/save', {
            //   method: isSaved ? 'DELETE' : 'POST',
            //   body: JSON.stringify({ jobId: job.id })
            // });
        } catch (error) {
            console.error('Error saving job:', error);
        } finally {
            setSaving(false);
        }
    };

    // Employment type badge color
    const getEmploymentTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            full_time: 'bg-green-100 text-green-700',
            part_time: 'bg-blue-100 text-blue-700',
            contract: 'bg-purple-100 text-purple-700',
            internship: 'bg-yellow-100 text-yellow-700',
            freelance: 'bg-pink-100 text-pink-700',
        };

        return colors[type] || 'bg-gray-100 text-gray-700';
    };

    const formatEmploymentType = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <Link href={`/job/${job.id}`}>
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-jobs-primary hover:shadow-xl transition-all group relative overflow-hidden">
                {/* Featured Badge */}
                {job.featured && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-jobs-accent to-jobs-secondary text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <TrendingUp className="h-3 w-3" />
                        FEATURED
                    </div>
                )}

                {/* Match Score Badge */}
                {showMatchScore && job.matchScore && job.matchScore > 0 && (
                    <div className="absolute top-4 left-4 bg-jobs-primary text-white text-sm font-black px-3 py-1 rounded-full shadow-lg">
                        {job.matchScore}% Match
                    </div>
                )}

                {/* Company Logo */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        {job.companyLogo ? (
                            <img
                                src={job.companyLogo}
                                alt={job.companyName}
                                className="h-14 w-14 rounded-xl object-cover border-2 border-gray-100 group-hover:border-jobs-primary transition-colors"
                            />
                        ) : (
                            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-jobs-primary to-jobs-secondary flex items-center justify-center text-white font-black text-xl border-2 border-gray-100 group-hover:border-jobs-primary transition-colors">
                                {job.companyName.charAt(0)}
                            </div>
                        )}

                        <div>
                            <h3 className="font-black text-lg text-jobs-dark group-hover:text-jobs-primary transition-colors line-clamp-1">
                                {job.title}
                            </h3>
                            <p className="text-sm text-gray-600 font-semibold">{job.companyName}</p>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSaveJob}
                        disabled={saving}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        title={isSaved ? 'Remove from saved' : 'Save job'}
                    >
                        {isSaved ? (
                            <Bookmark className="h-5 w-5 text-jobs-primary fill-jobs-primary" />
                        ) : (
                            <BookmarkPlus className="h-5 w-5 text-gray-400 group-hover:text-jobs-primary transition-colors" />
                        )}
                    </button>
                </div>

                {/* Job Details */}
                <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 flex-shrink-0 text-jobs-primary" />
                        <span className="font-semibold">{job.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="h-4 w-4 flex-shrink-0 text-jobs-primary" />
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getEmploymentTypeBadge(job.employmentType)}`}>
                            {formatEmploymentType(job.employmentType)}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="font-semibold">{job.category}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 flex-shrink-0 text-jobs-primary" />
                        <span className="font-bold text-jobs-dark">
                            {formatSalary(job.salaryMin, job.salaryMax)}
                        </span>
                        <span className="text-gray-400">/ month</span>
                    </div>
                </div>

                {/* Skills */}
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {job.requiredSkills.slice(0, 3).map((skill, index) => (
                            <span
                                key={index}
                                className="px-3 py-1 bg-gray-50 text-gray-700 text-xs font-bold rounded-full border border-gray-200"
                            >
                                {skill}
                            </span>
                        ))}
                        {job.requiredSkills.length > 3 && (
                            <span className="px-3 py-1 bg-gray-50 text-gray-500 text-xs font-bold rounded-full border border-gray-200">
                                +{job.requiredSkills.length - 3} more
                            </span>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{getTimeAgo(job.createdAt)}</span>
                    </div>

                    {job.applicationsCount !== undefined && (
                        <div className="text-sm text-gray-500 font-medium">
                            {job.applicationsCount} {job.applicationsCount === 1 ? 'applicant' : 'applicants'}
                        </div>
                    )}
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-jobs-primary to-jobs-accent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </div>
        </Link>
    );
}