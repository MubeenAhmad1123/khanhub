// apps/web/src/app/departments/spims/dashboard/student/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentDashboardEntry() {
  const router = useRouter();
  useEffect(() => {
    try {
      const raw = localStorage.getItem('spims_session');
      if (!raw) throw new Error('no session');
      const parsed = JSON.parse(raw);
      const sid = parsed.studentId || parsed.patientId;
      if (sid) {
        router.replace(`/departments/spims/dashboard/student/${sid}`);
        return;
      }
    } catch {}
    router.replace('/departments/spims/login');
  }, [router]);
  return null;
}
