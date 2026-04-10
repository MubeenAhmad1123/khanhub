// apps/web/src/app/hq/dashboard/superadmin/departments/page.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, HeartPulse, GraduationCap, Users2 } from 'lucide-react';

const DEPTS = [
  {
    id: 'rehab',
    name: 'Rehab Center',
    description: 'Patient admissions, plans, and detailed reports.',
    href: '/departments/rehab/dashboard/admin/patients',
    icon: HeartPulse,
  },
  {
    id: 'spims',
    name: 'SPIMS',
    description: 'Student enrollments, academics, and fee tracking.',
    href: '/departments/spims/dashboard/admin/students',
    icon: GraduationCap,
  },
];

export default function SuperadminDepartmentsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return DEPTS;
    return DEPTS.filter((d) => d.name.toLowerCase().includes(s) || d.description.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 min-h-screen bg-gray-50/50 dark:bg-transparent">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Department Hubs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Direct access to specialized departmental managers.</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <div className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search departments…"
            className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-300 dark:text-white"
          />
        </div>
        <Link
          href="/hq/dashboard/superadmin/users"
          className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-black text-white dark:bg-white dark:text-gray-900 active:scale-95 transition"
        >
          <Users2 className="h-4 w-4" />
          <span>Users</span>
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((d) => (
          <button
            key={d.id}
            onClick={() => router.push(d.href)}
            className="text-left rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-white/5 group"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-900 transition group-hover:bg-gray-900 group-hover:text-white dark:bg-white/10 dark:text-white dark:group-hover:bg-white dark:group-hover:text-gray-900">
                <d.icon className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{d.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{d.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-black text-gray-900 dark:text-white">Centralized Management Notice</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Approvals, Finance, and Global Audit are unified at the HQ level. Departmental hubs provide access to specific internal entities like patient profiles and student academic records.
        </p>
      </div>
    </div>
  );
}


