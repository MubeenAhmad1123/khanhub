'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SpimsDashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('spims_session');
    if (!raw) {
      router.push('/departments/spims/login');
      return;
    }

    try {
      const user = JSON.parse(raw);
      if (user.isActive === false) {
        localStorage.removeItem('spims_session');
        router.push('/departments/spims/login');
        return;
      }

      const role = user.role;
      if (role === 'student' || role === 'family') {
        router.push(`/departments/spims/dashboard/student/${user.studentId || user.patientId}`);
      } else if (role === 'staff') {
        router.push('/departments/spims/dashboard/staff');
      } else if (role === 'admin') {
        router.push('/departments/spims/dashboard/admin');
      } else if (role === 'superadmin') {
        router.push('/departments/spims/dashboard/superadmin');
      } else {
        router.push('/departments/spims/dashboard/profile');
      }
    } catch (err) {
      localStorage.removeItem('spims_session');
      router.push('/departments/spims/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
    </div>
  );
}
