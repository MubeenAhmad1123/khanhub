'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2 } from 'lucide-react';
import CredentialsManager from '@/components/hq/CredentialsManager';

export default function SuperAdminPasswordsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-neutral-800" />
      </div>
    );
  }

  return (
    <CredentialsManager 
      mode="superadmin" 
      backPath="/hq/dashboard/superadmin" 
    />
  );
}
