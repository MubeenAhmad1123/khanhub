'use client';

import { ReactNode, useState, useEffect } from 'react';
import { initializeFirebase } from '@/lib/firebase/config';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import TransportNavbar from '@/components/layout/TransportNavbar';
import TransportFooter from '@/components/layout/TransportFooter';
import TransportLoader from '@/app/animations/TransportLoader'; // ✅ fixed path

// Initialize Firebase once
initializeFirebase();

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loader for 1.5 seconds
    const timeout = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <AuthProviderWrapper>
      {/* Loader overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <TransportLoader />
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-col min-h-screen">
        <TransportNavbar />

        <main className="flex-grow w-full">{children}</main>

        <TransportFooter />
      </div>
    </AuthProviderWrapper>
  );
}
