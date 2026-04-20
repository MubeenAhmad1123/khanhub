'use client';

import { useAuth } from '@/hooks/useAuth';
import { canAccessHqPortal } from '@/lib/hqPortalAccess';
import { useEffect, useState } from 'react';
import { resolveDashboardPathOnServer } from '@/app/actions/resolveDashboard';

// ─── Department session registry ──────────────────────────────────────────────
const DEPT_SESSION_RESOLVERS: {
  sessionKey: string;
  resolvePath: (session: Record<string, any>) => string;
}[] = [
  {
    sessionKey: 'hq_session',
    resolvePath: (s) => {
      const role = String(s.role || '').toLowerCase();
      if (role === 'superadmin') return '/hq/dashboard/superadmin';
      if (role === 'manager') return '/hq/dashboard/manager';
      if (role === 'cashier') return '/hq/dashboard/cashier';
      return '/hq/dashboard';
    },
  },
  {
    sessionKey: 'rehab_session',
    resolvePath: (s) => {
      const role = String(s.role || '').toLowerCase();
      if (role === 'admin') return '/departments/rehab/dashboard/admin';
      if (role === 'cashier') return '/departments/rehab/dashboard/cashier';
      if (role === 'staff') return '/departments/rehab/dashboard/staff';
      if (role === 'superadmin') return '/departments/rehab/dashboard/superadmin';
      if (role === 'family') return s.patientId ? `/departments/rehab/dashboard/family/${s.patientId}` : '/departments/rehab/dashboard';
      return '/departments/rehab/dashboard';
    },
  },
  {
    sessionKey: 'spims_session',
    resolvePath: (s) => {
      const role = String(s.role || '').toLowerCase();
      if (role === 'admin') return '/departments/spims/dashboard/admin';
      if (role === 'cashier') return '/departments/spims/dashboard/cashier';
      if (role === 'staff') return '/departments/spims/dashboard/staff';
      if (role === 'superadmin') return '/departments/spims/dashboard/superadmin';
      if (role === 'student') return '/departments/spims/dashboard/student';
      if (role === 'family') return '/departments/spims/dashboard/family';
      return '/departments/spims/dashboard';
    },
  },
  {
    sessionKey: 'hospital_session',
    resolvePath: (s) => {
      const role = String(s.role || '').toLowerCase();
      return `/departments/hospital/dashboard${role ? `/${role}` : ''}`;
    },
  },
  {
    sessionKey: 'sukoon_session',
    resolvePath: (s) => {
      const role = String(s.role || '').toLowerCase();
      return `/departments/sukoon/dashboard${role ? `/${role}` : ''}`;
    },
  },
  {
    sessionKey: 'welfare_session',
    resolvePath: (s) => {
      const role = String(s.role || '').toLowerCase();
      return `/departments/welfare/dashboard${role ? `/${role}` : ''}`;
    },
  },
  {
    sessionKey: 'job_center_session',
    resolvePath: (s) => {
      const role = String(s.role || '').toLowerCase();
      return `/departments/job-center/dashboard${role ? `/${role}` : ''}`;
    },
  },
];

function resolveActiveDashboard(): string {
  if (typeof window === 'undefined') return '/dashboard';

  let latestTime = -1;
  let latestPath = '/dashboard';

  for (const resolver of DEPT_SESSION_RESOLVERS) {
    try {
      const raw = localStorage.getItem(resolver.sessionKey);
      if (!raw) continue;
      const session = JSON.parse(raw) as Record<string, any>;
      const loginTime = Number(session.loginTime || 0);
      if (loginTime >= latestTime) {
        latestTime = loginTime;
        latestPath = resolver.resolvePath(session);
      }
    } catch {
      // ignore
    }
  }

  return latestPath;
}

export function useDashboardPath() {
  const { user } = useAuth();
  const [dashboardPath, setDashboardPath] = useState('/dashboard');

  useEffect(() => {
    let isMounted = true;

    async function detect() {
      if (!user) {
        if (isMounted) setDashboardPath('/dashboard');
        return;
      }

      // 1. Check department sessions in localStorage (Fastest - uses existing session)
      const deptPath = resolveActiveDashboard();
      if (deptPath !== '/dashboard') {
        if (isMounted) setDashboardPath(deptPath);
        return;
      }

      // 2. Check HQ portal access by email (Allowlist fallback - very fast)
      if (canAccessHqPortal(user.email)) {
        if (isMounted) setDashboardPath('/hq/dashboard/superadmin');
        return;
      }

      // 3. Deep Detection - Check common user collections (Server-side to bypass permission issues)
      // This is slow but thorough, only runs if no local session or email match is found.
      try {
        const path = await resolveDashboardPathOnServer(user.uid);
        if (path && isMounted) {
          setDashboardPath(path);
          return;
        }
      } catch (err) {
        console.error('Deep dashboard detection failed:', err);
      }

      // 4. Default: generic dashboard for Google-only users
      if (isMounted) setDashboardPath('/dashboard');
    }

    detect();

    return () => { isMounted = false; };
  }, [user]);

  return dashboardPath;
}
