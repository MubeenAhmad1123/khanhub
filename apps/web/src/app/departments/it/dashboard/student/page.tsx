'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { User, AlertCircle, ArrowRight, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function ITStudentDashboardIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) {
      router.push('/departments/it/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);
    setLoading(false);

    if (parsed.role === 'student' && parsed.studentId) {
      router.push(`/departments/it/dashboard/student/${parsed.studentId}`);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-sm border border-black/5 p-12 text-center relative overflow-hidden">
        <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto mb-8">
          {session?.role === 'student' ? (
            <AlertCircle size={48} strokeWidth={1.5} />
          ) : (
            <GraduationCap size={48} strokeWidth={1.5} />
          )}
        </div>

        <h1 className="text-3xl font-black text-black mb-4 tracking-tighter uppercase">
          {session?.role === 'student' ? 'Account Unlinked' : 'Access Restricted'}
        </h1>

        <p className="text-gray-400 font-bold text-sm leading-relaxed mb-10 uppercase tracking-tight">
          {session?.role === 'student' 
            ? "Your account is not currently linked to a specific IT Intern profile. Please contact IT management to update your credentials."
            : `You are logged in as "${session?.role?.toUpperCase()}". Students can view their progress, curriculum, and attendance here.`
          }
        </p>

        <div className="space-y-4">
          {(session?.role === 'admin' || session?.role === 'superadmin') && (
            <Link 
              href="/departments/it/dashboard/admin/students"
              className="flex items-center justify-center gap-3 w-full bg-black text-white rounded-[1.5rem] py-5 font-black text-xs uppercase tracking-widest transition-all hover:bg-indigo-600 shadow-xl active:scale-95 group"
            >
              View All Students
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          <button 
            onClick={() => router.back()}
            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-[1.5rem] py-5 font-black text-[10px] uppercase tracking-widest transition-all border border-black/5"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
