'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { useAuth } from './useAuth';

export interface AdminStats {
    totalUsers: number;
    totalCandidates: number;
    totalCompanies: number;
    pendingPayments: number;
    pendingVideos: number;
    liveVideos: number;
    totalConnections: number;
    totalRevenue: number;
    loading: boolean;
}

export function useAdminStats(): AdminStats {
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        totalCandidates: 0,
        totalCompanies: 0,
        pendingPayments: 0,
        pendingVideos: 0,
        liveVideos: 0,
        totalConnections: 0,
        totalRevenue: 0,
        loading: true,
    });

    const { user } = useAuth();

    useEffect(() => {
        if (user?.role !== 'admin') {
            setStats(prev => ({ ...prev, loading: false }));
            return;
        }

        const unsubs: (() => void)[] = [];

        // Total users and role breakdown
        unsubs.push(
            onSnapshot(collection(db, 'users'), (snap) => {
                let candidates = 0;
                let companies = 0;
                snap.docs.forEach(doc => {
                    const role = doc.data().role;
                    if (role === 'job_seeker') candidates++;
                    if (role === 'employer') companies++;
                });
                setStats(prev => ({
                    ...prev,
                    totalUsers: snap.size,
                    totalCandidates: candidates,
                    totalCompanies: companies,
                    loading: false
                }));
            }, (err) => console.warn('[useAdminStats] Users error:', err.message))
        );

        // Pending payments count
        unsubs.push(
            onSnapshot(
                query(collection(db, 'payments'), where('status', '==', 'pending')),
                (snap) => setStats(prev => ({ ...prev, pendingPayments: snap.size })),
                (err) => console.warn('[useAdminStats] Pending payments error:', err.message)
            )
        );

        // Pending videos count
        unsubs.push(
            onSnapshot(
                query(collection(db, 'videos'), where('admin_status', '==', 'pending')),
                (snap) => setStats(prev => ({ ...prev, pendingVideos: snap.size })),
                (err) => console.warn('[useAdminStats] Pending videos error:', err.message)
            )
        );

        // Live videos count
        unsubs.push(
            onSnapshot(
                query(collection(db, 'videos'), where('is_live', '==', true)),
                (snap) => setStats(prev => ({ ...prev, liveVideos: snap.size })),
                (err) => console.warn('[useAdminStats] Live videos error:', err.message)
            )
        );

        // Total connections
        unsubs.push(
            onSnapshot(collection(db, 'connections'), (snap) =>
                setStats(prev => ({ ...prev, totalConnections: snap.size })),
                (err) => console.warn('[useAdminStats] Connections error:', err.message)
            )
        );

        // Total revenue — sum of all approved payments amounts
        unsubs.push(
            onSnapshot(
                query(collection(db, 'payments'), where('status', '==', 'approved')),
                (snap) => {
                    const total = snap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
                    setStats(prev => ({ ...prev, totalRevenue: total }));
                },
                (err) => console.warn('[useAdminStats] Approved payments error:', err.message)
            )
        );

        return () => unsubs.forEach(u => u());
    }, [user?.role]);

    return stats;
}
