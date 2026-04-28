'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, getIdToken, signOut } from 'firebase/auth';
import type { HqSession } from '@/types/hq';
import { getCached, setCached } from '@/lib/queryCache';

const SESSION_KEY = 'hq_session';
const SESSION_TIMEOUT = 604800000; // 7 days in milliseconds
const CACHE_TTL = 600; // 10 minutes

export function useHqSession() {
  const [session, setSession] = useState<HqSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  const startListener = async (uid: string) => {
    const loginTime = session?.loginTime || Date.now();
    const cacheKey = `hq_profile_${uid}`;
    const cached = getCached<HqSession>(cacheKey);
    
    if (cached) {
      setSession(prev => prev ? { ...cached, loginTime: prev.loginTime } : { ...cached, loginTime });
    } else {
      try {
        const snap = await getDoc(doc(db, 'hq_users', uid));
        if (snap.exists()) {
          const data = snap.data() as HqSession;
          const updatedSession = { ...data, uid, loginTime };
          setCached(cacheKey, updatedSession, CACHE_TTL);
          setSession(updatedSession);
          localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
        }
      } catch (err: any) {
        console.error('[useHqSession] Profile refresh error:', err);
      }
    }

    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = onSnapshot(
      doc(db, 'hq_users', uid),
      (snap) => {
        const data = snap.data();
        if (data?.forceLogoutAt) {
          const logoutTime = new Date(data.forceLogoutAt).getTime();
          if (logoutTime > loginTime) {
            console.log('[useHqSession] Remote logout triggered');
            localStorage.removeItem(SESSION_KEY);
            setSession(null);
            signOut(auth).catch(() => {});
          }
        }
      },
      (err) => {
        console.warn('[useHqSession] Snapshot error (likely permissions):', err);
      }
    );
  };

  useEffect(() => {
    // 1. Check local storage session first (optimistic)
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const parsed: HqSession = JSON.parse(raw);
        const elapsed = Date.now() - parsed.loginTime;
        if (elapsed < SESSION_TIMEOUT) {
          setSession(parsed);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setIsAuthReady(true);
      
      // Only stop loading once we've heard from Firebase at least once
      setLoading(false);

      if (user) {
        // If we have a user but no session, we might need to restore it
        // but for HQ we usually rely on the login page flow.
        // We ensure the profile listener is running.
        startListener(user.uid);
      } else {
        // No Firebase user. If we have a local session, it's stale.
        if (session) {
          console.warn('[HQ Session] Firebase user missing, but session exists. Clearing...');
          setSession(null);
          localStorage.removeItem(SESSION_KEY);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [session]); // Re-run if session changes to detect mismatch

  const memoizedSession = useMemo(() => session, [session]);

  return { session: memoizedSession, loading, clearSession };
}
