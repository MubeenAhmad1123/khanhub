'use client';

import { useEffect, useState, useMemo } from 'react';
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

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  useEffect(() => {
    // Restore session from localStorage
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: HqSession = JSON.parse(raw);
        const elapsed = Date.now() - parsed.loginTime;
        if (elapsed > SESSION_TIMEOUT) {
          localStorage.removeItem(SESSION_KEY);
          setSession(null);
        } else {
          setSession(parsed);
        }
      }
    } catch {
      setSession(null);
    }

    // Real-time remote logout listener
    let unsubDoc: (() => void) | undefined;

    const startListener = async (uid: string, loginTime: number) => {
      // Step 2 Optimization: Fetch/Refresh profile with in-memory cache
      const cacheKey = `hq_profile_${uid}`;
      const cached = getCached<HqSession>(cacheKey);
      
      if (cached) {
        // Sync state with cached data but keep the original loginTime from session
        setSession(prev => prev ? { ...cached, loginTime: prev.loginTime } : { ...cached, loginTime });
      } else {
        // Only fetch if not in cache
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
          // If permission error, it might be due to a stale token that wasn't caught by onAuthStateChanged
          if (err.code === 'permission-denied') {
            console.warn('[useHqSession] Attempting emergency token refresh...');
            const currentUser = auth.currentUser;
            if (currentUser) {
              await getIdToken(currentUser, true).catch(e => console.error('[useHqSession] Emergency refresh failed:', e));
              // Retry once
              const retrySnap = await getDoc(doc(db, 'hq_users', uid)).catch(() => null);
              if (retrySnap?.exists()) {
                const data = retrySnap.data() as HqSession;
                const updatedSession = { ...data, uid, loginTime };
                setSession(updatedSession);
                localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
              }
            }
          }
        }
      }

      if (unsubDoc) unsubDoc();
      unsubDoc = onSnapshot(
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

    // Firebase Auth state listener with forced token refresh
    const unsub = onAuthStateChanged(auth, async (user) => {
      const raw = localStorage.getItem(SESSION_KEY);
      const parsed = raw ? (JSON.parse(raw) as HqSession) : null;

      if (!user) {
        // Firebase Auth session lost — clear HQ session too
        if (parsed) {
          localStorage.removeItem(SESSION_KEY);
        }
        setSession(null);
        setLoading(false);
        return;
      }

      // Clear on UID mismatch
      if (parsed && user.uid !== parsed.uid) {
        console.warn('[useHqSession] UID mismatch, clearing session');
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
        setLoading(false);
        return;
      }

      // ── Force-refresh the ID token BEFORE starting listeners ──
      try {
        await getIdToken(user, true);
        console.log('[useHqSession] Token refreshed successfully');
      } catch (e) {
        console.warn('[useHqSession] Token refresh failed:', e);
      }

      // ── Start listener only when we have auth AND session matching ──
      if (parsed && user.uid === parsed.uid) {
        await startListener(user.uid, parsed.loginTime);
      }

      setLoading(false);
    });

    return () => {
      unsub();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const memoizedSession = useMemo(() => session, [session]);

  return { session: memoizedSession, loading, clearSession };
}
