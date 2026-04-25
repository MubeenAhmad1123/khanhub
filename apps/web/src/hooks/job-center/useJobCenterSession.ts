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
    const startListener = (uid: string, loginTime: number) => {
      if (unsubDoc) unsubDoc();
      unsubDoc = onSnapshot(doc(db, 'jobcenter_users', uid), (snap) => {
        const data = snap.data();
        if (data?.forceLogoutAt) {
          const logoutTime = new Date(data.forceLogoutAt).getTime();
          if (logoutTime > loginTime) {
            console.log('[JobCenterSession] Remote logout triggered');
            localStorage.removeItem('jobcenter_session');
            setSession(null);
            signOut(auth).catch(() => {});
          }
        }
      });
    };

    const unsubAuth = auth.onAuthStateChanged((user) => {
      const raw = localStorage.getItem('jobcenter_session');
      const parsed = raw ? (JSON.parse(raw) as JobCenterSession) : null;
      
      if (user && parsed && user.uid === parsed.uid) {
        startListener(user.uid, parsed.loginTime);
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { session, loading };
}

