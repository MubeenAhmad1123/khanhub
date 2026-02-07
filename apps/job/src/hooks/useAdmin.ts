'use client';

import { useState, useEffect } from 'react';
import { getPendingPayments, getAllPlacements } from '@/lib/firebase/firestore';
import { Payment } from '@/types/payment';
import { Placement } from '@/types/admin';

export function useAdmin() {
    const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
    const [placements, setPlacements] = useState<Placement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            const [payments, placementsData] = await Promise.all([
                getPendingPayments(),
                getAllPlacements(),
            ]);

            setPendingPayments(payments);
            setPlacements(placementsData);
        } catch (err) {
            console.error('Error loading admin data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    return {
        pendingPayments,
        placements,
        loading,
        error,
        refresh: loadData,
    };
}
