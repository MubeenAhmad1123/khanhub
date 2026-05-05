'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { Building2, AlertCircle, ArrowRight, Briefcase } from 'lucide-react';
import Link from 'next/link';

export default function ITClientDashboardIndex() {
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

    if (parsed.role === 'client' && parsed.clientId) {
      router.push(`/departments/it/dashboard/client/${parsed.clientId}`);
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
        <div className="w-24 h-24 bg-purple-50 rounded-[2rem] flex items-center justify-center text-purple-600 mx-auto mb-8">
          {session?.role === 'client' ? (
            <AlertCircle size={48} strokeWidth={1.5} />
          ) : (
            <Building2 size={48} strokeWidth={1.5} />
          )}
        </div>

        <h1 className="text-3xl font-black text-black mb-4 tracking-tighter uppercase">
          {session?.role === 'client' ? 'Client Unlinked' : 'Partner Portal'}
        </h1>

        <p className="text-gray-400 font-bold text-sm leading-relaxed mb-10 uppercase tracking-tight">
          {session?.role === 'client' 
            ? "Your account is not currently linked to a specific Client profile. Please contact your project manager to enable access."
            : `You are logged in as "${session?.role?.toUpperCase()}". Clients can track project milestones, billing, and technical reports here.`
          }
        </p>

        <div className="space-y-4">
          {(session?.role === 'admin' || session?.role === 'superadmin') && (
            <Link 
              href="/departments/it/dashboard/admin/clients"
              className="flex items-center justify-center gap-3 w-full bg-black text-white rounded-[1.5rem] py-5 font-black text-xs uppercase tracking-widest transition-all hover:bg-purple-600 shadow-xl active:scale-95 group"
            >
              View All Clients
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
