'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SocialMediaRootPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('media_session');
    if (!raw) {
      router.push('/departments/social-media/login');
      return;
    }

    try {
      const user = JSON.parse(raw);
      if (user.isActive === false) {
        localStorage.removeItem('media_session');
        router.push('/departments/social-media/login');
        return;
      }

      const role = user.role?.toLowerCase();
      if (role === 'staff') {
        router.push('/departments/social-media/dashboard/staff');
      } else if (role === 'admin' || role === 'superadmin' || role === 'manager') {
        router.push('/departments/social-media/dashboard/admin');
      } else {
        router.push('/departments/social-media/login');
      }
    } catch (err) {
      localStorage.removeItem('media_session');
      router.push('/departments/social-media/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070913] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );
}
