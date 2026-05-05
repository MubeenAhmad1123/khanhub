// apps/web/src/app/departments/spims/dashboard/admin/students/[id]/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, GraduationCap, RefreshCw } from 'lucide-react';
import { getUnifiedStudent } from '@/lib/spims/students';
import type { SpimsStudent } from '@/types/spims';
import AdmissionTab from '@/components/spims/student-profile/AdmissionTab';
import FeeRecordTab from '@/components/spims/student-profile/FeeRecordTab';
import ExamRecordTab from '@/components/spims/student-profile/ExamRecordTab';
import DocumentsTab from '@/components/spims/student-profile/DocumentsTab';
import FinanceSummaryTab from '@/components/spims/student-profile/FinanceSummaryTab';
import ProfileHeader from '@/components/spims/student-profile/ProfileHeader';

type Tab = 'admission' | 'fees' | 'exam' | 'documents' | 'finance';

export default function AdminStudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [session, setSession] = useState<{ uid: string; displayName?: string; role: string } | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [tab, setTab] = useState<Tab>('admission');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const s = await getUnifiedStudent(studentId);
    setStudent(s);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    let sessionData = localStorage.getItem('spims_session');
    
    if (!sessionData) {
      const hqRaw = localStorage.getItem('hq_session');
      if (hqRaw) {
        const parsedHq = JSON.parse(hqRaw);
        if (parsedHq.role === 'superadmin') {
          sessionData = JSON.stringify({
            ...parsedHq,
            displayName: parsedHq.displayName || parsedHq.name,
            role: 'superadmin'
          });
        }
      }
    }

    if (!sessionData) {
      router.push('/departments/spims/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/spims/login');
      return;
    }
    setSession(parsed);
    void load();
  }, [router, load]);

  if (!session || loading || !student) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-9 h-9 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'admission', label: 'Admission' },
    { id: 'fees', label: 'Fee record' },
    { id: 'exam', label: 'Exam record' },
    { id: 'documents', label: 'Documents' },
    { id: 'finance', label: 'Finance summary' },
  ];

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-8 pb-24">
      <Link
        href="/departments/spims/dashboard/admin/students"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#1D9E75] transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={3} /> Students Registry
      </Link>

      <ProfileHeader student={student} />

      {student.isVirtual && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <GraduationCap size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Login Account Only</h3>
              <p className="text-xs font-medium text-amber-700/80">This student has a login account but no admission profile. Complete their admission to enable full tracking.</p>
            </div>
          </div>
          <Link
            href={`/departments/spims/dashboard/admin/students/new?prefill_uid=${student.login?.uid || student.id}&prefill_name=${encodeURIComponent(student.name)}&prefill_login_id=${student.login?.customId || student.login?.studentId || ''}`}
            className="whitespace-nowrap bg-amber-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-600/20 hover:scale-105 active:scale-95 transition-all"
          >
            Complete Admission
          </Link>
        </div>
      )}

      {!student.isVirtual && (student.status === 'Pass' || student.status === 'Left' || student.status === 'Fail') && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <RefreshCw size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Ready for Re-admission?</h3>
              <p className="text-xs font-medium text-indigo-700/80">This student has {student.status.toLowerCase()} their previous session. You can start a new admission for them.</p>
            </div>
          </div>
          <Link
            href={`/departments/spims/dashboard/admin/students/new?prefill_uid=${student.login?.uid || ''}&prefill_name=${encodeURIComponent(student.name)}&prefill_login_id=${student.login?.customId || student.rollNo || ''}&re_admission_from=${student.id}`}
            className="whitespace-nowrap bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
          >
            New Admission / Re-join
          </Link>
        </div>
      )}

      <div className="space-y-6">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          <div className="flex sm:flex-wrap gap-2 md:gap-3 p-1.5 bg-gray-100/50 rounded-[1.5rem] w-fit min-w-max sm:min-w-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-5 md:px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  tab === t.id 
                    ? 'bg-white text-[#1D9E75] shadow-lg shadow-gray-200/50 transform -translate-y-0.5' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-gray-100 bg-white p-6 md:p-10 shadow-xl shadow-gray-200/50 min-h-[400px]">

        {tab === 'admission' && <AdmissionTab student={student} session={session} onSaved={load} />}
        {tab === 'fees' && <FeeRecordTab student={student} session={session} />}
        {tab === 'exam' && <ExamRecordTab student={student} session={session} onSaved={load} />}
        {tab === 'documents' && <DocumentsTab studentId={student.id} session={session} />}
        {tab === 'finance' && <FinanceSummaryTab student={student} />}
      </div>
    </div>
    </div>
  );
}
