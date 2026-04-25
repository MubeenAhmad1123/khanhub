'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, getIdToken, signOut } from 'firebase/auth';
import type { HqSession } from '@/types/hq';

const SESSION_KEY = 'hq_session';
const SESSION_TIMEOUT = 604800000; // 7 days in milliseconds

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

    const startListener = (uid: string, loginTime: number) => {
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
          console.error('[useHqSession] Snapshot error (likely permissions):', err);
          // Attempt a silent token refresh on permission errors
          if (auth.currentUser) {
            getIdToken(auth.currentUser, true).catch(() => {});
          }
        }
      );
    };

    // Firebase Auth state listener with forced token refresh
    const unsub = onAuthStateChanged(auth, async (user) => {
      const raw = localStorage.getItem(SESSION_KEY);
      const parsed = raw ? (JSON.parse(raw) as HqSession) : null;

      // Clear on UID mismatch
      if (user && parsed && user.uid !== parsed.uid) {
        console.warn('[useHqSession] UID mismatch, clearing session');
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
        setLoading(false);
        return;
      }

      // ── Start listener only when we have auth AND session matching ──
      if (user && parsed && user.uid === parsed.uid) {
        startListener(user.uid, parsed.loginTime);
      }

      // ── Force-refresh the ID token so Firestore rules see a valid auth ──
      if (user) {
        try {
          await getIdToken(user, true);
        } catch (e) {
          console.warn('[useHqSession] Token refresh failed:', e);
        }
      }

      setLoading(false);
    });

    return () => {
      unsub();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { session, loading, clearSession };
}
