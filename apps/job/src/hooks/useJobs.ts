'use client';

import { useState, useCallback } from 'react';
import { getActiveJobs, getJobsByCategory, getJobById } from '@/lib/firebase/firestore';
import { Job } from '@/types/job';

export function useJobs() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchActiveJobs = useCallback(async (limitCount?: number) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getActiveJobs(limitCount);
            setJobs(data as unknown as Job[]);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch jobs');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchJobsByCategory = useCallback(async (category: string, limitCount?: number) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getJobsByCategory(category, limitCount);
            setJobs(data as unknown as Job[]);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch jobs by category');
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        jobs,
        loading,
        error,
        fetchActiveJobs,
        fetchJobsByCategory,
    };
}
