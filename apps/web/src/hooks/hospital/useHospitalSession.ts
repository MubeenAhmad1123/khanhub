'use client';
import { useEffect, useState } from 'react';

export interface HospitalSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  patientId?: string | null;
}

export function useHospitalSession() {
  const [session, setSession] = useState<HospitalSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hospital_session');
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
