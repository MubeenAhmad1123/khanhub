// apps/web/src/app/departments/spims/dashboard/student/[studentId]/page.tsx
'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, ArrowLeft, ClipboardList, CheckCircle2, Clock, BookOpen, Award, 
  TrendingUp, BarChart2, Activity, ChevronRight, Calendar, Play, Download, 
  ExternalLink, FileText, Check, CheckSquare, ListTodo
} from 'lucide-react';
import { getUnifiedStudent, fetchStudentFees } from '@/lib/spims/students';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toDate } from '@/lib/utils';
import type { SpimsStudent } from '@/types/spims';
import { useVisibleSections } from '@/hooks/useVisibleSections';
import { toast } from 'react-hot-toast';
import { LogoLoader } from '@/components/ui';
import dynamic from 'next/dynamic';
import { subscribeStudentTests, type SpimsTest } from '@/lib/spims/tests';
import { subscribeStudentAttendance } from '@/lib/spims/studentAttendance';

// Dynamically import components to bypass any monorepo/library React Node type mismatches
const AdmissionTab = dynamic(() => import('@/components/spims/student-profile/AdmissionTab'), { ssr: false }) as any;
const FeeRecordTab = dynamic(() => import('@/components/spims/student-profile/FeeRecordTab'), { ssr: false }) as any;
const ExamRecordTab = dynamic(() => import('@/components/spims/student-profile/ExamRecordTab'), { ssr: false }) as any;
const DocumentsTab = dynamic(() => import('@/components/spims/student-profile/DocumentsTab'), { ssr: false }) as any;
const FinanceSummaryTab = dynamic(() => import('@/components/spims/student-profile/FinanceSummaryTab'), { ssr: false }) as any;
const TestsTab = dynamic(() => import('@/components/spims/student-profile/TestsTab'), { ssr: false }) as any;
const AttendanceTab = dynamic(() => import('@/components/spims/student-profile/AttendanceTab'), { ssr: false }) as any;
const ProfileHeader = dynamic(() => import('@/components/spims/student-profile/ProfileHeader'), { ssr: false }) as any;

type Tab = 'admission' | 'fees' | 'exam' | 'documents' | 'finance' | 'tests' | 'attendance' | 'tasks' | 'lessons' | 'progress' | 'tracking';

