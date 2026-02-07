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

export default function JobDetailPage() {
    const router = useRouter();
    const params = useParams();
    const jobId = params.id as string;
    const { user, profile } = useAuth();

    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [matchScore, setMatchScore] = useState<number | null>(null);

    useEffect(() => {
        const loadJob = async () => {
            try {
                const jobData = await getJobById(jobId);
                if (jobData) {
                    setJob(jobData);

                    // Calculate match score if profile exists
                    if (profile) {
                        const score = calculateMatchScore(profile, jobData);
                        setMatchScore(score);
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
    }, [jobId, profile]);

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

                {/* Job Header Card */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-6">
                    <div className="flex items-start gap-6 mb-6">
                        {/* Company Logo */}
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            {job.company.logo ? (
                                <Image
                                    src={job.company.logo}
                                    alt={job.company.name}
                                    width={80}
                                    height={80}
                                    className="w-full h-full rounded-2xl object-cover"
                                />
                            ) : (
                                <Building2 className="h-10 w-10 text-gray-400" />
                            )}
                        </div>

                        {/* Job Title & Company */}
                        <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h1 className="text-4xl font-black text-jobs-dark mb-2">{job.title}</h1>
                                    <BlurredContent isPremium={profile?.isPremium || false}>
                                        <p className="text-xl font-bold text-jobs-dark/80">{job.company.name}</p>
                                    </BlurredContent>
                                </div>
                                {matchScore !== null && (
                                    <MatchScoreBadge score={matchScore} />
                                )}
                            </div>

                            {/* Job Meta Info */}
                            <div className="flex flex-wrap gap-4 mb-4">
                                <div className="flex items-center gap-2 text-jobs-dark/70">
                                    <MapPin className="h-5 w-5" />
                                    <span className="font-medium">{job.city}, {job.province}</span>
                                </div>
                                <div className="flex items-center gap-2 text-jobs-dark/70">
                                    <Briefcase className="h-5 w-5" />
                                    <span className="font-medium capitalize">{job.type.replace('-', ' ')}</span>
                                </div>
                                {job.salary && (
                                    <div className="flex items-center gap-2 text-jobs-dark/70">
                                        <DollarSign className="h-5 w-5" />
                                        <span className="font-medium">
                                            Rs. {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-jobs-dark/70">
                                    <Calendar className="h-5 w-5" />
                                    <span className="font-medium">Deadline: {job.deadline.toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                                {job.featured && <PremiumBadge />}
                                <span className="px-4 py-1.5 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
                                    {job.category}
                                </span>
                                <span className="px-4 py-1.5 bg-purple-100 text-purple-800 text-sm font-bold rounded-full capitalize">
                                    {job.experienceLevel} Level
                                </span>
                                {job.isRemote && (
                                    <span className="px-4 py-1.5 bg-green-100 text-green-800 text-sm font-bold rounded-full">
                                        Remote
                                    </span>
                                )}
                                <span className="px-4 py-1.5 bg-gray-100 text-gray-800 text-sm font-bold rounded-full">
                                    {job.vacancies} {job.vacancies === 1 ? 'Position' : 'Positions'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Apply Button */}
                    <div className="flex gap-4 pt-6 border-t">
                        <Link
                            href={`/job/${job.id}/apply`}
                            className="flex-1 bg-jobs-accent text-white py-4 rounded-xl font-black text-lg hover:opacity-90 transition text-center shadow-lg shadow-jobs-accent/30"
                        >
                            Apply Now
                        </Link>
                        <button className="px-8 py-4 bg-gray-100 text-jobs-dark rounded-xl font-bold hover:bg-gray-200 transition">
                            Save Job
                        </button>
                    </div>
                </div>

                {/* Job Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                            <h2 className="text-2xl font-black text-jobs-dark mb-4">Job Description</h2>
                            <p className="text-jobs-dark/80 leading-relaxed whitespace-pre-line">{job.description}</p>
                        </div>

                        {/* Requirements */}
                        {job.requirements && job.requirements.length > 0 && (
                            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                                <h2 className="text-2xl font-black text-jobs-dark mb-4">Requirements</h2>
                                <ul className="space-y-3">
                                    {job.requirements.map((req, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <span className="text-jobs-dark/80">{req}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Responsibilities */}
                        {job.responsibilities && job.responsibilities.length > 0 && (
                            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                                <h2 className="text-2xl font-black text-jobs-dark mb-4">Responsibilities</h2>
                                <ul className="space-y-3">
                                    {job.responsibilities.map((resp, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="w-2 h-2 bg-jobs-primary rounded-full flex-shrink-0 mt-2" />
                                            <span className="text-jobs-dark/80">{resp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Benefits */}
                        {job.benefits && job.benefits.length > 0 && (
                            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                                <h2 className="text-2xl font-black text-jobs-dark mb-4">Benefits</h2>
                                <ul className="space-y-3">
                                    {job.benefits.map((benefit, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <span className="text-jobs-dark/80">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Job Overview */}
                        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                            <h3 className="text-lg font-black text-jobs-dark mb-4">Job Overview</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs font-bold text-gray-500 mb-1">Experience Required</div>
                                    <div className="text-sm font-bold text-jobs-dark">{job.requiredExperience} years</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-500 mb-1">Education</div>
                                    <div className="text-sm font-bold text-jobs-dark">{job.requiredEducation}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-500 mb-1">Job Type</div>
                                    <div className="text-sm font-bold text-jobs-dark capitalize">{job.type.replace('-', ' ')}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-500 mb-1">Location Type</div>
                                    <div className="text-sm font-bold text-jobs-dark capitalize">{job.locationType}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-500 mb-1">Posted</div>
                                    <div className="text-sm font-bold text-jobs-dark">
                                        {job.postedAt.toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Required Skills */}
                        {job.requiredSkills && job.requiredSkills.length > 0 && (
                            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                                <h3 className="text-lg font-black text-jobs-dark mb-4">Required Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {job.requiredSkills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1.5 bg-jobs-primary/10 text-jobs-primary text-xs font-bold rounded-full"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Company Contact - Blurred for non-premium */}
                        <BlurredContent isPremium={profile?.isPremium || false}>
                            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                                <h3 className="text-lg font-black text-jobs-dark mb-4">Company Contact</h3>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 mb-1">Email</div>
                                        <div className="font-medium text-jobs-dark">{job.companyEmail}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 mb-1">Phone</div>
                                        <div className="font-medium text-jobs-dark">{job.companyPhone}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 mb-1">Address</div>
                                        <div className="font-medium text-jobs-dark">{job.companyAddress}</div>
                                    </div>
                                </div>
                            </div>
                        </BlurredContent>

                        {/* CTA Card */}
                        <div className="bg-gradient-to-br from-jobs-accent to-orange-600 rounded-3xl shadow-2xl p-6 text-white">
                            <h3 className="text-xl font-black mb-3">Ready to Apply?</h3>
                            <p className="text-white/90 text-sm mb-4">
                                Don't miss this opportunity. Submit your application today!
                            </p>
                            <Link
                                href={`/job/${job.id}/apply`}
                                className="block w-full bg-white text-jobs-accent py-3 rounded-xl font-bold text-center hover:bg-white/90 transition"
                            >
                                Apply Now
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}