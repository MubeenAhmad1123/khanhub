// apps/web/src/app/departments/spims/dashboard/admin/patients/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyPatientsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/departments/spims/dashboard/admin/students');
  }, [router]);
  return null;
}
