// apps/web/src/app/departments/spims/dashboard/student/[studentId]/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getUnifiedStudent, fetchStudentFees } from '@/lib/spims/students';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toDate } from '@/lib/utils';
import type { SpimsStudent } from '@/types/spims';
import { useVisibleSections } from '@/hooks/useVisibleSections';
import dynamic from 'next/dynamic';

// Dynamically import components to bypass any monorepo/library React Node type mismatches
const AdmissionTab = dynamic(() => import('@/components/spims/student-profile/AdmissionTab'), { ssr: false }) as any;
const FeeRecordTab = dynamic(() => import('@/components/spims/student-profile/FeeRecordTab'), { ssr: false }) as any;
const ExamRecordTab = dynamic(() => import('@/components/spims/student-profile/ExamRecordTab'), { ssr: false }) as any;
const DocumentsTab = dynamic(() => import('@/components/spims/student-profile/DocumentsTab'), { ssr: false }) as any;
const FinanceSummaryTab = dynamic(() => import('@/components/spims/student-profile/FinanceSummaryTab'), { ssr: false }) as any;
const TestsTab = dynamic(() => import('@/components/spims/student-profile/TestsTab'), { ssr: false }) as any;
const AttendanceTab = dynamic(() => import('@/components/spims/student-profile/AttendanceTab'), { ssr: false }) as any;
const ProfileHeader = dynamic(() => import('@/components/spims/student-profile/ProfileHeader'), { ssr: false }) as any;

type Tab = 'admission' | 'fees' | 'exam' | 'documents' | 'finance' | 'tests' | 'attendance';

