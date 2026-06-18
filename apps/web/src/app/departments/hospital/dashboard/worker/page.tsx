// apps/web/src/app/departments/hospital/dashboard/worker/page.tsx
// Redirect all worker/sub-staff roles to the unified staff page.
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkerRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/departments/hospital/dashboard/staff');
  }, [router]);
  return null;
}
