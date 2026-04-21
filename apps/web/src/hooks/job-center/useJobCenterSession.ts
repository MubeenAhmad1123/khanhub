'use client';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export interface JobCenterSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  seekerId?: string | null;
  loginTime: number;
}

export function useJobCenterSession() {
  const [session, setSession] = useState<JobCenterSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('jobcenter_session');
    const parsed = raw ? (JSON.parse(raw) as JobCenterSession) : null;
    if (parsed) {
      setSession(parsed);
    }
    setLoading(false);

    // Real-time remote logout listener
    let unsubDoc: (() => void) | undefined;
    if (parsed?.uid) {
      unsubDoc = onSnapshot(doc(db, 'jobcenter_users', parsed.uid), (snap) => {
        const data = snap.data();
        if (data?.forceLogoutAt) {
          const logoutTime = new Date(data.forceLogoutAt).getTime();
          if (logoutTime > parsed.loginTime) {
            localStorage.removeItem('jobcenter_session');
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

