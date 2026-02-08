// ==========================================
// CUSTOM HOOKS - AUTHENTICATION (FIXED)
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase/firebase-config'; // ✅ Correct path
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { User, COLLECTIONS } from '@/types/DATABASE_SCHEMA'; // ✅ Updated path

interface UseAuthReturn {
    user: User | null;
    loading: boolean;
    error: string | null;
}

/**
 * Custom hook for authentication
 * Returns current user with role and profile data
 */
export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                try {
                    // Fetch user document from Firestore
                    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));

                    if (userDoc.exists()) {
                        setUser({ id: userDoc.id, ...userDoc.data() } as unknown as User);
                    } else {
                        setError('User profile not found');
                        setUser(null);
                    }
                } catch (err) {
                    console.error('Error fetching user data:', err);
                    setError('Failed to load user data');
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading, error };
}

/**
 * Hook to check if user has paid registration fee
 */
export function usePaymentStatus() {
    const { user, loading } = useAuth();

    if (loading) return { paymentApproved: false, loading: true };

    if (user && 'paymentStatus' in user) {
        return { paymentApproved: user.paymentStatus === 'approved', loading: false };
    }

    return { paymentApproved: false, loading: false };
}

/**
 * Hook to check if user has active premium membership
 */
export function usePremiumStatus() {
    const { user, loading } = useAuth();

    if (loading) return { isPremium: false, loading: true };

    if (user && 'isPremium' in user) {
        // Check if premium is active and not expired
        const isPremium = user.isPremium && user.premiumEndDate && (
            user.premiumEndDate instanceof Date ? user.premiumEndDate : user.premiumEndDate.toDate()
        ) > new Date();
        return { isPremium, loading: false };
    }

    return { isPremium: false, loading: false };
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin() {
    const { user, loading } = useAuth();

    if (loading) return { isAdmin: false, loading: true };

    return { isAdmin: user?.role === 'admin', loading: false };
}