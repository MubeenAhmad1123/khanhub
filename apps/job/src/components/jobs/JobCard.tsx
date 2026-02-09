import Link from 'next/link';
import { Job } from '@/types/job';
import { formatSalary, formatPostedDate } from '@/lib/utils';
import MatchScoreBadge from './MatchScoreBadge';

interface JobCardProps {
    job: Job;
    matchScore?: number;
}

<<<<<<< HEAD
export default function JobCard({ job, matchScore }: JobCardProps) {
=======
export default function JobCard({ job, showMatchScore = false }: JobCardProps) {
    const [isSaved, setIsSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();
    const isPremium = user?.isPremium;

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

>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b
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