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
    <div className="min-h-screen bg-[#FCFBF8] transition-colors duration-500 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-12 mb-20">
          <div className="space-y-6">
            <h1 className="text-6xl font-black tracking-tighter text-gray-900 uppercase leading-none">
              Operational <span className="text-indigo-600">Hubs</span>
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] leading-relaxed max-w-xl italic">
              Centralized Management Systems • Cross-Departmental Synchronization
            </p>
          </div>
          <Link
            href="/hq/dashboard/superadmin/users"
            className="inline-flex items-center justify-center gap-4 rounded-[2rem] bg-white border border-gray-100 px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 hover:bg-gray-900 hover:text-white transition-all shadow-2xl shadow-gray-200/50 active:scale-95 group"
          >
            <Users2 className="h-5 w-5 text-indigo-600 group-hover:text-white" />
            <span>Governance Access</span>
          </Link>
        </div>

        <div className="mb-16 group relative max-w-3xl">
          <div className="absolute inset-y-0 left-0 pl-8 flex items-center pointer-events-none">
            <Building2 className="h-6 w-6 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SEARCH GLOBAL DIRECTORY..."
            className="w-full bg-white border border-gray-100 pl-16 pr-8 py-7 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest text-gray-900 placeholder:text-gray-300 outline-none focus:border-indigo-600 transition-all shadow-2xl shadow-gray-200/50"
          />
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => router.push(d.href)}
              className="text-left rounded-[3.5rem] border border-gray-100 bg-white p-12 shadow-2xl shadow-gray-200/50 hover:shadow-indigo-500/20 hover:scale-[1.02] transition-all duration-700 group relative overflow-hidden"
            >
              <div className="flex flex-col gap-12 relative z-10">
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gray-50 text-indigo-600 border border-gray-100 shadow-inner transition-all duration-700 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6">
                  <d.icon className="h-10 w-10" strokeWidth={2.5} />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">
                    {d.name}
                  </h3>
                  <p className="text-[11px] font-bold leading-relaxed text-gray-400 uppercase tracking-widest italic border-l-2 border-gray-100 pl-6 group-hover:border-indigo-600 transition-colors">
                    {d.description}
                  </p>
                </div>
                
                <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center text-[10px] font-black text-gray-900 group-hover:text-indigo-600 group-hover:gap-6 transition-all uppercase tracking-[0.3em]">
                    <span>Deploy Module</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-all transform -translate-x-4 group-hover:translate-x-0">→</span>
                  </div>
                  <div className="h-2 w-12 rounded-full bg-gray-100 group-hover:bg-indigo-600 transition-all duration-700" />
                </div>
              </div>
            </button>
          ))}
        </div>

        </div>
      </div>
    </div>
  );
}


