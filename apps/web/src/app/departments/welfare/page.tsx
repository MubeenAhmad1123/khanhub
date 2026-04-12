'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { WelfareUser } from '@/types/welfare';

export default function WelfareRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('welfare_session');
    if (!raw) {
      router.push('/departments/welfare/login');
      return;
    }

    try {
      const user = JSON.parse(raw) as WelfareUser;
      if (!user.isActive) {
        localStorage.removeItem('welfare_session');
        router.push('/departments/welfare/login');
        return;
      }

      // Redirect based on role to the last known dashboard
      const role = user.role;
      if (role === 'child') {
        router.push(`/departments/welfare/dashboard/child/${user.childId}`);
      } else if (role === 'staff') {
        router.push('/departments/welfare/dashboard/staff');
      } else if (role === 'cashier') {
        router.push('/departments/welfare/dashboard/cashier');
      } else if (role === 'admin') {
        router.push('/departments/welfare/dashboard/admin');
      } else if (role === 'superadmin') {
        router.push('/departments/welfare/dashboard/superadmin');
      }
    } catch (err) {
      localStorage.removeItem('welfare_session');
      router.push('/departments/welfare/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-[#E11D48] border-t-transparent rounded-full" />
    </div>
  );
}
