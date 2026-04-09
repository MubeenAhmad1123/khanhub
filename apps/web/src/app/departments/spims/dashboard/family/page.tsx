// apps/web/src/app/departments/spims/dashboard/family/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** @deprecated Use /dashboard/student */
export default function LegacyFamilyRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/departments/spims/dashboard/student');
  }, [router]);
  return null;
}
