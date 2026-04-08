'use client';
import { useEffect, useState } from 'react';

export interface WelfareSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  patientId?: string | null;
}

export function useWelfareSession() {
  const [session, setSession] = useState<WelfareSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('welfare_session');
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
