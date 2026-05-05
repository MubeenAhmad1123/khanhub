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

  const listenerUidRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Only stop loading once we've heard from Firebase at least once
      setLoading(false);
      setIsAuthReady(true);

      if (user) {
        if (listenerUidRef.current !== user.uid) {
          listenerUidRef.current = user.uid;
          startListener(user.uid);
        }
      } else {
        listenerUidRef.current = null;
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []); // Removed [session] to prevent infinite loop

  const memoizedSession = useMemo(() => session, [session]);

  return { session: memoizedSession, loading, clearSession };
}
