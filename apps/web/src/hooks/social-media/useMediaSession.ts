'use client';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export interface MediaSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  loginTime: number;
}

export function useMediaSession() {
  const [session, setSession] = useState<MediaSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('media_session');
    const parsed = raw ? (JSON.parse(raw) as MediaSession) : null;
    if (parsed) {
      if (!parsed.loginTime) {
        const storedTime = localStorage.getItem('media_login_time') || localStorage.getItem('hq_login_time');
        parsed.loginTime = storedTime ? parseInt(storedTime, 10) : Date.now();
      }
      setSession(parsed);
    }
    setLoading(false);

    if (!parsed?.uid) return;
    if (parsed.role === 'superadmin' || parsed.role === 'manager') return;

    // Real-time remote logout listener
    let unsubDoc: (() => void) | undefined;
    unsubDoc = onSnapshot(doc(db, 'media_users', parsed.uid), (snap) => {
      const data = snap.data();
      if (data?.forceLogoutAt) {
        const logoutTime = new Date(data.forceLogoutAt).getTime();
        const loginTime = parsed.loginTime || Number(localStorage.getItem('media_login_time')) || 0;
        if (logoutTime > loginTime) {
          localStorage.removeItem('media_session');
          localStorage.removeItem('media_login_time');
          setSession(null);
          signOut(auth).catch(() => {});
        }
      }
    }, (error) => {
      console.error('[useMediaSession] Remote logout listener error:', error);
    });

    return () => {
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { session, loading };
}
