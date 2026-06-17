// src/app/hq/dashboard/manager/staff/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  doc, getDoc, collection, getDocs, query, where, orderBy,
  updateDoc, addDoc, serverTimestamp, setDoc, limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { formatDateDMY, toDate, downloadElementAsPng } from '@/lib/utils';
import Link from 'next/link';
import {
  Target, Camera, Activity,
  ArrowLeft, Award, Clock, Calendar, Shield, DollarSign,
  TrendingUp, ChevronDown, ChevronUp, RefreshCw,
  User, ClipboardList, CheckCircle2, XCircle, AlertCircle, MinusCircle, X, UserMinus,
  ChevronLeft, ChevronRight, Star, Plus, Trash2, CreditCard, LayoutDashboard, Lock, AlertTriangle,
  Sparkles, Save, CheckCircle, Info, Download, Printer, Eye, EyeOff, FileText, Loader2,
  Briefcase
} from 'lucide-react';
import { Spinner } from '@/components/ui';
import {
  fetchStaffProfile,
  updateStaffProfile,
  deleteStaffProfile,
  getDeptPrefix,
  getDeptCollection,
  type StaffDept,
  type StaffProfile
} from '@/lib/hq/superadmin/staff';
import { Timestamp, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import ScoreCard from '@/components/rehab/ScoreCard';
import StaffProfileReport from '@/components/hq/StaffProfileReport';
import { SCORE_CATEGORIES, MONTHLY_REWARDS, WEEKLY_RULE } from '@/data/scoreRules';
import { HqCheckCell } from '@/components/hq/HqCheckCell';
import {
  HqDailyAttendanceRecord,
  HqDailyDressCodeRecord,
  HqDailyDutyRecord,
  HqDressCodeItem,
  HqDutyItem,
  HqSpecialTask,
  SalarySlip
} from '@/types/hq';
import { awardStaffPoint } from '@/app/hq/actions/points';
import { ResetPasswordModal } from '@/components/hq/superadmin/ResetPasswordModal';
import LeadsCRM from '@/components/shared/LeadsCRM';
import VisibilityManager from '@/components/shared/VisibilityManager';
import { saveVisibleSections } from '@/lib/visibilityManager';

// Define unified icons for tasks
import { GLOBAL_DUTIES, GLOBAL_DRESS_ITEMS } from '@/data/hqConfig';

interface Staff {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  isActive?: boolean;
  monthlySalary?: number;
  photoUrl?: string;
  phone?: string;
  dutyStartTime?: string;
  dutyEndTime?: string;
  role?: string;
  email?: string;
  userId?: string;
  // Configuration for monthly grids
  dressCodeConfig?: { key: string; label: string }[];
  dutyConfig?: { key: string; label: string }[];
}

interface AttendanceLog {
  id: string;
  date: any;
  status: 'present' | 'absent' | 'leave' | 'late' | 'paid_leave' | 'unpaid_leave' | 'unmarked';
  arrivalTime?: string;
  departureTime?: string;
}


function formatStaffDate(input: any): string {
  if (!input) return 'N/A';
  return formatDateDMY(input);
}

function calculateDutyHours(start: string, end: string) {
  if (!start || !end) return { total: '0.0', text: '0h 0m' };
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    total: (totalMinutes / 60).toFixed(1),
    text: `${hours}h ${minutes}m`
  };
}

