// src/app/departments/job-center/dashboard/cashier/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CashierRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Optional: Auto redirect after 5 seconds
    const timer = setTimeout(() => {
      // router.push('/hq/dashboard/cashier');
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mx-auto mb-6">
          <CreditCard size={40} />
        </div>
        
        <h1 className="text-2xl font-black text-gray-900 mb-3">Cashier Relocated</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          The <span className="font-bold text-gray-900">Cashier Station</span> has been moved to the new 
          <span className="font-bold text-orange-600"> KhanHub Headquarter (HQ)</span> portal for centralized financial management.
        </p>

        <div className="space-y-4">
          <Link 
            href="/hq/dashboard/cashier"
            className="flex items-center justify-center gap-2 w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-100 group"
          >
            Go to HQ Cashier Station
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            You will no longer be able to manage transactions from the Job Center portal.
          </p>
        </div>
      </div>
    </div>
  );
}