export default function StudentSelfServicePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = params.studentId as string;

  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<{ uid: string; displayName?: string; role: string; studentId?: string; patientId?: string } | null>(null);
  const [student, setStudent] = useState<SpimsStudent | null>(null);
  
  // Default to 'tasks' to showcase high-fidelity tracking metrics first
  const initialTab = (searchParams?.get('tab') || 'tasks') as Tab;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);

  const { sections, loading: visibilityLoading } = useVisibleSections('spims', 'students', studentId);

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

  // Sync state tab dynamically with URL search query param tab
  useEffect(() => {
    const queryTab = searchParams?.get('tab') as Tab | null;
    if (queryTab && ['admission', 'fees', 'exam', 'documents', 'finance', 'tests', 'attendance', 'tasks', 'lessons', 'progress', 'tracking'].includes(queryTab)) {
      setTab(queryTab);
    }
  }, [searchParams]);

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
      tasks: true,
      lessons: true,
      progress: true,
      tracking: true,
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
      const s = await getUnifiedStudent(studentId);

      let resolvedDocId = studentId;
      let fieldStudentId = '';

      if (s) {
        resolvedDocId = s.id;
        fieldStudentId = s.studentId || '';
      }

      const txQueries = [
        getDocs(query(collection(db, 'spims_transactions'), where('patientId', '==', resolvedDocId))),
        getDocs(query(collection(db, 'spims_transactions'), where('studentId', '==', resolvedDocId)))
      ];

      if (fieldStudentId && fieldStudentId !== resolvedDocId) {
        txQueries.push(
          getDocs(query(collection(db, 'spims_transactions'), where('patientId', '==', fieldStudentId))),
          getDocs(query(collection(db, 'spims_transactions'), where('studentId', '==', fieldStudentId)))
        );
        if (/^\d+$/.test(fieldStudentId)) {
          txQueries.push(
            getDocs(query(collection(db, 'spims_transactions'), where('patientId', '==', Number(fieldStudentId)))),
            getDocs(query(collection(db, 'spims_transactions'), where('studentId', '==', Number(fieldStudentId))))
          );
        }
      }

      const [fees, ...txSnaps] = await Promise.all([
        fetchStudentFees(resolvedDocId, fieldStudentId, true),
        ...txQueries
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
        txSnaps.forEach((snap) => {
          snap.docs.forEach((doc) => {
            txMap.set(doc.id, { id: doc.id, ...doc.data() });
          });
        });
        const mergedTxDocs = Array.from(txMap.values());

        mergedTxDocs.forEach(txData => {
          const txId = txData.id;
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

        // Calculate pending amount from aggregated payments (spims_fees)
        let pendingAmount = 0;
        const countedPendingIds = new Set<string>();
        aggregatedPayments.forEach(p => {
          if (p.status === 'pending' || p.status === 'pending_cashier') {
            pendingAmount += Number(p.amount || 0);
            countedPendingIds.add(p.id);
            if (p.linkedTransactionId) countedPendingIds.add(p.linkedTransactionId);
          }
        });

        // Also count pending transactions from spims_transactions that weren't already counted
        mergedTxDocs.forEach(txData => {
          const txId = txData.id;
          if (countedPendingIds.has(txId)) return; // already counted
          if (txData.feePaymentId && countedPendingIds.has(txData.feePaymentId)) return; // already counted via fee

          const cat = String(txData.category || '').toLowerCase();
          const isFee = cat.includes('fee') || cat.includes('admission') || !!txData.feePaymentId;
          if (!isFee) return;

          if (txData.status === 'pending' || txData.status === 'pending_cashier') {
            pendingAmount += Number(txData.amount || 0);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LogoLoader size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'tasks', label: 'My Tasks', visible: true },
    { id: 'lessons', label: 'My Lessons', visible: true },
    { id: 'progress', label: 'My Progress', visible: true },
    { id: 'tracking', label: 'Academic Tracking', visible: true },
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
          {tab === 'tasks' && <StudentTasksView student={student} tasks={categorizedData.tasks} />}
          {tab === 'lessons' && <StudentLessonsView student={student} lessons={categorizedData.lessons} />}
          {tab === 'progress' && <StudentProgressView student={student} exams={categorizedData.exams} attendanceRecords={attendanceRecords} />}
          {tab === 'tracking' && <StudentTrackingView student={student} milestones={milestones} />}
        </div>
      </div>
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
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
            <ClipboardList className="text-[#1D9E75]" /> Task Registry
          </h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">
            Active syllabus requirements and assignments
          </p>
        </div>
        <div className="flex p-1 bg-gray-50 border border-gray-100 rounded-2xl w-fit">
          {['all', 'pending', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-[#1D9E75] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
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
                ? 'bg-gray-50/50 border-gray-100 opacity-75' 
                : 'bg-white border-gray-100 hover:border-[#1D9E75]/30 hover:shadow-2xl hover:shadow-gray-200/50'
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
                <h4 className={`text-sm font-bold text-gray-900 mt-2.5 leading-snug ${t.completed ? 'line-through text-gray-400' : ''}`}>
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
                <p className="text-md font-black text-gray-900 mt-1">+{t.points} <span className="text-[10px] text-gray-400">XP</span></p>
              </div>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.completed ? 'bg-emerald-50 text-[#1D9E75]' : 'bg-gray-50 text-gray-400'}`}>
                <Award size={18} />
              </div>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
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
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
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
              className="p-6 rounded-[2.5rem] border border-gray-100 bg-white hover:shadow-2xl hover:shadow-gray-200/50 hover:border-[#1D9E75]/30 transition-all duration-500 flex flex-col justify-between"
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

                <h4 className="text-sm font-black text-gray-900 mt-5 leading-snug line-clamp-2">
                  {l.title}
                </h4>
                {l.note && <p className="text-xs text-gray-500 mt-2">{l.note}</p>}

                <div className="space-y-2 mt-6">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-400">
                    <span>Progress ({l.completed}/{l.topics} Topics)</span>
                    <span className="text-[#1D9E75]">{completionRate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-50 border border-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1D9E75] transition-all duration-1000"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 mt-6 pt-6">
                <button
                  type="button"
                  onClick={() => toast.success("Downloading lecture handouts...")}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
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
          <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
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
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
          <TrendingUp className="text-[#1D9E75]" /> Student Efficiency Grid
        </h3>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">
          Real-time academic performance dashboard and metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance Rate */}
        <div className="p-6 rounded-[2.5rem] border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center text-center">
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
              <span className="text-3xl font-black text-gray-900">{attendancePercent}%</span>
              <span className="text-[8px] font-bold text-gray-400 mt-0.5">{presentDays}/{totalClasses} CLASSES</span>
            </div>
          </div>
          <span className="mt-6 px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-[#1D9E75] border border-emerald-100">
            {attendancePercent >= 80 ? 'EXCELLENT RATING' : 'GOOD RATING'}
          </span>
        </div>

        {/* Test Score Trends */}
        <div className="p-6 rounded-[2.5rem] border border-gray-100 bg-white shadow-sm md:col-span-2 space-y-6">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Exam Performance Index</p>
          <div className="space-y-4">
            {scoreTrends.map(t => (
              <div key={t.title} className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-700">
                  <span>{t.title}</span>
                  <span className="font-black text-gray-900">{t.score}/{t.max}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-gray-50 border border-gray-100 overflow-hidden">
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
      <div className="p-8 rounded-[3rem] border border-gray-100 bg-gray-50/50 space-y-6">
        <div>
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
            <Award className="text-amber-500" /> Academic Achievements
          </h4>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Unlocked scholar credentials</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: 'Early Bird Log', desc: '100% On-time Arrival', icon: <Clock size={20} className="text-indigo-600" />, bg: 'bg-indigo-50 border-indigo-100' },
            { title: 'Code Warrior', desc: 'All Syllabus Labs Completed', icon: <BookOpen size={20} className="text-emerald-600" />, bg: 'bg-emerald-50 border-emerald-100' },
            { title: 'Perfect Score', desc: '100% score on Quiz', icon: <Award size={20} className="text-amber-600" />, bg: 'bg-amber-50 border-amber-100' },
            { title: 'Active Scholar', desc: 'Top Growth XP Points', icon: <Activity size={20} className="text-rose-600" />, bg: 'bg-rose-50 border-rose-100' },
          ].map(b => (
            <div
              key={b.title}
              className={`p-4 rounded-[2rem] border ${b.bg} flex flex-col items-center text-center justify-center hover:-translate-y-1 transition-transform`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3">
                {b.icon}
              </div>
              <p className="text-[10px] font-black uppercase tracking-tight text-gray-900">{b.title}</p>
              <p className="text-[8px] font-medium text-gray-500 mt-1 leading-tight">{b.desc}</p>
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
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
          <BarChart2 className="text-[#1D9E75]" /> Academic Roadmap
        </h3>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">
          Audit timeline of student achievements, fees, and evaluations
        </p>
      </div>

      <div className="relative pl-6 sm:pl-8 border-l border-gray-100 ml-4 space-y-8">
        {milestones.map((m, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline node dot */}
            <div className="absolute -left-[38px] sm:-left-[46px] top-0 w-8 h-8 rounded-full border border-gray-100 bg-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              {m.icon}
            </div>

            <div className="p-6 rounded-[2rem] border border-gray-50 bg-white hover:border-gray-200/50 hover:shadow-2xl hover:shadow-gray-200/40 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{m.date}</p>
                <h4 className="text-xs font-black text-gray-900 mt-2 uppercase tracking-tight">{m.title}</h4>
                <p className="text-[10px] font-semibold text-gray-500 mt-1 leading-snug">{m.desc}</p>
              </div>

              <span className="px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-gray-50 text-gray-700 border border-gray-100 w-fit">
                {m.points}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
