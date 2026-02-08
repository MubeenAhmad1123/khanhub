'use client';

import { useState, useEffect, useCallback } from 'react';
import { JobSeekerProfile } from '@/types/user';
import { updateDocument, COLLECTIONS } from '@/lib/firebase/firestore';
import { calculateProfileStrength, getProfileImprovementSteps } from '@/lib/services/pointsSystem';

export function useProfile(userId: string | null, initialProfile: JobSeekerProfile | null) {
    const [profile, setProfile] = useState<JobSeekerProfile | null>(initialProfile);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const profileStrength = profile ? calculateProfileStrength(profile) : 0;
    const improvementSteps = profile ? getProfileImprovementSteps(profile) : [];

    const updateProfile = useCallback(async (updates: Partial<JobSeekerProfile>) => {
        if (!userId) {
            setError('User not authenticated');
            return;
        }

        setUpdating(true);
        setError(null);

        try {
            // Update Firestore directly for full profile updates
            await updateDocument(COLLECTIONS.USERS, userId, updates);

            // Update local state
            setProfile(prev => prev ? { ...prev, ...updates } : null);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Failed to update profile');
            throw err;
        } finally {
            setUpdating(false);
        }
    }, [userId]);

    return {
        profile,
        profileStrength,
        improvementSteps,
        updating,
        error,
        updateProfile,
    };
}
