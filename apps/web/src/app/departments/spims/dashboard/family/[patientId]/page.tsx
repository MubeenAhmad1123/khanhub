// apps/web/src/app/departments/spims/dashboard/family/[patientId]/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/** @deprecated Use /dashboard/student/[studentId] */
export default function LegacyFamilyIdRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params.patientId as string;
  useEffect(() => {
    if (id) router.replace(`/departments/spims/dashboard/student/${id}`);
  }, [router, id]);
  return null;
}
