'use client';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { getCached, setCached } from '@/lib/queryCache';

export interface JobCenterSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  seekerId?: string | null;
  loginTime: number;
}

const CACHE_TTL = 600;

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
    
    const startSync = async (uid: string, loginTime: number) => {
      const cacheKey = `jobcenter_profile_${uid}`;
      const cached = getCached<JobCenterSession>(cacheKey);
      
      if (cached) {
        setSession(prev => prev ? { ...cached, loginTime: prev.loginTime } : { ...cached, loginTime });
      } else {
        try {
          const snap = await getDoc(doc(db, 'jobcenter_users', uid));
          if (snap.exists()) {
            const data = snap.data() as JobCenterSession;
            const updated = { ...data, uid, loginTime };
            setCached(cacheKey, updated, CACHE_TTL);
            setSession(updated);
            localStorage.setItem('jobcenter_session', JSON.stringify(updated));
          }
        } catch (err) {
          console.error('[JobCenterSession] Profile sync error:', err);
        }
      }

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
      }, (error) => {
        console.error('[useJobCenterSession] Remote logout listener error:', error);
      });
    };

    const unsubAuth = auth.onAuthStateChanged((user) => {
      const raw = localStorage.getItem('jobcenter_session');
      const parsed = raw ? (JSON.parse(raw) as JobCenterSession) : null;
      
      if (user && parsed && user.uid === parsed.uid) {
        startSync(user.uid, parsed.loginTime);
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


