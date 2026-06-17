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
    let raw = localStorage.getItem('media_session');
    const hqSessionStr = localStorage.getItem('hq_session');
    
    // Auto-sync hq_session to media_session if missing to prevent layout/page mount race condition
    if (!raw && hqSessionStr) {
      try {
        const hqSession = JSON.parse(hqSessionStr);
        if (hqSession?.role === 'superadmin' || hqSession?.role === 'manager') {
          const syncSession = {
            uid: hqSession.uid,
            customId: hqSession.customId || hqSession.email || 'HQ-USER',
            role: hqSession.role,
            displayName: hqSession.displayName || (hqSession.role === 'superadmin' ? 'Superadmin' : 'Manager'),
            loginTime: hqSession.loginTime || Number(localStorage.getItem('hq_login_time')) || Date.now()
          };
          localStorage.setItem('media_session', JSON.stringify(syncSession));
          localStorage.setItem('media_login_time', (syncSession.loginTime).toString());
          raw = JSON.stringify(syncSession);
        }
      } catch (e) {}
    }

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
