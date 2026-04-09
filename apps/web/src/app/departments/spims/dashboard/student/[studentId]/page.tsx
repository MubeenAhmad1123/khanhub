// apps/web/src/app/departments/spims/dashboard/student/[studentId]/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getStudent } from '@/lib/spims/students';
import type { SpimsStudent } from '@/types/spims';
import AdmissionTab from '@/components/spims/student-profile/AdmissionTab';
import FeeRecordTab from '@/components/spims/student-profile/FeeRecordTab';
import ExamRecordTab from '@/components/spims/student-profile/ExamRecordTab';
import DocumentsTab from '@/components/spims/student-profile/DocumentsTab';
import FinanceSummaryTab from '@/components/spims/student-profile/FinanceSummaryTab';

type Tab = 'admission' | 'fees' | 'exam' | 'documents' | 'finance';

export default function StudentSelfServicePage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;

  const [session, setSession] = useState<{ uid: string; displayName?: string; role: string; studentId?: string; patientId?: string } | null>(null);
  const [student, setStudent] = useState<SpimsStudent | null>(null);
  const [tab, setTab] = useState<Tab>('fees');
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
    const sid = parsed.studentId || parsed.patientId;
    if (parsed.role !== 'student' || sid !== studentId) {
      router.push('/departments/spims/login');
      return;
    }
    setSession(parsed);
    void load();
  }, [router, studentId, load]);

  if (!session || loading || !student) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-9 h-9 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'fees', label: 'Fee record' },
    { id: 'finance', label: 'Finance summary' },
    { id: 'exam', label: 'Exam record' },
    { id: 'admission', label: 'Admission' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6 pb-24">
      <Link
        href="/departments/spims/dashboard/student"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#1D9E75]"
      >
        <ArrowLeft size={16} /> Home
      </Link>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
        <div className="border-b border-gray-100 pb-6 mb-6">
          <h1 className="text-2xl font-black text-gray-900">{student.name}</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Roll {student.rollNo} · {student.course} · Session {student.session}
          </p>
          <p className="text-sm font-bold text-amber-700 mt-2">
            Remaining: Rs {(Number(student.remaining) || 0).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                tab === t.id ? 'bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/25' : 'bg-gray-100 text-gray-600'
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
