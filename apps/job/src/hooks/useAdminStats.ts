'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

export interface AdminStats {
    totalUsers: number;
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
        pendingPayments: 0,
        pendingVideos: 0,
        liveVideos: 0,
        totalConnections: 0,
        totalRevenue: 0,
        loading: true,
    });

    useEffect(() => {
        const unsubs: (() => void)[] = [];

        // Total users
        unsubs.push(
            onSnapshot(collection(db, 'users'), (snap) =>
                setStats(prev => ({ ...prev, totalUsers: snap.size, loading: false }))
            )
        );

        // Pending payments count
        unsubs.push(
            onSnapshot(
                query(collection(db, 'payments'), where('status', '==', 'pending')),
                (snap) => setStats(prev => ({ ...prev, pendingPayments: snap.size }))
            )
        );

        // Pending videos count
        unsubs.push(
            onSnapshot(
                query(collection(db, 'videos'), where('admin_status', '==', 'pending')),
                (snap) => setStats(prev => ({ ...prev, pendingVideos: snap.size }))
            )
        );

        // Live videos count
        unsubs.push(
            onSnapshot(
                query(collection(db, 'videos'), where('is_live', '==', true)),
                (snap) => setStats(prev => ({ ...prev, liveVideos: snap.size }))
            )
        );

        // Total connections
        unsubs.push(
            onSnapshot(collection(db, 'connections'), (snap) =>
                setStats(prev => ({ ...prev, totalConnections: snap.size }))
            )
        );

        // Total revenue — sum of all approved payments amounts
        unsubs.push(
            onSnapshot(
                query(collection(db, 'payments'), where('status', '==', 'approved')),
                (snap) => {
                    const total = snap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
                    setStats(prev => ({ ...prev, totalRevenue: total }));
                }
            )
        );

        return () => unsubs.forEach(u => u());
    }, []);

    return stats;
}