export default function StaffProfilePage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string; // Expected: dept_UID
  const { session, loading: sessionLoading } = useHqSession();
  const fetchLock = useRef(false);
  const lastFetchedId = useRef<string | null>(null);
  const lastFetchedMonth = useRef<string | null>(null);

  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [generatingSlip, setGeneratingSlip] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'tasks' | 'attendance' | 'duties' | 'dress' | 'salary' | 'score' | 'edit' | 'payroll' | 'action' | 'leads'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingConfig, setProcessingConfig] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    designation: '',
    department: 'hq' as StaffDept,
    secondaryDepts: [] as StaffDept[],
    monthlySalary: 0,
    dutyStartTime: '',
    dutyEndTime: '',
    isActive: true,
    phone: '',
    customId: '', // Login ID / Portal ID
    employeeId: '', // Visual Employee ID (e.g. SPIMS-STF-001)
    cnic: '',
    dob: '',
    gender: 'male' as 'male' | 'female' | 'other',
    bloodGroup: '',
    emergencyContact: '',
    emergencyContactName: '',
    emergencyPhone: '',
    address: '',
    userId: '',
    dressCodeConfig: [] as { key: string; label: string }[],
    dutyConfig: [] as { key: string; label: string }[],
    basicInfoExtras: {} as Record<string, string>,
    joiningDate: '',
    seniority: '',
    fatherName: '',
    defaultPassword: '',
    documents: [] as { title: string; url: string }[],
    education: [] as { degree: string; institution: string; year: string }[],
    experience: [] as { title: string; company: string; duration: string }[]
  });

  const [newExtraField, setNewExtraField] = useState({ key: '', value: '' });
  const [newDocTitle, setNewDocTitle] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // States to track document deletion confirmation and countdown timers
  const [docStates, setDocStates] = useState<Record<number, {
    status: 'normal' | 'confirm' | 'deleting';
    timeLeft: number;
    intervalId?: any;
    timeoutId?: any;
  }>>({});

  useEffect(() => {
    return () => {
      // Cleanup all active timers on unmount
      Object.values(docStates).forEach((state) => {
        if (state.intervalId) clearInterval(state.intervalId);
        if (state.timeoutId) clearTimeout(state.timeoutId);
      });
    };
  }, [docStates]);

  const getDeptColor = (dept: string) => {
    switch (dept?.toLowerCase()) {
      case 'it': return { bg: 'from-indigo-600/20 to-indigo-600/5', border: 'border-indigo-500/30', text: 'text-indigo-600', accent: 'bg-indigo-600', light: 'bg-indigo-50', shadow: 'shadow-indigo-500/20' };
      case 'rehab': return { bg: 'from-rose-600/20 to-rose-600/5', border: 'border-rose-500/30', text: 'text-rose-600', accent: 'bg-rose-600', light: 'bg-rose-50', shadow: 'shadow-rose-500/20' };
      case 'sukoon': return { bg: 'from-purple-600/20 to-purple-600/5', border: 'border-purple-500/30', text: 'text-purple-600', accent: 'bg-purple-600', light: 'bg-purple-50', shadow: 'shadow-purple-500/20' };
      case 'hospital': return { bg: 'from-blue-600/20 to-blue-600/5', border: 'border-blue-500/30', text: 'text-blue-600', accent: 'bg-blue-600', light: 'bg-blue-50', shadow: 'shadow-blue-500/20' };
      case 'job-center': return { bg: 'from-orange-600/20 to-orange-600/5', border: 'border-orange-500/30', text: 'text-orange-600', accent: 'bg-orange-600', light: 'bg-orange-50', shadow: 'shadow-orange-500/20' };
      case 'spims': return { bg: 'from-teal-600/20 to-teal-600/5', border: 'border-teal-500/30', text: 'text-teal-600', accent: 'bg-teal-600', light: 'bg-teal-50', shadow: 'shadow-teal-500/20' };
      case 'welfare': return { bg: 'from-amber-600/20 to-amber-600/5', border: 'border-amber-500/30', text: 'text-amber-600', accent: 'bg-amber-600', light: 'bg-amber-50', shadow: 'shadow-amber-500/20' };
      case 'social-media': return { bg: 'from-cyan-600/20 to-cyan-600/5', border: 'border-cyan-500/30', text: 'text-cyan-600', accent: 'bg-cyan-600', light: 'bg-cyan-50', shadow: 'shadow-cyan-500/20' };
      default: return { bg: 'from-gray-600/20 to-gray-600/5', border: 'border-gray-500/30', text: 'text-gray-600', accent: 'bg-gray-600', light: 'bg-gray-50', shadow: 'shadow-gray-500/20' };
    }
  };

  const theme = getDeptColor(staff?.dept || 'it');
  const isDark = false;

  // Data States
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [dutyLogs, setDutyLogs] = useState<any[]>([]);
  const [dressLogs, setDressLogs] = useState<any[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);
  const [growthHistory, setGrowthHistory] = useState<any[]>([]);
  const [bonusInput, setBonusInput] = useState<number>(0);
  const [salaryRecords, setSalaryRecords] = useState<SalarySlip[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loadingScore, setLoadingScore] = useState(false);
  const [openRule, setOpenRule] = useState<string | null>(null);
  const [showSalaryBreakdownModal, setShowSalaryBreakdownModal] = useState(false);
  const [contributionsMap, setContributionsMap] = useState<Record<string, any>>({});
  const [fines, setFines] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'jazzcash' | 'easypaisa',
    referenceNo: ''
  });
  const [recordingAdvance, setRecordingAdvance] = useState(false);

  // Duty Marking State
  const [markingDuty, setMarkingDuty] = useState(false);
  const [dutyForm, setDutyForm] = useState({
    type: 'morning_shift',
    status: 'completed',
    comment: '',
    fineAmount: '',
    fineReason: ''
  });

  // Special Tasks State
  const [specialTasks, setSpecialTasks] = useState<HqSpecialTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<'once' | 'weekly' | 'monthly' | 'custom_days'>('once');
  const [newTaskIntervalDays, setNewTaskIntervalDays] = useState<number>(15);
  const [creatingTask, setCreatingTask] = useState(false);

  // Meeting Form
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: todayStr,
    time: '10:00',
    location: 'Conference Room',
    agenda: ''
  });
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);

  // Custom Config Add States
  const [availableDuties, setAvailableDuties] = useState<{ key: string, label: string }[]>([]);
  const [availableDress, setAvailableDress] = useState<{ key: string, label: string }[]>([]);
  const [addingConfig, setAddingConfig] = useState<{ type: 'duty' | 'dress', mode: 'select' | 'custom' } | null>(null);
  const [addingConfigSelection, setAddingConfigSelection] = useState('');
  const [addingConfigCustom, setAddingConfigCustom] = useState('');

  // Payroll Form State
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [notePopup, setNotePopup] = useState<{
    isOpen: boolean;
    date: string;
    note: string;
  }>({ isOpen: false, date: '', note: '' });

  const [payrollForm, setPayrollForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    basicSalary: 0,
    presentDays: 30,
    leaveDays: 0,
    actionDays: 0,
    incentive: 0,
    otherEarnings: 0,
    otherEarningsReason: '',
    fine: 0,
    advance: 0,
    absentDeduction: 0,
    otherDeductions: 0,
    deductionReason: '',
  });

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showReset, setShowReset] = useState(false);
  const [showDefaultPassword, setShowDefaultPassword] = useState(false);

  const monthDays = useMemo(() => {
    const days = [];
    const date = new Date();
    date.setDate(1);
    const month = date.getMonth();
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, []);

  const daysInMonth = useCallback(() => {
    if (!selectedMonth || !selectedMonth.includes('-')) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    if (isNaN(year) || isNaN(month)) return [];
    const date = new Date(year, month - 1, 1);
    if (isNaN(date.getTime())) return [];

    const days = [];
    while (date.getMonth() === month - 1) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${d}`);
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedMonth]);

  const [attendanceMap, setAttendanceMap] = useState<Record<string, HqDailyAttendanceRecord>>({});
  const [dressMap, setDressMap] = useState<Record<string, HqDailyDressCodeRecord>>({});
  const [dutyMap, setDutyMap] = useState<Record<string, HqDailyDutyRecord>>({});

  const isFineInSelectedMonth = useCallback((f: any) => {
    if (!f.date) return false;
    try {
      const dObj = toDate(f.date);
      if (dObj && typeof dObj.toISOString === 'function') {
        return dObj.toISOString().slice(0, 7) === selectedMonth;
      }
    } catch (e) {}
    return String(f.date).startsWith(selectedMonth);
  }, [selectedMonth]);

  const approvedAdvancesForMonth = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.category !== 'advance_salary' || tx.status !== 'approved') return false;
      const txDate = tx.transactionDate || tx.date || tx.createdAt;
      if (!txDate) return false;
      try {
        const dObj = toDate(txDate);
        if (dObj && typeof dObj.toISOString === 'function') {
          return dObj.toISOString().slice(0, 7) === selectedMonth;
        }
      } catch (e) {}
      return false;
    }).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [transactions, selectedMonth]);

  const salaryDetails = useMemo(() => {
    if (!staff) {
      return {
        dailyWage: 0,
        presentDays: 0,
        lateDays: 0,
        paidLeaves: 0,
        unpaidLeaves: 0,
        absentDays: 0,
        payableDays: 0,
        unpaidDays: 0,
        earnings: 0,
        absentDeduction: 0,
        estimatedSalary: 0,
        fines: 0,
        bonus: 0,
        bonusReason: '',
        deductionReason: '',
        payableDatesList: [] as { date: string; status: string }[],
        deductedDatesList: [] as { date: string; status: string; deduction: number }[],
        isFinalized: false,
        status: ''
      };
    }

    const monthlySalary = Number(staff.monthlySalary) || 0;
    const dailyWage = monthlySalary / 30;

    // Check if finalized slip exists
    const slip = salaryRecords.find(s => s.month === selectedMonth);

    // Calculate dynamic values (always needed for lists of dates, even if finalized)
    const days = daysInMonth();
    const todayStr = new Date().toISOString().slice(0, 10);
    const isCurrentMonth = selectedMonth === todayStr.slice(0, 7);

    // Calculate days passed in month
    let daysPassed = 30;
    if (isCurrentMonth) {
      daysPassed = Math.min(new Date().getDate(), 30);
    } else if (selectedMonth > todayStr.slice(0, 7)) {
      daysPassed = 0;
    }

    let presentDays = 0;
    let lateDays = 0;
    let paidLeaves = 0;
    let unpaidLeaves = 0;
    let absentDays = 0;
    let unmarkedDays = 0;

    const payableDatesList: { date: string; status: string }[] = [];
    const deductedDatesList: { date: string; status: string; deduction: number }[] = [];

    days.forEach(dayStr => {
      const att = attendanceMap[dayStr];
      const status = att ? att.status : 'unmarked';
      const isPast = dayStr < todayStr;

      if (status === 'present') {
        presentDays++;
        payableDatesList.push({ date: dayStr, status: 'Present' });
      } else if (status === 'late') {
        lateDays++;
        payableDatesList.push({ date: dayStr, status: 'Late' });
      } else if (status === 'leave' || status === 'paid_leave' || status === 'unpaid_leave') {
        paidLeaves++;
        payableDatesList.push({ date: dayStr, status: 'Paid Leave' });
      } else if (status === 'absent') {
        absentDays++;
        if (dayStr <= todayStr) {
          deductedDatesList.push({ date: dayStr, status: 'Absent', deduction: dailyWage });
        }
      } else {
        if (isPast) {
          unmarkedDays++;
          deductedDatesList.push({ date: dayStr, status: 'Unmarked (Past)', deduction: dailyWage });
        }
      }
    });

    const totalAbsentDays = absentDays + unmarkedDays;
    const payableDays = Math.max(0, daysPassed - totalAbsentDays);

    const earnings = payableDays * dailyWage;
    const absentDeduction = totalAbsentDays * dailyWage;

    // Filter fines for selected month
    const monthlyFinesList = fines.filter(isFineInSelectedMonth);
    const totalFines = monthlyFinesList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    if (slip) {
      return {
        dailyWage: slip.dailyWage || dailyWage,
        presentDays: slip.presentDays || 0,
        lateDays: 0,
        paidLeaves: slip.leaveDays || 0,
        unpaidLeaves: slip.unpaidLeaveDays || 0,
        absentDays: slip.absentDays || 0,
        payableDays: slip.presentDays || 0,
        unpaidDays: slip.absentDays || 0,
        earnings: slip.basicSalary - (slip.absentDeduction || 0),
        absentDeduction: slip.absentDeduction || 0,
        estimatedSalary: slip.netSalary || 0,
        fines: slip.fine || slip.otherDeductions || 0,
        advance: slip.advance || 0,
        bonus: slip.bonus || 0,
        bonusReason: slip.bonusReason || '',
        deductionReason: slip.deductionReason || '',
        payableDatesList,
        deductedDatesList,
        isFinalized: true,
        status: slip.status
      };
    }

    const estimatedSalary = Math.floor(Math.max(0, earnings - totalFines - approvedAdvancesForMonth));

    return {
      dailyWage,
      presentDays,
      lateDays,
      paidLeaves,
      unpaidLeaves,
      absentDays,
      payableDays,
      unpaidDays: totalAbsentDays,
      earnings,
      absentDeduction,
      estimatedSalary,
      fines: totalFines,
      advance: approvedAdvancesForMonth,
      bonus: 0,
      bonusReason: '',
      deductionReason: '',
      payableDatesList,
      deductedDatesList,
      isFinalized: false,
      status: ''
    };
  }, [staff, attendanceMap, fines, salaryRecords, selectedMonth, daysInMonth, approvedAdvancesForMonth]);

  const tillDateSalary = useMemo(() => {
    return salaryDetails.estimatedSalary;
  }, [salaryDetails]);

  const presentDaysCount = useMemo(() => {
    return salaryDetails.presentDays + salaryDetails.lateDays;
  }, [salaryDetails]);
  const [timePopup, setTimePopup] = useState<{
    isOpen: boolean;
    date: string;
    arrivalTime: string;
    departureTime: string;
  }>({ isOpen: false, date: '', arrivalTime: '', departureTime: '' });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [showVacateConfirm, setShowVacateConfirm] = useState(false);
  const [isVacating, setIsVacating] = useState(false);
  const [vacateReason, setVacateReason] = useState<'resigned' | 'terminated'>('resigned');



  const computedScores = useMemo(() => {
    if (!staff) return { attendance: 0, punctuality: 0, uniform: 0, working: 0, growthPoint: 0, normalizedDaily: 0, totalScore: 0, workingDays: 0 };
    
    const days = daysInMonth();
    let attScore = 0;
    let punctScore = 0;
    let uniScore = 0;
    let workScore = 0;

    days.forEach(day => {
      // 1. Attendance: 1 point if present and NOT late
      const att = attendanceMap[day];
      if (att) {
        const status = String(att.status || '').toLowerCase();
        const isLate = att.isLate === true || status === 'late';
        if (status === 'present' && !isLate) {
          attScore++;
        }
        if (att.arrivedOnTime) punctScore++;
      }

      // 3. Uniform: 1 point if all items are compliant
      const dress = dressMap[day];
      if (dress) {
        if ((dress as any).status === 'yes' || (dress as any).isCompliant === true) {
          uniScore++;
        } else {
          const config = (staff as any).dressCodeConfig || [];
          const items = dress.items || [];
          if (config.length === 0) {
            if ((dress as any).status !== 'no') uniScore++;
          } else {
            const missing = config.filter((c: any) => {
              const item = items.find(i => i.key === c.key);
              return !item || item.status === 'no' || (item as any).wearing === false;
            });
            if (missing.length === 0) uniScore++;
          }
        }
      }

      // 4. Working (Duties): 1 point if all duties are done
      const duty = dutyMap[day];
      if (duty) {
        if ((duty as any).status === 'yes' || (duty as any).status === 'completed') {
          workScore++;
        } else {
          const config = (staff as any).dutyConfig || [];
          const items = duty.duties || [];
          if (config.length === 0) {
            if ((duty as any).status !== 'no' && (duty as any).status !== 'failed') workScore++;
          } else {
            const pending = config.filter((c: any) => {
              const item = items.find(i => i.key === c.key);
              return !item || (item as any).status === 'pending' || item.status === 'not_done';
            });
            if (pending.length === 0) workScore++;
          }
        }
      }
    });

    let gpScore = 0;
    days.forEach(day => {
      const contrib = contributionsMap[day];
      if (contrib) {
        const status = String(contrib.status || '').toLowerCase();
        if (status === 'yes' || contrib.isApproved === true) {
          gpScore++;
        }
      }
    });

    const extraPoints = growthHistory
      .filter(item => item.month === selectedMonth && item.category === 'Growth Point Bonus')
      .reduce((acc, curr) => acc + (Number(curr.points) || 0), 0);
    gpScore += extraPoints;

    const dailyPointsSum = attScore + uniScore + workScore;
    const normalizedDaily = days.length > 0 ? Math.round((dailyPointsSum / (days.length * 3)) * 90) : 0;
    const totalScore = Math.min(100, normalizedDaily + gpScore);

    return {
      attendance: attScore,
      punctuality: punctScore,
      uniform: uniScore,
      working: workScore,
      growthPoint: gpScore,
      normalizedDaily,
      totalScore,
      workingDays: days.length
    };
  }, [staff, attendanceMap, dressMap, dutyMap, growthHistory, contributionsMap, daysInMonth, selectedMonth]);

  useEffect(() => {
    setBonusInput(computedScores.growthPoint);
  }, [computedScores.growthPoint]);

  const fetchData = useCallback(async () => {
    if (!staffId) return;
    console.log(`[StaffProfile] fetchData START for: ${staffId}`);
    try {
      setLoading(true);
      
      // Safety timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Fetch timeout after 60s")), 60000)
      );

      const profilePromise = fetchStaffProfile(staffId);
      const profile = await Promise.race([profilePromise, timeoutPromise]) as StaffProfile | null;
      
      console.log(`[StaffProfile] Profile lookup result:`, profile ? "FOUND" : "NOT_FOUND");

      if (!profile) {
        toast.error("Staff member not found");
        router.push('/hq/dashboard/manager/staff');
        return;
      }

      setStaff(profile);
      if (profile.name === 'Vacant') {
        setActiveTab('edit');
      }
      setEditForm({
        name: profile.name || '',
        designation: profile.designation || '',
        department: profile.dept || 'hq',
        secondaryDepts: profile.secondaryDepts || [],
        monthlySalary: Number(profile.monthlySalary || 0),
        dutyStartTime: profile.dutyStartTime || '09:00',
        dutyEndTime: profile.dutyEndTime || '17:00',
        isActive: profile.isActive !== false,
        phone: profile.phone || '',
        customId: profile.customId || '',
        employeeId: profile.employeeId || profile.customId || '',
        cnic: profile.cnic || '',
        dob: profile.dob || '',
        gender: (profile.gender as any) || 'male',
        bloodGroup: profile.bloodGroup || '',
        emergencyContact: profile.emergencyContact || '',
        emergencyContactName: profile.emergencyContactName || profile.emergencyContact || '',
        emergencyPhone: profile.emergencyPhone || '',
        address: profile.address || '',
        userId: profile.staffId || '',
        dressCodeConfig: (profile.dressCodeConfig?.length ? profile.dressCodeConfig : []),
        dutyConfig: (profile.dutyConfig?.length ? profile.dutyConfig : []),
        basicInfoExtras: profile.basicInfoExtras || {},
        joiningDate: profile.joiningDate ? toDate(profile.joiningDate).toISOString().slice(0, 10) : '',
        seniority: profile.seniority || '',
        fatherName: profile.fatherName || '',
        defaultPassword: profile.defaultPassword || '',
        documents: profile.documents || [],
        education: profile.education || [],
        experience: profile.experience || []
      });

      // ─── Fetch Monthly Logs ───────────────────────────────────────────────
      const prefix = getDeptPrefix(profile.dept);
      const secondaryDepts = profile.secondaryDepts || [];
      const prefixes = Array.from(new Set([
        prefix,
        ...secondaryDepts.map((d: any) => getDeptPrefix(d))
      ])).filter(Boolean);

      const uid = profile.staffId;
      const days = daysInMonth();
      const start = days[0];
      const end = days[days.length - 1];

      // Collect all potential variant IDs to retrieve all logged records
      const candidateIds = new Set<string>();
      if (uid) {
        candidateIds.add(uid);
        prefixes.forEach(p => {
          candidateIds.add(uid.startsWith(`${p}_`) ? uid.replace(`${p}_`, '') : uid);
          candidateIds.add(uid.startsWith(`${p}_`) ? uid : `${p}_${uid}`);
        });
      }
      if (profile.loginUserId) {
        const loginId = profile.loginUserId as string;
        candidateIds.add(loginId);
        prefixes.forEach(p => {
          candidateIds.add(loginId.startsWith(`${p}_`) ? loginId.replace(`${p}_`, '') : loginId);
          candidateIds.add(loginId.startsWith(`${p}_`) ? loginId : `${p}_${loginId}`);
        });
      }
      if (profile.customId) candidateIds.add(profile.customId);
      if (profile.employeeId) candidateIds.add(profile.employeeId);

      const uniqueIds = Array.from(candidateIds).filter(Boolean);

      console.log(`[StaffProfile] Triggering parallel snaps for prefixes:`, prefixes, `| Candidates:`, uniqueIds, `| Range: ${start} to ${end}`);
      const t1 = Date.now();

      const fetchParallel = async (suffix: string) => {
        const docsList: any[] = [];
        for (const p of prefixes) {
          const colName = `${p}_${suffix}`;
          const snaps = await Promise.all(
            uniqueIds.map(id => 
              getDocs(query(collection(db, colName), where('staffId', '==', id)))
                .catch(() => ({ docs: [] } as any))
            )
          );
          docsList.push(...snaps.flatMap(snap => snap.docs));
        }
        return docsList;
      };

      const [
        attDocs,
        dressDocs,
        dutyDocs,
        salarySnap,
        tasksDocs,
        fineDocs,
        metaDoc,
        txDocs,
        contribDocs
      ] = await Promise.all([
        fetchParallel(`attendance`),
        fetchParallel(`dress_logs`),
        fetchParallel(`duty_logs`),
        fetchParallel(`salary_records`),
        fetchParallel(`special_tasks`),
        fetchParallel(`fines`),
        getDoc(doc(db, `hq_meta`, 'config')).catch(() => ({ exists: () => false } as any)),
        fetchParallel(`transactions`).catch(() => []),
        fetchParallel(`contributions`).catch(() => [])
      ]);
      console.log(`[StaffProfile] All snaps LOADED in ${Date.now() - t1}ms`);

      const metaData = metaDoc.exists() ? metaDoc.data() : { customDuties: [], customDress: [] };
      setAvailableDuties([
        ...GLOBAL_DUTIES.map(d => ({ key: d.toLowerCase().replace(/\s+/g, '_'), label: d })),
        ...(metaData.customDuties || [])
      ]);
      setAvailableDress([
        ...GLOBAL_DRESS_ITEMS.map(d => ({ key: d.toLowerCase().replace(/\s+/g, '_'), label: d })),
        ...(metaData.customDress || [])
      ]);

      const getAttendancePriority = (status?: string) => {
        if (!status) return 0;
        const s = status.toLowerCase();
        if (s === 'present') return 4;
        if (s === 'late') return 3;
        if (s === 'leave' || s === 'paid_leave' || s === 'unpaid_leave') return 2;
        if (s === 'absent') return 1;
        return 0;
      };

      const getDressPriority = (status?: string) => {
        if (!status) return 0;
        const s = status.toLowerCase();
        if (s === 'yes') return 3;
        if (s === 'incomplete') return 2;
        if (s === 'no') return 1;
        return 0;
      };

      const getDutyPriority = (status?: string) => {
        if (!status) return 0;
        const s = status.toLowerCase();
        if (s === 'yes' || s === 'completed') return 3;
        if (s === 'incomplete') return 2;
        if (s === 'no' || s === 'failed') return 1;
        return 0;
      };

      const aMap: Record<string, HqDailyAttendanceRecord> = {};
      attDocs.forEach((d: any) => { 
        const data = d.data();
        if (data.date >= start && data.date <= end) {
          const existing = aMap[data.date];
          if (!existing || getAttendancePriority(data.status) > getAttendancePriority(existing.status)) {
            aMap[data.date] = data as HqDailyAttendanceRecord; 
          }
        }
      });
      setAttendanceMap(aMap);

      const drMap: Record<string, HqDailyDressCodeRecord> = {};
      dressDocs.forEach((d: any) => { 
        const data = d.data();
        if (data.date >= start && data.date <= end) {
          const existing = drMap[data.date];
          if (!existing || getDressPriority(data.status) > getDressPriority((existing as any).status)) {
            drMap[data.date] = data as HqDailyDressCodeRecord; 
          }
        }
      });
      setDressMap(drMap);

      const duMap: Record<string, HqDailyDutyRecord> = {};
      dutyDocs.forEach((d: any) => { 
        const data = d.data();
        if (data.date >= start && data.date <= end) {
          const existing = duMap[data.date];
          if (!existing || getDutyPriority(data.status) > getDutyPriority((existing as any).status)) {
            duMap[data.date] = data as HqDailyDutyRecord; 
          }
        }
      });
      setDutyMap(duMap);

      // Populate array states for calculations and lists
      setAttendance(attDocs.map((d: any) => d.data()));
      setDressLogs(dressDocs.map((d: any) => d.data()));
      setDutyLogs(dutyDocs.map((d: any) => d.data()));
      setSalaryRecords(salarySnap.map((d: any) => ({ id: d.id, ...d.data() } as SalarySlip)));
      setSpecialTasks(tasksDocs.map((d: any) => ({ id: d.id, ...d.data() } as HqSpecialTask)));
      setFines(fineDocs.map((d: any) => ({ id: d.id, ...d.data() })));
      setTransactions(txDocs.map((d: any) => ({ id: d.id, ...d.data() })));

      const cMap: Record<string, any> = {};
      contribDocs.forEach((d: any) => {
        const data = d.data();
        if (data.date) {
          cMap[data.date] = data;
        }
      });
      setContributionsMap(cMap);

      // Fetch growth history (all records)
      const monthlyGpDocs = (await fetchParallel(`growth_points`)).map((d: any) => d.data());

      const contribRows: any[] = [];

      monthlyGpDocs.forEach((gpDoc: any) => {
        const extraPoints = Number(gpDoc.extra || 0);
        if (extraPoints > 0) {
          contribRows.push({
            id: `${gpDoc.month}_extra`,
            points: extraPoints,
            note: `Monthly Bonus/Extra Points`,
            date: `${gpDoc.month}-28`,
            month: gpDoc.month,
            category: 'Growth Point Bonus'
          });
        }
      });

      const approvedContribs = contribDocs
        .map((d: any) => d.data())
        .filter((item: any) => item.status === 'yes' || item.isApproved === true)
        .map((item: any) => ({
          id: item.date,
          points: 1,
          note: item.link ? `Contribution: ${item.link}` : 'Daily Growth Contribution',
          date: item.date,
          month: item.date && typeof item.date === 'string' ? item.date.substring(0, 7) : '',
          category: 'Growth Point'
        }));

      const combinedGrowth = [...contribRows, ...approvedContribs];
      const uniqueContribRows = Array.from(new Map(combinedGrowth.map(item => [item.id + '_' + item.category, item])).values());
      uniqueContribRows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setGrowthHistory(uniqueContribRows);

    } catch (err) {
      console.error("[StaffProfile] fetchData ERROR:", err);
      toast.error("Error loading profile");
    } finally {
      console.log(`[StaffProfile] fetchData FINALLY (setting loading false)`);
      setLoading(false);
      fetchLock.current = false;
    }
  }, [staffId, daysInMonth]); // Removed router as it's not needed for fetch and can be unstable // Removed router as it's not needed for fetch and can be unstable

  const handleUpdateStatus = async (newStatus: 'active' | 'inactive' | 'resigned' | 'terminated' | 'active_vacancy') => {
    if (!staff) return;
    try {
      setSaving(true);
      const isActive = newStatus === 'active';
      await updateStaffProfile(staffId, { 
        status: newStatus,
        isActive
      });
      setStaff(prev => prev ? { ...prev, status: newStatus, isActive } : null);
      toast.success(`Staff status updated to ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };
  
  const handleDownloadReport = async () => {
    const el = document.getElementById('staff-report-root');
    if (!el) return;
    await downloadElementAsPng(el, `${staff?.name || 'staff'}-report.png`, { scale: 2 });
  };

  const handleDeleteConfig = async (type: 'duty' | 'dress', key: string) => {
    if (!staff) return;
    try {
      setProcessingConfig(true);
      const field = type === 'duty' ? 'dutyConfig' : 'dressCodeConfig';
      const current = type === 'duty' ? (staff.dutyConfig || []) : (staff.dressCodeConfig || []);
      const next = current.filter(i => i.key !== key);
      
      await updateStaffProfile(staffId, { [field]: next });
      setStaff(prev => prev ? { ...prev, [field]: next } : null);
      setEditForm(prev => ({ ...prev, [field]: next }));
      toast.success(`${type === 'duty' ? 'Duty' : 'Dress Item'} removed`);
    } catch (err) {
      toast.error("Failed to remove item");
    } finally {
      setProcessingConfig(false);
    }
  };

  const handleAddConfig = async () => {
    if (!staff || !addingConfig || processingConfig) return;
    setProcessingConfig(true);
    const { type, mode } = addingConfig;

    let newItem: { key: string, label: string } | null = null;

    if (mode === 'select' && addingConfigSelection) {
      const opts = type === 'duty' ? availableDuties : availableDress;
      newItem = opts.find(o => o.key === addingConfigSelection) || null;
    } else if (mode === 'custom' && addingConfigCustom.trim()) {
      const label = addingConfigCustom.trim();
      const key = label.toLowerCase().replace(/\s+/g, '_');
      newItem = { key, label };

      // Save backend to `hq_meta/config`
      try {
        const metaRef = doc(db, `hq_meta`, 'config');
        const metaDoc = await getDoc(metaRef);
        const field = type === 'duty' ? 'customDuties' : 'customDress';
        const existing = metaDoc.exists() ? (metaDoc.data()[field] || []) : [];
        if (!existing.find((e: any) => e.key === key)) {
          await setDoc(metaRef, { [field]: [...existing, newItem] }, { merge: true });
          toast.success(`${type === 'duty' ? 'Duty' : 'Dress Item'} stored globally to options list!`);
        }

        // Update Local States
        if (type === 'duty') setAvailableDuties(p => [...p, newItem!]);
        else setAvailableDress(p => [...p, newItem!]);
      } catch (e) {
        console.error(e);
        toast.error("Failed to commit custom config to backend metadata.");
      }
    }

    if (newItem) {
      setEditForm(prev => {
        const targetList = type === 'duty' ? prev.dutyConfig : prev.dressCodeConfig;
        if (targetList.find(i => i.key === newItem!.key)) return prev;
        return {
          ...prev,
          [type === 'duty' ? 'dutyConfig' : 'dressCodeConfig']: [...targetList, newItem!]
        };
      });
    }

    setAddingConfig(null);
    setAddingConfigSelection('');
    setAddingConfigCustom('');
    setProcessingConfig(false);
  };


  const toggleAttendance = async (date: string, next: any) => {
    try {
      if (!staff) return;
      const slug = getDeptPrefix(staff.dept);
      const uid = staff.staffId;
      const ref = doc(db, `${slug}_attendance`, `${uid}_${date}`);

      const prevRecord = attendanceMap[date] || {};
      const newRecord: HqDailyAttendanceRecord = {
        staffId: uid,
        date,
        status: next,
        markedBy: session?.uid,
        updatedAt: new Date().toISOString(),
        arrivedOnTime: next === 'present' || next === 'late' ? (prevRecord.arrivedOnTime ?? true) : null,
        departedOnTime: next === 'present' || next === 'late' ? (prevRecord.departedOnTime ?? true) : null,
      } as any;

      // Set default times if presenting for the first time
      if (next === 'present' && !prevRecord.arrivalTime) {
        newRecord.arrivalTime = staff.dutyStartTime || '09:00';
        newRecord.departureTime = staff.dutyEndTime || '17:00';
        newRecord.arrivedOnTime = true;
        newRecord.departedOnTime = true;
      }

      setAttendanceMap(prev => ({ ...prev, [date]: newRecord }));
      await setDoc(ref, newRecord, { merge: true });

      // Award Point if present or late
      if (next === 'present' || next === 'late') {
        await awardStaffPoint(uid, staff.dept, 'attendance', date);
      }
    } catch (err) {
      toast.error("Update failed");
      fetchData(); // Rollback
    }
  };

  const togglePunctuality = async (date: string, field: 'arrivedOnTime' | 'departedOnTime', next: boolean) => {
    try {
      if (!staff) return;
      const slug = getDeptPrefix(staff.dept);
      const uid = staff.staffId;
      const ref = doc(db, `${slug}_attendance`, `${uid}_${date}`);

      const prevRecord = attendanceMap[date] || {};
      const newRecord: HqDailyAttendanceRecord = {
        ...prevRecord,
        staffId: uid,
        date,
        [field]: next,
        status: (() => {
          const currentStatus = prevRecord.status || 'unmarked';
          // If status is a "leave" status, DO NOT change it based on punctuality toggles
          if (['leave', 'paid_leave', 'unpaid_leave'].includes(currentStatus)) {
            return currentStatus;
          }
          // Otherwise, if they are marked on-time or were already present, keep as present
          return (next || currentStatus === 'present') ? 'present' : (currentStatus === 'late' ? 'present' : currentStatus);
        })() as any,
        updatedAt: new Date().toISOString(),
        markedBy: session?.uid
      } as any;

      if (newRecord.status === 'present' && !newRecord.arrivalTime) {
        newRecord.arrivalTime = staff?.dutyStartTime || '09:00';
        newRecord.departureTime = staff?.dutyEndTime || '17:00';
      }

      setAttendanceMap(prev => ({ ...prev, [date]: newRecord }));
      await setDoc(ref, newRecord, { merge: true });

      if (!next && field === 'arrivedOnTime') {
        setNotePopup({
          isOpen: true,
          date,
          note: prevRecord.note || ''
        });
      }

      toast.success(next ? "Marked as On Time" : "Marked as Late");
    } catch (err) {
      toast.error("Update failed");
      fetchData();
    }
  };

  const handleSaveNote = async () => {
    if (!notePopup.date) return;
    try {
      if (!staff) return;
      const slug = getDeptPrefix(staff.dept);
      const uid = staff.staffId;
      const ref = doc(db, `${slug}_attendance`, `${uid}_${notePopup.date}`);

      await setDoc(ref, { note: notePopup.note }, { merge: true });
      setAttendanceMap(prev => ({
        ...prev,
        [notePopup.date]: { ...prev[notePopup.date], note: notePopup.note }
      }));
      setNotePopup({ ...notePopup, isOpen: false });
      toast.success("Note saved");
    } catch (err) {
      toast.error("Failed to save note");
    }
  };

  const handleUpdateTime = async (date: string, field: 'arrivalTime' | 'departureTime', value: string) => {
    try {
      if (!staff) return;
      const slug = getDeptPrefix(staff.dept);
      const uid = staff.staffId;
      const ref = doc(db, `${slug}_attendance`, `${uid}_${date}`);

      const prevRecord = attendanceMap[date] || {};

      const normalizeTime = (t: string) => {
        if (!t) return '00:00';
        if (t.includes('AM') || t.includes('PM')) {
          const [time, modifier] = t.split(' ');
          let [hours, minutes] = time.split(':');
          if (hours === '12') hours = '00';
          if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
          return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
        return t.padStart(5, '0');
      };

      const staffIn = normalizeTime(staff.dutyStartTime || '09:00');
      const staffOut = normalizeTime(staff.dutyEndTime || '17:00');
      const currentVal = normalizeTime(value);

      let arrivedOnTime = prevRecord.arrivedOnTime;
      let departedOnTime = prevRecord.departedOnTime;

      if (field === 'arrivalTime') {
        arrivedOnTime = currentVal <= staffIn;
      } else if (field === 'departureTime') {
        departedOnTime = currentVal >= staffOut;
      }

      const newRecord = {
        ...prevRecord,
        [field]: value,
        arrivedOnTime,
        departedOnTime,
        status: (prevRecord.status === 'unmarked' ? 'present' : prevRecord.status) as any,
        updatedAt: new Date().toISOString()
      };

      setAttendanceMap(prev => ({ ...prev, [date]: newRecord }));
      await setDoc(ref, {
        [field]: value,
        status: newRecord.status,
        arrivedOnTime: newRecord.arrivedOnTime,
        departedOnTime: newRecord.departedOnTime,
        updatedAt: newRecord.updatedAt
      }, { merge: true });
    } catch (err) {
      toast.error("Failed to update time");
    }
  };

  const handleAttendanceCell = (dateStr: string) => {
    const existing = attendanceMap[dateStr];

    const normalizeTime = (t: string) => {
      if (!t) return '';
      if (t.includes('AM') || t.includes('PM')) {
        const [time, modifier] = t.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }
      return t;
    };

    setTimePopup({
      isOpen: true,
      date: dateStr,
      arrivalTime: existing?.arrivalTime || normalizeTime(staff?.dutyStartTime || '09:00'),
      departureTime: existing?.departureTime || normalizeTime(staff?.dutyEndTime || '17:00')
    });
  };

  const handleTimePopupSave = async () => {
    if (!timePopup.date) return;

    try {
      setSaving(true);
      if (!staff) return;
      const slug = getDeptPrefix(staff.dept);
      const uid = staff.staffId;
      const ref = doc(db, `${slug}_attendance`, `${uid}_${timePopup.date}`);

      const normalizeTime = (t: string) => {
        if (!t) return '00:00';
        if (t.includes('AM') || t.includes('PM')) {
          const [time, modifier] = t.split(' ');
          let [hours, minutes] = time.split(':');
          if (hours === '12') hours = '00';
          if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
          return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
        return t.padStart(5, '0');
      };

      const staffIn = normalizeTime(staff.dutyStartTime || '09:00');
      const staffOut = normalizeTime(staff.dutyEndTime || '17:00');
      const arrival = normalizeTime(timePopup.arrivalTime);
      const departure = normalizeTime(timePopup.departureTime);

      // Auto-calculate punctuality if times are set
      const arrivedOnTime = arrival <= staffIn;
      const departedOnTime = departure >= staffOut;

      const payload = {
        ...attendanceMap[timePopup.date],
        staffId: uid,
        date: timePopup.date,
        arrivalTime: timePopup.arrivalTime,
        departureTime: timePopup.departureTime,
        arrivedOnTime,
        departedOnTime,
        status: 'present' as HqDailyAttendanceRecord['status'],
        updatedAt: new Date().toISOString(),
        markedBy: session?.uid
      };

      // Update Local State
      setAttendanceMap(prev => ({
        ...prev,
        [timePopup.date]: payload
      }));

      // Single setDoc call as requested
      await setDoc(ref, payload, { merge: true });

      toast.success("Timing updated");
      setTimePopup({ ...timePopup, isOpen: false });
    } catch (err) {
      toast.error("Failed to save timing");
    } finally {
      setSaving(false);
    }
  };

  const toggleDress = async (date: string, itemKey: string, next: any) => {
    try {
      if (!staff) return;
      const slug = getDeptPrefix(staff.dept);
      const uid = staff.staffId;
      const ref = doc(db, `${slug}_dress_logs`, `${uid}_${date}`);
      const current = dressMap[date]?.items || [];
      const exists = current.find(i => i.key === itemKey);

      let nextItems: HqDressCodeItem[] = [];
      if (exists) {
        nextItems = current.map(i => i.key === itemKey ? { ...i, status: next } : i);
      } else {
        const label = staff?.dressCodeConfig?.find(c => c.key === itemKey)?.label || itemKey;
        nextItems = [...current, { key: itemKey, label, status: next }];
      }

      const newRecord: HqDailyDressCodeRecord = {
        staffId: uid,
        date,
        items: nextItems,
        markedBy: session?.uid,
        updatedAt: new Date().toISOString() // Keep string for local state
      };

      setDressMap(prev => ({ ...prev, [date]: newRecord }));
      
      // Use serverTimestamp for the actual DB write to avoid "future time" warnings
      await setDoc(ref, {
        ...newRecord,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Check if ALL dress items are ticked (yes)
      const config = staff.dressCodeConfig || [];
      if (config.length > 0) {
        const allTicked = config.every(c => {
          const item = nextItems.find(i => i.key === c.key);
          return item && item.status === 'yes';
        });
        if (allTicked) {
          await awardStaffPoint(uid, staff.dept, 'dress', date);
        }
      }

      // Sync step removed to protect master configuration from historical overrides.
    } catch (err) {
      toast.error("Update failed");
      fetchData();
    }
  };

  const toggleDuty = async (date: string, dutyKey: string, next: any) => {
    try {
      if (!staff) return;
      const slug = getDeptPrefix(staff.dept);
      const uid = staff.staffId;
      const ref = doc(db, `${slug}_duty_logs`, `${uid}_${date}`);
      const current = dutyMap[date]?.duties || [];
      const exists = current.find(d => d.key === dutyKey);

      let nextDuties: HqDutyItem[] = [];
      if (exists) {
        nextDuties = current.map(d => d.key === dutyKey ? { ...d, status: next } : d);
      } else {
        const label = staff?.dutyConfig?.find(c => c.key === dutyKey)?.label || dutyKey;
        nextDuties = [...current, { key: dutyKey, label, status: next }];
      }

      const newRecord: HqDailyDutyRecord = {
        staffId: uid,
        department: staff.dept,
        date,
        duties: nextDuties,
        markedBy: session?.uid,
        updatedAt: new Date().toISOString()
      };

      setDutyMap(prev => ({ ...prev, [date]: newRecord }));
      
      // Use serverTimestamp for the actual DB write
      await setDoc(ref, {
        ...newRecord,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Sync step removed to protect master configuration from historical overrides.

      // Check if ALL duties are marked as 'done'
      const config = staff.dutyConfig || [];
      if (config.length > 0) {
        const allDone = config.every(c => {
          const item = nextDuties.find(d => d.key === c.key);
          return item && item.status === 'done';
        });
        if (allDone) {
          await awardStaffPoint(uid, staff.dept, 'duty', date);
        }
      }
    } catch (err) {
      toast.error("Update failed");
      fetchData();
    }
  };

  const handleCreateSpecialTask = async () => {
    if (!newTaskText.trim() || !staff) return;
    try {
      setCreatingTask(true);
      const slug = getDeptPrefix(staff.dept);
      const newTask: Partial<HqSpecialTask> = {
        staffId: staff.staffId,
        description: newTaskText,
        status: 'assigned',
        recurrence: newTaskRecurrence,
        intervalDays: newTaskRecurrence === 'custom_days' ? newTaskIntervalDays : undefined,
        assignedBy: session?.uid || '',
        assignedByName: session?.name || '',
        createdAt: new Date().toISOString(),
        dueDate: new Date().toISOString(), // Default to today
      };
      const docRef = await addDoc(collection(db, `${slug}_special_tasks`), newTask);
      setSpecialTasks([{ id: docRef.id, ...newTask } as HqSpecialTask, ...specialTasks]);
      
      // Add notification for the staff member
      await addDoc(collection(db, "staff_notifications"), {
        recipientId: staff.staffId,
        title: "New Special Task Assigned",
        body: `You have been assigned a new task: ${newTaskText}`,
        type: 'task',
        isRead: false,
        createdAt: new Date().toISOString(),
        dept: staff.dept,
        relatedId: docRef.id
      });

      setNewTaskText('');
      setNewTaskRecurrence('once');
      toast.success("Special Task Assigned!");
    } catch (e) {
      toast.error("Failed to assign task");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleTaskActionManager = async (taskId: string, newStatus: 'assigned' | 'acknowledged' | 'completed') => {
    try {
      if (!staff) return;
      const prefix = getDeptPrefix(staff.dept);
      await updateDoc(doc(db, `${prefix}_special_tasks`, taskId), {
        status: newStatus,
        ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : {})
      });
      if (newStatus === 'completed') {
        await updateDoc(doc(db, `${prefix}_growth_points`, `${staff.staffId}_${new Date().toISOString().slice(0, 7)}`), {
          extra: increment(1),
          total: increment(1)
        }).catch(e => console.log('Growth doc might not exist yet', e));

        // Handle Recurrence
        const taskSnap = await getDoc(doc(db, `${prefix}_special_tasks`, taskId));
        const taskData = taskSnap.data() as HqSpecialTask;
        
        if (taskData && taskData.recurrence && taskData.recurrence !== 'once') {
          const nextDate = new Date();
          if (taskData.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (taskData.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else if (taskData.recurrence === 'custom_days' && taskData.intervalDays) {
            nextDate.setDate(nextDate.getDate() + taskData.intervalDays);
          }

          const nextTask: Partial<HqSpecialTask> = {
            staffId: staff.staffId,
            description: taskData.description,
            status: 'assigned',
            recurrence: taskData.recurrence,
            intervalDays: taskData.intervalDays,
            assignedBy: taskData.assignedBy,
            assignedByName: taskData.assignedByName,
            createdAt: new Date().toISOString(),
            dueDate: nextDate.toISOString(),
          };
          await addDoc(collection(db, `${prefix}_special_tasks`), nextTask);
        }
      }
      toast.success(`Task marked as ${newStatus}`);
      fetchData();
    } catch (e) {
      toast.error("Failed to update task");
    }
  };

  const isPayrollWindow = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return false;
    const [year, month] = monthStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month)) return false;

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1; // 1-indexed
    const todayDay = today.getDate();

    // Last 5 days of the selected month
    const lastDayOfSelectedMonth = new Date(year, month, 0).getDate();
    const isLast5Days = (
      todayYear === year &&
      todayMonth === month &&
      todayDay >= (lastDayOfSelectedMonth - 4) &&
      todayDay <= lastDayOfSelectedMonth
    );

    // First 10 days of the next month
    let nextMonthYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextMonthYear += 1;
    }
    const isFirst10DaysNextMonth = (
      todayYear === nextMonthYear &&
      todayMonth === nextMonth &&
      todayDay >= 1 &&
      todayDay <= 10
    );

    // First 10 days of the selected month (as fallback)
    const isFirst10DaysSelectedMonth = (
      todayYear === year &&
      todayMonth === month &&
      todayDay >= 1 &&
      todayDay <= 10
    );

    return isLast5Days || isFirst10DaysNextMonth || isFirst10DaysSelectedMonth;
  };

  const handleDeleteSlip = async (record: SalarySlip) => {
    if (!staff) return;
    
    const recordsForMonth = salaryRecords.filter(r => r.month === record.month);
    const inWindow = isPayrollWindow(record.month);
    
    if (inWindow && recordsForMonth.length <= 1) {
      toast.error(`You cannot delete the last remaining salary slip for ${record.month} during the payroll window (last 5 days of the month or first 10 days of the month).`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the salary slip for ${record.month}? This action is irreversible.`)) {
      return;
    }

    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      const salaryPrefix = getDeptPrefix(staff.dept);
      await deleteDoc(doc(db, `${salaryPrefix}_salary_records`, record.id));
      toast.success("Salary slip deleted successfully");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete salary slip");
    }
  };

  const handleGenerateSlip = async () => {
    if (generatingSlip) return;
    try {
      if (!staff) return;
      setGeneratingSlip(true);
      const [y, m] = payrollForm.month.split('-');
      const workingDays = new Date(Number(y), Number(m), 0).getDate();
      
      const proRatedBase = payrollForm.basicSalary;
      const totalAdditions = (payrollForm.incentive || 0) + (payrollForm.otherEarnings || 0);
      const totalDeductions = (payrollForm.fine || 0) + (payrollForm.advance || 0) + (payrollForm.absentDeduction || 0) + (payrollForm.otherDeductions || 0);
      const netSalary = Math.round(proRatedBase + totalAdditions - totalDeductions);

      const slip: any = {
        staffId: staff.staffId,
        employeeId: staff.employeeId || staff.customId || '',
        staffName: staff.name || '',
        department: staff.dept,
        month: payrollForm.month,
        basicSalary: payrollForm.basicSalary,
        dailyWage: Math.round(payrollForm.basicSalary / workingDays),
        workingDays,
        presentDays: payrollForm.presentDays,
        absentDays: workingDays - payrollForm.presentDays,
        leaveDays: payrollForm.leaveDays,
        actionDays: payrollForm.actionDays,
        absentDeduction: payrollForm.absentDeduction || 0,
        incentive: payrollForm.incentive || 0,
        otherEarnings: payrollForm.otherEarnings || 0,
        otherEarningsReason: payrollForm.otherEarningsReason || '',
        fine: payrollForm.fine || 0,
        advance: payrollForm.advance || 0,
        otherDeductions: payrollForm.otherDeductions || 0,
        deductionReason: payrollForm.deductionReason || '',
        bonus: 0, // deprecated but keep for safety
        netSalary,
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: session?.uid || ''
      };
      const salaryPrefix = getDeptPrefix(staff.dept);
      await addDoc(collection(db, `${salaryPrefix}_salary_records`), slip);
      toast.success("Financial Ledger Updated & Finalized");
      setShowPayrollModal(false);
      fetchData();
    } catch (e) {
      toast.error("Failed to generate slip");
    } finally {
      setGeneratingSlip(false);
    }
  };

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'manager' && session.role !== 'superadmin')) {
      router.push('/hq/login');
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (sessionLoading || !staffId) return;
    
    // Prevent double-fetching if the ID and month hasn't changed and we aren't already fetching
    if (lastFetchedId.current === staffId && lastFetchedMonth.current === selectedMonth && staff) return;
    if (fetchLock.current) return;

    fetchLock.current = true;
    lastFetchedId.current = staffId;
    lastFetchedMonth.current = selectedMonth;
    fetchData();
  }, [staffId, selectedMonth, sessionLoading, fetchData]); // Removed session and router as dependencies to stop loops

  const handleScheduleMeeting = async () => {
    if (!meetingForm.title || !meetingForm.date || !staff) return;
    const currentDept = staff.dept as StaffDept;
    setSchedulingMeeting(true);
    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      
      // 1. Save to staff_notifications (Individual)
      await addDoc(collection(db, 'staff_notifications'), {
        recipientId: staff.id,
        title: `Meeting: ${meetingForm.title}`,
        body: `You have a meeting scheduled for ${meetingForm.date} at ${meetingForm.time}. Location: ${meetingForm.location}`,
        type: 'meeting',
        dept: currentDept,
        relatedId: staff.id,
        isRead: false,
        createdAt: serverTimestamp()
      });

      // 2. Add to specialTasks with meeting type
      await addDoc(collection(db, `${getDeptPrefix(currentDept)}_special_tasks`), {
        staffId: staff.id,
        description: `MEETING: ${meetingForm.title} (${meetingForm.date} @ ${meetingForm.time})`,
        status: 'pending',
        priority: 'high',
        assignedBy: session?.uid,
        assignedByName: session?.displayName || 'Manager',
        category: 'meeting',
        metadata: {
          ...meetingForm
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success('Meeting Scheduled and Notified');
      setMeetingForm({ title: '', date: todayStr, time: '10:00', location: 'Conference Room', agenda: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to schedule meeting');
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const handleMarkDuty = async () => {
    try {
      setMarkingDuty(true);
      if (!staff) return;
      const slug = getDeptPrefix(staff.dept);
      const uid = staff.staffId;

      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Record Duty Log
      await addDoc(collection(db, `${slug}_duty_logs`), {
        staffId: uid,
        dutyType: dutyForm.type,
        status: dutyForm.status,
        comment: dutyForm.comment || (dutyForm.status === 'not_completed' ? `Fine: ${dutyForm.fineReason}` : ''),
        points: dutyForm.status === 'completed' ? 10 : -5, // Penalty points
        date: todayStr, // Use string for daily report consistency
        createdAt: serverTimestamp(),
        markedBy: session?.uid,
        fineAmount: dutyForm.status === 'not_completed' ? Number(dutyForm.fineAmount) || 0 : 0,
        fineReason: dutyForm.status === 'not_completed' ? dutyForm.fineReason : ''
      });

      // 2. If it's a fine, record it in the fines collection for salary deduction
      if (dutyForm.status === 'not_completed' && Number(dutyForm.fineAmount) > 0) {
        await addDoc(collection(db, `${slug}_fines`), {
          staffId: uid,
          amount: Number(dutyForm.fineAmount),
          reason: dutyForm.fineReason || `Fine for ${dutyForm.type.replace(/_/g, ' ')}`,
          status: 'unpaid',
          date: todayStr, // Match daily report query
          createdAt: serverTimestamp(),
          markedBy: session?.uid,
          source: 'duty_assessment'
        });
      }

      toast.success(dutyForm.status === 'completed' ? "Duty assessment finalized" : "Fine recorded and finalized");
      
      // Delay redirect slightly to allow toast to be seen
      setTimeout(() => {
        router.push('/hq/dashboard/manager/staff');
      }, 1000);
    } catch (error) {
      toast.error("Failed to record assessment");
    } finally {
      setMarkingDuty(false);
    }
  };

  const handleMarkAttendance = async (dateStr: string, status: 'present' | 'absent' | 'leave') => {
    try {
      if (!staff) return;
      const slug = getDeptPrefix(staff.dept);
      const uid = staff.staffId;
      const attId = `${uid}_${dateStr}`;
      await setDoc(doc(db, `${slug}_attendance`, attId), {
        staffId: uid,
        date: dateStr,
        status,
        markedAt: serverTimestamp(),
        markedBy: session?.uid,
        arrivalTime: status === 'present' ? '09:00' : null,
        departureTime: status === 'present' ? '17:00' : null,
        arrivedOnTime: status === 'present' ? true : null, // Fix: Ensure they are marked on time by default
        departedOnTime: status === 'present' ? true : null
      });
      toast.success(`Marked as ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to mark attendance");
    }
  };

  const handleMarkDress = async (dateStr: string, isCompliant: boolean) => {
    try {
      if (!staff) return;
      const prefix = getDeptPrefix(staff.dept);
      const uid = staff.staffId;
      const logId = `${uid}_${dateStr}`;
      await setDoc(doc(db, `${prefix}_dress_logs`, logId), {
        staffId: uid,
        date: dateStr,
        isCompliant,
        markedAt: serverTimestamp(),
        markedBy: session?.uid
      });
      toast.success("Dress code logged");
      fetchData();
    } catch (error) {
      toast.error("Failed to log dress code");
    }
  };

  const handleSaveBonus = async () => {
    if (!staff) return;
    try {
      setSaving(true);
      const val = Math.max(0, Math.min(10, Number(bonusInput) || 0));
      const month = selectedMonth;
      
      let cleanPrefix: string = staff.dept;
      if (cleanPrefix === 'job-center') cleanPrefix = 'jobcenter';
      if (cleanPrefix === 'social-media') cleanPrefix = 'media';
      const p = cleanPrefix ? `${cleanPrefix.replace('-', '_')}_` : 'rehab_';
      
      const docId = `${staff.staffId}_${month}`;
      const docRef = doc(db, `${p}growth_points`, docId);
      
      await setDoc(docRef, {
        id: docId,
        staffId: staff.staffId,
        month: month,
        extra: val,
        lastCalculatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Recalculate
      const { recalculateGrowthPoints } = await import('@/lib/rehab/growthPoints');
      await recalculateGrowthPoints(staff.staffId, month, staff.dept);
      
      toast.success("Bonus points saved and total score recalculated successfully!");
      fetchData();
    } catch (err) {
      console.error("Error saving bonus points:", err);
      toast.error("Failed to save bonus points");
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      if (!staff) return;
      toast.loading("Recalculating points...", { id: 'recalc' });
      const month = selectedMonth || new Date().toISOString().slice(0, 7);
      const { recalculateGrowthPoints } = await import('@/lib/rehab/growthPoints');
      await recalculateGrowthPoints(staff.staffId, month, staff.dept);
      toast.success("Points updated", { id: 'recalc' });
      fetchData();
    } catch (error) {
      toast.error("Recalculation failed", { id: 'recalc' });
    }
  };

  const handleRecordAdvance = async () => {
    if (!staff || !advanceForm.amount || Number(advanceForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    try {
      setRecordingAdvance(true);
      toast.loading("Recording advance transaction...", { id: 'rec-advance' });
      
      const prefix = getDeptPrefix(staff.dept as StaffDept);
      
      const payload: any = {
        type: 'expense',
        category: 'advance_salary',
        categoryName: 'Advance Salary',
        amount: Number(advanceForm.amount),
        patientId: `${staff.dept}-general`,
        patientName: `General ${staff.dept.toUpperCase()} Account`,
        description: advanceForm.description.trim() || `Advance salary for ${staff.name}`,
        paymentMethod: advanceForm.paymentMethod,
        referenceNo: advanceForm.referenceNo.trim(),
        status: session?.role === 'superadmin' ? 'approved' : 'pending',
        cashierId: session?.customId || 'HQ-MANAGER',
        date: Timestamp.fromDate(new Date(`${advanceForm.date}T00:00:00`)),
        transactionDate: Timestamp.fromDate(new Date(`${advanceForm.date}T00:00:00`)),
        createdBy: session?.uid,
        createdByName: session?.displayName || session?.name || 'HQ Manager',
        createdAt: Timestamp.now(),
        staffId: staff.staffId,
        staffName: staff.name
      };
      
      if (session?.role === 'superadmin') {
        payload.approvedAt = Timestamp.now();
        payload.approvedBy = session.customId;
        payload.processedAt = Timestamp.now();
        payload.processedBy = session.customId;
      }
      
      const txRef = await addDoc(collection(db, `${prefix}_transactions`), payload);
      
      if (session?.role === 'superadmin') {
        try {
          const { syncDirectApprovedTransaction } = await import('@/app/hq/actions/approvals');
          await syncDirectApprovedTransaction({ 
            dept: staff.dept as any, 
            txId: txRef.id,
            approvedBy: session?.customId || 'SUPERADMIN'
          });
        } catch (syncErr) {
          console.error('[StaffProfile] Sync direct approved transaction failed:', syncErr);
        }
      }
      
      toast.success(session?.role === 'superadmin' ? "Advance salary recorded & approved!" : "Advance salary recorded & submitted for cashier/superadmin approval!", { id: 'rec-advance' });
      setShowAdvanceModal(false);
      setAdvanceForm({
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        paymentMethod: 'cash',
        referenceNo: ''
      });
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to record advance salary", { id: 'rec-advance' });
    } finally {
      setRecordingAdvance(false);
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!staff) return;
    if (!confirm(`Are you sure you want to promote ${staff.name} to Department Admin? Any existing Admin in the ${staff.dept.toUpperCase()} department will be demoted to Staff role. This action is real-time and cannot be undone.`)) {
      return;
    }
    
    try {
      setSaving(true);
      toast.loading("Reconfiguring department administration...", { id: 'promote-admin' });
      
      const deptCol = getDeptCollection(staff.dept as StaffDept);
      
      // 1. Query for existing admin(s) in this department
      const adminsQuery = query(collection(db, deptCol), where('role', '==', 'admin'));
      const adminsSnap = await getDocs(adminsQuery);
      
      // 2. Demote them to 'staff'
      const batchPromises: Promise<any>[] = [];
      adminsSnap.docs.forEach(docSnap => {
        if (docSnap.id !== staff.staffId) {
          batchPromises.push(
            updateDoc(doc(db, deptCol, docSnap.id), {
              role: 'staff',
              designation: 'Staff Member',
              updatedAt: serverTimestamp()
            })
          );
        }
      });
      
      await Promise.all(batchPromises);
      
      // 3. Promote selected staff member to 'admin'
      await updateDoc(doc(db, deptCol, staff.staffId), {
        role: 'admin',
        designation: 'Admin',
        updatedAt: serverTimestamp()
      });
      
      toast.success(`${staff.name} promoted to Admin successfully! Previous admin demoted.`, { id: 'promote-admin' });
      fetchData();
    } catch (error: any) {
      console.error("[PromoteAdmin] Error:", error);
      toast.error(error.message || "Failed to promote to Admin", { id: 'promote-admin' });
    } finally {
      setSaving(false);
    }
  };


  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !staff) return;

    if (file.type !== 'image/webp') {
      toast.error("Only .webp images are allowed for profile photos.");
      e.target.value = '';
      return;
    }

    try {
      toast.loading("Uploading photo...", { id: 'upload' });
      const { uploadToCloudinary } = await import('@/lib/cloudinaryUpload');
      const url = await uploadToCloudinary(file, `khanhub/staff/${staff.dept}`);

      const collectionName = getDeptCollection(staff.dept as StaffDept);
      await updateDoc(doc(db, collectionName, staff.staffId), {
        photoUrl: url
      });

      toast.success("Photo updated", { id: 'upload' });
      fetchData();
    } catch (error) {
      toast.error("Upload failed", { id: 'upload' });
    }
  };




  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !staff) return;
    if (!newDocTitle.trim()) {
      toast.error("Please enter a Document Title first.");
      e.target.value = '';
      return;
    }

    const file = e.target.files[0];
    try {
      setUploadingDoc(true);
      toast.loading("Uploading document...", { id: 'upload-doc' });
      const { uploadToCloudinary } = await import('@/lib/cloudinaryUpload');
      const url = await uploadToCloudinary(file, `khanhub/staff/${staff.dept}/documents`);

      const nextDocs = [...(editForm.documents || []), { title: newDocTitle.trim(), url }];
      setEditForm({ ...editForm, documents: nextDocs });
      
      setNewDocTitle('');
      toast.success("Document uploaded to form (Don't forget to Save Changes)", { id: 'upload-doc' });
    } catch (error) {
      toast.error("Upload failed", { id: 'upload-doc' });
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };


  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      if (!staff) return;

      // Filter out any documents currently in deleting/counting down state
      const finalDocuments = (editForm.documents || []).filter((_, idx) => {
        return docStates[idx]?.status !== 'deleting';
      });

      let finalUpdates: any = {
        ...editForm,
        documents: finalDocuments,
        updatedAt: serverTimestamp()
      };

      // Auto-hire: Transition active vacancy to active when hired
      if (
        (staff.status === 'active_vacancy' || staff.name?.toLowerCase() === 'vacant') &&
        editForm.name &&
        editForm.name.toLowerCase() !== 'vacant'
      ) {
        finalUpdates.status = 'active';
        finalUpdates.isActive = true;
      }

      const res = await updateStaffProfile(staff.id, finalUpdates);

      if (!res.success) throw new Error(res.error);

      // Clear any pending deletion timers/states since profile saved
      Object.values(docStates).forEach((state) => {
        if (state.intervalId) clearInterval(state.intervalId);
        if (state.timeoutId) clearTimeout(state.timeoutId);
      });
      setDocStates({});

      toast.success("Profile updated successfully");
      
      if (res.newId) {
        // Redirect to new ID if department changed
        router.replace(`/hq/dashboard/manager/staff/${res.newId}`);
      } else {
        fetchData();
        setActiveTab('profile');
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!staff || deleteConfirmText !== staff.name) {
      toast.error("Please type the staff name exactly to confirm");
      return;
    }

    try {
      setIsDeleting(true);
      const res = await deleteStaffProfile(staff.id); // Passing composite ID

      if (res.success) {
        toast.success("Staff profile deleted successfully");
        router.push('/hq/dashboard/manager/staff');
      } else {
        throw new Error(res.error);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to delete staff profile");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleVacateProfile = async () => {
    try {
      setIsVacating(true);
      if (!staff) return;

      // 1. Update the departing staff member's record in Firestore
      // Keep their name and other details exactly as-is but change status to resigned/terminated and isActive = false
      const res = await updateStaffProfile(staff.id, {
        isActive: false,
        status: vacateReason, // 'resigned' or 'terminated'
        updatedAt: serverTimestamp()
      });

      if (!res.success) throw new Error(res.error);

      // 2. Create the NEW replacement vacant profile document
      // Clone configuration fields: dept, designation, dutyConfig, dressCodeConfig, monthlySalary, shift times
      const newStaffDocRef = await addDoc(collection(db, getDeptCollection(staff.dept)), {
        name: "Vacant",
        displayName: "Vacant",
        email: "",
        phone: "",
        phoneNumber: "",
        cnic: "",
        address: "",
        photoUrl: "",
        photoURL: "",
        fatherName: "",
        joiningDate: "",
        isActive: false,
        status: "active_vacancy",
        dept: staff.dept,
        role: staff.role || "staff",
        designation: staff.designation || "",
        dutyConfig: staff.dutyConfig || [],
        dressCodeConfig: staff.dressCodeConfig || [],
        monthlySalary: staff.monthlySalary || 0,
        dutyStartTime: staff.dutyStartTime || "09:00",
        dutyEndTime: staff.dutyEndTime || "17:00",
        visibleSections: staff.visibleSections || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const newCompositeId = `${staff.dept}_${newStaffDocRef.id}`;

      toast.success(`${staff.name} archived as ${vacateReason.toUpperCase()}. New vacant profile slot created!`);
      setShowVacateConfirm(false);

      // 3. Redirect the manager to the new vacant profile
      router.push(`/hq/dashboard/manager/staff/${newCompositeId}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to vacate profile slot");
    } finally {
      setIsVacating(false);
    }
  };

  if (loading || sessionLoading) return (
    <div className={`min-h-screen flex items-center justify-center bg-[#F8FAFC]`}>
      <Spinner showText={true} />
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 pb-20 bg-[#F8FAFC] text-gray-900`}>
      {/* Dynamic Header */}
      <div className={`border-b sticky top-0 z-20 shadow-sm transition-colors bg-white border-gray-100`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/hq/dashboard/manager/staff" className={`flex items-center gap-2 group transition-colors text-black hover:text-gray-900`}>
            <div className={`p-2 rounded-xl group-hover:bg-gray-100`}><ArrowLeft size={18} /></div>
            <span className="text-xs font-black uppercase tracking-widest leading-none">Directory</span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRecalculate}
              className={`p-2.5 rounded-xl transition-all shadow-sm bg-orange-50 text-orange-600 shadow-orange-100`}
              title="Recalculate Growth Points"
            >
              <Target size={18} />
            </button>
            <div className={`h-6 w-px bg-gray-100`} />
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-[1000] text-black uppercase tracking-widest leading-tight">Monthly Score</p>
              <p className="text-sm font-[1000] text-black">{computedScores.totalScore} / 100</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`rounded-[2.5rem] p-8 shadow-sm border flex flex-col items-center text-center relative overflow-hidden transition-colors ${'bg-white border-gray-100'
              }`}>
              <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-br ${theme.bg} opacity-100`} />

              <div className="relative mt-4 mb-6 group">
                {staff?.photoUrl ? (
                  <img src={staff.photoUrl} className="w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-transparent shadow-2xl" />
                ) : (
                  <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-4xl font-black ring-8 shadow-inner ${'bg-gray-100 text-black ring-white'
                    }`}>
                    {staff?.name?.[0]}
                  </div>
                )}
                <label className={`absolute bottom-0 right-0 p-3 rounded-2xl shadow-xl cursor-pointer hover:scale-110 transition-transform ${'bg-gray-900 text-white'
                  }`}>
                  <Camera size={18} />
                  <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/webp" />
                </label>
              </div>

              <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mt-1.5 leading-none">{staff?.designation || 'Position N/A'}</p>
              <h2 className={`text-2xl font-black text-gray-900 mt-1.5 mb-4`}>{staff?.name || 'Unknown Staff'}</h2>

              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${'bg-gray-50 border-gray-100 text-black'
                  }`}>
                  ID: {staff?.employeeId || '—'}
                </span>
                {staff?.seniority && (
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-indigo-500/10 text-indigo-500 border-indigo-500/20`}>
                    {staff.seniority}
                  </span>
                )}
                {staff?.role === 'admin' && (
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    👑 Admin
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${staff?.dept === 'rehab' ? 'bg-teal-500/10 text-teal-500 border-teal-500/20' : ('bg-gray-50 text-black')
                  }`}>
                  {staff?.dept || 'General'}
                </span>
              </div>

              <div className="w-full grid grid-cols-2 gap-4 mt-4">
                <div className={`rounded-2xl p-4 text-left bg-gray-50`}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Lifecycle Status</p>
                  <select 
                    className={`bg-transparent font-black text-xs uppercase outline-none border-none cursor-pointer w-full p-0 m-0 ${
                      staff?.status === 'active' ? 'text-teal-500' : 
                      staff?.status === 'active_vacancy' ? 'text-indigo-500' : 
                      staff?.status === 'resigned' ? 'text-amber-500' : 
                      staff?.status === 'terminated' ? 'text-rose-500' : 
                      'text-slate-900'
                    }`}
                    value={staff?.status || (staff?.isActive !== false ? 'active' : 'inactive')}
                    onChange={(e) => handleUpdateStatus(e.target.value as any)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="resigned">Resigned</option>
                    <option value="terminated">Terminated</option>
                    <option value="active_vacancy">Active Vacancy</option>
                  </select>
                </div>
                <div className={`rounded-2xl p-4 text-left bg-gray-50`}>
                  <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1">Base Salary</p>
                  <p className={`font-black text-xs text-gray-900`}>₨{Number(staff?.monthlySalary || 0).toLocaleString()}</p>
                </div>
              </div>

              <div 
                onClick={() => setShowSalaryBreakdownModal(true)}
                className={`w-full mt-4 rounded-2xl p-5 text-left border-2 transition-all hover:scale-[1.02] cursor-pointer ${theme.light} ${theme.border} ${theme.shadow}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-[10px] font-black ${theme.text} uppercase tracking-widest`}>Till Date Salary</p>
                  <span className={`px-2 py-0.5 rounded-md ${theme.accent} text-white text-[8px] font-black uppercase`}>{presentDaysCount} Present</span>
                </div>
                <p className={`text-2xl font-black ${theme.text} mb-3`}>₨{tillDateSalary.toLocaleString()}</p>
                
                <div className="border-t border-dashed border-gray-200 pt-2.5 mt-2.5 space-y-1.5 text-[10px] uppercase font-bold text-gray-700">
                  <div className="flex justify-between items-center">
                    <span>Daily Wage:</span>
                    <span className="font-black text-gray-900">₨{Math.round(salaryDetails.dailyWage).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Payable Days:</span>
                    <span className="font-black text-emerald-600">{salaryDetails.payableDays} Days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Deducted Days:</span>
                    <span className="font-black text-rose-500">{salaryDetails.unpaidDays} Days (-₨{Math.round(salaryDetails.absentDeduction).toLocaleString()})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Fines:</span>
                    <span className="font-black text-rose-500">-₨{salaryDetails.fines.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-[8px] text-gray-400 italic mt-3 text-center">Click for detailed daily salary breakdown & leaves</p>
              </div>

              <div className={`w-full mt-4 rounded-2xl p-4 text-left border bg-amber-50/50 border-amber-100`}>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className={`w-3 h-3 text-amber-500`} />
                  <p className="text-[10px] font-black text-black uppercase tracking-widest">Portal Credentials</p>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[9px] font-black text-black uppercase tracking-widest mb-0.5">Login Email / ID</p>
                    <p className={`font-mono text-xs font-bold text-indigo-600`}>{staff?.email || staff?.customId || 'No Email Registered'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-black uppercase tracking-widest mb-0.5">Password</p>
                    <div className="flex items-center gap-2">
                      <p className={`font-mono text-xs font-bold text-indigo-600`}>
                        {staff?.defaultPassword
                          ? (showDefaultPassword ? staff.defaultPassword : '••••••••')
                          : 'Custom (Reset Required)'}
                      </p>
                      {staff?.defaultPassword && (
                        <button
                          type="button"
                          onClick={() => setShowDefaultPassword(!showDefaultPassword)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                        >
                          {showDefaultPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReset(true)}
                    className="w-full mt-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 border border-amber-600/30"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {staff?.defaultPassword ? 'Reset Password' : 'Set Password'}
                  </button>
                  {staff && staff.role !== 'admin' && (
                    <button
                      onClick={handlePromoteToAdmin}
                      disabled={saving}
                      className="w-full mt-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 border border-indigo-700/30 disabled:opacity-50"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Promote to Admin
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Score Card */}
            <ScoreCard
              staffName={staff?.name || 'Staff'}
              month={selectedMonth}
              scores={computedScores}
              darkMode={isDark}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-6">


            {/* Tabs */}
            <div className={`p-1 rounded-[1.2rem] md:rounded-[1.5rem] border flex flex-wrap items-center justify-center gap-1 transition-colors ${'bg-white border-gray-100'
              }`}>
              {[
                { id: 'profile', label: 'View Profile', icon: <User size={12} /> },
                { id: 'edit', label: 'Edit Profile', icon: <Lock size={12} /> },
                { id: 'action', label: 'Action & Logs', icon: <Activity size={12} />, visibilityKey: 'reports' },
                { id: 'tasks', label: 'Special Tasks', icon: <Target size={12} /> },
                { id: 'attendance', label: 'Attendance', icon: <Calendar size={12} />, visibilityKey: 'attendance' },
                { id: 'payroll', label: 'Finance', icon: <DollarSign size={12} />, visibilityKey: 'salary' },
                { id: 'dress', label: 'Dress Code', icon: <Shield size={12} />, visibilityKey: 'uniform' },
                { id: 'duties', label: 'Duty Logs', icon: <ClipboardList size={12} />, visibilityKey: 'duties' },
                { id: 'score', label: 'Score Analysis', icon: <TrendingUp size={12} />, visibilityKey: 'growthPoints' },
                ...(staffId === 'hospital_5mHY2l3o6NhGDji4CysY' || staffId?.includes('5mHY2l3o6NhGDji4CysY') ? [{ id: 'leads', label: 'Leads CRM', icon: <ClipboardList size={12} /> }] : []),
              ].map(tab => {
                const isHidden = (tab as any).visibilityKey && staff?.visibleSections && (staff.visibleSections as any)[(tab as any).visibilityKey] === false;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                    }}
                    className={`flex items-center gap-2 px-4 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                      ? `${theme.accent} text-white shadow-lg ${theme.shadow}`
                      : 'text-black hover:bg-black/5'
                      }`}
                  >
                    {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                    {isHidden && <span className="text-[10px] font-bold" title="Hidden from Staff Self-View">🔒</span>}
                  </button>
                );
              })}
            </div>

            {/* Panels */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {session && (session.role === 'manager' || session.role === 'superadmin') && (
                  <VisibilityManager
                    entityType="staff"
                    entityId={staffId}
                    department={staff?.dept || 'hq'}
                    currentSections={staff?.visibleSections || {}}
                    onSave={async (updated) => {
                      await saveVisibleSections(staff?.dept || 'hq', 'staff', staffId, updated);
                      setStaff(prev => prev ? { ...prev, visibleSections: updated } : null);
                    }}
                  />
                )}

                <div className={`rounded-[2.5rem] p-10 border transition-all bg-white border-gray-100 shadow-sm relative overflow-hidden`}>
                  <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${theme.bg} blur-3xl opacity-20 -mr-32 -mt-32`} />
                  
                  <div className="flex items-center justify-between mb-10 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl ${theme.light} flex items-center justify-center ${theme.text}`}>
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Staff Information Card</h3>
                        <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>Public profile details</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShowReport(true)} className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
                        <FileText size={14} /> Generate Report
                      </button>
                      <button onClick={() => setActiveTab('edit')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-gray-100 text-gray-900 hover:bg-gray-200`}>
                        Request Update
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                    <div>
                      <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Full Identity Name</p>
                      <p className="text-sm font-black">{staff?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Guardian / Father</p>
                      <p className="text-sm font-black">{staff?.fatherName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Professional Designation</p>
                      <p className="text-sm font-black">{staff?.designation || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Primary Department</p>
                      <p className={`text-sm font-black uppercase ${theme.text}`}>{staff?.dept || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Contact Phone</p>
                      <p className="text-sm font-black">{staff?.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Gender Identification</p>
                      <p className="text-sm font-black capitalize">{staff?.gender || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Blood Group</p>
                      <p className="text-sm font-black uppercase">{staff?.bloodGroup || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Joining Date</p>
                      <p className="text-sm font-black uppercase">{formatDateDMY(staff?.joiningDate)}</p>
                    </div>
                    {staff?.seniority && (
                      <div>
                        <p className={`text-[9px] font-black ${theme.text} opacity-60 uppercase tracking-widest mb-1`}>Staff Seniority Level</p>
                        <p className={`text-sm font-black uppercase ${theme.text}`}>{staff.seniority}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Employee ID</p>
                      <p className="text-sm font-black font-mono">{staff?.employeeId || '—'}</p>
                    </div>
                    {staff?.address && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-1">Residential Address</p>
                        <p className="text-sm font-black">{staff.address}</p>
                      </div>
                    )}
                  </div>

                  <div className={`mt-10 p-8 rounded-3xl border border-dashed flex flex-col md:flex-row items-center justify-between gap-6 ${theme.light} ${theme.border}`}>
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl ${theme.accent} text-white flex items-center justify-center shadow-lg ${theme.shadow}`}>
                        <Clock size={28} />
                      </div>
                      <div>
                        <p className={`text-[10px] font-black ${theme.text} uppercase tracking-widest`}>Calculated Shift Duration</p>
                        <h4 className={`text-2xl font-[1000] tracking-tighter ${theme.text}`}>
                          {calculateDutyHours(staff?.dutyStartTime || '09:00', staff?.dutyEndTime || '17:00').text}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-black uppercase tracking-widest mb-1">Duty In</p>
                        <p className="text-sm font-black">{staff?.dutyStartTime || '09:00'}</p>
                      </div>
                      <div className="w-px h-8 bg-emerald-500/20" />
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-black uppercase tracking-widest mb-1">Duty Out</p>
                        <p className="text-sm font-black">{staff?.dutyEndTime || '17:00'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-8 rounded-[2.5rem] border bg-white border-gray-100 shadow-sm`}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-6 flex items-center gap-2">
                      <Shield size={14} className="text-indigo-500" /> Active Dress Code
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {staff?.dressCodeConfig?.length ? staff.dressCodeConfig.map(i => (
                        <span key={i.key} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border bg-gray-50 border-gray-100`}>{i.label}</span>
                      )) : <p className="text-xs text-black italic">No configuration found</p>}
                    </div>
                  </div>
                  <div className={`p-8 rounded-[2.5rem] border bg-white border-gray-100 shadow-sm`}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-6 flex items-center gap-2">
                      <ClipboardList size={14} className="text-teal-500" /> Operational Duties
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {staff?.dutyConfig?.length ? staff.dutyConfig.map(i => (
                        <div key={i.key} className={`group flex items-center gap-2 px-4 py-2 rounded-xl border transition-all bg-gray-50 border-gray-100`}>
                          <span className="text-[9px] font-black uppercase tracking-widest">{i.label}</span>
                          <button 
                            onClick={() => handleDeleteConfig('duty', i.key)}
                            className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )) : <p className="text-xs text-black italic">No configuration found</p>}
                    </div>
                  </div>
                </div>

                {/* Education & Experience */}
                {(((staff?.education?.length ?? 0) > 0) || ((staff?.experience?.length ?? 0) > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {((staff?.education?.length ?? 0) > 0) && (
                      <div className="p-8 rounded-[2.5rem] border bg-white border-gray-100 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-6 flex items-center gap-2">
                          <Award size={14} className="text-indigo-500" /> Education
                        </h4>
                        <div className="space-y-4">
                          {staff?.education?.map((edu: any, idx: number) => (
                            <div key={idx} className="flex flex-col gap-0.5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <p className="text-sm font-black text-gray-900">{edu.degree || '—'}</p>
                              <p className="text-xs font-bold text-gray-500">{edu.institution || '—'}</p>
                              {edu.year && <p className="text-[10px] font-bold text-gray-400 uppercase">{edu.year}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {((staff?.experience?.length ?? 0) > 0) && (
                      <div className="p-8 rounded-[2.5rem] border bg-white border-gray-100 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-6 flex items-center gap-2">
                          <Briefcase size={14} className="text-teal-500" /> Work Experience
                        </h4>
                        <div className="space-y-4">
                          {staff?.experience?.map((exp: any, idx: number) => (
                            <div key={idx} className="flex flex-col gap-0.5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <p className="text-sm font-black text-gray-900">{exp.title || '—'}</p>
                              <p className="text-xs font-bold text-gray-500">{exp.company || '—'}</p>
                              {exp.duration && <p className="text-[10px] font-bold text-gray-400 uppercase">{exp.duration}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}


              </div>
            )}

            {activeTab === 'action' && (

              <div className="space-y-6 animate-in fade-in duration-500">
                {/* 1. Matrix View */}
                <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-colors bg-white border-gray-100`}>
                  <div className="flex flex-col sm:flex-row justify-between mb-8">
                    <div>
                      <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 text-gray-900`}>
                        <Activity className={theme.text} /> Operational Health Check
                      </h3>
                      <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">Audit attendance, duty, and compliance patterns</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-4 scrollbar-none">
                    {monthDays.map((day: Date) => {
                      const dateStr = day.toISOString().split('T')[0];
                      const isToday = dateStr === todayStr;
                      const isSelected = dateStr === selectedDate;
                      const att = attendanceMap[dateStr];
                      const duty = dutyMap[dateStr];
                      const contribs = growthHistory.filter(h => h.date === dateStr);

                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`min-w-[80px] p-4 rounded-3xl border-2 transition-all group flex flex-col items-center gap-3 ${isSelected
                            ? `${theme.accent} border-black shadow-2xl scale-105`
                            : (isToday ? `${theme.light} ${theme.border}` : 'bg-white border-black/5 hover:border-black/20')
                            }`}
                        >
                          <div className="text-center">
                            <p className={`text-[8px] font-black uppercase tracking-tighter ${isSelected ? 'text-white/40' : 'text-black/30'}`}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                            <p className={`text-sm font-black ${isSelected ? 'text-white' : 'text-black'}`}>{day.getDate()}</p>
                          </div>
                          <div className="flex flex-col gap-1 w-full px-1">
                            {/* Attendance */}
                            <div className={`h-1 rounded-full w-full ${att?.status === 'present' ? 'bg-emerald-400' : att?.status === 'late' ? 'bg-amber-400' : att?.status === 'absent' ? 'bg-rose-400' : 'bg-black/5'}`} />
                            {/* Duty */}
                            <div className={`h-1 rounded-full w-full ${duty?.duties?.some(d => d.status === 'done') ? 'bg-teal-400' : 'bg-black/5'}`} />
                            {/* Contribution */}
                            <div className={`h-1 rounded-full w-full ${contribs.length > 0 ? 'bg-indigo-400' : 'bg-black/5'}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Dress Code Section */}
                    <div>
                      <h4 className="text-[10px] font-black text-black uppercase tracking-widest mb-3">Uniform Items</h4>
                      <div className="space-y-2">
                        {(staff?.dressCodeConfig?.length ? staff.dressCodeConfig : [
                          { key: 'pant', label: 'Dress Pant' },
                          { key: 'shirt', label: 'Uniform Shirt' },
                          { key: 'shoes', label: 'Black Shoes' },
                          { key: 'id_card', label: 'ID Card' }
                        ]).map((dress: any) => {
                          const dayRecord = dressMap[todayStr];
                          const status = dayRecord?.items?.find((i: any) => i.key === dress.key)?.status || 'na';
                          return (
                            <div key={dress.key} className="flex items-center justify-between">
                              <span className={`text-xs font-bold text-black`}>{dress.label}</span>
                              <HqCheckCell type="dresscode" size="md" value={status} onToggle={(next) => toggleDress(todayStr, dress.key, next)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Duties Section */}
                    <div>
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Punctuality Score</h4>
                      <div className="flex flex-wrap gap-2 mb-8">
                        <button
                          onClick={() => handleAttendanceCell(todayStr)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${attendanceMap[todayStr]?.arrivalTime ? `${theme.accent} text-white shadow-lg ${theme.shadow}` : (isDark ? "bg-zinc-800 text-black" : "bg-gray-100 text-black")}`}
                        >
                          <Clock size={12} />
                          {attendanceMap[todayStr]?.arrivalTime || "Set Arrival"}
                        </button>
                        <button
                          onClick={() => handleAttendanceCell(todayStr)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${attendanceMap[todayStr]?.departureTime ? "bg-rose-600 text-white shadow-sm shadow-rose-500/20" : (isDark ? "bg-zinc-800 text-black" : "bg-gray-100 text-black")}`}
                        >
                          <Clock size={12} />
                          {attendanceMap[todayStr]?.departureTime || "Set Departure"}
                        </button>
                      </div>

                      <h4 className="text-[10px] font-black text-black uppercase tracking-widest mb-3">Operational Duties</h4>
                      <div className="space-y-2">
                        {(staff?.dutyConfig?.length ? staff.dutyConfig : GLOBAL_DUTIES.slice(0, 4).map(d => ({ key: d.toLowerCase().replace(/\s+/g, '_'), label: d }))).map((duty: any) => {
                          const dayRecord = dutyMap[todayStr];
                          const status = dayRecord?.duties?.find((i: any) => i.key === duty.key)?.status || 'na';
                          return (
                            <div key={duty.key} className="flex items-center justify-between">
                              <span className={`text-xs font-bold text-black`}>{duty.label}</span>
                              <HqCheckCell type="duty" size="md" value={status} onToggle={(next) => toggleDuty(todayStr, duty.key, next)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={`mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 border-gray-200`}>
                    <span className="text-[10px] font-black text-black uppercase tracking-widest">Attendance</span>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => toggleAttendance(todayStr, 'present')}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-[1000] uppercase tracking-widest transition-all shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 ${attendanceMap[todayStr]?.status === 'present' ? 'bg-emerald-400 text-black' : 'bg-white text-black opacity-40 hover:opacity-100'}`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => {
                          toggleAttendance(todayStr, 'late');
                          handleAttendanceCell(todayStr);
                        }}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-[1000] uppercase tracking-widest transition-all shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 ${attendanceMap[todayStr]?.status === 'late' ? 'bg-amber-400 text-black' : 'bg-white text-black opacity-40 hover:opacity-100'}`}
                      >
                        Late Entry
                      </button>
                      <button
                        onClick={() => toggleAttendance(todayStr, 'absent')}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-[1000] uppercase tracking-widest transition-all shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 ${attendanceMap[todayStr]?.status === 'absent' ? 'bg-rose-400 text-black' : 'bg-white text-black opacity-40 hover:opacity-100'}`}
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => toggleAttendance(todayStr, 'leave')}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-[1000] uppercase tracking-widest transition-all shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 ${attendanceMap[todayStr]?.status === 'leave' || attendanceMap[todayStr]?.status === 'paid_leave' || attendanceMap[todayStr]?.status === 'unpaid_leave' ? 'bg-blue-400 text-black' : 'bg-white text-black opacity-40 hover:opacity-100'}`}
                      >
                        Leave
                      </button>
                    </div>
                  </div>

                {/* Mark Duty Module */}
                <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-colors ${'bg-white border-gray-100'
                  }`}>
                  <h3 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-gray-900`}>
                    <Award className="text-indigo-500" /> Assess Daily Duty
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1 mb-1 block">Duty Type</label>
                        <select
                          className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ${'bg-gray-50 text-gray-900'
                            }`}
                          value={dutyForm.type}
                          onChange={e => setDutyForm({ ...dutyForm, type: e.target.value })}
                        >
                          <option value="morning_shift">Morning Shift</option>
                          <option value="evening_shift">Evening Shift</option>
                          <option value="night_shift">Night Shift</option>
                          <option value="special_duty">Special Duty</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDutyForm({ ...dutyForm, status: 'completed' })}
                          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${dutyForm.status === 'completed'
                            ? 'bg-teal-500 border-teal-500 text-white shadow-lg'
                            : ('bg-white border-gray-100 text-black')
                            }`}
                        >Completed</button>
                        <button
                          onClick={() => setDutyForm({ ...dutyForm, status: 'not_completed' })}
                          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${dutyForm.status === 'not_completed'
                            ? 'bg-rose-500 border-rose-500 text-white shadow-lg'
                            : ('bg-white border-gray-100 text-black')
                            }`}
                        >Fine</button>
                      </div>

                      {dutyForm.status === 'not_completed' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <div>
                            <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1 mb-1 block">Fine Amount (PKR)</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none bg-rose-50 text-rose-900 placeholder:text-rose-300`}
                              value={dutyForm.fineAmount}
                              onChange={e => setDutyForm({ ...dutyForm, fineAmount: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1 mb-1 block">Reason for Fine</label>
                            <input
                              type="text"
                              placeholder="Late arrival / Misbehavior / etc."
                              className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none bg-rose-50 text-rose-900 placeholder:text-rose-300`}
                              value={dutyForm.fineReason}
                              onChange={e => setDutyForm({ ...dutyForm, fineReason: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <textarea
                        placeholder="Operational performance notes..."
                        className={`w-full border-none rounded-2xl px-4 py-4 text-sm font-medium outline-none h-full min-h-[120px] md:min-h-[100px] ${'bg-gray-50 text-gray-900'
                          }`}
                        value={dutyForm.comment}
                        onChange={e => setDutyForm({ ...dutyForm, comment: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleMarkDuty}
                    disabled={markingDuty}
                    className={`w-full py-4 mt-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all ${'bg-gray-900 text-white hover:bg-black'
                      }`}
                  >
                    {markingDuty ? 'Recording...' : 'Finalize Assessment'}
                  </button>
                </div>

                {/* Professional Meeting Scheduler */}
                <div className={`rounded-[2.5rem] p-10 border transition-all bg-white border-gray-100 shadow-xl shadow-black/5 animate-in slide-in-from-bottom-4 duration-700`}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-3xl bg-black text-white flex items-center justify-center shadow-2xl">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-[1000] uppercase tracking-tight">Schedule Professional Meeting</h3>
                      <p className="text-[10px] font-black text-black opacity-40 uppercase tracking-[0.2em]">Notify staff member of formal discussions</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="md:col-span-2 lg:col-span-1">
                      <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Meeting Title</label>
                      <input 
                        type="text" 
                        placeholder="Performance Review / Policy Update"
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-black`}
                        value={meetingForm.title}
                        onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Date</label>
                      <input 
                        type="date" 
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 transition-all bg-gray-50 border-gray-100 text-gray-900 focus:border-black`}
                        value={meetingForm.date}
                        onChange={e => setMeetingForm({ ...meetingForm, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Time</label>
                      <input 
                        type="time" 
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 transition-all bg-gray-50 border-gray-100 text-gray-900 focus:border-black`}
                        value={meetingForm.time}
                        onChange={e => setMeetingForm({ ...meetingForm, time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Location</label>
                    <input 
                      type="text" 
                      placeholder="Conference Room / Manager Office"
                      className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 transition-all bg-gray-50 border-gray-100 text-gray-900 focus:border-black`}
                      value={meetingForm.location}
                      onChange={e => setMeetingForm({ ...meetingForm, location: e.target.value })}
                    />
                  </div>

                  <button
                    onClick={handleScheduleMeeting}
                    disabled={schedulingMeeting || !meetingForm.title || !meetingForm.date}
                    className="w-full h-16 mt-8 rounded-3xl bg-black text-white text-[11px] font-[1000] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-black/20 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {schedulingMeeting ? 'Synchronizing...' : (
                      <>
                        <Shield size={18} />
                        Schedule & Notify Staff
                      </>
                    )}
                  </button>
                </div>

                {/* Duty Logs (Audit) moved to Action tab */}
                {dutyLogs.length === 0 ? <div className="p-20 text-center text-black font-bold uppercase tracking-widest text-[10px]">No history found</div> : (
                  dutyLogs.map(log => (
                    <div key={log.id} className={`p-6 rounded-[2.5rem] shadow-sm border flex items-start gap-4 transition-all hover:scale-[1.01] ${'bg-white border-gray-100 hover:border-indigo-200'
                      }`}>
                      <div className={`p-3 rounded-2xl ${log.status === 'completed' ? 'bg-teal-500/10 text-teal-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        <Award size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-black capitalize text-sm text-gray-900`}>{log.dutyType?.replace(/_/g, ' ')}</h4>
                            <p className="text-[10px] text-black font-bold uppercase tracking-widest mt-0.5">{formatStaffDate(log.date || log.createdAt)}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.status === 'completed' ? 'bg-teal-500/20 text-teal-500' : 'bg-rose-500/20 text-rose-500'
                            }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className={`text-sm mt-3 italic leading-relaxed text-black`}>{log.comment || 'No assessment recorded'}</p>
                      </div>
                    </div>
                  ))
                )}


              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Special Tasks */}
                <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-colors ${'bg-white border-gray-100'
                  }`}>
                  <div className="flex flex-col sm:flex-row justify-between mb-8">
                    <div>
                      <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 text-gray-900`}>
                        <Target className="text-purple-500" /> Administrative Task Matrix
                      </h3>
                      <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">Assign one-off operational missions</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <input
                      type="text"
                      className={`flex-1 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ${'bg-gray-50 text-gray-900'
                        }`}
                      placeholder="Describe the temporary task..."
                      value={newTaskText}
                      onChange={e => setNewTaskText(e.target.value)}
                    />
                    <select
                      className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none border-none bg-gray-50 text-purple-600`}
                      value={newTaskRecurrence}
                      onChange={e => setNewTaskRecurrence(e.target.value as any)}
                    >
                      <option value="once">Once</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom_days">Custom Days</option>
                    </select>
                    {newTaskRecurrence === 'custom_days' && (
                      <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                        <input
                          type="number"
                          className={`w-20 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none bg-gray-50 text-gray-900`}
                          value={newTaskIntervalDays}
                          onChange={e => setNewTaskIntervalDays(Number(e.target.value))}
                          min={1}
                        />
                        <span className="text-[10px] font-black uppercase text-black">Days</span>
                      </div>
                    )}
                    <button
                      onClick={handleCreateSpecialTask}
                      disabled={creatingTask || !newTaskText.trim()}
                      className="px-6 py-3 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all disabled:opacity-50"
                    >
                      Assign Task
                    </button>
                  </div>

                  <div className="space-y-3">
                    {specialTasks.length === 0 ? (
                      <div className="py-6 text-center text-black font-bold uppercase tracking-widest text-[10px]">No active tasks</div>
                    ) : (
                      specialTasks.map(task => (
                        <div key={task.id} className={`p-4 rounded-2xl border flex items-center justify-between ${task.status === 'completed' ? ('bg-emerald-50 border-emerald-100') :
                          'bg-gray-50 border-gray-100'
                          }`}>
                          <div>
                            <p className={`text-sm font-black text-gray-900`}>{task.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-black font-bold uppercase tracking-widest">By {task.assignedByName}</p>
                              {(task as any).category === 'meeting' && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-tighter border border-amber-500/20">
                                  Meeting
                                </span>
                              )}
                              {task.recurrence && task.recurrence !== 'once' && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-500 text-[8px] font-black uppercase tracking-tighter border border-purple-500/20">
                                  {task.recurrence}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-600' :
                              task.status === 'acknowledged' ? 'bg-blue-500/20 text-blue-600' : 'bg-amber-500/20 text-amber-600'
                              }`}>
                              {task.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Schedule Meeting Section */}
                <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-colors bg-white border-gray-100`}>
                  <div className="mb-8">
                    <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 text-gray-900`}>
                      <Calendar className="text-amber-500" /> Schedule Professional Meeting
                    </h3>
                    <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">Notify staff member of formal discussions</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1 mb-1 block">Meeting Title</label>
                      <input
                        type="text"
                        placeholder="Performance Review / Policy Update"
                        className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none bg-gray-50 text-gray-900`}
                        value={meetingForm.title}
                        onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1 mb-1 block">Date</label>
                        <input
                          type="date"
                          className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none bg-gray-50 text-gray-900`}
                          value={meetingForm.date}
                          onChange={e => setMeetingForm({ ...meetingForm, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1 mb-1 block">Time</label>
                        <input
                          type="time"
                          className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none bg-gray-50 text-gray-900`}
                          value={meetingForm.time}
                          onChange={e => setMeetingForm({ ...meetingForm, time: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1 mb-1 block">Location</label>
                    <input
                      type="text"
                      placeholder="Conference Room / Online / Staff Desk"
                      className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none bg-gray-50 text-gray-900`}
                      value={meetingForm.location}
                      onChange={e => setMeetingForm({ ...meetingForm, location: e.target.value })}
                    />
                  </div>

                  <button
                    onClick={handleScheduleMeeting}
                    disabled={schedulingMeeting || !meetingForm.title}
                    className="w-full py-4 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
                  >
                    {schedulingMeeting ? 'Scheduling...' : 'Schedule & Notify Staff'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all bg-white border-gray-100`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Monthly Attendance Grid</h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black border-none outline-none bg-gray-100 text-gray-900`}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto no-scrollbar -mx-4 sm:-mx-8 px-4 sm:px-8">
                  <div className="inline-block min-w-[800px] w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-inherit pr-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-black whitespace-nowrap">Day of Month</th>
                          {daysInMonth().map(d => (
                            <th key={d} className="px-1 py-4 text-center min-w-[40px]">
                              <span className="text-[10px] font-black opacity-40">{d.split('-')[2]}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-zinc-800/10">
                          <td className="sticky left-0 z-10 bg-inherit pr-8 py-6 text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest">Status</span>
                          </td>
                          {daysInMonth().map(d => (
                            <td key={d} className="px-1 py-6 text-center">
                              <HqCheckCell
                                type="attendance"
                                size="md"
                                value={attendanceMap[d]?.status || 'unmarked'}
                                onToggle={(next) => toggleAttendance(d, next)}
                              />
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-zinc-800/10 transition-colors hover:bg-zinc-500/5">
                          <td className="sticky left-0 z-10 bg-inherit pr-8 py-4 text-left">
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500/50">Shift In</span>
                          </td>
                          {daysInMonth().map(d => (
                            <td
                              key={d}
                              className="px-1 py-4 text-center"
                            >
                              <button
                                onClick={() => handleAttendanceCell(d)}
                                className={`px-2 py-1 rounded-md text-[10px] font-black transition-all hover:scale-105 ${attendanceMap[d]?.arrivalTime
                                  ? ('bg-indigo-50 text-indigo-600')
                                  : ('bg-gray-100 text-black')
                                  }`}
                              >
                                {attendanceMap[d]?.arrivalTime || 'Set'}
                              </button>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-zinc-500/5 transition-colors hover:bg-zinc-500/5">
                          <td className="sticky left-0 z-10 bg-inherit pr-8 py-2 text-left">
                            <span className="text-[8px] font-black uppercase tracking-widest text-teal-500/50">Arr On Time</span>
                          </td>
                          {daysInMonth().map(d => (
                            <td key={d} className="px-1 py-2 text-center group relative">
                              <div className="flex flex-col items-center gap-1">
                                <HqCheckCell
                                  type="dresscode"
                                  size="sm"
                                  value={
                                    (attendanceMap[d]?.status === 'present' || attendanceMap[d]?.status === 'late')
                                      ? (attendanceMap[d]?.arrivedOnTime ? 'yes' : attendanceMap[d]?.arrivedOnTime === false ? 'no' : 'na')
                                      : 'na'
                                  }
                                  onToggle={(next) => togglePunctuality(d, 'arrivedOnTime', next === 'yes')}
                                />
                                {attendanceMap[d]?.note && (
                                  <button
                                    onClick={() => setNotePopup({ isOpen: true, date: d, note: attendanceMap[d].note || '' })}
                                    className="text-[8px] text-amber-500 hover:text-amber-600 font-black uppercase transition-all"
                                  >
                                    Note
                                  </button>
                                )}
                                {attendanceMap[d]?.arrivedOnTime === false && !attendanceMap[d]?.note && (
                                  <button
                                    onClick={() => setNotePopup({ isOpen: true, date: d, note: '' })}
                                    className="opacity-0 group-hover:opacity-100 text-[8px] text-black hover:text-indigo-500 font-black uppercase transition-all"
                                  >
                                    +Note
                                  </button>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-zinc-800/10 transition-colors hover:bg-zinc-500/5">
                          <td className="sticky left-0 z-10 bg-inherit pr-8 py-4 text-left">
                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500/50">Shift Out</span>
                          </td>
                          {daysInMonth().map(d => (
                            <td
                              key={d}
                              className="px-1 py-4 text-center"
                            >
                              <button
                                onClick={() => handleAttendanceCell(d)}
                                className={`px-2 py-1 rounded-md text-[10px] font-black transition-all hover:scale-105 ${attendanceMap[d]?.departureTime
                                  ? ('bg-rose-50 text-rose-600')
                                  : ('bg-gray-100 text-black')
                                  }`}
                              >
                                {attendanceMap[d]?.departureTime || 'Set'}
                              </button>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-zinc-500/5 transition-colors hover:bg-zinc-500/5">
                          <td className="sticky left-0 z-10 bg-inherit pr-8 py-2 text-left">
                            <span className="text-[8px] font-black uppercase tracking-widest text-rose-500/50">Dep On Time</span>
                          </td>
                          {daysInMonth().map(d => (
                            <td key={d} className="px-1 py-2 text-center text-center">
                              <HqCheckCell
                                type="dresscode"
                                size="sm"
                                value={
                                  (attendanceMap[d]?.status === 'present' || attendanceMap[d]?.status === 'late')
                                    ? (attendanceMap[d]?.departedOnTime ? 'yes' : attendanceMap[d]?.departedOnTime === false ? 'no' : 'na')
                                    : 'na'
                                }
                                onToggle={(next) => togglePunctuality(d, 'departedOnTime', next === 'yes')}
                              />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dress' && (
              <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all bg-white border-gray-100`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Dress Code Compliance</h3>
                  <p className="text-[10px] font-black text-black uppercase tracking-widest">Monthly Item Grids</p>
                </div>

                <div className="overflow-x-auto no-scrollbar -mx-4 sm:-mx-8 px-4 sm:px-8">
                  <div className="inline-block min-w-[800px] w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-inherit pr-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-black whitespace-nowrap">Uniform Items</th>
                          {daysInMonth().map(d => (
                            <th key={d} className="px-1 py-4 text-center min-w-[40px]">
                              <span className="text-[10px] font-black opacity-40">{d.split('-')[2]}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(staff?.dressCodeConfig?.length ? staff.dressCodeConfig : GLOBAL_DRESS_ITEMS.slice(0, 4).map(d => ({ key: d.toLowerCase().replace(/\s+/g, '_'), label: d }))).map((dress: { key: string; label: string }) => (
                          <tr key={dress.key} className="border-t border-zinc-800/10">
                            <td className="sticky left-0 z-10 bg-inherit pr-8 py-6 text-left">
                              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{dress.label}</span>
                            </td>
                            {daysInMonth().map(d => {
                              const dayRecord = dressMap[d];
                              const dressStatus = dayRecord?.items?.find(i => i.key === dress.key)?.status || 'na';
                              return (
                                <td key={d} className="px-1 py-6 text-center">
                                  <HqCheckCell
                                    type="dresscode"
                                    size="md"
                                    value={dressStatus as any}
                                    onToggle={(next) => toggleDress(d, dress.key, next)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'duties' && (
              <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all bg-white border-gray-100`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Daily Duty Logs</h3>
                  <p className="text-[10px] font-black text-black uppercase tracking-widest">Performance Tracking</p>
                </div>

                <div className="overflow-x-auto no-scrollbar -mx-4 sm:-mx-8 px-4 sm:px-8">
                  <div className="inline-block min-w-[800px] w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-inherit pr-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-black whitespace-nowrap">Assigned Duties</th>
                          {daysInMonth().map(d => (
                            <th key={d} className="px-1 py-4 text-center min-w-[40px]">
                              <span className="text-[10px] font-black opacity-40">{d.split('-')[2]}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(staff?.dutyConfig?.length ? staff.dutyConfig : GLOBAL_DUTIES.slice(0, 4).map(d => ({ key: d.toLowerCase().replace(/\s+/g, '_'), label: d }))).map((duty: { key: string; label: string }) => (
                          <tr key={duty.key} className="border-t border-zinc-800/10">
                            <td className="sticky left-0 z-10 bg-inherit pr-8 py-6 text-left">
                              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{duty.label}</span>
                            </td>
                            {daysInMonth().map(d => {
                              const dayRecord = dutyMap[d];
                              const dutyStatus = dayRecord?.duties?.find(i => i.key === duty.key)?.status || 'na';
                              return (
                                <td key={d} className="px-1 py-6 text-center">
                                  <HqCheckCell
                                    type="duty"
                                    size="md"
                                    value={dutyStatus as any}
                                    onToggle={(next) => toggleDuty(d, duty.key, next)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'edit' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header Section */}
                <div className={`rounded-[2.5rem] p-10 border transition-all bg-white border-gray-100 shadow-xl shadow-blue-900/5`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-3">
                        <User className="text-indigo-500" size={24} />
                        Profile Optimization
                      </h3>
                      <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1 ml-9">Surgical updates to staff credentials</p>
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                    >
                      {saving ? <Spinner size="sm" /> : <Save size={16} />}
                      {saving ? 'Synchronizing...' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                {/* Section 1: Work Identity */}
                <div className={`rounded-[2.5rem] p-10 border transition-all bg-white border-gray-100 shadow-sm`}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      <Lock size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest">Work Identity</h4>
                      <p className="text-[10px] font-bold text-black uppercase tracking-widest">Authentication & Internal ID</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                      <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Employee ID</label>
                      <input
                        type="text"
                        value={editForm.employeeId}
                        placeholder="KH-STAFF-001"
                        onChange={e => setEditForm({ ...editForm, employeeId: e.target.value })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                      />
                      <p className="text-[9px] text-black font-bold uppercase tracking-widest mt-2 ml-2">Visual ID for reporting</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-2 mb-2 block flex items-center gap-2">
                        <Shield size={10} /> Login ID / Portal ID
                      </label>
                      <input
                        type="text"
                        value={editForm.customId}
                        placeholder="spims-admin"
                        onChange={e => setEditForm({ ...editForm, customId: e.target.value })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-indigo-50 border-indigo-100 text-indigo-700 focus:border-indigo-500`}
                      />
                      <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-2 ml-2">Warning: Changes affect login</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-2 mb-2 block flex items-center gap-2">
                        <Lock size={10} /> Portal Password
                      </label>
                      <input
                        type="text"
                        value={editForm.defaultPassword || ''}
                        placeholder="Set or Reset Password"
                        onChange={e => setEditForm({ ...editForm, defaultPassword: e.target.value })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-indigo-50 border-indigo-100 text-indigo-700 focus:border-indigo-500`}
                      />
                      <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-2 ml-2">Set/Reset login password</p>
                    </div>


                    {/* Name & Father Name */}
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest px-1 text-indigo-600`}>Legal Name</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl border-2 text-sm font-black uppercase outline-none transition-all bg-white text-black`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest px-1 text-indigo-600`}>Father's Name</label>
                        <input
                          type="text"
                          value={editForm.fatherName}
                          onChange={e => setEditForm({ ...editForm, fatherName: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl border-2 text-sm font-black uppercase outline-none transition-all bg-white text-black`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                      <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Professional Designation</label>
                      <input
                        type="text"
                        value={editForm.designation}
                        placeholder="Senior Nurse / Manager"
                        onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Seniority Status</label>
                      <select
                        value={editForm.seniority}
                        onChange={e => setEditForm({ ...editForm, seniority: e.target.value })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-indigo-50 border-indigo-100 text-indigo-700 focus:border-indigo-500`}
                      >
                        <option value="">Select Seniority...</option>
                        <option value="fresher">Fresher</option>
                        <option value="junior">Junior</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="senior">Senior</option>
                        <option value="expert">Expert</option>
                        <option value="lead">Lead / Head</option>
                        <option value="managerial">Managerial</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                      <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Monthly Salary (PKR)</label>
                      <div className="relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-black">
                          <DollarSign size={16} />
                        </div>
                        <input
                          type="number"
                          value={editForm.monthlySalary}
                          onChange={e => setEditForm({ ...editForm, monthlySalary: Number(e.target.value) })}
                          placeholder="50000"
                          className={`w-full h-14 pl-14 pr-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Primary Department</label>
                      <select
                        value={editForm.department}
                        onChange={e => setEditForm({ ...editForm, department: e.target.value as StaffDept })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                      >
                        {['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'].map(d => (
                          <option key={d} value={d}>{d.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className={`p-4 rounded-2xl border border-dashed flex flex-col justify-center border-gray-200 bg-gray-50/50`}>
                      <label className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                        <ArrowLeft size={10} className="rotate-180" /> Secondary Depts
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare'].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              const current = editForm.secondaryDepts || [];
                              if (current.includes(d as StaffDept)) {
                                setEditForm({ ...editForm, secondaryDepts: current.filter(x => x !== d) });
                              } else {
                                setEditForm({ ...editForm, secondaryDepts: [...current, d as StaffDept] });
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-[7px] font-bold uppercase tracking-wider border transition-all ${editForm.secondaryDepts?.includes(d as StaffDept)
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : ('bg-white border-gray-200 text-black')
                              }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Personal Information */}
                <div className={`rounded-[2.5rem] p-10 border transition-all bg-white border-gray-100 shadow-sm`}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <User size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest">Personal Information</h4>
                      <p className="text-[10px] font-bold text-black uppercase tracking-widest">Biometric & Identity Details</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Row 1: DOB & Gender */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Date of Birth</label>
                        <input
                          type="date"
                          value={editForm.dob}
                          onChange={e => setEditForm({ ...editForm, dob: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Gender</label>
                        <select
                          value={editForm.gender}
                          onChange={e => setEditForm({ ...editForm, gender: e.target.value as any })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 2: CNIC / Passport & Joining Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">CNIC / Passport</label>
                        <input
                          type="text"
                          placeholder="00000-0000000-0"
                          value={editForm.cnic}
                          onChange={e => setEditForm({ ...editForm, cnic: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Joining Date</label>
                        <input
                          type="date"
                          value={editForm.joiningDate}
                          onChange={e => setEditForm({ ...editForm, joiningDate: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                        />
                      </div>
                    </div>

                    {/* Row 3: Blood Group & Emergency Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Blood Group</label>
                        <input
                          type="text"
                          placeholder="B+"
                          value={editForm.bloodGroup}
                          onChange={e => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Contact Person</label>
                          <input
                            type="text"
                            placeholder="Name"
                            value={editForm.emergencyContactName}
                            onChange={e => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                            className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-orange-50/30 border-orange-100 text-gray-900 focus:border-orange-500`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Emergency Phone</label>
                          <input
                            type="text"
                            placeholder="03xx-xxxxxxx"
                            value={editForm.emergencyPhone}
                            onChange={e => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                            className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-orange-50/30 border-orange-100 text-gray-900 focus:border-orange-500`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Phone & Address */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Phone Number</label>
                        <input
                          type="text"
                          placeholder="03xx-xxxxxxx"
                          value={editForm.phone}
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Residential Address</label>
                        <input
                          type="text"
                          placeholder="Street, City, Province"
                          value={editForm.address}
                          onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Operations & Extensions */}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Custom Basic Info */}
                  <div className={`rounded-[2.5rem] p-10 border transition-all bg-white border-gray-100 shadow-sm`}>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Plus size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest">Custom Basic Info</h4>
                        <p className="text-[10px] font-bold text-black uppercase tracking-widest">Extra Fields & Metadata</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-8 min-h-[100px]">
                      {Object.entries(editForm.basicInfoExtras || {}).map(([key, val]) => (
                        <div key={key} className="flex gap-2 group animate-in slide-in-from-left-2 duration-300">
                          <div className={`flex-1 p-4 rounded-2xl text-[10px] font-bold border transition-all flex flex-wrap gap-x-2 items-center bg-gray-50 border-gray-100 text-black`}>
                            <span className="text-black font-extrabold uppercase whitespace-nowrap">{key.replace(/_/g, ' ')}:</span>
                            <span className="break-all">{val}</span>
                          </div>
                          <button
                            onClick={() => {
                              const next = { ...editForm.basicInfoExtras };
                              delete next[key];
                              setEditForm({ ...editForm, basicInfoExtras: next });
                            }}
                            className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {Object.keys(editForm.basicInfoExtras || {}).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-6 text-black">
                          <AlertCircle size={32} className="opacity-20 mb-2" />
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">No custom data strings</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-dashed border-gray-200">
                      <input
                        placeholder="Label"
                        className={`flex-1 min-w-0 h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500`}
                        value={newExtraField.key}
                        onChange={e => setNewExtraField({ ...newExtraField, key: e.target.value })}
                      />
                      <input
                        placeholder="Value"
                        className={`flex-1 min-w-0 h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500`}
                        value={newExtraField.value}
                        onChange={e => setNewExtraField({ ...newExtraField, value: e.target.value })}
                      />
                      <button
                        onClick={() => {
                          if (!newExtraField.key || !newExtraField.value) return;
                          setEditForm({
                            ...editForm,
                            basicInfoExtras: { ...editForm.basicInfoExtras, [newExtraField.key.toLowerCase().replace(/\s+/g, '_')]: newExtraField.value }
                          });
                          setNewExtraField({ key: '', value: '' });
                        }}
                        className="h-14 px-8 rounded-2xl bg-amber-500 text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>



                  {/* Shift Timing */}
                  <div className={`rounded-[2.5rem] p-10 border transition-all bg-white border-gray-100 shadow-sm`}>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Clock size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest">Shift Timing</h4>
                        <p className="text-[10px] font-bold text-black uppercase tracking-widest">
                          Operational Hours —
                          <span className="text-emerald-500 ml-1">
                            {calculateDutyHours(editForm.dutyStartTime, editForm.dutyEndTime).text} total
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Duty Start</label>
                        <input
                          type="time"
                          value={editForm.dutyStartTime}
                          onChange={e => setEditForm({ ...editForm, dutyStartTime: e.target.value })}
                          className={`w-full h-16 px-6 rounded-[2rem] text-xl font-black outline-none border-4 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Duty End</label>
                        <input
                          type="time"
                          value={editForm.dutyEndTime}
                          onChange={e => setEditForm({ ...editForm, dutyEndTime: e.target.value })}
                          className={`w-full h-16 px-6 rounded-[2rem] text-xl font-black outline-none border-4 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Advanced Configuration */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Dress Code Config */}
                  <div className={`p-10 rounded-[2.5rem] border transition-all bg-gray-100/50 border-gray-200`}>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center">
                          <Shield size={20} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Dress Code</h4>
                      </div>
                      <button
                        onClick={() => setAddingConfig({ type: 'dress', mode: 'select' })}
                        className="p-3 rounded-2xl bg-indigo-500 text-white hover:scale-110 active:scale-90 transition-all shadow-lg shadow-indigo-500/20"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    {addingConfig?.type === 'dress' && (
                      <div className={`p-6 rounded-[2rem] border-2 mb-8 transition-all animate-in zoom-in-95 duration-200 bg-white border-indigo-200 shadow-xl shadow-indigo-500/10`}>
                        <div className="flex flex-col gap-4">
                          {addingConfig.mode === 'select' ? (
                            <select
                              className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500`}
                              value={addingConfigSelection}
                              onChange={e => {
                                if (e.target.value === '__custom__') setAddingConfig({ ...addingConfig, mode: 'custom' });
                                else setAddingConfigSelection(e.target.value);
                              }}
                            >
                              <option value="" disabled>Select a preset dress item...</option>
                              {availableDress
                                .filter(o => !editForm.dressCodeConfig.find(existing => existing.key === o.key))
                                .map(o => <option key={o.key} value={o.key}>{o.label}</option>)
                              }
                              <option value="__custom__">+ Create Custom Label...</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="Type a new global dress code item (e.g. Scarf)"
                              autoFocus
                              className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 focus:border-indigo-500 transition-all bg-gray-50 border-gray-200 text-gray-900`}
                              value={addingConfigCustom}
                              onChange={e => setAddingConfigCustom(e.target.value)}
                            />
                          )}
                          <div className="flex gap-3">
                            <button
                              onClick={handleAddConfig}
                              disabled={processingConfig || (addingConfig.mode === 'select' && !addingConfigSelection) || (addingConfig.mode === 'custom' && !addingConfigCustom.trim())}
                              className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                            >
                              {processingConfig ? 'Processing...' : 'Add to Profile'}
                            </button>
                            <button onClick={() => { setAddingConfig(null); setAddingConfigSelection(''); setAddingConfigCustom(''); }} className={`px-8 h-14 text-[10px] font-black uppercase tracking-widest border-2 rounded-2xl transition-all border-gray-200 text-black hover:bg-white`}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {editForm.dressCodeConfig.map((item, idx) => (
                        <div key={item.key} className={`flex items-center justify-between p-5 rounded-2xl border transition-all hover:scale-[1.02] bg-white border-gray-200`}>
                          <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                          <button
                            onClick={() => {
                              setEditForm(prev => ({
                                ...prev,
                                dressCodeConfig: prev.dressCodeConfig.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Duty Config */}
                  <div className={`p-10 rounded-[2.5rem] border transition-all bg-gray-100/50 border-gray-200`}>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white flex items-center justify-center">
                          <ClipboardList size={20} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500">Scheduled Duties</h4>
                      </div>
                      <button
                        onClick={() => setAddingConfig({ type: 'duty', mode: 'select' })}
                        className="p-3 rounded-2xl bg-teal-500 text-white hover:scale-110 active:scale-90 transition-all shadow-lg shadow-teal-500/20"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    {addingConfig?.type === 'duty' && (
                      <div className={`p-6 rounded-[2rem] border-2 mb-8 transition-all animate-in zoom-in-95 duration-200 bg-white border-teal-200 shadow-xl shadow-teal-500/10`}>
                        <div className="flex flex-col gap-4">
                          {addingConfig.mode === 'select' ? (
                            <select
                              className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-teal-500`}
                              value={addingConfigSelection}
                              onChange={e => {
                                if (e.target.value === '__custom__') setAddingConfig({ ...addingConfig, mode: 'custom' });
                                else setAddingConfigSelection(e.target.value);
                              }}
                            >
                              <option value="" disabled>Select a preset duty...</option>
                              {availableDuties
                                .filter(o => !editForm.dutyConfig.find(existing => existing.key === o.key))
                                .map(o => <option key={o.key} value={o.key}>{o.label}</option>)
                              }
                              <option value="__custom__">+ Create Custom Duty...</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="Type a new global duty (e.g. Night Shift Guard)"
                              autoFocus
                              className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 focus:border-teal-500 transition-all bg-gray-50 border-gray-200 text-gray-900`}
                              value={addingConfigCustom}
                              onChange={e => setAddingConfigCustom(e.target.value)}
                            />
                          )}
                          <div className="flex gap-3">
                            <button
                              onClick={handleAddConfig}
                              disabled={processingConfig || (addingConfig.mode === 'select' && !addingConfigSelection) || (addingConfig.mode === 'custom' && !addingConfigCustom.trim())}
                              className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest bg-teal-500 hover:bg-teal-600 text-white rounded-2xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
                            >
                              {processingConfig ? 'Processing...' : 'Add to Profile'}
                            </button>
                            <button onClick={() => { setAddingConfig(null); setAddingConfigSelection(''); setAddingConfigCustom(''); }} className={`px-8 h-14 text-[10px] font-black uppercase tracking-widest border-2 rounded-2xl transition-all border-gray-200 text-black hover:bg-white`}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {editForm.dutyConfig.map((item, idx) => (
                        <div key={item.key} className={`flex items-center justify-between p-5 rounded-2xl border transition-all hover:scale-[1.02] bg-white border-gray-200`}>
                          <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                          <button
                            onClick={() => {
                              setEditForm(prev => ({
                                ...prev,
                                dutyConfig: prev.dutyConfig.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Synchronization Info */}
                <div className="mt-12 flex items-center justify-between px-10">
                  <p className={`text-[10px] font-black uppercase tracking-widest text-black`}>
                    Last synchronized with global KhanHub registry
                  </p>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-10 py-5 rounded-3xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                  >
                    {saving ? 'Synchronizing...' : (
                      <>
                        <Shield size={16} />
                        Update Profile
                      </>
                    )}
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="mt-16 pt-12 border-t-2 border-dashed border-rose-500/20">
                  <div className={`p-8 rounded-[2.5rem] border transition-all bg-rose-50/50 border-rose-100/80`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-rose-200/50">
                      {/* Vacate Position Slot */}
                      <div className="flex flex-col justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 mt-1">
                            <UserMinus size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-amber-600 mb-1">Vacate Position</h4>
                            <p className="text-xs font-bold leading-relaxed text-slate-600">
                              Clear all personal details (Name, CNIC, Phone, Photo, Address) but keep the professional designation, Employee ID, salary, uniform/duty configurations and active slots.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowVacateConfirm(true)}
                          className="px-6 py-4 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all hover:scale-105 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 w-fit md:ml-16 mt-2"
                        >
                          <UserMinus size={16} />
                          Vacate Profile Slot
                        </button>
                      </div>

                      {/* Delete Profile */}
                      <div className="flex flex-col justify-between gap-4 pt-6 md:pt-0 md:pl-8">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0 mt-1">
                            <Trash2 size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-rose-500 mb-1">Permanent Deletion</h4>
                            <p className="text-xs font-bold leading-relaxed text-slate-600">
                              Permanently delete this staff profile and all associated data records. This action cannot be undone and will revoke all access immediately.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-6 py-4 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all hover:scale-105 shadow-xl shadow-rose-500/20 flex items-center justify-center gap-3 w-fit md:ml-16 mt-2"
                        >
                          <Trash2 size={16} />
                          Delete Staff Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deletion Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />
                <div className={`relative w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border bg-white border-gray-100`}>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
                      <Trash2 size={40} />
                    </div>
                    <h3 className={`text-2xl font-black mb-2 text-gray-900 uppercase tracking-tight`}>Confirm Deletion</h3>
                    <p className={`text-sm font-bold leading-relaxed mb-8 text-black`}>
                      Are you absolutely sure? This will permanently delete
                      <span className="mx-1 text-rose-500 font-black underline decoration-2 underline-offset-4">{staff?.name}</span>
                      from the system.
                    </p>

                    <div className="w-full space-y-4 mb-8">
                      <label className="text-[10px] font-black text-black uppercase tracking-widest block text-left ml-2">Type the staff name to confirm</label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={staff?.name}
                        className={`w-full h-16 rounded-2xl px-6 text-sm font-bold outline-none border-2 transition-all ${isDark
                          ? 'bg-zinc-800 border-zinc-700 text-white focus:border-rose-500'
                          : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-rose-500'
                          }`}
                      />
                    </div>

                    <div className="flex gap-4 w-full">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className={`flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${'border-gray-200 text-black hover:bg-white'
                          } disabled:opacity-50`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting || deleteConfirmText !== staff?.name}
                        className="flex-1 h-14 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 shadow-xl shadow-rose-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vacate Confirmation Modal */}
            {showVacateConfirm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isVacating && setShowVacateConfirm(false)} />
                <div className={`relative w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border bg-white border-gray-100`}>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-[2rem] bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
                      <UserMinus size={40} />
                    </div>
                    <h3 className={`text-2xl font-black mb-2 text-gray-900 uppercase tracking-tight`}>Vacate Position</h3>
                    <p className="text-sm font-bold leading-relaxed mb-6 text-slate-700">
                      Are you sure you want to vacate <span className="text-amber-600 font-black">{staff?.name}</span>'s position slot?
                    </p>

                    {/* Departure Reason Selector */}
                    <div className="w-full mb-6 text-left">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Reason for Departure:</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setVacateReason('resigned')}
                          className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            vacateReason === 'resigned'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/25'
                              : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100 hover:scale-[1.01]'
                          }`}
                        >
                          👋 Resigned
                        </button>
                        <button
                          type="button"
                          onClick={() => setVacateReason('terminated')}
                          className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            vacateReason === 'terminated'
                              ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/25'
                              : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100 hover:scale-[1.01]'
                          }`}
                        >
                          🚫 Terminated
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left mb-8 w-full">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Workflow Action Details:</p>
                      <ul className="text-xs font-semibold text-slate-700 space-y-1.5 list-disc pl-4 leading-normal">
                        <li>Archives <span className="font-bold text-slate-900">{staff?.name}</span>'s profile status as <span className={`font-bold ${vacateReason === 'resigned' ? 'text-amber-600' : 'text-rose-600'}`}>{vacateReason.toUpperCase()}</span>.</li>
                        <li>Historical attendance records, fines, and salary sheets remain <span className="font-bold text-emerald-600">safely archived</span> under their name.</li>
                        <li>Auto-creates a <span className="font-bold text-indigo-600">new replacement vacant position slot</span>.</li>
                        <li>Copies Designation, Department, Base Salary, Duty configs, and Uniform config to the replacement slot.</li>
                      </ul>
                    </div>

                    <div className="flex gap-4 w-full">
                      <button
                        type="button"
                        onClick={() => setShowVacateConfirm(false)}
                        disabled={isVacating}
                        className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-gray-200 text-black hover:bg-gray-50 transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleVacateProfile}
                        disabled={isVacating}
                        className="flex-1 h-14 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isVacating ? 'Vacating...' : 'Confirm Vacate'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payroll' && (
              <div className="space-y-6">
                <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all bg-white border-gray-100`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                        <DollarSign size={16} /> Financial Ledger
                      </h3>
                      <p className="text-[10px] font-black text-black uppercase tracking-widest">Personnel Economic Audit</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black border-none outline-none bg-gray-100 text-gray-900`}
                      />
                      <button
                        onClick={() => {
                          setPayrollForm({
                            month: selectedMonth || new Date().toISOString().slice(0, 7),
                            basicSalary: staff?.monthlySalary || 0,
                            presentDays: salaryDetails.payableDays,
                            leaveDays: salaryDetails.paidLeaves + salaryDetails.unpaidLeaves,
                            actionDays: salaryDetails.payableDays + salaryDetails.paidLeaves,
                            incentive: 0,
                            otherEarnings: 0,
                            otherEarningsReason: '',
                            fine: salaryDetails.fines,
                            advance: salaryDetails.advance || 0,
                            absentDeduction: Math.round(salaryDetails.absentDeduction),
                            otherDeductions: 0,
                            deductionReason: '',
                          });
                          setShowPayrollModal(!showPayrollModal);
                        }}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showPayrollModal ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : ('bg-amber-50 text-amber-600')}`}
                      >
                        {showPayrollModal ? 'Cancel' : 'Generate Slip'}
                      </button>
                      <button
                        onClick={() => {
                          setAdvanceForm({
                            amount: '',
                            date: new Date().toISOString().slice(0, 10),
                            description: '',
                            paymentMethod: 'cash',
                            referenceNo: ''
                          });
                          setShowAdvanceModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      >
                        Record Cashier Advance
                      </button>
                    </div>
                  </div>

                  {showPayrollModal && (
                    <div className={`p-6 rounded-3xl border mb-8 bg-amber-50/50 border-amber-100`}>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-4">Draft New Salary Record</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Month (YYYY-MM)</label>
                          <input type="month" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none bg-white text-gray-900`} value={payrollForm.month} onChange={e => setPayrollForm({ ...payrollForm, month: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Gross Salary (PKR)</label>
                          <input type="number" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none bg-white text-gray-900`} value={payrollForm.basicSalary} onChange={e => setPayrollForm({ ...payrollForm, basicSalary: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Present Days</label>
                          <input type="number" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none bg-white text-gray-900`} value={payrollForm.presentDays} onChange={e => setPayrollForm({ ...payrollForm, presentDays: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Leave Days</label>
                          <input type="number" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none bg-white text-gray-900`} value={payrollForm.leaveDays} onChange={e => setPayrollForm({ ...payrollForm, leaveDays: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Action Days</label>
                          <input type="number" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none bg-white text-gray-900`} value={payrollForm.actionDays} onChange={e => setPayrollForm({ ...payrollForm, actionDays: Number(e.target.value) })} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3">Additions</h5>
                          <div className="grid gap-3">
                            <div>
                              <label className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 ml-2 mb-1 block">Incentive (PKR)</label>
                              <input type="number" className="w-full rounded-xl px-4 py-2 text-sm font-bold border-none bg-white text-gray-900" value={payrollForm.incentive} onChange={e => setPayrollForm({ ...payrollForm, incentive: Number(e.target.value) })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 ml-2 mb-1 block">Other / Custom</label>
                                <input type="number" className="w-full rounded-xl px-4 py-2 text-sm font-bold border-none bg-white text-gray-900" value={payrollForm.otherEarnings} onChange={e => setPayrollForm({ ...payrollForm, otherEarnings: Number(e.target.value) })} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 ml-2 mb-1 block">Reason</label>
                                <input type="text" className="w-full rounded-xl px-4 py-2 text-sm font-bold border-none bg-white text-gray-900" value={payrollForm.otherEarningsReason} onChange={e => setPayrollForm({ ...payrollForm, otherEarningsReason: e.target.value })} placeholder="Reason" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-3">Deductions</h5>
                          <div className="grid gap-3">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-rose-600 ml-2 mb-1 block">Fine (PKR)</label>
                                <input type="number" className="w-full rounded-xl px-4 py-2 text-sm font-bold border-none bg-white text-gray-900" value={payrollForm.fine} onChange={e => setPayrollForm({ ...payrollForm, fine: Number(e.target.value) })} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-rose-600 ml-2 mb-1 block">Advance</label>
                                <input type="number" className="w-full rounded-xl px-4 py-2 text-sm font-bold border-none bg-white text-gray-900" value={payrollForm.advance} onChange={e => setPayrollForm({ ...payrollForm, advance: Number(e.target.value) })} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-rose-600 ml-2 mb-1 block">Absent (-)</label>
                                <input type="number" className="w-full rounded-xl px-4 py-2 text-sm font-bold border-none bg-white text-gray-900" value={payrollForm.absentDeduction} onChange={e => setPayrollForm({ ...payrollForm, absentDeduction: Number(e.target.value) })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-rose-600 ml-2 mb-1 block">Other / Custom</label>
                                <input type="number" className="w-full rounded-xl px-4 py-2 text-sm font-bold border-none bg-white text-gray-900" value={payrollForm.otherDeductions} onChange={e => setPayrollForm({ ...payrollForm, otherDeductions: Number(e.target.value) })} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-rose-600 ml-2 mb-1 block">Reason</label>
                                <input type="text" className="w-full rounded-xl px-4 py-2 text-sm font-bold border-none bg-white text-gray-900" value={payrollForm.deductionReason} onChange={e => setPayrollForm({ ...payrollForm, deductionReason: e.target.value })} placeholder="Reason" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        disabled={generatingSlip}
                        onClick={handleGenerateSlip}
                        className="w-full py-3 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {generatingSlip && <Loader2 size={12} className="animate-spin" />}
                        {generatingSlip ? 'Finalizing Slip...' : 'Finalize Slip'}
                      </button>
                    </div>
                  )}

                  {salaryRecords.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                        <CreditCard className="text-black" size={32} />
                      </div>
                      <p className="text-black font-bold uppercase tracking-widest text-[10px]">No salary slips recorded yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {salaryRecords.sort((a, b) => (b.month || '').localeCompare(a.month || '')).map(record => (
                        <div key={record.id} className={`p-6 rounded-[2.5rem] border transition-all hover:scale-[1.01] ${'bg-gray-50 border-gray-100 hover:border-amber-200'
                          }`}>
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${record.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                                record.status === 'approved' ? 'bg-blue-500/10 text-blue-500' :
                                  'bg-amber-500/10 text-amber-500'
                                }`}>
                                <DollarSign size={24} />
                              </div>
                              <div>
                                <h4 className={`text-lg font-black text-gray-900 uppercase tracking-tight`}>
                                  {record.month ? new Date(record.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown Month'}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${record.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    record.status === 'approved' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    }`}>
                                    {record.status}
                                  </span>
                                  <span className="text-[10px] text-black font-bold uppercase tracking-widest">
                                    {(record as any).presentDays || 0} Present · {(record as any).leaveDays || 0} Leaves · {(record as any).actionDays || 0} Action Days
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 md:self-start">
                              <button
                                onClick={() => {
                                  const prefix = getDeptPrefix(staff?.dept as StaffDept);
                                  window.open(`/hq/print-salary/${prefix}/${record.id}`, '_blank');
                                }}
                                className="p-3 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm active:scale-90"
                                title="Print Salary Slip"
                              >
                                <Printer size={18} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={() => handleDeleteSlip(record)}
                                className="p-3 rounded-xl bg-white border border-gray-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all shadow-sm active:scale-90"
                                title="Delete Salary Slip"
                              >
                                <Trash2 size={18} strokeWidth={2.5} />
                              </button>
                              <div className="md:text-right">
                                <p className={`text-2xl font-black text-gray-900`}>₨{Number((record as any).netSalary || (record as any).amount || 0).toLocaleString()}</p>
                                <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">Net Payable Amount</p>
                              </div>
                            </div>
                          </div>

                          <div className={`mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-dashed border-gray-200`}>
                            <div>
                              <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Base Earnings</p>
                              <p className={`text-xs font-bold text-black`}>
                                ₨{Math.round(((record as any).basicSalary || 0) / 30 * ((record as any).presentDays || 0)).toLocaleString()}
                              </p>
                              <p className="text-[9px] text-black mt-1 uppercase font-black">Pro-rated attendance</p>
                            </div>

                            {((record as any).bonus > 0) && (
                              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Performance Bonus (+)</p>
                                <p className={`text-xs font-bold text-emerald-600`}>
                                  ₨{(record as any).bonus.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-emerald-500/60 mt-1 font-medium leading-tight">Reason: {(record as any).bonusReason || 'Incentive'}</p>
                              </div>
                            )}

                            {((record as any).otherDeductions > 0) && (
                              <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Other Deductions (-)</p>
                                <p className={`text-xs font-bold text-rose-600`}>
                                  ₨{(record as any).otherDeductions.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-rose-500/60 mt-1 font-medium leading-tight">Reason: {(record as any).deductionReason || 'Adjustment'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Advances History (Cashier Side) */}
                  <div className="mt-8 pt-8 border-t border-dashed border-gray-200">
                    <h4 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-6 flex items-center gap-2">
                      <CreditCard size={16} /> Advance Salary Transactions (Cashier Side)
                    </h4>
                    
                    {transactions.filter(tx => tx.category === 'advance_salary').length === 0 ? (
                      <div className="py-10 text-center bg-gray-50/50 border border-gray-100 rounded-3xl">
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">No advance salary transactions recorded</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {transactions.filter(tx => tx.category === 'advance_salary').sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(tx => (
                          <div key={tx.id} className="p-5 rounded-3xl border bg-gray-50 border-gray-100 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                tx.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                tx.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>
                                <DollarSign size={20} />
                              </div>
                              <div>
                                <h5 className="font-black text-gray-900 text-sm capitalize">
                                  ₨{Number(tx.amount || 0).toLocaleString()}
                                </h5>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                    tx.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                    tx.status === 'rejected' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                                    'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                  }`}>
                                    {tx.status}
                                  </span>
                                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                    {tx.paymentMethod} · {formatDateDMY(tx.date || tx.createdAt)}
                                  </span>
                                </div>
                                {tx.description && (
                                  <p className="text-[10px] text-gray-500 italic mt-1">{tx.description}</p>
                                )}
                              </div>
                            </div>
                            {tx.status === 'pending' && (
                              <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest bg-amber-50 border border-amber-200/50 px-3 py-1.5 rounded-xl">
                                Pending Superadmin Approval
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leads' && (
              <div className="space-y-6">
                <LeadsCRM department={staff?.dept === 'rehab' || staff?.dept === 'spims' || staff?.dept === 'hospital' ? staff.dept : 'hospital'} />
              </div>
            )}

            {activeTab === 'score' && (
              <div className="space-y-6">
                {/* Score Breakdown Analysis */}
                <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all bg-white border-gray-100 shadow-xl shadow-blue-900/5`}>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Performance Breakdown</h3>
                      <p className="text-[10px] font-bold text-black uppercase tracking-widest mt-1">
                        Cycle: {growthPoints?.month ? new Date(growthPoints.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Current Month'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-gray-900 text-white`}>
                        Total Score: {computedScores.totalScore} / 100 (Normalized Daily: {computedScores.normalizedDaily} + Bonus: {computedScores.growthPoint})
                      </span>
                      <button onClick={handleRecalculate} className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-50 hover:text-white transition-all shadow-sm">
                        <RefreshCw size={14} className={saving ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Attendance', score: computedScores.attendance, max: (computedScores.workingDays || 0) * 1, icon: <Calendar size={18} />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                      { label: 'Uniform', score: computedScores.uniform, max: (computedScores.workingDays || 0) * 1, icon: <Shield size={18} />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                      { label: 'Working', score: computedScores.working, max: (computedScores.workingDays || 0) * 1, icon: <ClipboardList size={18} />, color: 'text-teal-500', bg: 'bg-teal-500/10' },
                      { label: 'Bonus Points', score: computedScores.growthPoint, max: 10, icon: <TrendingUp size={18} />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    ].map((stat, i) => (
                      <div key={i} className={`p-6 rounded-3xl border bg-gray-50 border-gray-200/50 flex flex-col items-center text-center group hover:scale-[1.02] transition-all`}>
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                          {stat.icon}
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-1">{stat.label}</h4>
                        <p className={`text-xl font-black text-gray-900`}>{stat.score} <span className="text-xs text-gray-400 font-bold">/ {stat.max}</span></p>
                        <div className="w-full h-1 bg-zinc-700/20 rounded-full mt-4 overflow-hidden">
                          <div
                            className={`h-full ${stat.bg.replace('/10', '')} transition-all duration-1000`}
                            style={{ width: `${Math.min(100, (stat.score / (stat.max || 1)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[9px] font-bold text-black uppercase tracking-widest mt-2">
                          {stat.label === 'Bonus Points' ? 'Score' : 'Efficiency'}: {Math.round((stat.score / (stat.max || 1)) * 100)}%
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-8 p-6 rounded-3xl border border-dashed bg-indigo-50/50 border-indigo-100`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                        <Sparkles size={14} />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Merits & Bonus Points</h4>
                    </div>

                    {/* Award Bonus Points Form */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 bg-white rounded-2xl border border-indigo-100">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-gray-900 uppercase">Award Monthly Bonus Points</p>
                        <p className="text-[10px] font-bold text-slate-450 text-slate-400 uppercase tracking-wider">Manager can award 0 to 10 points at the end of the month.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          min="0"
                          max="10"
                          value={bonusInput}
                          onChange={e => setBonusInput(Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)))}
                          className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white text-center"
                        />
                        <button
                          onClick={handleSaveBonus}
                          disabled={saving}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <div className="space-y-1">
                        <p className={`text-sm font-black text-gray-900`}>Bonus Points Awarded: {computedScores.growthPoint} / 10</p>
                        <p className="text-[10px] font-bold text-black uppercase tracking-widest leading-relaxed">Bonus points are awarded manually by the manager at the end of the month.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Global Ranking</p>
                        <p className={`text-sm font-bold text-black`}>T-3 Management Candidate</p>
                      </div>
                    </div>

                    {/* Growth History List */}
                    <div className="space-y-3">
                      {growthHistory.length === 0 ? (
                        <p className="text-[10px] font-bold text-black opacity-30 uppercase text-center py-4">No contribution records found</p>
                      ) : (
                        growthHistory.map((item, idx) => (
                          <div key={item.id || idx} className={`p-4 rounded-2xl border flex items-center justify-between transition-all hover:bg-white bg-white/50 border-gray-100`}>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-xs">
                                +{item.points || 1}
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-tight">{item.note || item.category || 'Point Awarded'}</p>
                                <p className="text-[8px] font-bold text-black opacity-40 uppercase tracking-widest">{formatDateDMY(item.date)}</p>
                              </div>
                            </div>
                            <Award size={14} className="text-indigo-400" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>


              </div>
            )}

          </div>
        </div>

        {/* Full-width Uploaded Documents (View Profile Tab) */}
        {activeTab === 'profile' && (
          <div className="mt-8 p-10 rounded-[2.5rem] border bg-white border-gray-100 shadow-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-8 flex items-center gap-2">
              <FileText size={14} className="text-teal-500" /> Uploaded Documents
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {staff?.documents?.length ? staff.documents.map((doc: { title: string; url: string }, idx: number) => (
                <div key={idx} className="group relative rounded-2xl overflow-hidden border border-gray-200 bg-white hover:border-teal-500 hover:shadow-md transition-all duration-300 flex flex-col w-full">
                  <div className="aspect-[4/3] w-full bg-gray-50 relative overflow-hidden flex items-center justify-center border-b border-gray-100">
                    {doc.url.toLowerCase().endsWith('.pdf') ? (
                      <div className="flex flex-col items-center justify-center gap-2 p-4">
                        <FileText size={36} className="text-red-500 animate-pulse" />
                        <span className="text-[8px] font-black uppercase text-red-600 tracking-wider bg-red-50 px-2 py-1 rounded">PDF Document</span>
                      </div>
                    ) : (
                      <img 
                        src={doc.url} 
                        alt={doc.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <a href={doc.url} target="_blank" rel="noreferrer" className="bg-white text-black font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md">
                        View Fullscreen
                      </a>
                    </div>
                  </div>
                  <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-2">
                    <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Document Title</label>
                    <span className="text-xs font-black text-black uppercase tracking-widest leading-snug">{doc.title}</span>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-8 text-center text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  No documents available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full-width Documents & Verification (Edit Profile Tab) */}
        {activeTab === 'edit' && (
          <div className="mt-8 p-10 rounded-[2.5rem] border bg-white border-gray-100 shadow-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest">Documents & Verification</h4>
                <p className="text-[10px] font-bold text-black uppercase tracking-widest">Upload CNIC, Certificates, etc.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {(editForm.documents || []).map((doc: { title: string; url: string }, idx: number) => {
                const docState = docStates[idx]?.status || 'normal';
                const timeLeft = docStates[idx]?.timeLeft || 0;

                if (docState === 'deleting') {
                  return (
                    <div key={idx} className="relative rounded-2xl overflow-hidden border border-dashed border-red-300 bg-red-50/10 p-6 flex flex-col items-center justify-center min-h-[220px] text-center w-full animate-in fade-in duration-300">
                      <div className="w-10 h-10 rounded-full border-4 border-rose-500 border-t-transparent animate-spin mb-3"></div>
                      <p className="text-xs font-black uppercase tracking-wider text-rose-700">Deleting Document...</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase">Permanently in {timeLeft}s</p>
                      <button
                        onClick={() => {
                          const state = docStates[idx];
                          if (state) {
                            if (state.intervalId) clearInterval(state.intervalId);
                            if (state.timeoutId) clearTimeout(state.timeoutId);
                          }
                          setDocStates(prev => ({
                            ...prev,
                            [idx]: { status: 'normal', timeLeft: 0 }
                          }));
                          toast.success("Deletion cancelled", { id: `cancel-${idx}` });
                        }}
                        className="mt-4 bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                      >
                        Undo Delete
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="group relative rounded-2xl overflow-hidden border border-gray-200 bg-white hover:border-teal-500 transition-all duration-300 shadow-sm flex flex-col w-full">
                    <div className="aspect-[4/3] w-full bg-gray-50 relative overflow-hidden flex items-center justify-center border-b border-gray-100">
                      {doc.url.toLowerCase().endsWith('.pdf') ? (
                        <div className="flex flex-col items-center justify-center gap-2 p-4">
                          <FileText size={36} className="text-red-500" />
                          <span className="text-[8px] font-black uppercase text-red-600 tracking-wider bg-red-50 px-2 py-1 rounded">PDF Document</span>
                        </div>
                      ) : (
                        <img 
                          src={doc.url} 
                          alt={doc.title} 
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {docState === 'confirm' ? (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center z-20 animate-in fade-in duration-300">
                          <p className="text-white text-[10px] font-black uppercase tracking-widest mb-3 leading-relaxed">
                            Are you sure you want to delete this document?
                          </p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                let currentSeconds = 6;
                                const intervalId = setInterval(() => {
                                  currentSeconds -= 1;
                                  setDocStates(prev => {
                                    if (!prev[idx] || prev[idx].status !== 'deleting') {
                                      clearInterval(intervalId);
                                      return prev;
                                    }
                                    return {
                                      ...prev,
                                      [idx]: { ...prev[idx], timeLeft: currentSeconds }
                                    };
                                  });
                                }, 1000);

                                const timeoutId = setTimeout(() => {
                                  clearInterval(intervalId);
                                  setEditForm(prev => {
                                    const next = [...prev.documents];
                                    next.splice(idx, 1);
                                    return { ...prev, documents: next };
                                  });
                                  setDocStates(prev => {
                                    const copy = { ...prev };
                                    delete copy[idx];
                                    return copy;
                                  });
                                  toast.success("Document deleted permanently.");
                                }, 6000);

                                setDocStates(prev => ({
                                  ...prev,
                                  [idx]: {
                                    status: 'deleting',
                                    timeLeft: currentSeconds,
                                    intervalId,
                                    timeoutId
                                  }
                                }));
                              }}
                              className="bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md"
                            >
                              Yes, Delete
                            </button>
                            <button 
                              onClick={() => {
                                setDocStates(prev => ({ ...prev, [idx]: { status: 'normal', timeLeft: 0 } }));
                              }}
                              className="bg-gray-200 text-black font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                          <a href={doc.url} target="_blank" rel="noreferrer" className="bg-white text-black font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl hover:scale-105 transition-all shadow-md">
                            Open Original
                          </a>
                          <button
                            onClick={() => {
                              setDocStates(prev => ({ ...prev, [idx]: { status: 'confirm', timeLeft: 0 } }));
                            }}
                            className="bg-rose-600 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl hover:scale-105 transition-all shadow-md"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-2">
                      <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Document Title</label>
                      <input
                        type="text"
                        value={doc.title}
                        onChange={(e) => {
                          const next = [...editForm.documents];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setEditForm({ ...editForm, documents: next });
                        }}
                        className="w-full h-12 px-4 rounded-xl text-xs font-black uppercase outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-teal-500 focus:bg-white"
                        placeholder="Edit Document Title..."
                      />
                    </div>
                  </div>
                );
              })}
              {(!editForm.documents || editForm.documents.length === 0) && (
                <div className="col-span-full flex flex-col items-center justify-center py-8 text-black border-2 border-dashed border-gray-200 rounded-[2.5rem] bg-gray-50/50">
                  <FileText size={36} className="opacity-20 mb-2 text-teal-600" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">No documents uploaded</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-dashed border-gray-200">
              <input
                placeholder="Document Title (e.g. CNIC Front)"
                className={`flex-1 min-w-0 h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-teal-500`}
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
              />
              <label className="h-14 px-8 rounded-2xl bg-teal-500 text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center cursor-pointer gap-2">
                {uploadingDoc ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                <span className="text-xs font-bold uppercase tracking-wider">{uploadingDoc ? 'Uploading...' : 'Upload File'}</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleUploadDocument}
                  disabled={uploadingDoc}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Time Entry Popup */}
      {timePopup.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setTimePopup({ ...timePopup, isOpen: false })} />
          <div className="relative w-full max-w-sm rounded-[2.5rem] p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] border-4 border-black animate-in zoom-in-95 duration-200 bg-white text-black">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black italic tracking-tight">Shift Timing</h3>
                <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">
                  Entry for {formatDateDMY(new Date(timePopup.date))}
                </p>
              </div>
              <button
                onClick={() => setTimePopup({ ...timePopup, isOpen: false })}
                className="p-2 rounded-xl transition-colors hover:bg-black hover:text-white text-black border-2 border-black"
              >
                <RefreshCw size={18} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Arrival Time</label>
                <input
                  type="time"
                  value={timePopup.arrivalTime}
                  onChange={e => setTimePopup({ ...timePopup, arrivalTime: e.target.value })}
                  className="w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 border-black bg-white text-black focus:bg-indigo-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Departure Time</label>
                <input
                  type="time"
                  value={timePopup.departureTime}
                  onChange={e => setTimePopup({ ...timePopup, departureTime: e.target.value })}
                  className="w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 border-black bg-white text-black focus:bg-indigo-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              <div className="p-4 rounded-2xl border-2 border-black flex items-start gap-3 bg-indigo-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <AlertCircle size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-[9px] font-bold leading-relaxed text-indigo-500/70 uppercase tracking-wider">
                  Setting these times will mark the staff as present for this specific date only.
                </p>
              </div>

              <button
                onClick={handleTimePopupSave}
                disabled={saving}
                className="w-full h-14 rounded-2xl bg-black text-white text-[11px] font-[1000] uppercase tracking-widest hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Spinner size="sm" /> : <RefreshCw size={16} />}
                {saving ? 'Synchronizing...' : 'Update Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Popup */}
      {notePopup.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setNotePopup({ ...notePopup, isOpen: false })} />
          <div className="relative w-full max-w-sm rounded-[2.5rem] p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] border-4 border-black animate-in zoom-in-95 duration-200 bg-white text-black">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black italic tracking-tight text-amber-500">Attendance Note</h3>
                <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">
                  Context for {formatDateDMY(new Date(notePopup.date))}
                </p>
              </div>
              <button
                onClick={() => setNotePopup({ ...notePopup, isOpen: false })}
                className="p-2 rounded-xl transition-colors hover:bg-black hover:text-white text-black border-2 border-black"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Late/Adjustment Reason</label>
                <textarea
                  value={notePopup.note}
                  onChange={e => setNotePopup({ ...notePopup, note: e.target.value })}
                  placeholder="e.g. Flight delayed, Medical emergency..."
                  className="w-full min-h-[120px] p-6 rounded-2xl text-sm font-black outline-none border-4 border-black bg-white text-black focus:bg-amber-50 transition-all resize-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              <div className="p-4 rounded-2xl border-2 border-black flex items-start gap-3 bg-amber-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[9px] font-bold leading-relaxed text-amber-500/70 uppercase tracking-wider">
                  This note will be visible in the attendance audit history.
                </p>
              </div>

              <button
                onClick={handleSaveNote}
                className="w-full h-14 rounded-2xl bg-amber-400 text-black text-[11px] font-[1000] uppercase tracking-widest hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
      {showAdvanceModal && staff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAdvanceModal(false)} />
          <div className="relative w-full max-w-md rounded-[2.5rem] p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] border-4 border-black animate-in zoom-in-95 duration-200 bg-white text-black">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black italic tracking-tight text-emerald-600">Record Advance Salary</h3>
                <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">
                  Cashier transaction for {staff.name}
                </p>
              </div>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="p-2 rounded-xl transition-colors hover:bg-black hover:text-white text-black border-2 border-black"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Advance Amount (PKR)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={advanceForm.amount}
                  onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  className="w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 border-black bg-white text-black focus:bg-emerald-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Date</label>
                <input
                  type="date"
                  value={advanceForm.date}
                  onChange={e => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                  className="w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 border-black bg-white text-black focus:bg-emerald-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Payment Method</label>
                <select
                  value={advanceForm.paymentMethod}
                  onChange={e => setAdvanceForm({ ...advanceForm, paymentMethod: e.target.value as any })}
                  className="w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 border-black bg-white text-black focus:bg-emerald-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Reference Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Tx ID / Receipt No"
                  value={advanceForm.referenceNo}
                  onChange={e => setAdvanceForm({ ...advanceForm, referenceNo: e.target.value })}
                  className="w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 border-black bg-white text-black focus:bg-emerald-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Description / Reason</label>
                <input
                  type="text"
                  placeholder="Reason for advance..."
                  value={advanceForm.description}
                  onChange={e => setAdvanceForm({ ...advanceForm, description: e.target.value })}
                  className="w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-4 border-black bg-white text-black focus:bg-emerald-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              <button
                onClick={handleRecordAdvance}
                disabled={recordingAdvance}
                className="w-full h-14 mt-6 rounded-2xl bg-emerald-400 text-black text-[11px] font-[1000] uppercase tracking-widest hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {recordingAdvance ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {recordingAdvance ? 'Recording...' : 'Submit Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReset && staff && (
        <ResetPasswordModal
          uid={staff.staffId || staff.id || ''}
          portal={(staff.dept || 'hq') as any}
          onClose={() => setShowReset(false)}
          isPasswordSet={!!staff?.defaultPassword}
        />
      )}

      {/* Salary Calculation Breakdown Modal */}
      {showSalaryBreakdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Salary Breakdown</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                  Cycle: {selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Current Month'}
                </p>
              </div>
              <button 
                onClick={() => setShowSalaryBreakdownModal(false)}
                className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Top Overview Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Monthly Base Salary</p>
                  <p className="text-lg font-black text-gray-900">₨{Number(staff?.monthlySalary || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-100/50">
                  <p className="text-[9px] font-black text-teal-500 uppercase tracking-widest mb-1">Net Till Date Earned</p>
                  <p className="text-lg font-black text-teal-600">₨{salaryDetails.estimatedSalary.toLocaleString()}</p>
                </div>
              </div>

              {/* Calculations Formula */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <p className="text-[9px] font-black text-black uppercase tracking-widest">
                  {salaryDetails.isFinalized ? `Official Salary Slip Registry (${salaryDetails.status})` : 'Calculation Formula'}
                </p>
                <div className="space-y-1 font-mono text-gray-600">
                  <div className="flex justify-between">
                    <span>Base Daily Rate:</span>
                    <span>₨{Number(staff?.monthlySalary || 0).toLocaleString()} / 30 = ₨{Math.round(salaryDetails.dailyWage).toLocaleString()} / Day</span>
                  </div>
                  {salaryDetails.isFinalized ? (
                    <>
                      <div className="flex justify-between text-emerald-600">
                        <span>Base Monthly Salary:</span>
                        <span>+ ₨{Number(staff?.monthlySalary || 0).toLocaleString()}</span>
                      </div>
                      {salaryDetails.absentDeduction > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>Absent Deductions:</span>
                          <span>- ₨{Math.round(salaryDetails.absentDeduction).toLocaleString()}</span>
                        </div>
                      )}
                      {salaryDetails.advance > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>Advance Salary:</span>
                          <span>- ₨{salaryDetails.advance.toLocaleString()}</span>
                        </div>
                      )}
                      {salaryDetails.bonus > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Allowance/Bonus ({salaryDetails.bonusReason || 'Adjustment'}):</span>
                          <span>+ ₨{salaryDetails.bonus.toLocaleString()}</span>
                        </div>
                      )}
                      {salaryDetails.fines > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>Adjustments/Deductions ({salaryDetails.deductionReason || 'Fines'}):</span>
                          <span>- ₨{salaryDetails.fines.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-emerald-600">
                        <span>Payable Days Earned ({salaryDetails.payableDays} Days):</span>
                        <span>+ ₨{Math.round(salaryDetails.earnings).toLocaleString()}</span>
                      </div>
                      {salaryDetails.absentDeduction > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>Unmarked / Absent Deductions ({salaryDetails.unpaidDays} Days):</span>
                          <span>- ₨{Math.round(salaryDetails.absentDeduction).toLocaleString()}</span>
                        </div>
                      )}
                      {salaryDetails.advance > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>Advance Salary:</span>
                          <span>- ₨{salaryDetails.advance.toLocaleString()}</span>
                        </div>
                      )}
                      {salaryDetails.fines > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>Fines:</span>
                          <span>- ₨{salaryDetails.fines.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-black text-gray-900">
                    <span>{salaryDetails.isFinalized ? 'Disbursed Net Salary:' : 'Till Date Net:'}</span>
                    <span>₨{salaryDetails.estimatedSalary.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Grid lists for Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payable Dates List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Payable Dates ({salaryDetails.payableDatesList.length})
                  </h4>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[200px] overflow-y-auto space-y-1 p-2 bg-gray-50/50">
                    {salaryDetails.payableDatesList.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic text-center py-4">No payable dates recorded</p>
                    ) : (
                      salaryDetails.payableDatesList.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-white border border-gray-100">
                          <span className="font-bold text-gray-700">{formatDateDMY(item.date)}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold text-[9px] uppercase">{item.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Deductible/Unpaid Dates List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Deductions / Absent ({salaryDetails.deductedDatesList.length})
                  </h4>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[200px] overflow-y-auto space-y-1 p-2 bg-gray-50/50">
                    {salaryDetails.deductedDatesList.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic text-center py-4">No deducted dates recorded</p>
                    ) : (
                      salaryDetails.deductedDatesList.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-white border border-gray-100">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-700">{formatDateDMY(item.date)}</span>
                            <span className="text-[8px] text-rose-400 uppercase font-black">{item.status}</span>
                          </div>
                          <span className="font-black text-rose-500">-₨{Math.round(item.deduction).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Fine Deductions List */}
                <div className="space-y-3 col-span-1 md:col-span-2 mt-4">
                  <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Fine Deductions Details ({fines.filter(isFineInSelectedMonth).length})
                  </h4>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[200px] overflow-y-auto space-y-1 p-2 bg-gray-50/50">
                    {fines.filter(isFineInSelectedMonth).length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic text-center py-4">No fines enforced this month</p>
                    ) : (
                      fines.filter(isFineInSelectedMonth).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-white border border-gray-100">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-700">{item.reason || 'Penalty'}</span>
                            <span className="text-[8px] text-gray-400 uppercase font-black">{formatDateDMY(item.date)}</span>
                          </div>
                          <span className="font-black text-rose-500">-₨{Number(item.amount).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 text-center text-[10px] text-gray-400 italic">
              All marked leaves are fully paid. Deductions only apply to absences and past unmarked days.
            </div>
          </div>
        </div>
      )}

      {showReport && staff && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:bg-transparent print:p-0 print:fixed print:inset-0">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:h-auto print:w-full print:shadow-none print:rounded-none print:p-0">
            {/* Action bar - hidden on print */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-gray-100 print:hidden">
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">Staff Profile Report</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadReport}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  <Download size={14} /> Download PNG
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all cursor-pointer"
                >
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setShowReport(false)} className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all cursor-pointer">
                  <X size={16} />
                </button>
              </div>
            </div>
            <StaffProfileReport staff={staff} />
          </div>
        </div>
      )}
    </div>
  );
}