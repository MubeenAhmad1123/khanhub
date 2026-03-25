'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RehabUser } from '@/types/rehab';

export function useRehabSession() {
  const [user, setUser] = useState<RehabUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const raw = localStorage.getItem('rehab_session');
      if (!raw) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const session = JSON.parse(raw);
        const docSnap = await getDoc(doc(db, 'rehab_users', session.uid));
        
        if (!docSnap.exists() || !docSnap.data().isActive || docSnap.data().role !== session.role) {
          localStorage.removeItem('rehab_session');
          setUser(null);
        } else {
          setUser({ uid: session.uid, ...docSnap.data() } as RehabUser);
        }
      } catch (err) {
        localStorage.removeItem('rehab_session');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  return { user, loading };
}
