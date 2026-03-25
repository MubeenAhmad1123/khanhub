'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RehabSidebar from '@/components/rehab/RehabSidebar';
import type { RehabUser } from '@/types/rehab';

export default function RehabDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<RehabUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('rehab_session');
    if (!raw) {
      router.push('/departments/rehab/login');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as RehabUser;
      if (!parsed.isActive) {
        localStorage.removeItem('rehab_session');
        router.push('/departments/rehab/login');
        return;
      }
      setSession(parsed);
    } catch (err) {
      localStorage.removeItem('rehab_session');
      router.push('/departments/rehab/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#1D9E75] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <RehabSidebar role={session.role} patientId={session.patientId} />
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
