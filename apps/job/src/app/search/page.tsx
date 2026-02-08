'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Filter, SlidersHorizontal, ChevronDown, Bookmark, Building2, Clock, DollarSign, TrendingUp, Users, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@khanhub/shared-ui';
import { getActiveJobs } from '@/lib/firebase/firestore';
import { Job } from '@/types/job';

export default function JobSearchPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [locationTerm, setLocationTerm] = useState('');

    useEffect(() => {
        const loadJobs = async () => {
            try {
                const approvedJobs = await getActiveJobs() as Job[];
                setJobs(approvedJobs);
                setLoading(false);
            } catch (err) {
                console.error('Error loading jobs:', err);
                setLoading(false);
            }
        };

        loadJobs();
    }, []);

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = searchTerm === '' ||
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.companyName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesLocation = locationTerm === '' ||
            job.city.toLowerCase().includes(locationTerm.toLowerCase()) ||
            job.location.toLowerCase().includes(locationTerm.toLowerCase());

        return matchesSearch && matchesLocation;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Search Header */}
            <div className="bg-white border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="Job title, keywords, or company"
                                className="w-full pl-12 pr-4 py-3 bg-jobs-neutral border border-gray-100 rounded-xl focus:ring-2 focus:ring-jobs-primary focus:bg-white transition-all font-bold text-jobs-dark"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-64 relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="City or region"
                                className="w-full pl-12 pr-4 py-3 bg-jobs-neutral border border-gray-100 rounded-xl focus:ring-2 focus:ring-jobs-primary focus:bg-white transition-all font-bold text-jobs-dark"
                                value={locationTerm}
                                onChange={(e) => setLocationTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="primary" className="md:w-32 !bg-jobs-primary !text-white font-black rounded-xl shadow-lg shadow-jobs-primary/20">Find Jobs</Button>
                    </div>

                    <div className="flex flex-wrap items-center mt-6 gap-4 text-sm">
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-jobs-primary/10 text-jobs-primary rounded-xl border border-jobs-primary/10 font-black transition-all hover:bg-jobs-primary/20">
                            <Filter className="h-4 w-4" /> Filter by Type <ChevronDown className="h-4 w-4" />
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg border border-transparent font-bold text-gray-600 transition-colors">
                            Salary Range <ChevronDown className="h-4 w-4" />
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg border border-transparent font-bold text-gray-600 transition-colors">
                            Experience Level <ChevronDown className="h-4 w-4" />
                        </button>
                        <div className="ml-auto flex items-center gap-2 text-gray-500">
                            <SlidersHorizontal className="h-4 w-4" />
                            <span>Sort by: <strong>Newest</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Results */}
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-gray-500 font-medium">Found <span className="font-black text-gray-900">{filteredJobs.length}</span> jobs matching your criteria</p>
                        </div>

                        {filteredJobs.length === 0 ? (
                            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-16 text-center">
                                <h3 className="text-2xl font-bold text-jobs-dark mb-2">No Jobs Found</h3>
                                <p className="text-jobs-dark/60 mb-6">
                                    {jobs.length === 0
                                        ? "No jobs have been posted yet. Employers can post jobs to get started!"
                                        : "Try adjusting your search criteria"}
                                </p>
                            </div>
                        ) : (
                            filteredJobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-jobs-primary/30 hover:shadow-xl hover:shadow-jobs-primary/5 transition-all group relative cursor-pointer"
                                    onClick={() => router.push(`/job/${job.id}`)}
                                >
                                    <button
                                        className="absolute top-6 right-6 p-2 text-gray-400 hover:text-jobs-primary hover:bg-jobs-primary/5 rounded-xl transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // TODO: Add save job functionality
                                        }}
                                    >
                                        <Bookmark className="h-5 w-5" />
                                    </button>

                                    <div className="flex gap-6">
                                        <div className="w-16 h-16 bg-jobs-neutral rounded-2xl flex items-center justify-center text-3xl group-hover:bg-jobs-primary/10 transition-colors">
                                            {job.companyLogo ? (
                                                <Image
                                                    src={job.companyLogo}
                                                    alt={job.companyName}
                                                    width={64}
                                                    height={64}
                                                    className="w-full h-full object-cover rounded-2xl"
                                                />
                                            ) : (
                                                <Building2 className="h-8 w-8 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-black text-jobs-dark group-hover:text-jobs-primary transition-colors tracking-tight">{job.title}</h3>
                                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
                                                <div className="flex items-center gap-1">
                                                    <Building2 className="h-4 w-4" /> {job.companyName}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4" /> {job.location}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" /> {new Date(job.postedAt as any).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 mt-4">
                                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wide capitalize">{job.employmentType.replace('-', ' ')}</span>
                                                {job.salaryMin && (
                                                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                                        <DollarSign className="h-3 w-3" /> Rs. {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()}
                                                    </span>
                                                )}
                                                {job.isRemote && (
                                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">Remote</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-80 space-y-6">
                        <div className="bg-jobs-primary rounded-3xl p-8 text-white overflow-hidden relative shadow-2xl">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,111,97,0.15),transparent)]"></div>
                            <div className="relative z-10">
                                <h4 className="text-2xl font-black mb-2 tracking-tight">Job Alerts</h4>
                                <p className="text-white/70 text-sm mb-6 font-medium leading-relaxed">Get notified as soon as new nursing jobs are posted in Vehari.</p>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl mb-4 text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all font-bold"
                                />
                                <Button variant="primary" className="w-full !bg-jobs-accent !text-white font-black rounded-xl py-4 shadow-xl shadow-jobs-accent/30 hover:opacity-90 transition-all active:scale-95 border-none">Activate Alert</Button>
                            </div>
                            <div className="absolute -bottom-4 -right-4 text-white opacity-10">
                                <TrendingUp className="h-24 w-24" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h4 className="text-lg font-black text-jobs-dark mb-4 flex items-center gap-2">
                                <Users className="h-5 w-5 text-jobs-primary" /> Featured Companies
                            </h4>
                            <div className="space-y-4">
                                {['Punjab Health', 'Indus Bank', 'Orient Electronics'].map((comp) => (
                                    <div key={comp} className="flex items-center justify-between group cursor-pointer p-2 hover:bg-jobs-neutral rounded-xl transition-all">
                                        <span className="font-bold text-jobs-dark/60 group-hover:text-jobs-primary transition-colors">{comp}</span>
                                        <span className="text-xs bg-jobs-neutral px-2 py-0.5 rounded text-jobs-dark/40 font-black group-hover:bg-jobs-primary/10 group-hover:text-jobs-primary transition-colors">12 Jobs</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
