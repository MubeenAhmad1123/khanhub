'use client';

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
import { auth } from '@/lib/firebase/firebase-config';
import { getUserProfile, createUserProfile, updateUserProfile } from '@/lib/firebase/auth';
import { User, UserRole } from '@/types/user';

export interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

// ─── Module-level singleton ───────────────────────────────────────────────────
// Stores latest resolved state so NEW components get it immediately on mount
let _state: AuthState = {
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
};

// All mounted useAuth components subscribe here:
const _subscribers = new Set<(s: AuthState) => void>();

// Broadcast to every mounted component:
const _broadcast = (newState: AuthState) => {
  _state = newState;
  _subscribers.forEach(fn => fn(newState));
};

// The ONE permanent listener — started once, never unsubscribed:
let _listenerActive = false;

const _startListener = () => {
  if (_listenerActive) return;
  _listenerActive = true;

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Retry getUserProfile up to 3 times with delay:
      let userProfile = null;
      let lastError = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          userProfile = await getUserProfile(firebaseUser.uid);
          lastError = null;
          break; // success — stop retrying
        } catch (err) {
          lastError = err;
          console.warn(`getUserProfile attempt ${attempt} failed:`, err);
          if (attempt < 3) {
            // Wait before retry: 500ms, 1500ms
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
          }
        }
      }

      if (userProfile) {
        // Success:
        _broadcast({
          user: userProfile,
          firebaseUser,
          loading: false,
          error: null,
        });
      } else {
        // All retries failed — CRITICAL:
        // Still set firebaseUser so user isn't stuck
        // They're authenticated in Firebase even if Firestore fetch failed
        console.error('getUserProfile failed after 3 attempts:', lastError);
        _broadcast({
          user: null,
          firebaseUser, // ← keep this so app knows auth succeeded
          loading: false,
          error: 'profile_load_failed', // specific error code
        });
      }
    } else {
      // Signed out:
      _broadcast({
        user: null,
        firebaseUser: null,
        loading: false,
        error: null,
      });
    }
  });
  // NOTE: No return / no unsubscribe — this listener lives forever
  // This is intentional — auth state must always be tracked
};
// ─────────────────────────────────────────────────────────────────────────────

export function useAuth() {
  // CRITICAL: Initialize with a fixed state to match server-side render.
  // This prevents hydration mismatches by ensuring the first render on the client
  // matches the "loading" state sent by the server.
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    firebaseUser: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Start the singleton listener (idempotent — safe to call many times):
    _startListener();

    // Immediately sync with the current singleton state after mount:
    setAuthState(_state);

    // Subscribe this component to future state changes:
    _subscribers.add(setAuthState);

    // Cleanup — just unsubscribe this component, never kill the listener:
    return () => {
      _subscribers.delete(setAuthState);
    };
  }, []);

  // ── All your existing methods below — NO changes needed ──────────────────

  const register = async (
    email: string,
    password: string,
    additionalData: any,
    role: UserRole = 'job_seeker'
  ): Promise<void> => {
    const trimmedEmail = email.trim();
    try {
      _broadcast({ ..._state, loading: true, error: null });

      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const displayName = additionalData.name || additionalData.displayName || 'User';
      await firebaseUpdateProfile(userCredential.user, { displayName });
      await sendEmailVerification(userCredential.user);

      await createUserProfile({
        uid: userCredential.user.uid,
        email: trimmedEmail,
        displayName,
        role,
        ...additionalData,
        name: additionalData.name || additionalData.displayName,
        phone: additionalData.phone,
        city: additionalData.city,
        skills: additionalData.skills || [],
        education: additionalData.education || [],
        experience: additionalData.experience || [],
        industry: additionalData.industry || additionalData.desiredIndustry,
        desiredJobTitle: additionalData.desiredJobTitle || additionalData.jobTitle,
        totalExperience: additionalData.totalExperience,
        professionalSummary: additionalData.professionalSummary || additionalData.bio,
        careerLevel: additionalData.careerLevel,
        gender: additionalData.gender,
        dateOfBirth: additionalData.dateOfBirth,
        languages: additionalData.languages || [],
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
        registrationMethod: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const userProfile = await getUserProfile(userCredential.user.uid);
      _broadcast({
        user: userProfile,
        firebaseUser: userCredential.user,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      _broadcast({ ..._state, loading: false, error: error.message || 'Registration failed' });
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    const trimmedEmail = email.trim();
    try {
      _broadcast({ ..._state, loading: true, error: null });
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const userProfile = await getUserProfile(userCredential.user.uid);
      if (userProfile) {
        await updateUserProfile(userCredential.user.uid, { lastLoginAt: new Date() });
      }
      _broadcast({
        user: userProfile,
        firebaseUser: userCredential.user,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      _broadcast({ ..._state, loading: false, error: error.message || 'Login failed' });
      throw error;
    }
  };

  const loginWithGoogle = async (role: UserRole): Promise<void> => {
    try {
      _broadcast({ ..._state, loading: true, error: null });
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      let userProfile = await getUserProfile(userCredential.user.uid);

      if (!userProfile) {
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
      } else if (!userProfile.onboardingCompleted && userProfile.role !== role) {
        await updateUserProfile(userCredential.user.uid, { role });
        userProfile = await getUserProfile(userCredential.user.uid);
      }

      _broadcast({
        user: userProfile,
        firebaseUser: userCredential.user,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      _broadcast({ ..._state, loading: false, error: error.message || 'Google login failed' });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Reset state first so UI shows logged-out immediately:
      _broadcast({ user: null, firebaseUser: null, loading: false, error: null });

      // Then sign out from Firebase:
      await firebaseSignOut(auth);

      // Hard redirect — clears any in-memory state completely:
      window.location.href = '/auth/login';
    } catch (error: any) {
      console.error('Logout error:', error);
      // Force reload even on error — better than being stuck:
      window.location.href = '/auth/login';
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerificationEmail = async (): Promise<void> => {
    if (!authState.firebaseUser) throw new Error('No user logged in');
    await sendEmailVerification(authState.firebaseUser);
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!authState.user) throw new Error('No user logged in');
    await updateUserProfile(authState.user.uid, updates);
    const updatedProfile = await getUserProfile(authState.user.uid);
    _broadcast({ ..._state, user: updatedProfile });
  };

  const refreshProfile = async (): Promise<void> => {
    if (!authState.user) return;
    try {
      const updatedProfile = await getUserProfile(authState.user.uid);
      _broadcast({ ..._state, user: updatedProfile });
    } catch (err) {
      console.error('Error refreshing profile:', err);
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

// ── Helper hooks — unchanged ──────────────────────────────────────────────────
export function usePaymentStatus() {
  const { user, loading } = useAuth();
  if (loading) return { paymentApproved: false, loading: true };
  return { paymentApproved: user?.paymentStatus === 'approved', loading: false };
}

export function usePremiumStatus() {
  const { user, loading } = useAuth();
  if (loading) return { isPremium: false, loading: true };
  if (user?.isPremium && user?.premiumEndDate) {
    const end = user.premiumEndDate instanceof Date
      ? user.premiumEndDate
      : (user.premiumEndDate as any).toDate();
    return { isPremium: end > new Date(), loading: false };
  }
  return { isPremium: false, loading: false };
}

export function useIsAdmin() {
  const { user, loading } = useAuth();
  if (loading) return { isAdmin: false, loading: true };
  return { isAdmin: user?.role === 'admin', loading: false };
}