'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SukoonUser } from '@/types/sukoon';

export default function SukoonRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('sukoon_session');
    if (!raw) {
      router.push('/departments/sukoon/login');
      return;
    }

    try {
      const user = JSON.parse(raw) as SukoonUser;
      if (!user.isActive) {
        localStorage.removeItem('sukoon_session');
        router.push('/departments/sukoon/login');
        return;
      }

      // Redirect based on role to the last known dashboard
      const role = user.role;
      if (role === 'family') {
        router.push(`/departments/sukoon/dashboard/family/${user.clientId}`);
      } else if (role === 'staff') {
        router.push('/departments/sukoon/dashboard/staff');
      } else if (role === 'cashier') {
        router.push('/departments/sukoon/dashboard/cashier');
      } else if (role === 'admin') {
        router.push('/departments/sukoon/dashboard/admin');
      } else if (role === 'superadmin') {
        router.push('/departments/sukoon/dashboard/superadmin');
      }
    } catch (err) {
      localStorage.removeItem('sukoon_session');
      router.push('/departments/sukoon/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-[#8B5CF6] border-t-transparent rounded-full" />
    </div>
  );
}
