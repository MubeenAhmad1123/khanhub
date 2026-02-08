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
import { auth } from './firebase-config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase-config';
import { User, UserRole, CreateUserData } from '@/types/user';

// ==================== SIGN UP ====================

export interface SignUpData {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
}

export const signUpWithEmail = async (
    data: SignUpData
): Promise<{ user: FirebaseUser; userData: User }> => {
    try {
        // Create Firebase auth user
        const userCredential: UserCredential = await createUserWithEmailAndPassword(
            auth,
            data.email,
            data.password
        );

        const firebaseUser = userCredential.user;

        // Update display name
        await updateProfile(firebaseUser, {
            displayName: data.displayName,
        });

        // Send email verification
        await sendEmailVerification(firebaseUser);

        // Create user document in Firestore
        const userData: User = {
            uid: firebaseUser.uid,
            email: data.email,
            displayName: data.displayName,
            photoURL: firebaseUser.photoURL || undefined,
            emailVerified: false,
            role: data.role,

            // Payment status (for job seekers)
            paymentStatus: data.role === 'job_seeker' ? 'pending' : 'approved',
            isPremium: false,

            // Usage limits
            applicationsUsed: 0,
            premiumJobsViewed: 0,

            // Points
            points: 0,
            pointsHistory: [],

            // Metadata
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
            lastLoginAt: serverTimestamp() as any,

            // Flags
            isActive: true,
            isFeatured: false,
            isBanned: false,
        };

        // Save to Firestore
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);

        return { user: firebaseUser, userData };
    } catch (error: any) {
        console.error('Sign up error:', error);
        throw new Error(getAuthErrorMessage(error.code));
    }
};

// ==================== SIGN IN ====================

export const signInWithEmail = async (
    email: string,
    password: string
): Promise<FirebaseUser> => {
    try {
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        // Update last login time
        await setDoc(
            doc(db, 'users', userCredential.user.uid),
            {
                lastLoginAt: serverTimestamp(),
            },
            { merge: true }
        );

        return userCredential.user;
    } catch (error: any) {
        console.error('Sign in error:', error);
        throw new Error(getAuthErrorMessage(error.code));
    }
};

// ==================== GOOGLE AUTH ====================

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<{
    user: FirebaseUser;
    isNewUser: boolean;
}> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;

        // Check if user document exists
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const isNewUser = !userDoc.exists();

        if (isNewUser) {
            // Create new user document
            const userData: User = {
                uid: firebaseUser.uid,
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName || 'User',
                photoURL: firebaseUser.photoURL || undefined,
                emailVerified: firebaseUser.emailVerified,
                role: 'job_seeker', // Default role

                paymentStatus: 'pending',
                isPremium: false,

                applicationsUsed: 0,
                premiumJobsViewed: 0,

                points: 0,
                pointsHistory: [],

                createdAt: serverTimestamp() as any,
                updatedAt: serverTimestamp() as any,
                lastLoginAt: serverTimestamp() as any,

                isActive: true,
                isFeatured: false,
                isBanned: false,
            };

            await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        } else {
            // Update last login
            await setDoc(
                doc(db, 'users', firebaseUser.uid),
                {
                    lastLoginAt: serverTimestamp(),
                },
                { merge: true }
            );
        }

        return { user: firebaseUser, isNewUser };
    } catch (error: any) {
        console.error('Google sign in error:', error);
        throw new Error(getAuthErrorMessage(error.code));
    }
};

// ==================== SIGN OUT ====================

export const logOut = async (): Promise<void> => {
    try {
        await signOut(auth);
    } catch (error: any) {
        console.error('Sign out error:', error);
        throw new Error('Failed to sign out. Please try again.');
    }
};

// ==================== EMAIL VERIFICATION ====================

export const sendVerificationEmail = async (): Promise<void> => {
    try {
        if (!auth.currentUser) {
            throw new Error('No user is currently signed in');
        }

        await sendEmailVerification(auth.currentUser);
    } catch (error: any) {
        console.error('Email verification error:', error);
        throw new Error('Failed to send verification email. Please try again.');
    }
};

export const checkEmailVerified = async (): Promise<boolean> => {
    try {
        if (!auth.currentUser) return false;

        await auth.currentUser.reload();
        return auth.currentUser.emailVerified;
    } catch (error) {
        console.error('Check email verified error:', error);
        return false;
    }
};

// ==================== PASSWORD RESET ====================

export const resetPassword = async (email: string): Promise<void> => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
        console.error('Password reset error:', error);
        throw new Error(getAuthErrorMessage(error.code));
    }
};

// ==================== UPDATE PROFILE ====================

export const updateUserProfile = async (data: {
    displayName?: string;
    photoURL?: string;
}): Promise<void> => {
    try {
        if (!auth.currentUser) {
            throw new Error('No user is currently signed in');
        }

        await updateProfile(auth.currentUser, data);

        // Update Firestore
        await setDoc(
            doc(db, 'users', auth.currentUser.uid),
            {
                ...data,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (error: any) {
        console.error('Update profile error:', error);
        throw new Error('Failed to update profile. Please try again.');
    }
};

// ==================== UPDATE EMAIL ====================

export const updateUserEmail = async (newEmail: string): Promise<void> => {
    try {
        if (!auth.currentUser) {
            throw new Error('No user is currently signed in');
        }

        await updateEmail(auth.currentUser, newEmail);

        // Update Firestore
        await setDoc(
            doc(db, 'users', auth.currentUser.uid),
            {
                email: newEmail,
                emailVerified: false,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        // Send verification email for new email
        await sendEmailVerification(auth.currentUser);
    } catch (error: any) {
        console.error('Update email error:', error);
        throw new Error(getAuthErrorMessage(error.code));
    }
};

// ==================== UPDATE PASSWORD ====================

export const updateUserPassword = async (newPassword: string): Promise<void> => {
    try {
        if (!auth.currentUser) {
            throw new Error('No user is currently signed in');
        }

        await updatePassword(auth.currentUser, newPassword);
    } catch (error: any) {
        console.error('Update password error:', error);
        throw new Error(getAuthErrorMessage(error.code));
    }
};

// ==================== GET CURRENT USER ====================

export const getCurrentUser = (): FirebaseUser | null => {
    return auth.currentUser;
};

export const getCurrentUserId = (): string | null => {
    return auth.currentUser?.uid || null;
};

// ==================== ERROR MESSAGES ====================

export const getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please sign in instead.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/operation-not-allowed':
            return 'Operation not allowed. Please contact support.';
        case 'auth/weak-password':
            return 'Password is too weak. Use at least 8 characters with letters and numbers.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed. Please try again.';
        case 'auth/cancelled-popup-request':
            return 'Sign-in cancelled. Please try again.';
        case 'auth/requires-recent-login':
            return 'Please sign in again to complete this action.';
        default:
            return 'An error occurred. Please try again.';
    }
};

// ==================== VALIDATION ====================

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password)
    );
};

export const getPasswordStrength = (password: string): {
    score: number; // 0-4
    label: string;
    color: string;
} => {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const strength = Math.min(score, 4);

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['red', 'orange', 'yellow', 'blue', 'green'];

    return {
        score: strength,
        label: labels[strength],
        color: colors[strength],
    };
};