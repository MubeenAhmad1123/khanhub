// apps/web/src/app/departments/spims/dashboard/admin/students/[id]/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getStudent } from '@/lib/spims/students';
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
  const [student, setStudent] = useState<SpimsStudent | null>(null);
  const [tab, setTab] = useState<Tab>('admission');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const s = await getStudent(studentId);
    setStudent(s);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    const raw = localStorage.getItem('spims_session');
    if (!raw) {
      router.push('/departments/spims/login');
      return;
    }
    const parsed = JSON.parse(raw);
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

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 md:gap-3 p-1.5 bg-gray-100/50 rounded-[1.5rem] w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                tab === t.id 
                  ? 'bg-white text-[#1D9E75] shadow-lg shadow-gray-200/50 transform -translate-y-0.5' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
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
