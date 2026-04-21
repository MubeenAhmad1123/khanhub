'use client';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

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
    if (parsed?.uid) {
      unsubDoc = onSnapshot(doc(db, 'spims_users', parsed.uid), (snap) => {
        const data = snap.data();
        if (data?.forceLogoutAt) {
          const logoutTime = new Date(data.forceLogoutAt).getTime();
          if (logoutTime > parsed.loginTime) {
            localStorage.removeItem('spims_session');
            setSession(null);
            signOut(auth).catch(() => {});
          }
        }
      });
    }

    return () => {
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { session, loading };
}

