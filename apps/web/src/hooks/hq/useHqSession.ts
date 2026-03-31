'use client';

import { useEffect, useState } from 'react';
import type { HqSession } from '@/types/hq';

const SESSION_KEY = 'hq_session';
const SESSION_TIMEOUT = 43200000; // 12 hours in milliseconds

export function useHqSession() {
  const [session, setSession] = useState<HqSession | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: HqSession = JSON.parse(raw);
        const elapsed = Date.now() - parsed.loginTime;
        if (elapsed > SESSION_TIMEOUT) {
          localStorage.removeItem(SESSION_KEY);
          setSession(null);
        } else {
          setSession(parsed);
        }
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { session, loading, clearSession };
}