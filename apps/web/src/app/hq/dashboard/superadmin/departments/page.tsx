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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-10 min-h-screen bg-white dark:bg-transparent">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Department Hubs</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Direct access to specialized departmental managers.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search departments..."
            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
        </div>
        <Link
          href="/hq/dashboard/superadmin/users"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-900 active:scale-95 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-lg shadow-slate-900/10 dark:shadow-none"
        >
          <Users2 className="h-4 w-4" />
          <span>User Access Control</span>
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {filtered.map((d) => (
          <button
            key={d.id}
            onClick={() => router.push(d.href)}
            className="text-left rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <d.icon className="h-24 w-24" />
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white transition-all group-hover:scale-110 dark:bg-white/10 dark:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900">
                <d.icon className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{d.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{d.description}</p>
              </div>
              
              <div className="flex items-center text-xs font-bold text-slate-900 dark:text-white group-hover:gap-2 transition-all">
                <span>OPEN HUB</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 rounded-[2rem] border border-slate-200 bg-slate-50/50 p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/20">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-black text-slate-900 dark:text-white">Centralized Management Notice</p>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Approvals, Finance, and Global Audit are unified at the HQ level. Departmental hubs provide access to specific internal entities like patient profiles and student academic records.
        </p>
      </div>
    </div>
  );
}


