// Firebase Authentication Helpers
// Authentication utility functions for user management

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword,
    User as FirebaseUser,
    UserCredential,
} from 'firebase/auth';
import { auth, db } from './firebase-config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { User, UserRole, CreateUserData } from '@/types/user';

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<User | null> {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));

        if (userDoc.exists()) {
            return {
                uid,
                ...userDoc.data(),
            } as User;
        }

        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

/**
 * Create new user profile in Firestore
 */
export async function createUserProfile(userData: Partial<User>): Promise<void> {
    try {
        const { uid, ...data } = userData;

        if (!uid) throw new Error('User ID is required');

        await setDoc(doc(db, 'users', uid), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
    try {
        const { doc, setDoc, serverTimestamp, getDoc } = await import('firebase/firestore');
        // Dynamic import to avoid circular dependency if any, though pointSystem doesn't import auth.ts usually
        const { calculateProfileStrength } = await import('@/lib/services/pointsSystem');

        const userRef = doc(db, 'users', uid);

        // 1. Get current data to ensure complete profile for calculation
        const currentDoc = await getDoc(userRef);
        const currentData = currentDoc.data() as User | undefined;

        // 2. Prepare updates with recalculated strength if applicable
        let finalUpdates = { ...updates };

        // Only recalculate if we have profile data to work with or are updating profile
        if (currentData?.role === 'job_seeker' || updates.role === 'job_seeker' || updates.profile) {
            const currentProfile = currentData?.profile || {};
            const updatesProfile = updates.profile || {};

            // Merge existing profile with updates to get complete state
            const mergedProfile = {
                ...currentProfile,
                ...updatesProfile
            };

            // Calculate new strength
            const newStrength = calculateProfileStrength(mergedProfile);

            // Apply new strength to updates
            finalUpdates = {
                ...finalUpdates,
                profile: {
                    ...updatesProfile,
                    profileStrength: newStrength
                } as any
            };

            // Also update the top-level profileStrength if it exists on User type (it doesn't seems so based on types, 
            // but let's stick to profile.profileStrength as defined in User type)
        }

        await setDoc(userRef, {
            ...finalUpdates,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}

/**
 * Check if user exists
 */
export async function userExists(uid: string): Promise<boolean> {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        return userDoc.exists();
    } catch (error) {
        console.error('Error checking user existence:', error);
        return false;
    }
}