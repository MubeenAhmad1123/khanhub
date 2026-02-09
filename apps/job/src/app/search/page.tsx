'use client';

<<<<<<< HEAD
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Briefcase, DollarSign, X, SlidersHorizontal, Loader2, ArrowRight, Filter } from 'lucide-react';
import JobGrid from '@/components/jobs/JobGrid';
import { useAuth } from '@/hooks/useAuth';
import { Job, JobFilters, PAKISTANI_CITIES, JOB_CATEGORIES, EMPLOYMENT_TYPES } from '@/types/job';
import { queryDocuments, where, orderBy, limit, startAfter, QueryDocumentSnapshot } from '@/lib/firebase/firestore';

export default function SearchPage() {
    const searchParams = useSearchParams();
    const { user, profile } = useAuth();
=======
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Filter, SlidersHorizontal, ChevronDown, Bookmark, Building2, Clock, DollarSign, TrendingUp, Users, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@khanhub/shared-ui';
import { getActiveJobs } from '@/lib/firebase/firestore';
import { Job } from '@/types/job';
>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b

    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [totalResults, setTotalResults] = useState(0);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || '');
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [selectedEmploymentType, setSelectedEmploymentType] = useState(searchParams.get('type') || '');
    const [minSalary, setMinSalary] = useState(searchParams.get('minSalary') || '');
    const [maxSalary, setMaxSalary] = useState(searchParams.get('maxSalary') || '');
    const [remoteOnly, setRemoteOnly] = useState(searchParams.get('remote') === 'true');
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

    const PAGE_SIZE = 20;

    useEffect(() => {
<<<<<<< HEAD
        searchJobs(true);
    }, [selectedCategory, selectedLocation, selectedEmploymentType, remoteOnly, sortBy]);

    const searchJobs = async (reset = false) => {
        try {
            setLoading(true);

            // Build query constraints
            const constraints = [
                where('status', '==', 'active')
            ];

            // Add filters
            if (selectedCategory) {
                constraints.push(where('category', '==', selectedCategory));
=======
        const loadJobs = async () => {
            try {
                const approvedJobs = await getActiveJobs() as Job[];
                setJobs(approvedJobs);
                setLoading(false);
            } catch (err) {
                console.error('Error loading jobs:', err);
                setLoading(false);
>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b
            }

            if (selectedLocation && selectedLocation !== 'all') {
                constraints.push(where('city', '==', selectedLocation));
            }

<<<<<<< HEAD
            if (selectedEmploymentType) {
                constraints.push(where('employmentType', '==', selectedEmploymentType));
            }

            if (remoteOnly) {
                constraints.push(where('isRemote', '==', true));
            }
=======
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = searchTerm === '' ||
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.companyName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesLocation = locationTerm === '' ||
            job.city.toLowerCase().includes(locationTerm.toLowerCase()) ||
            job.location.toLowerCase().includes(locationTerm.toLowerCase());
>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b

            // Add sorting
            const sortField = sortBy === 'salary_high' ? 'salaryMax' :
                sortBy === 'salary_low' ? 'salaryMin' :
                    'postedAt';
            const sortDirection = sortBy === 'salary_low' ? 'asc' : 'desc';

            constraints.push(orderBy(sortField, sortDirection));
            constraints.push(limit(PAGE_SIZE));

            // Add pagination
            if (!reset && lastDoc) {
                constraints.push(startAfter(lastDoc));
            }

            const results = await queryDocuments<Job>('jobs', constraints);

            // Filter by search query and salary (client-side)
            let filteredJobs = results;

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filteredJobs = filteredJobs.filter(job =>
                    job.title.toLowerCase().includes(query) ||
                    job.companyName.toLowerCase().includes(query) ||
                    job.description?.toLowerCase().includes(query) ||
                    job.requiredSkills?.some(skill => skill.toLowerCase().includes(query))
                );
            }

            if (minSalary) {
                filteredJobs = filteredJobs.filter(job => job.salaryMax >= parseInt(minSalary));
            }

            if (maxSalary) {
                filteredJobs = filteredJobs.filter(job => job.salaryMin <= parseInt(maxSalary));
            }

            if (reset) {
                setJobs(filteredJobs);
            } else {
                setJobs(prev => [...prev, ...filteredJobs]);
            }

            setTotalResults(filteredJobs.length);
            setHasMore(results.length === PAGE_SIZE);
            setLastDoc(results.length > 0 ? results[results.length - 1] as any : null);
        } catch (error) {
            console.error('Error searching jobs:', error);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        searchJobs(true);
    };

    const handleLoadMore = () => {
        searchJobs(false);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedLocation('');
        setSelectedCategory('');
        setSelectedEmploymentType('');
        setMinSalary('');
        setMaxSalary('');
        setRemoteOnly(false);
        searchJobs(true);
    };

    const activeFiltersCount = [
        selectedCategory,
        selectedLocation,
        selectedEmploymentType,
        minSalary,
        maxSalary,
        remoteOnly
    ].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Search Header */}
            <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Search Bar */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                            <Search className="h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Job title, keywords, or company..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="flex-1 bg-transparent outline-none text-jobs-dark font-medium placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleSearch}
                                className="bg-jobs-primary text-white px-8 py-3 rounded-xl font-black hover:opacity-90 transition-all shadow-lg active:scale-95"
                            >
                                Search
                            </button>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="md:hidden bg-gray-100 text-jobs-dark px-4 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all relative"
                            >
                                <SlidersHorizontal className="h-5 w-5" />
                                {activeFiltersCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-jobs-accent text-white text-xs font-black h-5 w-5 rounded-full flex items-center justify-center">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {selectedCategory && (
                            <span className="inline-flex items-center gap-1 bg-jobs-primary/10 text-jobs-primary px-3 py-1 rounded-full text-sm font-bold">
                                {JOB_CATEGORIES[selectedCategory as keyof typeof JOB_CATEGORIES]}
                                <button onClick={() => setSelectedCategory('')}>
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {selectedLocation && (
                            <span className="inline-flex items-center gap-1 bg-jobs-primary/10 text-jobs-primary px-3 py-1 rounded-full text-sm font-bold">
                                {selectedLocation}
                                <button onClick={() => setSelectedLocation('')}>
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {remoteOnly && (
                            <span className="inline-flex items-center gap-1 bg-jobs-primary/10 text-jobs-primary px-3 py-1 rounded-full text-sm font-bold">
                                Remote Only
                                <button onClick={() => setRemoteOnly(false)}>
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {activeFiltersCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="text-sm font-bold text-gray-500 hover:text-jobs-primary transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex gap-8">
                    {/* Filters Sidebar */}
                    <div className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-64 flex-shrink-0`}>
                        <div className="bg-white rounded-2xl p-6 border border-gray-200 sticky top-32">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-jobs-dark">Filters</h3>
                                {activeFiltersCount > 0 && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm font-bold text-jobs-primary hover:underline"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

<<<<<<< HEAD
                            <div className="space-y-6">
                                {/* Category Filter */}
                                <div>
                                    <label className="block text-sm font-bold text-jobs-dark mb-2">
                                        Category
                                    </label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jobs-primary focus:border-transparent"
                                    >
                                        <option value="">All Categories</option>
                                        {Object.entries(JOB_CATEGORIES).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Location Filter */}
                                <div>
                                    <label className="block text-sm font-bold text-jobs-dark mb-2">
                                        Location
                                    </label>
                                    <select
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jobs-primary focus:border-transparent"
                                    >
                                        <option value="">All Locations</option>
                                        {PAKISTANI_CITIES.map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Employment Type */}
                                <div>
                                    <label className="block text-sm font-bold text-jobs-dark mb-2">
                                        Employment Type
                                    </label>
                                    <select
                                        value={selectedEmploymentType}
                                        onChange={(e) => setSelectedEmploymentType(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jobs-primary focus:border-transparent"
                                    >
                                        <option value="">All Types</option>
                                        {Object.entries(EMPLOYMENT_TYPES).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Salary Range */}
                                <div>
                                    <label className="block text-sm font-bold text-jobs-dark mb-2">
                                        Salary Range (PKR)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            value={minSalary}
                                            onChange={(e) => setMinSalary(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jobs-primary focus:border-transparent"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            value={maxSalary}
                                            onChange={(e) => setMaxSalary(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jobs-primary focus:border-transparent"
                                        />
=======
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
>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b
                                    </div>
                                </div>

                                {/* Remote Only */}
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={remoteOnly}
                                            onChange={(e) => setRemoteOnly(e.target.checked)}
                                            className="rounded border-gray-300 text-jobs-primary focus:ring-jobs-primary"
                                        />
                                        <span className="text-sm font-bold text-jobs-dark">
                                            Remote jobs only
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="flex-1">
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-jobs-dark">
                                    {loading ? 'Searching...' : `${totalResults} Jobs Found`}
                                </h2>
                                {searchQuery && (
                                    <p className="text-gray-600 mt-1">
                                        Results for "<span className="font-bold">{searchQuery}</span>"
                                    </p>
                                )}
                            </div>

                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jobs-primary focus:border-transparent font-medium"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="salary_high">Highest Salary</option>
                                <option value="salary_low">Lowest Salary</option>
                            </select>
                        </div>

                        {/* Jobs Grid */}
                        {loading && jobs.length === 0 ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-12 w-12 animate-spin text-jobs-primary" />
                            </div>
                        ) : jobs.length > 0 ? (
                            <>
                                <JobGrid jobs={jobs} showMatchScore={!!profile} />

                                {/* Load More */}
                                {hasMore && (
                                    <div className="mt-8 text-center">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loading}
                                            className="bg-white text-jobs-primary border-2 border-jobs-primary px-8 py-3 rounded-xl font-black hover:bg-jobs-primary hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                                                    Loading...
                                                </>
                                            ) : (
                                                'Load More Jobs'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                                <Briefcase className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-xl font-black text-jobs-dark mb-2">No jobs found</h3>
                                <p className="text-gray-600 mb-6">Try adjusting your search criteria</p>
                                <button
                                    onClick={clearFilters}
                                    className="bg-jobs-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}