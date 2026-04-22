'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ItUser } from '@/types/it';

export default function ItRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('it_session') || localStorage.getItem('mediacenter_session');
    if (!raw) {
      router.push('/auth/signin');
      return;
    }

    try {
      const user = JSON.parse(raw) as ItUser;
      if (!user.isActive) {
        localStorage.removeItem('it_session');
        localStorage.removeItem('mediacenter_session');
        router.push('/auth/signin');
        return;
      }

      // Redirect to IT dashboard
      router.push('/departments/it/dashboard');
    } catch (err) {
      localStorage.removeItem('it_session');
      localStorage.removeItem('mediacenter_session');
      router.push('/auth/signin');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}
