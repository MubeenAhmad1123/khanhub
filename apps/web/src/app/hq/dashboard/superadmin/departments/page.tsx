// apps/web/src/app/hq/dashboard/superadmin/departments/page.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, HeartPulse, GraduationCap, Users2 } from 'lucide-react';

const DEPTS = [
  {
    id: 'rehab',
    name: 'Rehab',
    description: 'Patients, staff, finance, approvals',
    href: '/hq/dashboard/superadmin/departments?dept=rehab',
    icon: HeartPulse,
  },
  {
    id: 'spims',
    name: 'SPIMS',
    description: 'Students, staff, finance, approvals',
    href: '/hq/dashboard/superadmin/spims',
    icon: GraduationCap,
  },
];

export default function SuperadminDepartmentsPage() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return DEPTS;
    return DEPTS.filter((d) => d.name.toLowerCase().includes(s) || d.description.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Departments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Browse any department profile hub.</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <div className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search departments…"
            className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </div>
        <Link
          href="/hq/dashboard/superadmin/users"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-gray-900"
        >
          <Users2 className="h-4 w-4" />
          Users
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map((d) => (
          <Link
            key={d.id}
            href={d.href}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-900 dark:bg-white/10 dark:text-white">
                <d.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900 dark:text-white">{d.name}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{d.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <p className="text-sm font-black text-gray-900 dark:text-white">Tip</p>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Approvals and Finance are unified at HQ level, so you can filter by department inside those pages.
        </p>
      </div>
    </div>
  );
}

