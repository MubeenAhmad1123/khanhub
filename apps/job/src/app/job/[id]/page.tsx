'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    Briefcase,
    MapPin,
    Building2,
    DollarSign,
    Calendar,
    Clock,
    Users,
    CheckCircle,
    Loader2,
    AlertCircle,
    ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getJobById } from '@/lib/firebase/firestore';
import { calculateMatchScore } from '@/lib/services/matchingAlgorithm';
import { Job } from '@/types/job';
import MatchScoreBadge from '@/components/jobs/MatchScoreBadge';
import PremiumBadge from '@/components/premium/PremiumBadge';
import BlurredContent from '@/components/premium/BlurredContent';
import JobDetail from '@/components/jobs/JobDetail';

export default function JobDetailPage() {
    const router = useRouter();
    const params = useParams();
    const jobId = params.id as string;
    const { user } = useAuth();

    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [matchScore, setMatchScore] = useState<number | null>(null);

    useEffect(() => {
        const loadJob = async () => {
            try {
                const jobData = await getJobById(jobId);
                if (jobData) {
                    setJob(jobData as unknown as Job);

                    // Calculate match score if profile exists
                    if (user) {
                        // TODO: user object might need mapping to Profile for match score
                        // const score = calculateMatchScore(user as any, jobData);
                        // setMatchScore(score);
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error('Error loading job:', err);
                setLoading(false);
            }
        };

        if (jobId) {
            loadJob();
        }
    }, [jobId, user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-jobs-neutral">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-jobs-dark mb-2">Job Not Found</h2>
                    <p className="text-jobs-dark/60 mb-6">The job you're looking for doesn't exist or has been removed.</p>
                    <Link
                        href="/search"
                        className="inline-block bg-jobs-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition"
                    >
                        Browse Jobs
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-jobs-neutral py-8 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Back Button */}
                <Link
                    href="/search"
                    className="inline-flex items-center gap-2 text-jobs-primary font-bold mb-6 hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Jobs
                </Link>

                <JobDetail job={job} />
            </div>
        </div>
    );
}