// apps/web/src/app/hq/dashboard/superadmin/spims/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, Users2, TrendingUp } from 'lucide-react';

export default function SuperadminSpimsHubPage() {
  return (
    <div className="min-h-screen bg-[#FCFBF8] transition-colors duration-500 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-10">
        <div className="mb-16">
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 uppercase leading-none">SPIMS Architecture</h1>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 italic">Academic Governance • Lifecycle Tracking • Financial Integrity</p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Link
            href="/hq/dashboard/superadmin/spims/students"
            className="group rounded-[2.5rem] border border-gray-100 bg-white p-10 shadow-2xl shadow-gray-200/50 transition-all hover:shadow-indigo-500/10 hover:scale-[1.05] active:scale-95"
          >
            <div className="flex flex-col items-center text-center gap-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gray-50 text-indigo-600 border border-gray-100 shadow-inner group-hover:rotate-6 transition-all duration-700">
                <GraduationCap className="h-10 w-10" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900 uppercase tracking-tight">Students</p>
                <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Subject Directory</p>
              </div>
            </div>
          </Link>

          <Link
            href="/hq/dashboard/superadmin/staff?dept=spims"
            className="group rounded-[2.5rem] border border-gray-100 bg-white p-10 shadow-2xl shadow-gray-200/50 transition-all hover:shadow-indigo-500/10 hover:scale-[1.05] active:scale-95"
          >
            <div className="flex flex-col items-center text-center gap-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gray-50 text-indigo-600 border border-gray-100 shadow-inner group-hover:-rotate-6 transition-all duration-700">
                <Users2 className="h-10 w-10" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900 uppercase tracking-tight">Educationists</p>
                <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Personnel Matrix</p>
              </div>
            </div>
          </Link>

          <Link
            href="/hq/dashboard/superadmin/finance?tab=spims"
            className="group rounded-[2.5rem] border border-gray-100 bg-white p-10 shadow-2xl shadow-gray-200/50 transition-all hover:shadow-indigo-500/10 hover:scale-[1.05] active:scale-95"
          >
            <div className="flex flex-col items-center text-center gap-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gray-50 text-indigo-600 border border-gray-100 shadow-inner group-hover:scale-110 transition-all duration-700">
                <TrendingUp className="h-10 w-10" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900 uppercase tracking-tight">Treasury</p>
                <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Revenue Streams</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

