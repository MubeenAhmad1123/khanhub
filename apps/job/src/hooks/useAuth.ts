'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile } from '@/lib/firebase/auth';
import { UserProfile } from '@/types/user';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    const userProfile = await getUserProfile(firebaseUser.uid);
                    setProfile(userProfile);
                } catch (err) {
                    console.error('Error fetching user profile:', err);
                    setError('Failed to load user profile');
                }
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return {
        user,
        profile,
        loading,
        error,
        isAuthenticated: !!user,
        isJobSeeker: profile?.role === 'job_seeker',
        isEmployer: profile?.role === 'employer',
        isAdmin: profile?.role === 'admin',
        isPremium: profile?.isPremium || false,
        registrationApproved: profile?.registrationApproved || false,
    };
}