export default function StudentSelfServicePage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;

  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<{ uid: string; displayName?: string; role: string; studentId?: string; patientId?: string } | null>(null);
  const [student, setStudent] = useState<SpimsStudent | null>(null);
  const [tab, setTab] = useState<Tab>('fees');
  const [loading, setLoading] = useState(true);

  const { sections, loading: visibilityLoading } = useVisibleSections('spims', 'students', studentId);

  // Monitor Firebase Auth state directly to prevent early Firestore queries
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (visibilityLoading) return;
    const tabVisibility: Record<Tab, boolean> = {
      fees: sections.feeRecord !== false,
      finance: sections.feeRecord !== false,
      tests: sections.examRecords !== false,
      attendance: sections.attendance !== false,
      exam: sections.examRecords !== false,
      admission: sections.admissionDetails !== false,
      documents: sections.documents !== false,
    };
    
    if (tabVisibility[tab] === false) {
      const firstVisible = (Object.keys(tabVisibility) as Tab[]).find(k => tabVisibility[k] !== false);
      if (firstVisible) {
        setTab(firstVisible);
      }
    }
  }, [sections, visibilityLoading, tab]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, fees, txSnapPatient, txSnapStudent] = await Promise.all([
        getUnifiedStudent(studentId),
        fetchStudentFees(studentId),
        getDocs(query(collection(db, 'spims_transactions'), where('patientId', '==', studentId))),
        getDocs(query(collection(db, 'spims_transactions'), where('studentId', '==', studentId)))
      ]);

      const aggregatedPayments: any[] = [];
      let totalReceived = 0;

      if (s) {
        const admission = toDate(s.admissionDate);
        const now = new Date();
        const billableMonths = (now.getFullYear() - admission.getFullYear()) * 12 + (now.getMonth() - admission.getMonth()) + 1;

        const diffTimeMs = now.getTime() - admission.getTime();
        const daysAdmitted = diffTimeMs > 0 ? Math.floor(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;
        const durationFormatted = `${daysAdmitted} Days (${billableMonths} ${billableMonths === 1 ? 'Month' : 'Months'})`;

        const monthlyFee = Number(s.monthlyFee || 0);
        const dueTillDate = billableMonths * monthlyFee;

        const syncedTxIds = new Set<string>();
        const syncedFeeIds = new Set<string>();

        fees.forEach(fee => {
          const status = fee.status || 'approved';
          if (status === 'approved') {
            totalReceived += Number(fee.amount || 0);
          }
          syncedFeeIds.add(fee.id);
          if (fee.linkedTransactionId) syncedTxIds.add(fee.linkedTransactionId);
          
          aggregatedPayments.push({
            ...fee,
            id: fee.id,
            status
          });
        });

        const txMap = new Map<string, any>();
        txSnapPatient.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() }));
        txSnapStudent.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() }));
        const mergedTxDocs = Array.from(txMap.values());

        mergedTxDocs.forEach(txData => {
          const txId = txData.id;
          const isFee = txData.category === 'fee' || txData.feePaymentId;
          if (!isFee) return;

          const isApproved = txData.status === 'approved';
          const isSynced = syncedTxIds.has(txId) || (txData.feePaymentId && syncedFeeIds.has(txData.feePaymentId));

          if (isApproved && !isSynced) {
            totalReceived += Number(txData.amount || 0);
            aggregatedPayments.push({
              id: txId,
              amount: Number(txData.amount || 0),
              date: txData.date?.toDate ? txData.date.toDate() : txData.date,
              receivedBy: txData.receivedBy || txData.createdByName || 'HQ',
              note: txData.description || txData.note || '',
              status: 'approved',
              type: txData.feePaymentType || 'monthly',
              linkedTransactionId: txId
            });
          } else if (!isApproved && !isSynced) {
            aggregatedPayments.push({
              id: txId,
              amount: Number(txData.amount || 0),
              date: txData.date?.toDate ? txData.date.toDate() : txData.date,
              receivedBy: txData.receivedBy || txData.createdByName || 'HQ',
              note: txData.description || txData.note || '',
              status: txData.status || 'pending',
              type: txData.feePaymentType || 'monthly',
              linkedTransactionId: txId
            });
          }
        });

        let pendingAmount = 0;
        aggregatedPayments.forEach(p => {
          if (p.status === 'pending' || p.status === 'pending_cashier') {
            pendingAmount += Number(p.amount || 0);
          }
        });

        setStudent({
          ...s,
          billableMonths,
          daysAdmitted,
          durationFormatted,
          dueTillDate,
          totalReceived,
          pendingAmount,
          remaining: Math.max(0, (Number(s.totalPackage) || 0) - totalReceived)
        });
      } else {
        setStudent(null);
      }
    } catch (err) {
      console.error("Load error", err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      router.push('/departments/spims/login');
      return;
    }

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
  }, [router, studentId, load, authLoading, authUser]);

  if (authLoading || !session || loading || !student) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-9 h-9 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  const tabs = [
    { id: 'fees', label: 'Fee record', visible: sections.feeRecord !== false },
    { id: 'finance', label: 'Finance summary', visible: sections.feeRecord !== false },
    { id: 'tests', label: 'Tests', visible: sections.examRecords !== false },
    { id: 'attendance', label: 'Attendance', visible: sections.attendance !== false },
    { id: 'exam', label: 'Exam record', visible: sections.examRecords !== false },
    { id: 'admission', label: 'Admission', visible: sections.admissionDetails !== false },
    { id: 'documents', label: 'Documents', visible: sections.documents !== false },
  ].filter(t => t.visible !== false) as { id: Tab; label: string }[];

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-8 pb-24">
      <Link
        href="/departments/spims/dashboard/student"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#1D9E75] transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={3} /> Dashboard
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
          {tab === 'tests' && <TestsTab student={student} />}
          {tab === 'attendance' && <AttendanceTab studentId={student.id} />}
          {tab === 'exam' && <ExamRecordTab student={student} session={session} onSaved={load} />}
          {tab === 'documents' && <DocumentsTab studentId={student.id} session={session} />}
          {tab === 'finance' && <FinanceSummaryTab student={student} />}
        </div>
      </div>
    </div>
  );
}
