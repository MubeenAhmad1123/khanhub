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
let _state: AuthState = {
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
};

const _subscribers = new Set<(s: AuthState) => void>();

const _broadcast = (newState: AuthState) => {
  _state = newState;
  _subscribers.forEach(fn => fn(newState));
};

let _listenerActive = false;

const _startListener = () => {
  if (_listenerActive) return;
  _listenerActive = true;

  const timeoutId = setTimeout(() => {
    if (_state.loading) {
      console.warn('[useAuth] Auth session resolution timed out. Forcing interactive state.');
      _broadcast({ ..._state, loading: false });
    }
  }, 7000);

  onAuthStateChanged(auth, async (firebaseUser) => {
    clearTimeout(timeoutId);

    if (firebaseUser) {
      if (!_state.loading || (_state.firebaseUser?.uid !== firebaseUser.uid)) {
        _broadcast({ ..._state, firebaseUser, loading: true });
      }

      let userProfile = null;
      let lastError = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          userProfile = await getUserProfile(firebaseUser.uid);
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          console.warn(`[useAuth] getUserProfile attempt ${attempt} failed:`, err);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
          }
        }
      }

      if (userProfile) {
        _broadcast({
          user: userProfile,
          firebaseUser,
          loading: false,
          error: null,
        });
      } else {
        const fallbackUser: any = {
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

        console.warn('[useAuth] Using fallback user — Firestore profile unavailable');
        _broadcast({
          user: fallbackUser,
          firebaseUser,
          loading: false,
          error: 'profile_load_failed',
        });
      }
    } else {
      _broadcast({
        user: null,
        firebaseUser: null,
        loading: false,
        error: null,
      });
    }
  });
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Helper: Firestore-safe profile fetch/create ─────────────────────────────
// All Firestore calls are wrapped so a 400/permission error never
// breaks the login flow. The caller always gets a usable profile object.
const _safeGetOrCreateProfile = async (
  fbUser: FirebaseUser,
  role: UserRole
): Promise<any> => {
  let userProfile: any = null;

  // Step 1: try to fetch existing profile
  try {
    userProfile = await getUserProfile(fbUser.uid);
    console.log('[useAuth] 🟢 getUserProfile success, exists:', !!userProfile);
  } catch (err) {
    console.warn('[useAuth] 🔴 getUserProfile failed (Firestore error — rules not deployed?):', err);
  }

  // Step 2: if no profile found, try to create one
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
      });
      console.log('[useAuth] 🟢 createUserProfile success');
      userProfile = await getUserProfile(fbUser.uid);
    } catch (err) {
      console.warn('[useAuth] 🔴 createUserProfile failed:', err);
    }
  } else if (!userProfile.onboardingCompleted && userProfile.role !== role) {
    // Step 3: update role if needed
    try {
      await updateUserProfile(fbUser.uid, { role });
      userProfile = await getUserProfile(fbUser.uid);
    } catch (err) {
      console.warn('[useAuth] 🔴 updateUserProfile failed:', err);
    }
  }

  // Step 4: ultimate fallback — NEVER return null
  if (!userProfile) {
    console.warn('[useAuth] ⚠️ All Firestore attempts failed. Using Firebase Auth fallback. Deploy firestore rules!');
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
// ─────────────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => _state);

  useEffect(() => {
    _startListener();
    setAuthState(_state);
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
      provider.setCustomParameters({ prompt: 'select_account' });

      console.log('[useAuth] 🔵 Opening Google popup...');
      const userCredential = await signInWithPopup(auth, provider);
      console.log('[useAuth] 🟢 Popup success, uid:', userCredential.user.uid);

      // ─── KEY FIX: All Firestore ops are inside _safeGetOrCreateProfile.
      // A Firestore 400 / permission-denied will NO LONGER throw here —
      // we get a fallback user object instead, so router.push always runs.
      const userProfile = await _safeGetOrCreateProfile(userCredential.user, role);

      _broadcast({
        user: userProfile,
        firebaseUser: userCredential.user,
        loading: false,
        error: null,
      });
      console.log('[useAuth] ✅ loginWithGoogle complete — user state set, displayName:', userProfile.displayName);

    } catch (error: any) {
      // Handle popup closed / cancelled
      if (error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request') {

        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('[useAuth] ✅ User authenticated despite popup error — recovering...');
          const userProfile = await _safeGetOrCreateProfile(currentUser, role);
          _broadcast({
            user: userProfile,
            firebaseUser: currentUser,
            loading: false,
            error: null,
          });
          return;
        }

        console.warn('[useAuth] ⚠️ Popup cancelled, no user authenticated.');
        _broadcast({ ..._state, loading: false, error: null });
        return;
      }

      console.error('[useAuth] ❌ Google login failed:', error.code, error.message);
      _broadcast({ ..._state, loading: false, error: error.message || 'Google login failed' });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      _broadcast({ user: null, firebaseUser: null, loading: false, error: null });

      localStorage.removeItem('jobreel_registered');
      localStorage.removeItem('jobreel_active_category');
      localStorage.removeItem('jobreel_guest_prefs');
      sessionStorage.removeItem('authRedirect');

      await firebaseSignOut(auth);
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

// ── Helper hooks ──────────────────────────────────────────────────────────────
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