'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { JobCenterUser } from '@/types/job-center';

export default function JobCenterRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('job_center_session');
    if (!raw) {
      router.push('/departments/job-center/login');
      return;
    }

    try {
      const user = JSON.parse(raw) as JobCenterUser;
      if (!user.isActive) {
        localStorage.removeItem('job_center_session');
        router.push('/departments/job-center/login');
        return;
      }

      // Redirect based on role to the last known dashboard
      const role = user.role;
      if (role === 'family') {
        router.push(`/departments/job-center/dashboard/family/${user.seekerId}`);
      } else if (role === 'staff') {
        router.push('/departments/job-center/dashboard/staff');
      } else if (role === 'cashier') {
        router.push('/departments/job-center/dashboard/cashier');
      } else if (role === 'admin') {
        router.push('/departments/job-center/dashboard/admin');
      } else if (role === 'superadmin') {
        router.push('/departments/job-center/dashboard/superadmin');
      }
    } catch (err) {
      localStorage.removeItem('job_center_session');
      router.push('/departments/job-center/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-[#3B82F6] border-t-transparent rounded-full" />
    </div>
  );
}
