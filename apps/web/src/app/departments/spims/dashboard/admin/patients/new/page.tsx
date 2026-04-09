// apps/web/src/app/departments/spims/dashboard/admin/patients/new/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyPatientsNewRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/departments/spims/dashboard/admin/students/new');
  }, [router]);
  return null;
}
