'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RehabDashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('rehab_session');
    if (!raw) {
      router.push('/departments/rehab/login');
      return;
    }

    try {
      const user = JSON.parse(raw);
      if (user.isActive === false) {
        localStorage.removeItem('rehab_session');
        router.push('/departments/rehab/login');
        return;
      }

      const role = user.role;
      if (role === 'family') {
        router.push(`/departments/rehab/dashboard/family/${user.patientId}`);
      } else if (role === 'staff') {
        router.push('/departments/rehab/dashboard/staff');
      } else if (role === 'admin') {
        router.push('/departments/rehab/dashboard/admin');
      } else if (role === 'superadmin') {
        router.push('/departments/rehab/dashboard/superadmin');
      } else {
        router.push('/departments/rehab/dashboard/profile');
      }
    } catch (err) {
      localStorage.removeItem('rehab_session');
      router.push('/departments/rehab/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FCFBF4] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-rose-500 border-t-transparent rounded-full" />
    </div>
  );
}
