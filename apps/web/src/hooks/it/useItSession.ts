'use client';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { getCached, setCached } from '@/lib/queryCache';

export interface ItSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  loginTime: number;
}

const CACHE_TTL = 600;

export function useItSession() {
  const [session, setSession] = useState<ItSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('it_session');
    const parsed = raw ? (JSON.parse(raw) as ItSession) : null;
    if (parsed) {
      setSession(parsed);
    }
    setLoading(false);

    // Real-time remote logout listener
    let unsubDoc: (() => void) | undefined;
    
    const startSync = async () => {
      if (!parsed?.uid) return;

      const cacheKey = `it_profile_${parsed.uid}`;
      const cached = getCached<ItSession>(cacheKey);
      
      if (cached) {
        setSession(prev => prev ? { ...cached, loginTime: prev.loginTime } : { ...cached, loginTime: parsed.loginTime });
      } else {
        try {
          const snap = await getDoc(doc(db, 'it_users', parsed.uid));
          if (snap.exists()) {
            const data = snap.data() as ItSession;
            const updated = { ...data, uid: parsed.uid, loginTime: parsed.loginTime };
            setCached(cacheKey, updated, CACHE_TTL);
            setSession(updated);
            localStorage.setItem('it_session', JSON.stringify(updated));
          }
        } catch (err) {
          console.error('[useItSession] Profile sync error:', err);
        }
      }

      unsubDoc = onSnapshot(doc(db, 'it_users', parsed.uid), (snap) => {
        const data = snap.data();
        if (data?.forceLogoutAt) {
          const logoutTime = new Date(data.forceLogoutAt).getTime();
          if (logoutTime > (parsed.loginTime || 0)) {
            localStorage.removeItem('it_session');
            setSession(null);
            signOut(auth).catch(() => {});
          }
        }
      }, (error) => {
        console.error('[useItSession] Remote logout listener error:', error);
      });
    };

    startSync();

    return () => {
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { session, loading };
}

