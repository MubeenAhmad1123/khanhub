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
import { auth, persistenceReady } from '@/lib/firebase/firebase-config';
import { getUserProfile, createUserProfile, updateUserProfile } from '@/lib/firebase/auth';
import { User, UserRole } from '@/types/user';

export interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

let _state: AuthState = {
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
};

// Do NOT read localStorage at module level — causes React hydration error #418
let _hasAuthenticatedBefore = false;

const _subscribers = new Set<(s: AuthState) => void>();

const _broadcast = (newState: AuthState) => {
  console.log('[useAuth] 📤 Broadcasting state change:', {
    hasUser: !!newState.user,
    hasFirebaseUser: !!newState.firebaseUser,
    loading: newState.loading,
    error: newState.error,
  });

  _state = newState;

  if (newState.firebaseUser) {
    _hasAuthenticatedBefore = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('jobreel_authenticated', 'true');
    }
  } else if (!newState.loading && !newState.firebaseUser && !newState.user) {
    if (_hasAuthenticatedBefore) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jobreel_authenticated');
      }
      _hasAuthenticatedBefore = false;
      console.log('[useAuth] 👋 User logged out');
    }
  }

  _subscribers.forEach(fn => fn(newState));
};

// Flag to prevent duplicate listener initialization
let _listenerStarted = false;
let _unsubscribeAuth: (() => void) | null = null;

const _startListener = async () => {
  if (_listenerStarted) {
    console.log('[useAuth] 🎧 Auth listener already running');
    return;
  }

  _listenerStarted = true;

  console.log('[useAuth] 🎧 Starting auth listener — waiting for persistence...');

  // KEY FIX: wait for setPersistence to finish BEFORE calling onAuthStateChanged.
  await persistenceReady;

  console.log('[useAuth] 🎧 Persistence ready — checking redirect & attaching onAuthStateChanged');

  const timeoutId = setTimeout(() => {
    if (_state.loading) {
      console.warn('[useAuth] ⏱️ Auth timed out. Forcing interactive state.');
      _broadcast({ ..._state, loading: false });
    }
  }, 7000);

  // Attach the ongoing listener after checking for redirect result
  _unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
    console.log('[useAuth] 📡 Firebase onAuthStateChanged triggered:', firebaseUser?.uid || 'null');
    clearTimeout(timeoutId);

    if (firebaseUser) {
      console.log('[useAuth] 🔐 User detected, fetching profile...');

      let userProfile = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          userProfile = await getUserProfile(firebaseUser.uid);
          break;
        } catch (err) {
          console.warn(`[useAuth] getUserProfile attempt ${attempt} failed:`, err);
          if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 500));
        }
      }

      if (userProfile) {
        console.log('[useAuth] ✅ Profile loaded successfully');
        _broadcast({ user: userProfile, firebaseUser, loading: false, error: null });
      } else {
        console.warn('[useAuth] ⚠️ No profile, using fallback');
        const fallback: any = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'User',
          photoURL: firebaseUser.photoURL,
          role: 'user',
          onboardingCompleted: true,
          paymentStatus: 'approved',
          followerCount: 0,
          followingCount: 0,
          totalLikes: 0,
        };
        _broadcast({ user: fallback, firebaseUser, loading: false, error: 'profile_load_failed' });
      }
    } else {
      console.log('[useAuth] 👋 No user (logged out)');
      _broadcast({ user: null, firebaseUser: null, loading: false, error: null });
    }
  });
};

