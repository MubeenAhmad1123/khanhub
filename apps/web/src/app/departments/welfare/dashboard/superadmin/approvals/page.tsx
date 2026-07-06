// src/app/departments/welfare/dashboard/superadmin/approvals/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ApprovalsRedirect() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        
        <h1 className="text-2xl font-black text-gray-900 mb-3">Approvals Deactivated</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Welfare transactions are now <span className="font-bold text-teal-600">automatically approved</span> upon entry. 
          The local approvals queue is no longer required. For central history, visit the 
          <span className="font-bold text-gray-900"> Khan Hub Headquarter (HQ)</span>.
        </p>

        <div className="space-y-4">
          <Link 
            href="/hq/dashboard/superadmin/approvals"
            className="flex items-center justify-center gap-2 w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-teal-100 group"
          >
            Go to HQ Approvals
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            Audit history is preserved centrally in the HQ database.
          </p>
        </div>
      </div>
    </div>
  );
}
