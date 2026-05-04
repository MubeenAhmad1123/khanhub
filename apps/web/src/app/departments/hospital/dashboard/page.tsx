'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { HospitalUser } from '@/types/hospital';

export default function HospitalDashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('hospital_session');
    if (!raw) {
      router.push('/departments/hospital/login');
      return;
    }

    try {
      const user = JSON.parse(raw) as HospitalUser;
      if (!user.isActive) {
        localStorage.removeItem('hospital_session');
        router.push('/departments/hospital/login');
        return;
      }

      const role = user.role;
      if (role === 'family') {
        router.push(`/departments/hospital/dashboard/family/${user.patientId}`);
      } else if (role === 'staff') {
        router.push('/departments/hospital/dashboard/staff');
      } else if (role === 'cashier') {
        router.push('/departments/hospital/dashboard/cashier');
      } else if (role === 'admin') {
        router.push('/departments/hospital/dashboard/admin');
      } else if (role === 'superadmin') {
        router.push('/departments/hospital/dashboard/superadmin');
      } else {
        // fallback to staff or profile
        router.push('/departments/hospital/dashboard/profile');
      }
    } catch (err) {
      localStorage.removeItem('hospital_session');
      router.push('/departments/hospital/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}
