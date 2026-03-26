'use client';
import { useEffect, useState } from 'react';

export interface RehabSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  patientId?: string | null;
}

export function useRehabSession() {
  const [session, setSession] = useState<RehabSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rehab_session');
      if (raw) {
        setSession(JSON.parse(raw));
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { session, loading };
}
