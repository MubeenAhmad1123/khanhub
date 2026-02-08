'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Building2, MapPin, Clock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { getSavedJobs, getJobById } from '@/lib/firebase/firestore';
import { Job } from '@/types/job';
import { Button } from '@/components/ui/button';

export default function SavedJobsPage() {
    const { user } = useAuth();
    const [savedJobs, setSavedJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSavedJobs = async () => {
            if (!user) return;
            try {
                const jobIds = await getSavedJobs(user.uid);
                const jobPromises = jobIds.map((id: string) => getJobById(id));
                const jobResults = await Promise.all(jobPromises);
                setSavedJobs(jobResults.filter(j => j !== null) as Job[]);
            } catch (error) {
                console.error('Error loading saved jobs:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSavedJobs();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-jobs-primary/10 rounded-2xl text-jobs-primary">
                    <Bookmark className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-jobs-dark tracking-tight">Saved Jobs</h1>
                    <p className="text-gray-500 font-medium">You have {savedJobs.length} jobs saved for later</p>
                </div>
            </div>

            {savedJobs.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bookmark className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No saved jobs yet</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Explore nursing opportunities and save them to apply whenever you're ready.
                    </p>
                    <Link href="/search">
                        <Button variant="primary">Browse Jobs</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {savedJobs.map((job) => (
                        <div
                            key={job.id}
                            className="bg-white p-6 rounded-3xl border border-gray-100 hover:border-jobs-primary/20 hover:shadow-xl hover:shadow-jobs-primary/5 transition-all group"
                        >
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-jobs-neutral rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                                    {job.companyLogo ? (
                                        <Image
                                            src={job.companyLogo}
                                            alt={job.companyName}
                                            width={64}
                                            height={64}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Building2 className="h-8 w-8 text-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-jobs-dark group-hover:text-jobs-primary transition-colors">
                                        {job.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1 text-sm text-gray-500 font-medium">
                                        <div className="flex items-center gap-1">
                                            <Building2 className="h-3.5 w-3.5" /> {job.companyName}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" /> {job.city}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" /> Posted {job.postedAt && (typeof job.postedAt === 'object' && 'toDate' in job.postedAt ? job.postedAt.toDate() : new Date(job.postedAt as any)).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-6">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-jobs-primary/5 text-jobs-primary rounded-full text-[10px] font-black uppercase tracking-wider">
                                                {job.employmentType.replace('-', ' ')}
                                            </span>
                                            {job.salaryMin > 0 && (
                                                <span className="text-sm font-black text-green-600">
                                                    Rs. {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        <Link href={`/job/${job.id}`}>
                                            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                                                View Details
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
