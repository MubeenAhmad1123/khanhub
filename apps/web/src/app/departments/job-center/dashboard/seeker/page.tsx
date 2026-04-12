'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJobCenterSession } from '@/hooks/job-center/useJobCenterSession';
import { Loader2, User, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SeekerDashboardIndex() {
  const router = useRouter();
  const { session, loading } = useJobCenterSession();

  useEffect(() => {
    if (!loading) {
      if (!session) {
        router.push('/departments/job-center/login');
      } else if (session.role === 'seeker' && session.seekerId) {
        // Automatically redirect seekers to their specific dashboard
        router.push(`/departments/job-center/dashboard/seeker/${session.seekerId}`);
      }
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
        <p className="text-gray-400 text-sm font-black uppercase tracking-widest animate-pulse">
          Linking Seeker...
        </p>
      </div>
    );
  }

  // If we reach here, either the user is not a Seeker role or they don't have a seekerId
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl shadow-orange-900/5 border border-gray-100 p-8 md:p-12 text-center relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-50 rounded-full opacity-50 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-50 to-orange-100 rounded-[2rem] flex items-center justify-center text-orange-600 mx-auto mb-8 shadow-inner">
            {session?.role === 'seeker' ? (
              <AlertCircle size={40} strokeWidth={1.5} />
            ) : (
              <User size={40} strokeWidth={1.5} />
            )}
          </div>

          <h1 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">
            {session?.role === 'seeker' ? 'No Seeker Linked' : 'Role Access'}
          </h1>

          <p className="text-gray-500 text-sm leading-relaxed mb-10">
            {session?.role === 'seeker' 
              ? "Your account is not currently linked to a specific Seeker. Please contact administration to update your profile permissions."
              : `You are logged in as "${session?.role?.toUpperCase()}". To view a Seeker dashboard, please select one from the Seekers list.`
            }
          </p>

          <div className="space-y-3">
            {session?.role !== 'seeker' && (
              <Link 
                href="/departments/job-center/dashboard/admin/seekers"
                className="flex items-center justify-center gap-2 w-full bg-orange-600 hover:bg-orange-700 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-200 active:scale-95 group"
              >
                Go to Seekers List
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            )}

            <button 
              onClick={() => router.back()}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl py-4 font-black text-[10px] uppercase tracking-widest transition-all border border-gray-100"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

