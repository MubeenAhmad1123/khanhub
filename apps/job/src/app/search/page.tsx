'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Briefcase, DollarSign, X, SlidersHorizontal, Loader2, Filter } from 'lucide-react';
import JobGrid from '@/components/jobs/JobGrid';
import { useAuth } from '@/hooks/useAuth';
import { Job, PAKISTANI_CITIES, JOB_CATEGORIES, EMPLOYMENT_TYPES } from '@/types/job';
import { queryDocuments, queryDocumentsPaginated, where, orderBy, limit, startAfter, QueryDocumentSnapshot } from '@/lib/firebase/firestore';
import type { QueryConstraint } from 'firebase/firestore';

export default function SearchPage() {
    const searchParams = useSearchParams();
    const { profile } = useAuth();

    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false); // Added loadingMore state
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

    const fetchJobs = useCallback(async (reset = false) => {
        try {
            // Reset states when starting new search
            if (reset) {
                console.log('[Search Debug] Starting new search - resetting states');
                setLoading(true);
                setJobs([]);
                setTotalResults(0);
                setLastDoc(null);
            } else {
                console.log('[Search Debug] Loading more results');
                setLoadingMore(true);
            }

            // Build query constraints
            const constraints: QueryConstraint[] = [
                where('status', '==', 'active')
            ];

            // Add filters
            if (selectedCategory && selectedCategory !== '') {
                constraints.push(where('category', '==', selectedCategory));
            }

            if (selectedLocation && selectedLocation !== 'all' && selectedLocation !== '') {
                constraints.push(where('city', '==', selectedLocation));
            }

            if (selectedEmploymentType && selectedEmploymentType !== '') {
                constraints.push(where('employmentType', '==', selectedEmploymentType));
            }

            if (remoteOnly) {
                constraints.push(where('isRemote', '==', true));
            }

            // Add sorting
            const sortField = sortBy === 'salary_high' ? 'salaryMax' :
                sortBy === 'salary_low' ? 'salaryMin' :
                    'createdAt'; // Changed from postedAt to createdAt
            const sortDirection = sortBy === 'salary_low' ? 'asc' : 'desc';

            constraints.push(orderBy(sortField, sortDirection));
            const { documents: results, lastDoc: newLastDoc } = await queryDocumentsPaginated<Job>(
                'jobs',
                constraints,
                PAGE_SIZE,
                reset ? undefined : (lastDoc || undefined)
            );

            // Filter by search query and salary (client-side post-processing)
            let processedJobs = [...results];

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                processedJobs = processedJobs.filter(job =>
                    (job.title?.toLowerCase().includes(query) || '') ||
                    (job.companyName?.toLowerCase().includes(query) || (job as any).company?.toLowerCase().includes(query) || '') ||
                    (job.description?.toLowerCase().includes(query) || '') ||
                    (job.requiredSkills?.some(skill => skill.toLowerCase().includes(query)) || false)
                );
            }

            if (minSalary) {
                processedJobs = processedJobs.filter(job => (job.salaryMax || 0) >= parseInt(minSalary));
            }

            if (maxSalary) {
                processedJobs = processedJobs.filter(job => (job.salaryMin || 0) <= parseInt(maxSalary));
            }

            if (reset) {
                setJobs(processedJobs);
                setTotalResults(processedJobs.length);
                console.log(`[Search Debug] Search completed: ${processedJobs.length} jobs found`);
            } else {
                setJobs(prev => [...prev, ...processedJobs]);
                setTotalResults(prev => prev + processedJobs.length);
                console.log(`[Search Debug] Loaded ${processedJobs.length} more jobs`);
            }

            setHasMore(results.length === PAGE_SIZE);
            setLastDoc(newLastDoc);
        } catch (error) {
            console.error('[Search Error] Failed to fetch jobs:', error);
            if (reset) {
                setJobs([]);
                setTotalResults(0);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [searchQuery, selectedCategory, selectedLocation, selectedEmploymentType, remoteOnly, sortBy, lastDoc, minSalary, maxSalary]);

    useEffect(() => {
        fetchJobs(true);
    }, [fetchJobs]);

    const handleSearch = () => {
        fetchJobs(true);
    };

    const handleLoadMore = () => {
        fetchJobs(false);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedLocation('');
        setSelectedCategory('');
        setSelectedEmploymentType('');
        setMinSalary('');
        setMaxSalary('');
        setRemoteOnly(false);
        fetchJobs(true);
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                        {/* Auth CTA for non-logged-in users */}
                        {!profile && (
                            <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-6 rounded-2xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                                <div>
                                    <h3 className="font-black text-xl mb-1 flex items-center gap-2">
                                        🚀 Boost Your Career
                                    </h3>
                                    <p className="text-white/90 font-medium">
                                        Create a profile to save jobs, track applications, and get headhunted.
                                    </p>
                                </div>
                                <div className="flex gap-3 whitespace-nowrap">
                                    <Link
                                        href="/auth/login"
                                        className="bg-white/20 hover:bg-white/30 text-white border border-white/40 px-6 py-2 rounded-xl font-bold transition-all backdrop-blur-sm"
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        href="/auth/register"
                                        className="bg-white text-teal-700 px-6 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg"
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            </div>
                        )}

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