// src/hooks/useAuth.ts (CREATE THIS FILE)
'use client';

import { useEffect, useState } from 'react';
import {
    User,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
            setError(null);
        }, (error) => {
            console.error('Auth state change error:', error);
            setError(error.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            setError(null);
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error: any) {
            console.error('Error signing in with Google:', error);
            setError(error.message || 'Failed to sign in with Google');
            throw error;
        }
    };

    const signOut = async () => {
        try {
            setError(null);
            await firebaseSignOut(auth);
        } catch (error: any) {
            console.error('Error signing out:', error);
            setError(error.message || 'Failed to sign out');
            throw error;
        }
    };

    return {
        user,
        loading,
        error,
        signInWithGoogle,
        signOut,
    };
}