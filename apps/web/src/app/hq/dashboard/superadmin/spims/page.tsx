// apps/web/src/app/hq/dashboard/superadmin/spims/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, Users2, TrendingUp } from 'lucide-react';

export default function SuperadminSpimsHubPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-10 min-h-screen transition-colors duration-300">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-black dark:text-white uppercase">SPIMS Architecture</h1>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 italic">Academic Governance • Lifecycle Tracking • Financial Integrity</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/hq/dashboard/superadmin/spims/students"
          className="group rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm transition-all hover:border-black dark:hover:border-white hover:scale-[1.02] dark:border-white/10 dark:bg-black active:scale-95"
        >
          <div className="flex flex-col items-center text-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-black text-white dark:bg-white dark:text-black shadow-xl group-hover:rotate-6 transition-transform">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-black text-black dark:text-white uppercase tracking-widest">Students</p>
              <p className="mt-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Subject Directory</p>
            </div>
          </div>
        </Link>

        <Link
          href="/hq/dashboard/superadmin/staff?dept=spims"
          className="group rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm transition-all hover:border-black dark:hover:border-white hover:scale-[1.02] dark:border-white/10 dark:bg-black active:scale-95"
        >
          <div className="flex flex-col items-center text-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-black text-white dark:bg-white dark:text-black shadow-xl group-hover:-rotate-6 transition-transform">
              <Users2 className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-black text-black dark:text-white uppercase tracking-widest">Educationists</p>
              <p className="mt-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Personnel Matrix</p>
            </div>
          </div>
        </Link>

        <Link
          href="/hq/dashboard/superadmin/finance?tab=spims"
          className="group rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm transition-all hover:border-black dark:hover:border-white hover:scale-[1.02] dark:border-white/10 dark:bg-black active:scale-95"
        >
          <div className="flex flex-col items-center text-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-black text-white dark:bg-white dark:text-black shadow-xl group-hover:scale-110 transition-transform">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-black text-black dark:text-white uppercase tracking-widest">Treasury</p>
              <p className="mt-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Revenue Streams</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

