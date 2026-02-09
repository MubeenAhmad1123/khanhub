'use client';

// Enhanced useAuth Hook - Complete Authentication Management
import { useState, useEffect } from 'react';
import {
    User as FirebaseUser,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile as firebaseUpdateProfile,
    GoogleAuthProvider,
    onAuthStateChanged,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { getUserProfile, createUserProfile, updateUserProfile } from '@/lib/firebase/auth';
import { User, UserRole } from '@/types/user';

export interface AuthState {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    error: string | null;
}

export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        firebaseUser: null,
        loading: true,
        error: null,
    });

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Fetch full user profile from Firestore
                    const userProfile = await getUserProfile(firebaseUser.uid);
                    setAuthState({
                        user: userProfile,
                        firebaseUser,
                        loading: false,
                        error: null,
                    });
                } catch (err) {
                    console.error('Error fetching user data:', err);
                    setAuthState({
                        user: null,
                        firebaseUser,
                        loading: false,
                        error: 'Failed to load user data',
                    });
                }
            } else {
                setAuthState({
                    user: null,
                    firebaseUser: null,
                    loading: false,
                    error: null,
                });
            }
        });

        return () => unsubscribe();
    }, []);

    /**
     * Register with email and password
     */
    const register = async (
        email: string,
        password: string,
        displayName: string,
        role: UserRole
    ): Promise<void> => {
        const trimmedEmail = email.trim();
        try {
            setAuthState(prev => ({ ...prev, loading: true, error: null }));

            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

            // Update display name
            await firebaseUpdateProfile(userCredential.user, { displayName });

            // Send verification email
            await sendEmailVerification(userCredential.user);

            // Create user profile in Firestore
            await createUserProfile({
                uid: userCredential.user.uid,
                email: trimmedEmail,
                displayName,
                role,
                emailVerified: false,
                paymentStatus: 'pending',
                isPremium: false,
                applicationsUsed: 0,
                premiumJobsViewed: 0,
                points: 0,
                isActive: true,
                isFeatured: false,
                isBanned: false,
                onboardingCompleted: false,
            });

            // Fetch the created profile
            const userProfile = await getUserProfile(userCredential.user.uid);

            setAuthState({
                user: userProfile,
                firebaseUser: userCredential.user,
                loading: false,
                error: null,
            });
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Registration failed',
            }));
            throw error;
        }
    };

    /**
     * Login with email and password
     */
    const login = async (email: string, password: string): Promise<void> => {
        const trimmedEmail = email.trim();
        try {
            setAuthState(prev => ({ ...prev, loading: true, error: null }));

            const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
            const userProfile = await getUserProfile(userCredential.user.uid);

            if (userProfile) {
                // Update last login time
                await updateUserProfile(userCredential.user.uid, {
                    lastLoginAt: new Date(),
                });
            }

            setAuthState({
                user: userProfile,
                firebaseUser: userCredential.user,
                loading: false,
                error: null,
            });
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Login failed',
            }));
            throw error;
        }
    };

    /**
     * Login with Google
     */
    const loginWithGoogle = async (role: UserRole): Promise<void> => {
        try {
            setAuthState(prev => ({ ...prev, loading: true, error: null }));

            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);

            // Check if user already exists
            let userProfile = await getUserProfile(userCredential.user.uid);

            if (!userProfile) {
                // Create new user profile
                await createUserProfile({
                    uid: userCredential.user.uid,
                    email: userCredential.user.email!,
                    displayName: userCredential.user.displayName || 'User',
                    photoURL: userCredential.user.photoURL,
                    role,
                    emailVerified: userCredential.user.emailVerified,
                    paymentStatus: 'pending',
                    isPremium: false,
                    applicationsUsed: 0,
                    premiumJobsViewed: 0,
                    points: 0,
                    isActive: true,
                    isFeatured: false,
                    isBanned: false,
                    onboardingCompleted: false,
                });

                userProfile = await getUserProfile(userCredential.user.uid);
            }

            setAuthState({
                user: userProfile,
                firebaseUser: userCredential.user,
                loading: false,
                error: null,
            });
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Google login failed',
            }));
            throw error;
        }
    };

    /**
     * Logout
     */
    const logout = async (): Promise<void> => {
        try {
            await firebaseSignOut(auth);
            setAuthState({
                user: null,
                firebaseUser: null,
                loading: false,
                error: null,
            });
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                error: error.message || 'Logout failed',
            }));
            throw error;
        }
    };

    /**
     * Reset password
     */
    const resetPassword = async (email: string): Promise<void> => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            throw error;
        }
    };

    /**
     * Resend verification email
     */
    const resendVerificationEmail = async (): Promise<void> => {
        if (!authState.firebaseUser) {
            throw new Error('No user logged in');
        }

        try {
            await sendEmailVerification(authState.firebaseUser);
        } catch (error: any) {
            throw error;
        }
    };

    /**
     * Update user profile
     */
    const updateProfile = async (updates: Partial<User>): Promise<void> => {
        if (!authState.user) {
            throw new Error('No user logged in');
        }

        try {
            await updateUserProfile(authState.user.uid, updates);

            // Refresh user profile
            const updatedProfile = await getUserProfile(authState.user.uid);
            setAuthState(prev => ({
                ...prev,
                user: updatedProfile,
            }));
        } catch (error: any) {
            throw error;
        }
    };

    /**
     * Refresh user profile from Firestore
     */
    const refreshProfile = async (): Promise<void> => {
        if (!authState.user) return;

        try {
            const updatedProfile = await getUserProfile(authState.user.uid);
            setAuthState(prev => ({
                ...prev,
                user: updatedProfile,
            }));
        } catch (error: any) {
            console.error('Error refreshing profile:', error);
        }
    };

    return {
        user: authState.user,
        profile: authState.user,
        firebaseUser: authState.firebaseUser,
        loading: authState.loading,
        error: authState.error,
        isAuthenticated: !!authState.user,
        isJobSeeker: authState.user?.role === 'job_seeker',
        isEmployer: authState.user?.role === 'employer',
        isAdmin: authState.user?.role === 'admin',
        isPremium: authState.user?.isPremium || false,
        hasPaymentApproved: authState.user?.paymentStatus === 'approved',
        isOnboardingCompleted: authState.user?.onboardingCompleted || false,
        register,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        resendVerificationEmail,
        updateProfile,
        refreshProfile,
    };
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
            user.premiumEndDate instanceof Date ? user.premiumEndDate : (user.premiumEndDate as any).toDate()
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