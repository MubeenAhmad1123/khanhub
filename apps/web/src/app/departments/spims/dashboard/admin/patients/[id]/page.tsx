// apps/web/src/app/departments/spims/dashboard/admin/patients/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function LegacyPatientDetailRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  useEffect(() => {
    if (id) router.replace(`/departments/spims/dashboard/admin/students/${id}`);
  }, [router, id]);
  return null;
}
