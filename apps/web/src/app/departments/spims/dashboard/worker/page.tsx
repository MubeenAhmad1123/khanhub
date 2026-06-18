// apps/web/src/app/departments/spims/dashboard/worker/page.tsx
// Redirect all worker/sub-staff roles to the unified staff page.
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkerRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/departments/spims/dashboard/staff');
  }, [router]);
  return null;
}
