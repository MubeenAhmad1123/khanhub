'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User as FirebaseUser,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider } from '../lib/firebase';
import { AuthContextType, User } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const auth = getFirebaseAuth();

        const unsubscribe = onAuthStateChanged(
            auth,
            (firebaseUser) => {
                if (firebaseUser) {
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        phoneNumber: firebaseUser.phoneNumber,
                    });
                } else {
                    setUser(null);
                }
                setLoading(false);
                setError(null);
            },
            (error) => {
                console.error('Auth state change error:', error);
                setError(error.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async (): Promise<User> => {
        try {
            setError(null);
            const auth = getFirebaseAuth();
            const provider = getGoogleProvider();
            const result = await signInWithPopup(auth, provider);

            const user: User = {
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL,
                phoneNumber: result.user.phoneNumber,
            };

            return user;
        } catch (error: any) {
            console.error('Error signing in with Google:', error);
            const errorMessage = error.message || 'Failed to sign in with Google';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const signInWithEmail = async (email: string, password: string): Promise<User> => {
        try {
            setError(null);
            const auth = getFirebaseAuth();
            const result = await signInWithEmailAndPassword(auth, email, password);

            const user: User = {
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL,
                phoneNumber: result.user.phoneNumber,
            };

            return user;
        } catch (error: any) {
            console.error('Error signing in with email:', error);
            let errorMessage = 'Failed to sign in';

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = 'Invalid email or password';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            }

            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const signUpWithEmail = async (
        email: string,
        password: string,
        displayName: string,
        phoneNumber?: string
    ): Promise<User> => {
        try {
            setError(null);
            const auth = getFirebaseAuth();
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Update profile with display name
            await updateProfile(result.user, { displayName });

            const user: User = {
                uid: result.user.uid,
                email: result.user.email,
                displayName: displayName,
                photoURL: result.user.photoURL,
                phoneNumber: phoneNumber || result.user.phoneNumber,
            };

            return user;
        } catch (error: any) {
            console.error('Error signing up:', error);
            let errorMessage = 'Failed to create account';

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Email already in use';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password should be at least 6 characters';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            }

            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const signOut = async (): Promise<void> => {
        try {
            setError(null);
            const auth = getFirebaseAuth();
            await firebaseSignOut(auth);
        } catch (error: any) {
            console.error('Error signing out:', error);
            const errorMessage = error.message || 'Failed to sign out';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const resetPassword = async (email: string): Promise<void> => {
        try {
            setError(null);
            const auth = getFirebaseAuth();
            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            console.error('Error sending password reset:', error);
            let errorMessage = 'Failed to send reset email';

            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email';
            }

            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        resetPassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