const _safeGetOrCreateProfile = async (fbUser: FirebaseUser, role: UserRole): Promise<any> => {
  let userProfile: any = null;

  try {
    userProfile = await getUserProfile(fbUser.uid);
  } catch (err) {
    console.warn('[useAuth] 🔴 getUserProfile failed:', err);
  }

  if (!userProfile) {
    try {
      await createUserProfile({
        uid: fbUser.uid,
        email: fbUser.email!,
        displayName: fbUser.displayName || 'User',
        photoURL: fbUser.photoURL,
        role,
        emailVerified: fbUser.emailVerified,
        paymentStatus: 'pending',
        isPremium: false,
        applicationsUsed: 0,
        premiumJobsViewed: 0,
        points: 0,
        isActive: true,
        isFeatured: false,
        isBanned: false,
        onboardingCompleted: false,
        followerCount: 0,
        followingCount: 0,
        totalLikes: 0,
      });
      userProfile = await getUserProfile(fbUser.uid);
    } catch (err) {
      console.warn('[useAuth] 🔴 createUserProfile failed:', err);
    }
  } else if (!userProfile.onboardingCompleted && userProfile.role !== role) {
    try {
      await updateUserProfile(fbUser.uid, { role });
      userProfile = await getUserProfile(fbUser.uid);
    } catch (err) {
      console.warn('[useAuth] 🔴 updateUserProfile failed:', err);
    }
  }

  if (!userProfile) {
    userProfile = {
      uid: fbUser.uid,
      email: fbUser.email!,
      displayName: fbUser.displayName || 'User',
      photoURL: fbUser.photoURL,
      role,
      onboardingCompleted: false,
      paymentStatus: 'pending',
      isPremium: false,
      followerCount: 0,
      followingCount: 0,
      totalLikes: 0,
    };
  }

  return userProfile;
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => _state);

  useEffect(() => {
    // Read localStorage only on client inside useEffect — never at module level
    if (typeof window !== 'undefined') {
      _hasAuthenticatedBefore = localStorage.getItem('jobreel_authenticated') === 'true';
    }

    console.log('[useAuth] 🔄 Hook initialized, current state:', {
      hasUser: !!_state.user,
      hasFirebaseUser: !!_state.firebaseUser,
      loading: _state.loading,
      hasAuthenticatedBefore: _hasAuthenticatedBefore,
    });

    _startListener();
    setAuthState({ ..._state });
    _subscribers.add(setAuthState);
    return () => {
      _subscribers.delete(setAuthState);
    };
  }, []);

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
      _broadcast({ user: userProfile, firebaseUser: userCredential.user, loading: false, error: null });
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
      if (userProfile) await updateUserProfile(userCredential.user.uid, { lastLoginAt: new Date() });
      _broadcast({ user: userProfile, firebaseUser: userCredential.user, loading: false, error: null });
    } catch (error: any) {
      _broadcast({ ..._state, loading: false, error: error.message || 'Login failed' });
      throw error;
    }
  };

  const loginWithGoogle = async (role: UserRole): Promise<void> => {
    try {
      _broadcast({ ..._state, loading: true, error: null });

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // ── Popup for ALL devices (desktop + mobile) ──
      // COOP header removed from next.config.js so popup works on mobile too.
      // Redirect was removed — it added complexity with no benefit.
      console.log('[useAuth] 🔵 Opening Google popup...');
      const userCredential = await signInWithPopup(auth, provider);
      console.log('[useAuth] 🟢 Popup success, uid:', userCredential.user.uid);

      const fbUser = userCredential.user;
      const tempProfile: any = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || 'User',
        photoURL: fbUser.photoURL,
        role,
        emailVerified: fbUser.emailVerified,
        onboardingCompleted: true,
        paymentStatus: 'approved',
        isPremium: false,
        isActive: true,
        isBanned: false,
        isFeatured: false,
        applicationsUsed: 0,
        premiumJobsViewed: 0,
        points: 0,
        followerCount: 0,
        followingCount: 0,
        totalLikes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      _hasAuthenticatedBefore = true;
      localStorage.setItem('jobreel_authenticated', 'true');
      _broadcast({ user: tempProfile, firebaseUser: fbUser, loading: false, error: null });
      console.log('[useAuth] ✅ loginWithGoogle complete');

      // Background Firestore sync — non-blocking
      _safeGetOrCreateProfile(fbUser, role).then((profile) => {
        if (profile) {
          console.log('[useAuth] ✅ Firestore profile loaded in background');
          _broadcast({ user: profile, firebaseUser: fbUser, loading: false, error: null });
        }
      }).catch((err) => {
        console.warn('[useAuth] ⚠️ Firestore profile fetch failed:', err);
      });

    } catch (error: any) {
      console.error('[useAuth] ❌ Login failed:', error);

      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        console.warn('[useAuth] ⚠️ Popup cancelled, no user.');
        _broadcast({ ..._state, loading: false, error: 'Login cancelled' });
        throw new Error('Login cancelled');
      }

      _broadcast({ ..._state, loading: false, error: error.message || 'Login failed' });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('[useAuth] 🚪 Logging out...');
      localStorage.removeItem('jobreel_registered');
      localStorage.removeItem('jobreel_active_category');
      localStorage.removeItem('jobreel_guest_prefs');
      localStorage.removeItem('jobreel_authenticated');
      sessionStorage.removeItem('authRedirect');
      await firebaseSignOut(auth);
      _hasAuthenticatedBefore = false;
      _broadcast({ user: null, firebaseUser: null, loading: false, error: null });
      window.location.href = '/auth/login';
    } catch (error: any) {
      console.error('Logout error:', error);
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