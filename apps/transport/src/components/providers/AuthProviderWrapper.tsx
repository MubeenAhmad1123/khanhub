// File: apps/transport/src/components/providers/AuthProviderWrapper.tsx

'use client';

import { useEffect } from 'react';
import { AuthProvider } from '@/hooks/useAuthUser';
import { initializeFirebase } from '@/lib/firebase/config';

export default function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeFirebase();
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}