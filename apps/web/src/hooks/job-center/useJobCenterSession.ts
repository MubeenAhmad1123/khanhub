'use client';
import { useEffect, useState } from 'react';

export interface JobCenterSession {
  uid: string;
  customId: string;
  role: string;
  displayName: string;
  patientId?: string | null;
}

export function useJobCenterSession() {
  const [session, setSession] = useState<JobCenterSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('job-center_session');
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
