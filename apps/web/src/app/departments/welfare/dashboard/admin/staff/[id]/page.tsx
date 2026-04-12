// src/app/departments/welfare/dashboard/admin/staff/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminStaffProfileRedirect() {
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      router.replace(`/hq/dashboard/manager/staff/${id}`);
    } else {
      router.replace('/hq/dashboard/manager/staff');
    }
  }, [router, id]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-4" />
      <p className="text-sm font-black text-gray-400 uppercase tracking-widest">
        Redirecting to HQ Staff Profile...
      </p>
    </div>
  );
}
