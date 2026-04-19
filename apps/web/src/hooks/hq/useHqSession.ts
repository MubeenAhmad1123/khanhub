'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { HqSession } from '@/types/hq';

const SESSION_KEY = 'hq_session';
const SESSION_TIMEOUT = 43200000; // 12 hours in milliseconds

export function useHqSession() {
  const [session, setSession] = useState<HqSession | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  useEffect(() => {
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
    } finally {
      // Keep loading true until Firebase Auth confirms state.
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      const raw = localStorage.getItem(SESSION_KEY);
      const parsed = raw ? (JSON.parse(raw) as HqSession) : null;

      // Session is valid only when Firebase Auth exists and UID matches HQ session UID.
      if (!user || !parsed || user.uid !== parsed.uid) {
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
        if (user) {
          try {
            await signOut(auth);
          } catch {
            // Ignore sign-out failure; session is already cleared locally.
          }
        }
      }
      setLoading(false);
    });

    // Real-time remote logout listener
    let unsubDoc: (() => void) | undefined;
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as HqSession) : null;
    
    if (parsed?.uid) {
      unsubDoc = onSnapshot(doc(db, 'hq_users', parsed.uid), (snap) => {
        const data = snap.data();
        if (data?.forceLogoutAt) {
          const logoutTime = new Date(data.forceLogoutAt).getTime();
          if (logoutTime > parsed.loginTime) {
            localStorage.removeItem(SESSION_KEY);
            setSession(null);
            signOut(auth).catch(() => {});
          }
        }
      });
    }

    return () => {
      unsub();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { session, loading, clearSession };
}