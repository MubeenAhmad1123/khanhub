// apps/web/src/app/hq/dashboard/superadmin/analytics/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, ArrowLeft, Construction, Clock } from 'lucide-react';

export default function SuperadminAnalyticsPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-gray-950 min-h-screen text-white">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="rounded-full bg-white/5 p-2 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Advanced Analytics</h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Macro Analysis & Forecasting</p>
        </div>
      </div>

      <div className="mt-20 flex flex-col items-center justify-center text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
          <div className="relative rounded-full bg-amber-400/10 p-8 border border-amber-400/20">
            <Construction className="h-16 w-16 text-amber-400" />
          </div>
        </div>
        
        <h2 className="text-3xl font-black mb-4">Deep Intelligence Module</h2>
        <p className="max-w-md text-gray-400 font-medium leading-relaxed">
          The cross-portal macro analytics engine is currently being optimized. This section will feature predictive revenue modeling, demographic insights, and operational efficiency metrics.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          {[
            { label: 'Predictive ROI', icon: LayoutDashboard },
            { label: 'Real-time Pulse', icon: Clock },
            { label: 'Deep Drill-down', icon: Construction }
          ].map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm">
              <item.icon className="h-6 w-6 text-gray-500 mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Module {idx + 1}</p>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">{item.label}</h3>
            </div>
          ))}
        </div>

        <button 
          onClick={() => router.push('/hq/dashboard/superadmin/finance')}
          className="mt-12 rounded-2xl bg-amber-400 px-8 py-4 text-xs font-black uppercase tracking-widest text-black shadow-xl shadow-amber-400/20 hover:scale-105 transition-transform active:scale-95"
        >
          Return to Finance
        </button>
      </div>
    </div>
  );
}
