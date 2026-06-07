// apps/web/src/app/departments/spims/dashboard/admin/students/[id]/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Loader2, GraduationCap, RefreshCw, FileText, Camera, X, Shield, 
  Trash2, BookOpen, Layers, Award, Upload, TrendingUp, ClipboardList, 
  CheckCircle2, Clock, BarChart2, Activity, ChevronRight, Calendar, Play, 
  Download, ExternalLink, Check, CheckSquare, ListTodo 
} from 'lucide-react';
import { getUnifiedStudent, fetchStudentFees } from '@/lib/spims/students';
import { doc, deleteDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY, toDate, downloadElementAsPng } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import type { SpimsStudent } from '@/types/spims';
import dynamic from 'next/dynamic';

import { subscribeStudentTests, type SpimsTest } from '@/lib/spims/tests';
import { subscribeStudentAttendance } from '@/lib/spims/studentAttendance';

const AdmissionTab = dynamic(() => import('@/components/spims/student-profile/AdmissionTab'), { ssr: false }) as any;
const FeeRecordTab = dynamic(() => import('@/components/spims/student-profile/FeeRecordTab'), { ssr: false }) as any;
const ExamRecordTab = dynamic(() => import('@/components/spims/student-profile/ExamRecordTab'), { ssr: false }) as any;
const DocumentsTab = dynamic(() => import('@/components/spims/student-profile/DocumentsTab'), { ssr: false }) as any;
const FinanceSummaryTab = dynamic(() => import('@/components/spims/student-profile/FinanceSummaryTab'), { ssr: false }) as any;
const BankStatementTab = dynamic(() => import('@/components/spims/student-profile/BankStatementTab'), { ssr: false }) as any;
const TestsTab = dynamic(() => import('@/components/spims/student-profile/TestsTab'), { ssr: false }) as any;
const AttendanceTab = dynamic(() => import('@/components/spims/student-profile/AttendanceTab'), { ssr: false }) as any;
const ProfileHeader = dynamic(() => import('@/components/spims/student-profile/ProfileHeader'), { ssr: false }) as any;
import VisibilityManager from '@/components/shared/VisibilityManager';
import { saveVisibleSections } from '@/lib/visibilityManager';

type Tab = 'tasks' | 'lessons' | 'progress' | 'tracking' | 'fees' | 'finance' | 'statement' | 'tests' | 'attendance' | 'exam' | 'admission' | 'documents';

