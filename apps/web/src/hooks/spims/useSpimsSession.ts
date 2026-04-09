'use client';
import { useEffect, useState } from 'react';

export interface SpimsSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  studentId?: string | null;
  /** @deprecated use studentId */
  patientId?: string | null;
}

export function useSpimsSession() {
  const [session, setSession] = useState<SpimsSession | null>(null);
  const [loading, setLoading] = useState(true);

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

  return { session, loading };
}
