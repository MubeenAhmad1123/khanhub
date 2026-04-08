'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { RehabUser } from '@/types/rehab';

export default function RehabRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('rehab_session');
    if (!raw) {
      router.push('/departments/rehab/login');
      return;
    }

    try {
      const user = JSON.parse(raw) as RehabUser;
      if (!user.isActive) {
        localStorage.removeItem('rehab_session');
        router.push('/departments/rehab/login');
        return;
      }

      // Redirect based on role to the last known dashboard
      const role = user.role;
      if (role === 'family') {
        router.push(`/departments/rehab/dashboard/family/${user.patientId}`);
      } else if (role === 'staff') {
        router.push('/departments/rehab/dashboard/staff');
      } else if (role === 'cashier') {
        router.push('/departments/rehab/dashboard/cashier');
      } else if (role === 'admin') {
        router.push('/departments/rehab/dashboard/admin');
      } else if (role === 'superadmin') {
        router.push('/departments/rehab/dashboard/superadmin');
      }
    } catch (err) {
      localStorage.removeItem('rehab_session');
      router.push('/departments/rehab/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-[#1D9E75] border-t-transparent rounded-full" />
    </div>
  );
}