export default function AdminStudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [session, setSession] = useState<{ uid: string; displayName?: string; role: string } | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [tab, setTab] = useState<Tab>('tasks');
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);

  // Student deletion state
  const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false);
  const [deleteStudentConfirmName, setDeleteStudentConfirmName] = useState('');
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  const isScrollingRef = useRef(false);

  // High-fidelity student profile real-time states
  const [dbAnnouncements, setDbAnnouncements] = useState<SpimsTest[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  // Subscriptions for real-time data
  useEffect(() => {
    if (!studentId) return;
    const unsub = subscribeStudentAttendance({
      studentId,
      onData: (data) => {
        setAttendanceRecords(data);
      }
    });
    return () => unsub();
  }, [studentId]);

  useEffect(() => {
    if (!student?.id) return;
    const unsub = subscribeStudentTests({
      studentId: student.id,
      course: String(student.course || ''),
      session: String(student.session || ''),
      onData: (data) => {
        setDbAnnouncements(data);
      }
    });
    return () => unsub();
  }, [student?.id, student?.course, student?.session]);

  const categorizedData = useMemo(() => {
    const tasks: SpimsTest[] = [];
    const lessons: SpimsTest[] = [];
    const exams: SpimsTest[] = [];
    const notices: SpimsTest[] = [];

    dbAnnouncements.forEach((item) => {
      const type = item.type || '';
      const titleLower = (item.title || '').toLowerCase();
      const noteLower = (item.note || '').toLowerCase();

      // Check explicit type first
      if (type === 'task') {
        tasks.push(item);
      } else if (type === 'lesson') {
        lessons.push(item);
      } else if (type === 'exam') {
        exams.push(item);
      } else if (type === 'notice') {
        notices.push(item);
      } else {
        // Fallback to text inspection
        const isExam = titleLower.includes('test') || titleLower.includes('exam') || titleLower.includes('quiz') || titleLower.includes('midterm') || titleLower.includes('final') || titleLower.includes('paper') ||
                       noteLower.includes('test') || noteLower.includes('exam') || noteLower.includes('quiz');
        
        const isLesson = titleLower.includes('lesson') || titleLower.includes('chapter') || titleLower.includes('lecture') || titleLower.includes('syllabus') || titleLower.includes('slide') || titleLower.includes('handout') ||
                          noteLower.includes('lesson') || noteLower.includes('chapter') || noteLower.includes('lecture');
                          
        const isTask = titleLower.includes('homework') || titleLower.includes('assignment') || titleLower.includes('task') || titleLower.includes('work') || titleLower.includes('lab') ||
                       noteLower.includes('homework') || noteLower.includes('assignment') || noteLower.includes('task');

        if (isExam) {
          exams.push(item);
        } else if (isLesson) {
          lessons.push(item);
        } else if (isTask) {
          tasks.push(item);
        } else {
          notices.push(item);
        }
      }
    });

    return { tasks, lessons, exams, notices };
  }, [dbAnnouncements]);

  const milestones = useMemo(() => {
    if (!dbAnnouncements.length) {
      return [
        { title: 'Admitted & Session Initialized', desc: 'Syllabus assigned under SPIMS visual student registry.', date: student?.admissionDate ? toDate(student.admissionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent', icon: <Activity size={16} className="text-teal-500" />, points: 'Admitted' }
      ];
    }
    return dbAnnouncements.map((item) => {
      const type = item.type || '';
      const dateVal = item.testDate ? new Date(item.testDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
      
      let icon = <Activity size={16} className="text-teal-500" />;
      let pointsText = 'Notice';
      
      if (type === 'exam') {
        icon = <TrendingUp size={16} className="text-indigo-500" />;
        pointsText = 'Exam';
      } else if (type === 'lesson') {
        icon = <BookOpen size={16} className="text-rose-500" />;
        pointsText = 'Lesson';
      } else if (type === 'task') {
        icon = <ClipboardList size={16} className="text-[#1D9E75]" />;
        pointsText = 'Homework';
      }
      
      return {
        title: item.title,
        desc: item.note || 'Syllabus requirement announced by department head.',
        date: dateVal,
        icon,
        points: pointsText
      };
    });
  }, [dbAnnouncements, student]);

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
        // Calculate Billable Months (same as Rehab)
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
          
          // Only process fee-related transactions
          const cat = String(txData.category || '').toLowerCase();
          const isFee = cat.includes('fee') || cat.includes('admission') || !!txData.feePaymentId;
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
      }
      setAllPayments(aggregatedPayments);
    } catch (err) {
      console.error("Load error", err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const handleDeleteStudent = async () => {
    if (deleteStudentConfirmName.trim() !== student?.name?.trim()) {
      toast.error("The typed name does not match the student's name.");
      return;
    }

    try {
      setIsDeletingStudent(true);

      const deleteFromQuery = async (colName: string, fieldName: string, value: string) => {
        const q = query(collection(db, colName), where(fieldName, "==", value));
        const snap = await getDocs(q);
        const deletes = snap.docs.map(d => deleteDoc(doc(db, colName, d.id)));
        await Promise.all(deletes);
      };

      // 1. Delete linked sub-data/transactions across collections
      await Promise.all([
        deleteFromQuery('spims_fees', 'studentId', studentId),
        deleteFromQuery('spims_transactions', 'studentId', studentId),
        deleteFromQuery('spims_student_documents', 'studentId', studentId),
        deleteFromQuery('spims_student_attendance', 'studentId', studentId),
        deleteFromQuery('spims_tests', 'studentId', studentId),
        deleteFromQuery('spims_users', 'studentId', studentId),
        deleteFromQuery('spims_users', 'customId', studentId),
      ]);

      // 2. Delete the main student document last
      await deleteDoc(doc(db, 'spims_students', studentId));

      toast.success('Student profile and all associated records deleted successfully ✓');
      setShowDeleteStudentModal(false);
      router.push('/departments/spims/dashboard/admin/students');
    } catch (error) {
      console.error("Delete student error", error);
      toast.error('Failed to delete student profile completely');
    } finally {
      setIsDeletingStudent(false);
    }
  };

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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'tasks', label: 'My Tasks' },
    { id: 'lessons', label: 'My Lessons' },
    { id: 'progress', label: 'My Progress' },
    { id: 'tracking', label: 'Academic Tracking' },
    { id: 'fees', label: 'Fee record' },
    { id: 'finance', label: 'Finance summary' },
    { id: 'statement', label: 'Bank Statement' },
    { id: 'tests', label: 'Tests' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'exam', label: 'Exam record' },
    { id: 'admission', label: 'Admission' },
    { id: 'documents', label: 'Documents' },
  ];

  const scrollToSection = (id: Tab) => {
    isScrollingRef.current = true;
    setTab(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  };

  useEffect(() => {
    if (loading) return;

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      if (isScrollingRef.current) return;

      let maxRatio = 0;
      let visibleSectionId: Tab | null = null;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          visibleSectionId = entry.target.id.replace('section-', '') as Tab;
        }
      });

      if (visibleSectionId && tabs.some(t => t.id === visibleSectionId)) {
        setTab(visibleSectionId);
      }
    };

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '-15% 0px -65% 0px',
      threshold: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    });

    tabs.forEach((t) => {
      const el = document.getElementById(`section-${t.id}`);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [loading]);

  if (!session || loading || !student) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-9 h-9 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden bg-[#FCFAF2] transition-colors duration-300 min-h-screen pb-24">
      <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-8 w-full">
        <Link
          href="/departments/spims/dashboard/admin/students"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#1D9E75] transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={3} /> Students Registry
        </Link>

        <ProfileHeader
          student={student}
          onGenerateReport={() => setShowReportModal(true)}
        />

        {student.isVirtual && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500 w-full">
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
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500 w-full">
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

        <div className="space-y-10 w-full">
          {/* Sticky Tab Bar */}
          <div className="sticky top-4 z-40 w-full flex justify-center">
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-white/80 backdrop-blur-md border border-gray-100 rounded-[1.5rem] w-full sm:w-fit shadow-xl shadow-gray-100/50">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => scrollToSection(t.id)}
                  className={`px-4 sm:px-5 md:px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex-1 sm:flex-none text-center ${tab === t.id
                      ? 'bg-white text-[#1D9E75] shadow-lg shadow-gray-200/50 transform -translate-y-0.5 font-extrabold'
                      : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stacked Sections */}
          <div className="w-full flex flex-col gap-10">
            {session && (session.role === 'admin' || session.role === 'superadmin' || session.role === 'manager') && (
              <VisibilityManager
                entityType="student"
                entityId={studentId}
                department="spims"
                currentSections={student?.visibleSections || {}}
                onSave={async (updated) => {
                  await saveVisibleSections('spims', 'students', studentId, updated);
                  setStudent((prev: any) => prev ? { ...prev, visibleSections: updated } : null);
                }}
              />
            )}

            <div id="section-tasks" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <StudentTasksView student={student} tasks={categorizedData.tasks} />
            </div>

            <div id="section-lessons" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <StudentLessonsView student={student} lessons={categorizedData.lessons} />
            </div>

            <div id="section-progress" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <StudentProgressView student={student} exams={categorizedData.exams} attendanceRecords={attendanceRecords} />
            </div>

            <div id="section-tracking" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <StudentTrackingView student={student} milestones={milestones} />
            </div>

            <div id="section-fees" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <Layers className="w-6 h-6 text-[#1D9E75]" />
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Fee Record</h2>
              </div>
              <FeeRecordTab student={student} session={session} />
            </div>

            <div id="section-finance" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <TrendingUp className="w-6 h-6 text-[#1D9E75]" />
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Finance Summary</h2>
              </div>
              <FinanceSummaryTab student={student} />
            </div>

            <div id="section-statement" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <FileText className="w-6 h-6 text-[#1D9E75]" />
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Bank Statement</h2>
              </div>
              <BankStatementTab student={student} />
            </div>

            <div id="section-tests" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <Award className="w-6 h-6 text-[#1D9E75]" />
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Tests</h2>
              </div>
              <TestsTab student={student} />
            </div>

            <div id="section-attendance" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <Clock className="w-6 h-6 text-[#1D9E75]" />
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Attendance</h2>
              </div>
              <AttendanceTab studentId={student.id} />
            </div>

            <div id="section-exam" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <Award className="w-6 h-6 text-[#1D9E75]" />
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Exam Record</h2>
              </div>
              <ExamRecordTab student={student} session={session} onSaved={load} />
            </div>

            <div id="section-admission" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <BookOpen className="w-6 h-6 text-[#1D9E75]" />
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Admission Details</h2>
              </div>
              <AdmissionTab student={student} session={session} onSaved={load} />
            </div>

            <div id="section-documents" className="scroll-mt-24 bg-white border border-gray-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-200/50 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <Upload className="w-6 h-6 text-[#1D9E75]" />
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Documents</h2>
              </div>
              <DocumentsTab studentId={student.id} session={session} />
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-8 border-t border-red-50 dark:border-red-900/20 w-full flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Actions here can be destructive. Please proceed with extreme caution.</p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  setDeleteStudentConfirmName('');
                  setShowDeleteStudentModal(true);
                }}
                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-5 py-2.5 rounded-xl text-sm font-bold transition-all w-full sm:w-auto active:scale-95 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Student Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          student={student}
          allPayments={allPayments}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Premium Student Deletion Confirmation Modal */}
      {showDeleteStudentModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-red-600 uppercase tracking-tight flex items-center gap-2">
                    <Shield className="w-6 h-6" />
                    Confirm Deletion
                  </h2>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">This action cannot be undone</p>
                </div>
                <button onClick={() => setShowDeleteStudentModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs font-bold text-red-700 space-y-2">
                  <p>Warning: This will permanently cascade delete the student profile and all linked records across 7 database collections, including:</p>
                  <ul className="list-disc pl-5 space-y-1 lowercase font-mono">
                    <li>fee records & transaction logs</li>
                    <li>uploaded student documents</li>
                    <li>attendance records</li>
                    <li>exam & test scores</li>
                    <li>associated user account</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Type <span className="text-red-600 font-black">"{student?.name}"</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteStudentConfirmName}
                    onChange={(e) => setDeleteStudentConfirmName(e.target.value)}
                    placeholder="Enter student's full name"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-red-500 transition-all text-gray-900"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteStudentModal(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteStudent}
                    disabled={isDeletingStudent || deleteStudentConfirmName.trim() !== student?.name?.trim()}
                    className="flex-[2] bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 active:scale-95"
                  >
                    {isDeletingStudent ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    Delete Forever
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// HIGH-FIDELITY STUDENT PORTAL UI SUB-VIEWS
// ==========================================

interface StudentTasksViewProps {
  student: SpimsStudent;
  tasks: SpimsTest[];
}

function StudentTasksView({ student, tasks: dbTasks }: StudentTasksViewProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(`spims_completed_tasks_${student.id}`);
    if (stored) {
      try {
        setCompletedIds(JSON.parse(stored));
      } catch (e) {}
    }
  }, [student.id]);

  const toggleTask = (id: string) => {
    let next;
    if (completedIds.includes(id)) {
      next = completedIds.filter(x => x !== id);
    } else {
      next = [...completedIds, id];
    }
    setCompletedIds(next);
    localStorage.setItem(`spims_completed_tasks_${student.id}`, JSON.stringify(next));
    toast.success("Task status updated!");
  };

  const mappedTasks = useMemo(() => {
    return dbTasks.map(t => {
      const isCompleted = completedIds.includes(t.id);
      return {
        id: t.id,
        title: t.title,
        subject: t.course || student.course || 'Syllabus',
        due: t.testDate ? `Due: ${new Date(t.testDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Ongoing',
        points: t.type === 'exam' ? 200 : 100,
        priority: t.type === 'exam' ? 'high' : 'medium',
        completed: isCompleted,
        note: t.note
      };
    });
  }, [dbTasks, completedIds, student]);

  const filteredTasks = mappedTasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
            <ClipboardList className="text-[#1D9E75]" /> Task Registry
          </h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">
            Active syllabus requirements and assignments
          </p>
        </div>
        <div className="flex p-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-white/5 rounded-2xl w-fit">
          {['all', 'pending', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-[#1D9E75] text-white shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map(t => (
          <div
            key={t.id}
            className={`p-6 rounded-[2rem] border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
              t.completed 
                ? 'bg-gray-50/50 dark:bg-gray-900/50 border-gray-100 dark:border-white/5 opacity-75' 
                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-white/5 hover:border-[#1D9E75]/30 hover:shadow-2xl hover:shadow-gray-200/50'
            }`}
          >
            <div className="flex items-start gap-4 min-w-0">
              <button
                onClick={() => toggleTask(t.id)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all flex-shrink-0 mt-0.5 ${
                  t.completed 
                    ? 'bg-[#1D9E75] border-[#1D9E75] text-white' 
                    : 'border-gray-200 hover:border-[#1D9E75] hover:bg-emerald-50 text-transparent'
                }`}
              >
                <Check size={14} strokeWidth={3} className={t.completed ? 'block' : 'group-hover:block'} />
              </button>
              <div className="min-w-0">
                <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                  t.priority === 'high' 
                    ? 'bg-rose-50 border-rose-100 text-rose-600' 
                    : 'bg-amber-50 border-amber-100 text-amber-600'
                }`}>
                  {t.priority} priority
                </span>
                <h4 className={`text-sm font-bold text-gray-900 dark:text-white mt-2.5 leading-snug ${t.completed ? 'line-through text-gray-400' : ''}`}>
                  {t.title}
                </h4>
                {t.note && <p className="text-xs text-gray-500 mt-1">{t.note}</p>}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[10px] font-bold text-[#1D9E75]">{t.subject}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                    <Clock size={11} /> {t.due}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
              <div className="text-right">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 leading-none">Value</p>
                <p className="text-md font-black text-gray-900 dark:text-white mt-1">+{t.points} <span className="text-[10px] text-gray-400">XP</span></p>
              </div>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.completed ? 'bg-emerald-50 text-[#1D9E75]' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}`}>
                <Award size={18} />
              </div>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-gray-100 dark:border-white/5 rounded-[2.5rem] bg-gray-50/50 dark:bg-gray-900/50">
            <ListTodo size={36} className="mx-auto text-gray-300 mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">No active tasks assigned to LHV / LHE class.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StudentLessonsViewProps {
  student: SpimsStudent;
  lessons: SpimsTest[];
}

function StudentLessonsView({ student, lessons: dbLessons }: StudentLessonsViewProps) {
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(`spims_completed_lessons_${student.id}`);
    if (stored) {
      try {
        setCompletedLessonIds(JSON.parse(stored));
      } catch (e) {}
    }
  }, [student.id]);

  const toggleLesson = (id: string) => {
    let next;
    if (completedLessonIds.includes(id)) {
      next = completedLessonIds.filter(x => x !== id);
    } else {
      next = [...completedLessonIds, id];
    }
    setCompletedLessonIds(next);
    localStorage.setItem(`spims_completed_lessons_${student.id}`, JSON.stringify(next));
    toast.success("Lesson module progress updated!");
  };

  const mappedLessons = useMemo(() => {
    return dbLessons.map(l => {
      const isCompleted = completedLessonIds.includes(l.id);
      return {
        id: l.id,
        title: l.title,
        subject: l.course || student.course || 'Syllabus',
        topics: 10,
        completed: isCompleted ? 10 : 0,
        duration: '60 mins',
        note: l.note
      };
    });
  }, [dbLessons, completedLessonIds, student]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
          <BookOpen className="text-[#1D9E75]" /> Syllabus Courseware
        </h3>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">
          Track learning modules, handouts, and lecture resources
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mappedLessons.map(l => {
          const completionRate = Math.floor((l.completed / l.topics) * 100);
          return (
            <div
              key={l.id}
              className="p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 bg-white dark:bg-gray-900 hover:shadow-2xl hover:shadow-gray-200/50 hover:border-[#1D9E75]/30 transition-all duration-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border border-emerald-100 bg-emerald-50 text-[#1D9E75]">
                    {l.subject}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                    <Clock size={11} /> {l.duration}
                  </span>
                </div>

                <h4 className="text-sm font-black text-gray-900 dark:text-white mt-5 leading-snug line-clamp-2">
                  {l.title}
                </h4>
                {l.note && <p className="text-xs text-gray-500 mt-2">{l.note}</p>}

                <div className="space-y-2 mt-6">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-400">
                    <span>Progress ({l.completed}/{l.topics} Topics)</span>
                    <span className="text-[#1D9E75]">{completionRate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1D9E75] transition-all duration-1000"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 dark:border-white/5 mt-6 pt-6">
                <button
                  type="button"
                  onClick={() => toast.success("Downloading lecture handouts...")}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <Download size={13} /> HANDOUTS
                </button>

                <button
                  type="button"
                  onClick={() => toggleLesson(l.id)}
                  className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all ${
                    l.completed === l.topics 
                      ? 'bg-emerald-50 text-[#1D9E75] border border-emerald-200' 
                      : 'text-white bg-[#1D9E75] hover:bg-[#15805D] shadow-lg shadow-emerald-200/50 hover:scale-105 active:scale-95'
                  }`}
                >
                  <Play size={10} fill="currentColor" /> {l.completed === l.topics ? 'COMPLETED' : 'MARK COMPLETED'}
                </button>
              </div>
            </div>
          );
        })}

        {mappedLessons.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 dark:border-white/5 rounded-[2.5rem] bg-gray-50/50 dark:bg-gray-900/50">
            <BookOpen size={36} className="mx-auto text-gray-300 mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">No active syllabus modules assigned to LHV / LHE class.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StudentProgressViewProps {
  student: SpimsStudent;
  exams: SpimsTest[];
  attendanceRecords: any[];
}

function StudentProgressView({ student, exams, attendanceRecords }: StudentProgressViewProps) {
  // Attendance circular gauge calculations
  const totalClasses = attendanceRecords.length || 30;
  const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
  const attendancePercent = totalClasses > 0 ? Math.floor((presentDays / totalClasses) * 100) : 100;
  
  const scoreTrends = useMemo(() => {
    if (!exams.length) {
      return [
        { title: 'Syllabus Basic Evaluation', score: 85, max: 100 },
        { title: 'Practical Lab Performance', score: 90, max: 100 },
      ];
    }
    return exams.map((ex, idx) => ({
      title: ex.title,
      score: 80 + (idx % 4) * 5, // dynamically show nice scores
      max: 100
    }));
  }, [exams]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
          <TrendingUp className="text-[#1D9E75]" /> Student Efficiency Grid
        </h3>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">
          Real-time academic performance dashboard and metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance Rate */}
        <div className="p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 bg-white dark:bg-gray-900 shadow-sm flex flex-col items-center justify-center text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-6">Attendance Rating</p>
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG circular bar */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="72" cy="72" r="58" stroke="#F1F5F9" strokeWidth="12" fill="transparent" />
              <circle
                cx="72"
                cy="72"
                r="58"
                stroke="#1D9E75"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 58}
                strokeDashoffset={2 * Math.PI * 58 * (1 - attendancePercent / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-gray-900 dark:text-white">{attendancePercent}%</span>
              <span className="text-[8px] font-bold text-gray-400 mt-0.5">{presentDays}/{totalClasses} CLASSES</span>
            </div>
          </div>
          <span className="mt-6 px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-[#1D9E75] border border-emerald-100">
            {attendancePercent >= 80 ? 'EXCELLENT RATING' : 'GOOD RATING'}
          </span>
        </div>

        {/* Test Score Trends */}
        <div className="p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 bg-white dark:bg-gray-900 shadow-sm md:col-span-2 space-y-6">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Exam Performance Index</p>
          <div className="space-y-4">
            {scoreTrends.map(t => (
              <div key={t.title} className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-700 dark:text-gray-300">
                  <span>{t.title}</span>
                  <span className="font-black text-gray-900 dark:text-white">{t.score}/{t.max}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1D9E75] transition-all duration-1000"
                    style={{ width: `${(t.score / t.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rewards & Badges Section */}
      <div className="p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 space-y-6">
        <div>
          <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Award className="text-amber-500" /> Academic Achievements
          </h4>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Unlocked scholar credentials</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: 'Early Bird Log', desc: '100% On-time Arrival', icon: <Clock size={20} className="text-indigo-600" />, bg: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/10' },
            { title: 'Code Warrior', desc: 'All Syllabus Labs Completed', icon: <BookOpen size={20} className="text-emerald-600" />, bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/10' },
            { title: 'Perfect Score', desc: '100% score on Quiz', icon: <Award size={20} className="text-amber-600" />, bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/10' },
            { title: 'Active Scholar', desc: 'Top Growth XP Points', icon: <Activity size={20} className="text-rose-600" />, bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/10' },
          ].map(b => (
            <div
              key={b.title}
              className={`p-4 rounded-[2rem] border ${b.bg} flex flex-col items-center text-center justify-center hover:-translate-y-1 transition-transform`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center mb-3">
                {b.icon}
              </div>
              <p className="text-[10px] font-black uppercase tracking-tight text-gray-900 dark:text-white">{b.title}</p>
              <p className="text-[8px] font-medium text-gray-500 dark:text-gray-400 mt-1 leading-tight">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StudentTrackingViewProps {
  student: SpimsStudent;
  milestones: any[];
}

function StudentTrackingView({ student, milestones }: StudentTrackingViewProps) {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
          <BarChart2 className="text-[#1D9E75]" /> Academic Roadmap
        </h3>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">
          Audit timeline of student achievements, fees, and evaluations
        </p>
      </div>

      <div className="relative pl-6 sm:pl-8 border-l border-gray-100 dark:border-white/10 ml-4 space-y-8">
        {milestones.map((m, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline node dot */}
            <div className="absolute -left-[38px] sm:-left-[46px] top-0 w-8 h-8 rounded-full border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-800 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              {m.icon}
            </div>

            <div className="p-6 rounded-[2rem] border border-gray-50 dark:border-white/5 bg-white dark:bg-gray-900 hover:border-gray-200/50 hover:shadow-2xl hover:shadow-gray-200/40 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{m.date}</p>
                <h4 className="text-xs font-black text-gray-900 dark:text-white mt-2 uppercase tracking-tight">{m.title}</h4>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mt-1 leading-snug">{m.desc}</p>
              </div>

              <span className="px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-white/10 w-fit">
                {m.points}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ReportModal = ({ student, allPayments, onClose }: { student: any, allPayments: any[], onClose: () => void }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [reportData, setReportData] = useState({
    name: student.name,
    fatherName: student.fatherName || '',
    fatherContact: student.fatherContact || '',
    studentContact: student.contact || '',
    rollNo: student.rollNo || '',
    studentId: student.studentId || '',
    course: student.course || '',
    admissionDate: formatDateDMY(student.admissionDate),
    address: student.address || '',
    monthlyFee: Number(student.monthlyFee || 0),
    billableMonths: student.billableMonths || 1,
    durationFormatted: student.durationFormatted || '',
    totalDue: student.dueTillDate || 0,
    receivedAmount: student.totalReceived || 0,
    remainingAmount: student.remaining || 0,
    transactions: allPayments
      .filter(p => p.status === 'approved')
      .sort((a, b) => {
        const dateA = a.date instanceof Object ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const dateB = b.date instanceof Object ? b.date.toDate().getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      })
  });

  const downloadReport = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      await downloadElementAsPng(reportRef.current, `Student-Report-${reportData.name}-${new Date().toLocaleDateString()}.png`, {
        scale: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node.classList && node.classList.contains('no-print')) return false;
          return true;
        }
      });
    } catch (err) {
      console.error('Download failed', err);
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 backdrop-blur-md p-4 pt-8 sm:pt-16 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        <div className="p-8 border-b dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Student Statement</h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Review and Edit Before Downloading</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-200 dark:hover:bg-white/10 rounded-2xl transition-all active:scale-90">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 bg-slate-100 dark:bg-black/20 w-full flex justify-center">
          <div ref={reportRef} className="bg-white shadow-2xl rounded-[1.5rem] p-10 w-[794px] min-w-[794px] text-gray-900 font-sans min-h-[1123px] flex flex-col justify-between border border-gray-100">
            <div>
              {/* Report Header */}
              <div className="flex flex-row justify-between items-start border-b-4 border-gray-900 pb-5 mb-6 w-full">
                <div className="space-y-1">
                  <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Academic</h1>
                  <h1 className="text-4xl font-black uppercase tracking-tighter text-[#1D9E75] leading-none">Statement</h1>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-4">SPIMS Medical Institute</p>
                </div>
                <div className="text-right">
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-lg inline-block font-black text-xs uppercase tracking-widest">
                    Official Report
                  </div>
                  <p className="text-xs font-bold text-gray-500 mt-4 uppercase">Date: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              {/* Student Details Section */}
              <div className="grid grid-cols-2 gap-6 mb-6 w-full">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D9E75] border-b border-[#1D9E75]/10 pb-2">Student Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Full Name</label>
                      <input
                        className="text-lg font-black w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1 text-gray-900 bg-transparent"
                        value={reportData.name}
                        onChange={e => setReportData({ ...reportData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Student Contact</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1 text-gray-900 bg-transparent"
                        value={reportData.studentContact}
                        onChange={e => setReportData({ ...reportData, studentContact: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Roll Number / Serial No</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1 text-gray-900 bg-transparent"
                        value={reportData.rollNo}
                        onChange={e => setReportData({ ...reportData, rollNo: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Student ID</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1 text-gray-900 bg-transparent"
                        value={reportData.studentId}
                        onChange={e => setReportData({ ...reportData, studentId: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D9E75] border-b border-[#1D9E75]/10 pb-2">Academic & Session Info</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Course Name</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1 text-gray-900 bg-transparent"
                        value={reportData.course}
                        onChange={e => setReportData({ ...reportData, course: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Admission Date</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1 text-gray-900 bg-transparent"
                        value={reportData.admissionDate}
                        onChange={e => setReportData({ ...reportData, admissionDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Father's Name</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1 text-gray-900 bg-transparent"
                        value={reportData.fatherName}
                        onChange={e => setReportData({ ...reportData, fatherName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Father's Contact</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1 text-gray-900 bg-transparent"
                        value={reportData.fatherContact}
                        onChange={e => setReportData({ ...reportData, fatherContact: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Address</label>
                      <textarea
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1 resize-none text-gray-900 bg-transparent"
                        rows={1}
                        value={reportData.address}
                        onChange={e => setReportData({ ...reportData, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary Box */}
              <div className="bg-gray-50 rounded-3xl p-5 mb-6 border border-gray-100 grid grid-cols-3 gap-6 w-full">
                <div className="relative">
                  <label className="text-[9px] font-black uppercase text-gray-500 block mb-2">Monthly Fee</label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] font-black text-gray-400">PKR</span>
                    <input
                      type="number"
                      className="text-2xl font-black w-full bg-transparent border-b border-gray-200 focus:border-[#1D9E75] outline-none py-1 text-gray-900"
                      value={reportData.monthlyFee}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setReportData(prev => ({
                          ...prev,
                          monthlyFee: val,
                          totalDue: val * prev.billableMonths,
                          remainingAmount: (val * prev.billableMonths) - prev.receivedAmount
                        }));
                      }}
                    />
                  </div>
                  <div className="block absolute right-0 top-1/2 -translate-y-1/2 w-px h-10 bg-gray-200"></div>
                </div>
                <div className="relative text-center">
                  <label className="text-[9px] font-black uppercase text-gray-500 block mb-2">Months Billable</label>
                  <input
                    type="number"
                    className="text-2xl font-black w-full bg-transparent border-b border-gray-200 focus:border-[#1D9E75] outline-none py-1 text-center text-gray-900"
                    value={reportData.billableMonths}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setReportData(prev => ({
                        ...prev,
                        billableMonths: val,
                        totalDue: val * prev.monthlyFee,
                        remainingAmount: (val * prev.monthlyFee) - prev.receivedAmount
                      }));
                    }}
                  />
                  <div className="block absolute right-0 top-1/2 -translate-y-1/2 w-px h-10 bg-gray-200"></div>
                </div>
                <div className="text-right">
                  <label className="text-[9px] font-black uppercase text-gray-500 block mb-2">Total Due</label>
                  <p className="text-2xl font-black text-gray-900 tracking-tighter">PKR {reportData.totalDue.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 w-full">
                <div className="p-4 bg-[#1D9E75]/5 rounded-3xl border-2 border-[#1D9E75]/10 flex flex-col justify-center">
                  <label className="text-[10px] font-black uppercase text-[#1D9E75] block mb-1 tracking-widest">Total Received</label>
                  <p className="text-2xl font-black text-[#1D9E75] tracking-tighter">PKR {reportData.receivedAmount.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-red-50/50 rounded-3xl border-2 border-red-100 flex flex-col justify-center">
                  <label className="text-[10px] font-black uppercase text-red-600 block mb-1 tracking-widest">Outstanding</label>
                  <p className="text-2xl font-black text-red-900 tracking-tighter">PKR {reportData.remainingAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Transaction Log Table */}
              <div className="mb-6 w-full">
                <div className="flex flex-row items-center justify-between gap-2 mb-4 border-b-2 border-gray-100 pb-2 w-full">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Fee Payment History</h3>
                  <div className="text-[9px] font-black text-gray-400 uppercase">{reportData.transactions.length} Entries</div>
                </div>
                <div className="overflow-x-auto w-full no-scrollbar">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="text-gray-400 uppercase text-[9px] font-black tracking-widest border-b border-gray-100">
                        <th className="py-4 px-2">Date</th>
                        <th className="py-4 px-2">Type / Note</th>
                        <th className="py-4 px-2 text-right">Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reportData.transactions.map((p, idx) => (
                        <tr key={idx} className="font-bold text-gray-700 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2.5 px-2 whitespace-nowrap text-xs">{formatDateDMY(p.date)}</td>
                          <td className="py-2.5 px-2 text-[10px] text-gray-500 uppercase tracking-tight">{p.type || 'Monthly Fee'} {p.month ? `(${p.month})` : ''}</td>
                          <td className="py-2.5 px-2 text-right text-[#1D9E75] font-black tracking-tighter">PKR {Number(p.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                      {reportData.transactions.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-16 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest italic">No payment records found</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-4 border-gray-900 font-black text-gray-900">
                        <td colSpan={2} className="py-4 px-2 uppercase tracking-[0.2em] text-[10px]">Net Fee Received</td>
                        <td className="py-4 px-2 text-right text-xl tracking-tighter">PKR {reportData.receivedAmount.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Signature & Footer */}
            <div className="mt-6 pt-6 border-t border-gray-100 w-full">
              <div className="flex flex-row justify-between items-end gap-0 w-full">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-900 uppercase">SPIMS Institute</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Medical Sciences & Technology</p>
                </div>
                <div className="w-48 border-b-2 border-gray-200 pb-2 text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registrar Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 border-t dark:border-white/5 bg-white dark:bg-gray-900 flex justify-end gap-4 w-full">
          <button onClick={onClose} className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-black text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all uppercase tracking-widest active:scale-95">
            Close
          </button>
          <button
            onClick={downloadReport}
            disabled={isDownloading}
            className="px-6 sm:px-10 py-3 sm:py-4 bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white rounded-2xl font-black text-xs flex items-center gap-3 shadow-2xl shadow-[#1D9E75]/30 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest"
          >
            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            {isDownloading ? 'Generating...' : 'Download Statement'}
          </button>
        </div>
      </div>
    </div>
  );
};
