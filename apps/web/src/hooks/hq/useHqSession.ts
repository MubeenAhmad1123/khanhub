'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
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

      // Only clear if there's a definite mismatch. 
      // If user is null, it might just be initializing, so we don't clear immediately.
      // The layout guard will handle redirection if the session remains null.
      if (user && parsed && user.uid !== parsed.uid) {
        console.warn('[useHqSession] UID mismatch, clearing session');
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
        setLoading(false);
        return;
      }

      // If user is null but we have a parsed session, we might be in a transition.
      // We'll let the session stay for now. If it's truly gone, the next check will catch it.
      
      setLoading(false);
    });

    // Real-time remote logout listener
    let unsubDoc: (() => void) | undefined;
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as HqSession) : null;
    
    if (parsed?.uid) {
      unsubDoc = onSnapshot(
        doc(db, 'hq_users', parsed.uid), 
        (snap) => {
          const data = snap.data();
          if (data?.forceLogoutAt) {
            const logoutTime = new Date(data.forceLogoutAt).getTime();
            if (logoutTime > parsed.loginTime) {
              console.log('[useHqSession] Remote logout triggered');
              localStorage.removeItem(SESSION_KEY);
              setSession(null);
              signOut(auth).catch(() => {});
            }
          }
        },
        (err) => {
          console.error('[useHqSession] Snapshot error (likely permissions):', err);
          // Don't logout on permission error, just stop listening.
        }
      );
    }

    return () => {
      unsub();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { session, loading, clearSession };
}