'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SESSION_KEY = 'hq_session';
const SESSION_TIMEOUT = 604800000; // 7 days in ms

export default function HqEntryPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const elapsed = Date.now() - parsed.loginTime;
        if (elapsed < SESSION_TIMEOUT) {
          const roleRoutes: Record<string, string> = {
            superadmin: '/hq/dashboard/superadmin',
            manager: '/hq/dashboard/manager',
            cashier: '/hq/dashboard/cashier',
          };
          router.push(roleRoutes[parsed.role] || '/hq/login');
          return;
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    router.push('/hq/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Redirecting...</p>
      </div>
    </div>
  );
}
