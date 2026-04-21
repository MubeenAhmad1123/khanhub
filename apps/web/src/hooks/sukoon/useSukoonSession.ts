'use client';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export interface SukoonSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  patientId?: string | null;
  loginTime: number;
}

export function useSukoonSession() {
  const [session, setSession] = useState<SukoonSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('sukoon_session');
    const parsed = raw ? (JSON.parse(raw) as SukoonSession) : null;
    if (parsed) {
      setSession(parsed);
    }
    setLoading(false);

    // Real-time remote logout listener
    let unsubDoc: (() => void) | undefined;
    if (parsed?.uid) {
      unsubDoc = onSnapshot(doc(db, 'sukoon_users', parsed.uid), (snap) => {
        const data = snap.data();
        if (data?.forceLogoutAt) {
          const logoutTime = new Date(data.forceLogoutAt).getTime();
          if (logoutTime > parsed.loginTime) {
            localStorage.removeItem('sukoon_session');
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

