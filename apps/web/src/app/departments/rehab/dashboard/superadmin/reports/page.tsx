'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import ReportGenerator from '@/components/rehab/ReportGenerator';

export default function SuperAdminReportsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useRehabSession();

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || user.role !== 'superadmin') {
      router.push('/departments/rehab/login');
      return;
    }
  }, [user, sessionLoading, router]);

  if (sessionLoading) return <div className="p-20 text-center animate-pulse">Initializing Global Audit Hub...</div>;

  return (
    <div className="space-y-12 pb-20">
      <div>
        <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">Global Audit</h1>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.3em]">Master Financial Oversight</p>
      </div>

      <div className="bg-green-50 p-10 rounded-[3rem] border border-green-100 flex items-center gap-8 shadow-sm">
        <div className="w-16 h-16 bg-green-500 text-white rounded-3xl flex items-center justify-center text-2xl shadow-xl shadow-green-500/20">📈</div>
        <div className="flex-1">
          <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-1">Financial Intelligence</p>
          <p className="text-sm font-bold text-green-900 leading-relaxed max-w-2xl text-balance">The reports below provide a consolidated view of all <span className="underline decoration-2 decoration-green-500/30 font-black">verified revenue and expenditure</span> streams across the Rehab Center. Data is aggregated in real-time from the backend ledger.</p>
        </div>
      </div>

      <ReportGenerator />
      
      <div className="pt-20 border-t border-gray-100">
         <div className="grid grid-cols-2 gap-8">
            <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
               <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">Export History</h3>
               <p className="text-xs text-gray-500 font-medium leading-relaxed">System maintained logs of all generated reports and physical exports. These are stored for compliance purposes for up to 3 years.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
               <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">System Integrity</h3>
               <p className="text-xs text-gray-500 font-medium leading-relaxed">The ledger is immutable for all approved transactions. Any corrections must be made via a reversal entry approved by a superadmin.</p>
            </div>
         </div>
      </div>
    </div>
  );
}
