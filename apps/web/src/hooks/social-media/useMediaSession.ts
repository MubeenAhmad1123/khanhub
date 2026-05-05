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
      setSession(parsed);
    }
    setLoading(false);

    // Real-time remote logout listener
    let unsubDoc: (() => void) | undefined;
    if (parsed?.uid) {
      unsubDoc = onSnapshot(doc(db, 'media_users', parsed.uid), (snap) => {
        const data = snap.data();
        if (data?.forceLogoutAt) {
          const logoutTime = new Date(data.forceLogoutAt).getTime();
          if (logoutTime > (parsed.loginTime || 0)) {
            localStorage.removeItem('media_session');
            setSession(null);
            signOut(auth).catch(() => {});
          }
        }
      }, (error) => {
        console.error('[useMediaSession] Remote logout listener error:', error);
      });
    }

    return () => {
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { session, loading };
}
