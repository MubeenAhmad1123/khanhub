'use client';
import { useEffect, useState } from 'react';

import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { getCached, setCached } from '@/lib/queryCache';

export interface SpimsSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  studentId?: string | null;
  /** @deprecated use studentId */
  patientId?: string | null;
  loginTime: number;
}

const CACHE_TTL = 600;

export function useSpimsSession() {
  const [session, setSession] = useState<SpimsSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('spims_session');
    const parsed = raw ? (JSON.parse(raw) as SpimsSession) : null;
    if (parsed) {
      setSession(parsed);
    }
    setLoading(false);

    // Real-time remote logout listener
    let unsubDoc: (() => void) | undefined;

    const startSync = async () => {
      if (!parsed?.uid) return;

      const cacheKey = `spims_profile_${parsed.uid}`;
      const cached = getCached<SpimsSession>(cacheKey);
      
      if (cached) {
        setSession(prev => prev ? { ...cached, loginTime: prev.loginTime } : { ...cached, loginTime: parsed.loginTime });
      } else {
        try {
          const snap = await getDoc(doc(db, 'spims_users', parsed.uid));
          if (snap.exists()) {
            const data = snap.data() as SpimsSession;
            const updated = { ...data, uid: parsed.uid, loginTime: parsed.loginTime };
            setCached(cacheKey, updated, CACHE_TTL);
            setSession(updated);
            localStorage.setItem('spims_session', JSON.stringify(updated));
          }
        } catch (err) {
          console.error('[useSpimsSession] Profile sync error:', err);
        }
      }

      unsubDoc = onSnapshot(doc(db, 'spims_users', parsed.uid), (snap) => {
        const data = snap.data();
        if (data?.forceLogoutAt) {
          const logoutTime = new Date(data.forceLogoutAt).getTime();
          if (logoutTime > (parsed.loginTime || 0)) {
            localStorage.removeItem('spims_session');
            setSession(null);
            signOut(auth).catch(() => {});
          }
        }
      });
    };

    startSync();

    return () => {
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { session, loading };
}


