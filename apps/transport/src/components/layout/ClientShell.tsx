'use client';

import { ReactNode } from 'react';
import { initializeFirebase } from '@/lib/firebase/config';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import TransportNavbar from '@/components/layout/TransportNavbar';
import TransportFooter from '@/components/layout/TransportFooter';

initializeFirebase();

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <AuthProviderWrapper>
      <TransportNavbar />
      <main className="flex-grow flex flex-col">{children}</main>
      <TransportFooter />
    </AuthProviderWrapper>
  );
}
