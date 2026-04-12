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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-10 min-h-screen bg-transparent">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[#111827] dark:text-white mb-2">
            Department <span className="text-teal-600 dark:text-teal-400">Hubs</span>
          </h1>
          <p className="text-base text-[#6B7280] dark:text-gray-400 font-medium max-w-lg leading-relaxed">
            Access specialized management portals for each department. All global operations are unified at HQ.
          </p>
        </div>
        <Link
          href="/hq/dashboard/superadmin/users"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D1D5DB] bg-[#FFFFFF] px-6 py-4 text-sm font-black text-[#111827] dark:bg-white dark:text-slate-900 active:scale-95 hover:bg-[#F9FAFB] dark:hover:bg-gray-100 transition-all shadow-sm"
        >
          <Users2 className="h-4 w-4 text-[#374151] dark:text-slate-900" />
          <span>ACCESS CONTROL</span>
        </Link>
      </div>

      <div className="mt-10">
        <div className="group relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <div className="h-4 w-4 text-[#6B7280] dark:text-slate-400 group-focus-within:text-teal-500 transition-colors">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by department name or description..."
            className="w-full bg-[#F9FAFB] dark:bg-slate-900 border border-[#D1D5DB] dark:border-white/5 pl-11 pr-4 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-[#9CA3AF] outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {filtered.map((d) => (
          <button
            key={d.id}
            onClick={() => router.push(d.href)}
            className="text-left rounded-[2.5rem] border border-[#E5E7EB] bg-[#FFFFFF] p-8 shadow-sm hover:shadow-2xl hover:shadow-teal-900/5 hover:-translate-y-2 active:scale-[0.98] dark:border-white/5 dark:bg-slate-900 group relative overflow-hidden transition-all duration-500"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 h-48 w-48 bg-teal-50/50 dark:bg-teal-500/5 rounded-full blur-3xl transition-colors group-hover:bg-teal-100/50 dark:group-hover:bg-teal-500/10" />
            
            <div className="flex flex-col gap-8 relative z-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0FDF4] text-teal-600 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:bg-teal-500 group-hover:text-white dark:bg-teal-500/10 dark:text-teal-400 dark:group-hover:bg-teal-500 dark:group-hover:text-white">
                <d.icon className="h-8 w-8" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-[#111827] dark:text-white uppercase tracking-tighter group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {d.name}
                </h3>
                <p className="text-sm leading-relaxed text-[#6B7280] dark:text-gray-400 font-semibold italic">
                  "{d.description}"
                </p>
              </div>
              
              <div className="pt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center text-xs font-black text-teal-600 dark:text-teal-400 group-hover:gap-2 transition-all uppercase tracking-widest">
                  <span>LAUNCH PORTAL</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">→</span>
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-white/10 group-hover:bg-teal-500 transition-colors" />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-16 rounded-[2.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-10 dark:border-white/5 dark:bg-slate-900/30 backdrop-blur-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="h-20 w-20 shrink-0 flex items-center justify-center rounded-3xl bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none text-teal-600 dark:text-teal-400">
            <Building2 className="h-10 w-10" />
          </div>
          <div className="text-center md:text-left">
            <h4 className="text-lg font-black text-[#111827] dark:text-white mb-2">Centralized Command Structure</h4>
            <p className="text-sm leading-relaxed text-[#374151] dark:text-gray-400 font-medium max-w-2xl">
              KhanHub HQ operates as the primary authority for Approvals, Finance, and Global Audit. 
              Departmental hubs are specialized execution layers for managing entity-specific data like patient records and student academics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


