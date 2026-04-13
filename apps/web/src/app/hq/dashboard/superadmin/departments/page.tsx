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
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-10 min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-12">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-black dark:text-white uppercase mb-4">
            Intelligence <span className="text-gray-400 dark:text-gray-500 italic">Hubs</span>
          </h1>
          <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] leading-relaxed max-w-xl">
            Access specialized management portals for each department. All global operations are unified at HQ Command.
          </p>
        </div>
        <Link
          href="/hq/dashboard/superadmin/users"
          className="inline-flex items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-black dark:border-white/10 dark:bg-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-xl active:scale-95"
        >
          <Users2 className="h-4 w-4" />
          <span>Access Control</span>
        </Link>
      </div>

      <div className="mb-12 group relative max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
          <Building2 className="h-5 w-5 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SEARCH DEPARTMENT SEQUENCE..."
          className="w-full bg-white dark:bg-black border border-gray-100 dark:border-white/10 pl-14 pr-6 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest text-black dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none focus:border-black dark:focus:border-white/40 transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        {filtered.map((d) => (
          <button
            key={d.id}
            onClick={() => router.push(d.href)}
            className="text-left rounded-[3rem] border border-gray-50 bg-white p-10 shadow-sm hover:shadow-2xl hover:border-black dark:hover:border-white dark:border-white/[0.02] dark:bg-white/[0.02] group relative overflow-hidden transition-all duration-500 hover:-translate-y-2 active:scale-[0.98]"
          >
            <div className="flex flex-col gap-10 relative z-10">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gray-50 dark:bg-white/5 text-black dark:text-white border border-gray-100 dark:border-white/10 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black">
                <d.icon className="h-10 w-10" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter transition-colors">
                  {d.name}
                </h3>
                <p className="text-xs font-bold leading-relaxed text-gray-400 dark:text-gray-500 uppercase tracking-widest italic group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                  {d.description}
                </p>
              </div>
              
              <div className="pt-6 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center text-[10px] font-black text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white group-hover:gap-3 transition-all uppercase tracking-[0.2em]">
                  <span>Launch Module</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0">→</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-gray-100 dark:bg-white/10 group-hover:bg-black dark:group-hover:bg-white transition-colors" />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-20 rounded-[3rem] border border-gray-50 bg-gray-50/50 p-12 dark:border-white/5 dark:bg-white/[0.02] backdrop-blur-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="h-24 w-24 shrink-0 flex items-center justify-center rounded-[2rem] bg-white dark:bg-black shadow-2xl text-black dark:text-white border border-gray-100 dark:border-white/10">
            <Building2 className="h-12 w-12" />
          </div>
          <div className="text-center md:text-left">
            <h4 className="text-xl font-black text-black dark:text-white uppercase tracking-tight mb-3">Governance Architecture</h4>
            <p className="text-[10px] leading-relaxed text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em] max-w-3xl italic">
              CENTRAL HQ COMMAND EXERCISES SOVEREIGN OVERSIGHT OVER ALL SUBORDINATE MODULES. FINANCIAL INTEGRITY, ACCESS ESCALATION, AND AUDIT SURVEILLANCE ARE UNIFIED HERE. DEPARTMENTAL HUBS SERVE AS SPECIALIZED DATA EXECUTION LAYERS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


