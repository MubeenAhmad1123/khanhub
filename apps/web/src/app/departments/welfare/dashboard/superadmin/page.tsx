// src/app/departments/welfare/dashboard/superadmin/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Optional: Auto redirect after 5 seconds
    const timer = setTimeout(() => {
      // router.push('/hq/dashboard');
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mx-auto mb-6">
          <Shield size={40} />
        </div>
        
        <h1 className="text-2xl font-black text-gray-900 mb-3">Portal Relocated</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          The <span className="font-bold text-gray-900">Superadmin Dashboard</span> has been moved to the new 
          <span className="font-bold text-teal-600"> Khan Hub Headquarter (HQ)</span> portal for centralized management.
        </p>

        <div className="space-y-4">
          <Link 
            href="/hq/dashboard/superadmin"
            className="flex items-center justify-center gap-2 w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-teal-100 group"
          >
            Go to HQ Dashboard
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            You will no longer be able to manage HQ tasks from the Rehab portal.
          </p>
        </div>
      </div>
    </div>
  );
}
