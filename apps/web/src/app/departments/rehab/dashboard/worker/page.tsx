// apps/web/src/app/departments/rehab/dashboard/worker/page.tsx
// Redirect all worker/sub-staff roles to the unified staff page.
// This page exists only as a URL fallback — routing already sends workers
// directly to /staff via useDashboardPath and resolveDashboard.
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkerRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/departments/rehab/dashboard/staff');
  }, [router]);
  return null;
}
