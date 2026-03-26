'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RehabSidebar from '@/components/rehab/RehabSidebar';

export default function RehabDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    // Only runs on client after hydration
    const session = localStorage.getItem('rehab_session');
    
    if (!session) {
      router.push('/departments/rehab/login');
      return;
    }

    // Optional: validate session has required fields
    try {
      const parsed = JSON.parse(session);
      if (!parsed.uid || !parsed.role) {
        router.push('/departments/rehab/login');
        return;
      }
      setRole(parsed.role);
      setPatientId(parsed.patientId || null);
    } catch {
      router.push('/departments/rehab/login');
      return;
    }

    setIsChecking(false);
  }, [router]);

  // Show nothing while checking — prevents flash + premature redirect
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#fcfdfd] flex items-center justify-center">
        <div className="text-gray-400 text-sm font-bold uppercase tracking-widest animate-pulse">
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <RehabSidebar role={role as any} patientId={patientId as any} />
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
