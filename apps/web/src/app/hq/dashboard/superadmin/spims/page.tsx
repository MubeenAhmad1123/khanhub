// apps/web/src/app/hq/dashboard/superadmin/spims/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, Users2, TrendingUp } from 'lucide-react';

export default function SuperadminSpimsHubPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">SPIMS Hub</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Students, staff, and finance.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/hq/dashboard/superadmin/spims/students"
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/10">
              <GraduationCap className="h-5 w-5 text-gray-900 dark:text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white">Students</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Browse profiles</p>
            </div>
          </div>
        </Link>

        <Link
          href="/hq/dashboard/superadmin/staff?dept=spims"
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/10">
              <Users2 className="h-5 w-5 text-gray-900 dark:text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white">Staff</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Roster + metrics</p>
            </div>
          </div>
        </Link>

        <Link
          href="/hq/dashboard/superadmin/finance?tab=spims"
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/10">
              <TrendingUp className="h-5 w-5 text-gray-900 dark:text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white">Finance</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Collections + dues</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

