// useJobs Hook - Job Fetching and Management
import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toDate } from '@/lib/firebase/firestore';
import { Job, JobFilters, JobSortOption } from '@/types/job';
import { useAuth } from './useAuth';
import { calculateMatchScore } from '@/lib/services/matchingAlgorithm';
import { isJobSeeker } from '@/types/user';

export function useJobs(filters?: JobFilters, sortBy: JobSortOption = 'newest') {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let q = query(
                collection(db, 'jobs'),
                where('status', '==', 'active'),
                orderBy('postedAt', 'desc')
            );

            // Apply filters
            if (filters?.categories && filters.categories.length > 0) {
                q = query(q, where('category', 'in', filters.categories));
            }

            if (filters?.cities && filters.cities.length > 0) {
                q = query(q, where('city', 'in', filters.cities));
            }

            if (filters?.employmentTypes && filters.employmentTypes.length > 0) {
                q = query(q, where('employmentType', 'in', filters.employmentTypes));
            }

            if (filters?.remoteOnly) {
                q = query(q, where('isRemote', '==', true));
            }

            const snapshot = await getDocs(q);
            let jobsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Job[];

            // Client-side filtering for salary range
            if (filters?.minSalary) {
                jobsData = jobsData.filter(job => job.salaryMax >= filters.minSalary!);
            }

            if (filters?.maxSalary) {
                jobsData = jobsData.filter(job => job.salaryMin <= filters.maxSalary!);
            }

            // Client-side search
            if (filters?.searchQuery) {
                const queryStr = filters.searchQuery.toLowerCase();
                jobsData = jobsData.filter(job =>
                    job.title.toLowerCase().includes(queryStr) ||
                    job.companyName.toLowerCase().includes(queryStr) ||
                    job.description.toLowerCase().includes(queryStr) ||
                    job.requiredSkills.some(skill => skill.toLowerCase().includes(queryStr))
                );
            }

            // Calculate match scores if user is job seeker
            if (user && isJobSeeker(user)) {
                jobsData = jobsData.map(job => ({
                    ...job,
                    matchScore: calculateMatchScore(user, job),
                }));
            }

            // Sort jobs
            jobsData = sortJobs(jobsData, sortBy);

            setJobs(jobsData);
        } catch (err: any) {
            console.error('Error fetching jobs:', err);
            setError(err.message || 'Failed to fetch jobs');
        } finally {
            setLoading(false);
        }
    }, [filters, sortBy, user]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    return { jobs, loading, error, refetch: fetchJobs };
}

export function useJob(jobId: string) {
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchJob();
    }, [jobId]);

    const fetchJob = async () => {
        try {
            setLoading(true);
            setError(null);

            const docRef = doc(db, 'jobs', jobId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setJob({ id: docSnap.id, ...docSnap.data() } as Job);

                // Increment view count
                await updateDoc(docRef, {
                    viewCount: increment(1),
                });
            } else {
                setError('Job not found');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch job');
            console.error('Error fetching job:', err);
        } finally {
            setLoading(false);
        }
    };

    return { job, loading, error, refetch: fetchJob };
}

export function useFeaturedJobs(limitCount: number = 6) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFeaturedJobs();
    }, [limitCount]);

    const fetchFeaturedJobs = async () => {
        try {
            setLoading(true);
            setError(null);

            const q = query(
                collection(db, 'jobs'),
                where('status', '==', 'active'),
                where('isFeatured', '==', true),
                orderBy('postedAt', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            const jobsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Job[];

            setJobs(jobsData);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch featured jobs');
            console.error('Error fetching featured jobs:', err);
        } finally {
            setLoading(false);
        }
    };

    return { jobs, loading, error, refetch: fetchFeaturedJobs };
}

export function useRecentJobs(limitCount: number = 12) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRecentJobs();
    }, [limitCount]);

    const fetchRecentJobs = async () => {
        try {
            setLoading(true);
            setError(null);

            const q = query(
                collection(db, 'jobs'),
                where('status', '==', 'active'),
                orderBy('postedAt', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            const jobsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Job[];

            setJobs(jobsData);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch recent jobs');
            console.error('Error fetching recent jobs:', err);
        } finally {
            setLoading(false);
        }
    };

    return { jobs, loading, error, refetch: fetchRecentJobs };
}

// Helper function to sort jobs
function sortJobs(jobs: Job[], sortBy: JobSortOption): Job[] {
    switch (sortBy) {
        case 'newest':
            return [...jobs].sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());
        case 'oldest':
            return [...jobs].sort((a, b) => toDate(a.postedAt).getTime() - toDate(b.postedAt).getTime());
        case 'salary_high':
            return [...jobs].sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0));
        case 'salary_low':
            return [...jobs].sort((a, b) => (a.salaryMin || 0) - (b.salaryMin || 0));
        case 'match_score':
            return [...jobs].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        case 'most_viewed':
            return [...jobs].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        case 'most_applications':
            return [...jobs].sort((a, b) => (b.applicantCount || 0) - (a.applicantCount || 0));
        default:
            return jobs;
    }
}