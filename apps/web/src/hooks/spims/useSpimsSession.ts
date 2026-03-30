'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface SpimsSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  studentId?: string | null;
}

export function useSpimsSession() {
  const [session, setSession] = useState<SpimsSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('spims_session');
      if (raw) {
        setSession(JSON.parse(raw));
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = () => {
    localStorage.removeItem('spims_session');
    setSession(null);
    router.push('/departments/spims/login');
  };

  return { session, loading, signOut };
}
