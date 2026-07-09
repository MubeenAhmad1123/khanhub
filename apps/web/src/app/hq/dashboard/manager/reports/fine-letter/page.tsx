'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import FineLetterGenerator from '@/components/hq/FineLetterGenerator';

export default function FineLetterPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || !['manager', 'superadmin'].includes(session.role)) {
      router.push('/hq/login');
    }
  }, [session, sessionLoading, router]);

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans p-4 sm:p-6 md:p-8 max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Row */}
        <div className="flex items-center gap-4">
          <Link
            href="/hq/dashboard/manager/reports"
            className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl hover:shadow-md active:scale-95 transition-all duration-200"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              Fine Letter Generator
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">
              Generate print-ready disciplinary letters for personnel
            </p>
          </div>
        </div>

        {/* Generator Component */}
        <FineLetterGenerator />

      </div>
    </div>
  );
}
