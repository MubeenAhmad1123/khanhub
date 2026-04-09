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
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6 pb-24">
      <Link
        href="/departments/spims/dashboard/admin/students"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#1D9E75]"
      >
        <ArrowLeft size={16} /> Students
      </Link>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-6 mb-6">
          <div>
            <p className="text-[10px] font-black text-[#1D9E75] uppercase tracking-[0.2em] mb-1">Student profile</p>
            <h1 className="text-3xl font-black text-gray-900">{student.name}</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Roll {student.rollNo} · {student.course} · Session {student.session}
            </p>
          </div>
          <div className="text-right text-sm text-gray-600 font-bold">
            Balance: Rs {(Number(student.remaining) || 0).toLocaleString()}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                tab === t.id ? 'bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'admission' && <AdmissionTab student={student} session={session} onSaved={load} />}
        {tab === 'fees' && <FeeRecordTab student={student} session={session} />}
        {tab === 'exam' && <ExamRecordTab student={student} session={session} onSaved={load} />}
        {tab === 'documents' && <DocumentsTab studentId={student.id} session={session} />}
        {tab === 'finance' && <FinanceSummaryTab student={student} />}
      </div>
    </div>
  );
}
