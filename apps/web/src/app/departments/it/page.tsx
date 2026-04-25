'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ItUser } from '@/types/it';
import { LogoLoader } from '@/components/ui';

export default function ItRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('it_session');
    if (!raw) {
      router.push('/departments/it/login');
      return;
    }

    try {
      const user = JSON.parse(raw) as ItUser;
      if (!user.isActive) {
        localStorage.removeItem('it_session');
        router.push('/departments/it/login');
        return;
      }

      // Redirect based on role
      const role = user.role;
      if (role === 'student') {
        router.push(`/departments/it/dashboard/student/${user.studentId}`);
      } else if (role === 'client') {
        router.push(`/departments/it/dashboard/client/${user.clientId}`);
      } else if (role === 'staff') {
        router.push('/departments/it/dashboard/staff');
      } else if (role === 'admin' || role === 'superadmin') {
        router.push('/departments/it/dashboard/admin');
      } else {
        router.push('/departments/it/dashboard');
      }
    } catch (err) {
      localStorage.removeItem('it_session');
      router.push('/departments/it/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <LogoLoader size="md" />
    </div>
  );
}

