// src/hooks/useEmployerRealtime.ts
// Real-time hooks for employer data

import { useState, useEffect } from 'react';
import { Job, JobStatus } from '@/types/job';
import { Application } from '@/types/application';
import { subscribeToEmployerJobs, subscribeToEmployerApplications } from '@/lib/firebase/firestore';
import { Unsubscribe } from 'firebase/firestore';

/**
 * Hook to get employer's jobs with real-time updates
 */
export function useEmployerJobs(
    employerId: string | undefined,
    statusFilter: 'all' | 'active' | 'pending' | 'closed' = 'all'
) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!employerId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Set up real-time listener
        const unsubscribe = subscribeToEmployerJobs(
            employerId,
            (updatedJobs) => {
                setJobs(updatedJobs);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            },
            statusFilter
        );

        // Cleanup function - CRITICAL to prevent memory leaks
        return () => {
            unsubscribe();
        };
    }, [employerId, statusFilter]);

    // Calculate stats
    const stats = {
        total: jobs.length,
        active: jobs.filter((j) => j.status === 'active').length,
        pending: jobs.filter((j) => j.status === 'pending').length,
        closed: jobs.filter((j) => j.status === 'closed').length,
    };

    return { jobs, loading, error, stats };
}

/**
 * Hook to get employer's applications with real-time updates
 */
export function useEmployerApplications(employerId: string | undefined) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!employerId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Set up real-time listener
        const unsubscribe = subscribeToEmployerApplications(
            employerId,
            (updatedApplications) => {
                setApplications(updatedApplications);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        // Cleanup function
        return () => {
            unsubscribe();
        };
    }, [employerId]);

    // Calculate stats
    const stats = {
        total: applications.length,
        applied: applications.filter((a) => a.status === 'applied').length,
        shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
        rejected: applications.filter((a) => a.status === 'rejected').length,
        hired: applications.filter((a) => a.status === 'hired').length,
    };

    return { applications, loading, error, stats };
}

/**
 * Combined hook for employer dashboard (jobs + applications)
 */
export function useEmployerDashboard(employerId: string | undefined) {
    const { jobs, loading: jobsLoading, error: jobsError } = useEmployerJobs(employerId);
    const {
        applications,
        loading: appsLoading,
        error: appsError,
    } = useEmployerApplications(employerId);

    const loading = jobsLoading || appsLoading;
    const error = jobsError || appsError;

    // Calculate comprehensive stats
    const stats = {
        activeJobs: jobs.filter((j) => j.status === 'active').length,
        totalApplications: applications.length,
        pendingReview: jobs.filter((j) => j.status === 'pending').length,
        totalViews: jobs.reduce((sum, j) => sum + (j.viewCount || 0), 0),
    };

    // Get recent jobs (limit to 4)
    const recentJobs = jobs.slice(0, 4);

    return {
        jobs,
        applications,
        recentJobs,
        stats,
        loading,
        error,
    };
}