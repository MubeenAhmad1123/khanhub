// apps/web/src/app/departments/spims/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SpimsRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('spims_session');
    if (!raw) {
      router.push('/departments/spims/login');
      return;
    }

    try {
      const user = JSON.parse(raw);
      const role = user.role;
      const sid = user.studentId || user.patientId;

      if (role === 'student') {
        if (!sid) {
          router.push('/departments/spims/login');
          return;
        }
        router.push(`/departments/spims/dashboard/student/${sid}`);
      } else if (role === 'staff') {
        router.push('/departments/spims/dashboard/staff');
      } else if (role === 'cashier') {
        router.push('/departments/spims/dashboard/cashier');
      } else if (role === 'admin') {
        router.push('/departments/spims/dashboard/admin');
      } else if (role === 'superadmin') {
        router.push('/departments/spims/dashboard/superadmin');
      } else {
        router.push('/departments/spims/login');
      }
    } catch {
      localStorage.removeItem('spims_session');
      router.push('/departments/spims/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-[#1D9E75] border-t-transparent rounded-full" />
    </div>
  );
}
