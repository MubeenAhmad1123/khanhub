// File: apps/transport/src/hooks/useAuthUser.ts

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider, firebaseSignOut } from '@/lib/firebase/config';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, displayName: string, phoneNumber?: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
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
    } catch (error: any) {
      console.error('Error setting up auth listener:', error);
      setError(error.message || 'Auth initialization failed');
      setLoading(false);
    }
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
      throw error;
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
      setError(error.message);
      throw error;
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
      setError(error.message);
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setError(null);
      await firebaseSignOut();
      setUser(null);
    } catch (error: any) {
      console.error('Error signing out:', error);
      setError(error.message);
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setError(null);
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      setError(error.message);
      throw error;
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

  return React.createElement(AuthContext.Provider, { value: value }, children);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthUser() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthUser must be used within an AuthProvider');
  }
  return { user: context.user, loading: context.loading };
}