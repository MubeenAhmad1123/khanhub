'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import ReportGenerator from '@/components/rehab/ReportGenerator';

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useRehabSession();

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      router.push('/departments/rehab/login');
      return;
    }
  }, [user, sessionLoading, router]);

  if (sessionLoading) return <div className="p-20 text-center animate-pulse">Initializing Analytics Hub...</div>;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Monthly Analytics</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Audit-Ready Financial Reports</p>
        </div>
      </div>

      <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 flex items-center gap-6">
        <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">ℹ️</div>
        <div>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Information</p>
          <p className="text-sm font-bold text-blue-900 leading-relaxed">Reports are generated based on <span className="underline decoration-2 decoration-blue-500/30 font-black">approved transactions only</span>. Pending entries will not be included in the totals. Use the print button to generate a PDF for physical record keeping.</p>
        </div>
      </div>

      <ReportGenerator />
    </div>
  );
}
