'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SocialMediaRootPage() {
  const router = useRouter();

  useEffect(() => {
    let raw = localStorage.getItem('media_session');
    const hqSessionStr = localStorage.getItem('hq_session');

    // Auto-sync hq_session to media_session if missing to prevent redirect loop
    if (!raw && hqSessionStr) {
      try {
        const hqSession = JSON.parse(hqSessionStr);
        if (hqSession?.role === 'superadmin' || hqSession?.role === 'manager') {
          const syncSession = {
            uid: hqSession.uid,
            customId: hqSession.customId || hqSession.email || 'HQ-USER',
            role: hqSession.role,
            displayName: hqSession.displayName || (hqSession.role === 'superadmin' ? 'Superadmin' : 'Manager'),
            loginTime: hqSession.loginTime || Number(localStorage.getItem('hq_login_time')) || Date.now()
          };
          localStorage.setItem('media_session', JSON.stringify(syncSession));
          localStorage.setItem('media_login_time', (syncSession.loginTime).toString());
          raw = JSON.stringify(syncSession);
        }
      } catch (e) {}
    }

    if (!raw) {
      router.push('/departments/social-media/login');
      return;
    }

    try {
      const user = JSON.parse(raw);
      if (user.isActive === false) {
        localStorage.removeItem('media_session');
        localStorage.removeItem('media_login_time');
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
      localStorage.removeItem('media_login_time');
      router.push('/departments/social-media/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070913] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );
}

