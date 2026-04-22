// src/app/hq/dashboard/manager/staff/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  doc, getDoc, collection, getDocs, query, where, orderBy,
  updateDoc, addDoc, serverTimestamp, setDoc, limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { formatDateDMY, toDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Target, Camera, Activity,
  ArrowLeft, Award, Clock, Calendar, Shield, DollarSign,
  Loader2, TrendingUp, ChevronDown, ChevronUp, RefreshCw,
  User, ClipboardList, CheckCircle2, XCircle, AlertCircle, MinusCircle,
  ChevronLeft, ChevronRight, Star, Plus, Trash2, CreditCard, LayoutDashboard, Lock, AlertTriangle
} from 'lucide-react';
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

// Define unified icons for tasks
import { Sparkles, Save, X } from 'lucide-react';
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
  status: 'present' | 'absent' | 'leave';
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

  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'overview' | 'attendance' | 'duties' | 'dress' | 'salary' | 'score' | 'edit' | 'payroll'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingConfig, setProcessingConfig] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
    seniority: ''
  });

  const [newExtraField, setNewExtraField] = useState({ key: '', value: '' });

  useEffect(() => {
    const saved = localStorage.getItem('hq_dark_mode') === 'true';
    setIsDark(saved);
  }, []);

  // Data States
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [dutyLogs, setDutyLogs] = useState<any[]>([]);
  const [dressLogs, setDressLogs] = useState<any[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);
  const [growthHistory, setGrowthHistory] = useState<any[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalarySlip[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loadingScore, setLoadingScore] = useState(false);
  const [openRule, setOpenRule] = useState<string | null>(null);

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
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<'once' | 'weekly' | 'monthly'>('once');
  const [creatingTask, setCreatingTask] = useState(false);

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
    bonuses: 0,
    bonusReason: '',
    deductions: 0,
    deductionReason: '',
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  // ─── Monthly Grid Logic ───────────────────────────────────────────────────

  const [attendanceMap, setAttendanceMap] = useState<Record<string, HqDailyAttendanceRecord>>({});
  const [dressMap, setDressMap] = useState<Record<string, HqDailyDressCodeRecord>>({});
  const [dutyMap, setDutyMap] = useState<Record<string, HqDailyDutyRecord>>({});

  const tillDateSalary = useMemo(() => {
    if (!staff) return 0;
    const monthlySalary = Number(staff.monthlySalary) || 0;
    const daysInMonth = 30; // Standard month division as requested
    const dailyRate = monthlySalary / daysInMonth;

    // Count present days in the selected month
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const earnings = dailyRate * presentDays;

    // Fines for the current month/staff
    const totalFines = staff.totalFines || 0;

    return Math.floor(Math.max(0, earnings - totalFines));
  }, [staff, attendance]);

  const presentDaysCount = useMemo(() => {
    return attendance.filter(a => a.status === 'present').length;
  }, [attendance]);
  const [timePopup, setTimePopup] = useState<{
    isOpen: boolean;
    date: string;
    arrivalTime: string;
    departureTime: string;
  }>({ isOpen: false, date: '', arrivalTime: '', departureTime: '' });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const daysInMonth = useCallback(() => {
    if (!selectedMonth || !selectedMonth.includes('-')) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    if (isNaN(year) || isNaN(month)) return [];
    const date = new Date(year, month - 1, 1);
    if (isNaN(date.getTime())) return [];

    const days = [];
    while (date.getMonth() === month - 1) {
      days.push(new Date(date).toISOString().slice(0, 10));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedMonth]);

  const fetchData = useCallback(async () => {
    if (!staffId) return;
    try {
      setLoading(true);
      const profile = await fetchStaffProfile(staffId);

      if (!profile) {
        toast.error("Staff member not found");
        router.push('/hq/dashboard/manager/staff');
        return;
      }

      setStaff(profile);
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
        seniority: profile.seniority || ''
      });

      // ─── Fetch Monthly Logs ───────────────────────────────────────────────
      const prefix = getDeptPrefix(profile.dept);
      const uid = profile.staffId;
      const days = daysInMonth();
      const start = days[0];
      const end = days[days.length - 1];

      // Robust fetching: Individual catches prevent total page failure if one collection fails
      const [attSnap, dressSnap, dutySnap, pointsSnap, salarySnap, tasksSnap, metaDoc] = await Promise.all([
        getDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', uid), where('date', '>=', start), where('date', '<=', end))).catch(e => { console.error('attendance fail', e); return { docs: [] } as any; }),
        getDocs(query(collection(db, `${prefix}_dress_logs`), where('staffId', '==', uid), where('date', '>=', start), where('date', '<=', end))).catch(e => { console.error('dress fail', e); return { docs: [] } as any; }),
        getDocs(query(collection(db, `${prefix}_duty_logs`), where('staffId', '==', uid), where('date', '>=', start), where('date', '<=', end))).catch(e => { console.error('duty fail', e); return { docs: [] } as any; }),
        getDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', uid), limit(1))).catch(e => { console.error('points fail', e); return { docs: [] } as any; }),
        getDocs(query(collection(db, `${prefix}_salary_records`), where('staffId', '==', uid), orderBy('createdAt', 'desc'))).catch(e => { console.error('salary fail', e); return { docs: [] } as any; }),
        getDocs(query(collection(db, `${prefix}_special_tasks`), where('staffId', '==', uid), orderBy('createdAt', 'desc'))).catch(e => { console.error('tasks fail', e); return { docs: [] } as any; }),
        getDoc(doc(db, `hq_meta`, 'config')).catch(e => { console.error('meta fail', e); return { exists: () => false } as any; })
      ]);

      const metaData = metaDoc.exists() ? metaDoc.data() : { customDuties: [], customDress: [] };
      setAvailableDuties([
        ...GLOBAL_DUTIES.map(d => ({ key: d.toLowerCase().replace(/\s+/g, '_'), label: d })),
        ...(metaData.customDuties || [])
      ]);
      setAvailableDress([
        ...GLOBAL_DRESS_ITEMS.map(d => ({ key: d.toLowerCase().replace(/\s+/g, '_'), label: d })),
        ...(metaData.customDress || [])
      ]);

      const aMap: Record<string, HqDailyAttendanceRecord> = {};
      attSnap.docs.forEach((d: any) => { aMap[d.data().date] = d.data() as HqDailyAttendanceRecord; });
      setAttendanceMap(aMap);

      const drMap: Record<string, HqDailyDressCodeRecord> = {};
      dressSnap.docs.forEach((d: any) => { drMap[d.data().date] = d.data() as HqDailyDressCodeRecord; });
      setDressMap(drMap);

      const duMap: Record<string, HqDailyDutyRecord> = {};
      dutySnap.docs.forEach((d: any) => { duMap[d.data().date] = d.data() as HqDailyDutyRecord; });
      setDutyMap(duMap);

      if (!pointsSnap.empty) setGrowthPoints(pointsSnap.docs[0].data());
      setSalaryRecords(salarySnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SalarySlip)));
      setSpecialTasks(tasksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as HqSpecialTask)));

      // Fetch growth history (all months)
      const historySnap = await getDocs(
        query(collection(db, `${prefix}_growth_points`), where('staffId', '==', uid), orderBy('month', 'desc'))
      );
      setGrowthHistory(historySnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error(err);
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  }, [staffId, router, daysInMonth]);

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
        arrivedOnTime: prevRecord.arrivedOnTime ?? (next === 'present'),
        departedOnTime: prevRecord.departedOnTime ?? (next === 'present'),
      };

      // Set default times if presenting for the first time
      if (next === 'present' && !prevRecord.arrivalTime) {
        newRecord.arrivalTime = staff.dutyStartTime || '09:00';
        newRecord.departureTime = staff.dutyEndTime || '17:00';
        newRecord.arrivedOnTime = true;
        newRecord.departedOnTime = true;
      }

      setAttendanceMap(prev => ({ ...prev, [date]: newRecord }));
      await setDoc(ref, newRecord, { merge: true });

      // Award Point if present
      if (next === 'present') {
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
        status: (next || prevRecord.status === 'present') ? 'present' : prevRecord.status || 'unmarked',
        updatedAt: new Date().toISOString(),
        markedBy: session?.uid
      };

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
        status: prevRecord.status === 'unmarked' ? 'present' : prevRecord.status,
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
        arrivalTime: timePopup.arrivalTime,
        departureTime: timePopup.departureTime,
        arrivedOnTime,
        departedOnTime,
        updatedAt: new Date().toISOString(),
        markedBy: session?.uid
      };

      const newRecord: HqDailyAttendanceRecord = {
        ...(attendanceMap[timePopup.date] || {}),
        ...payload,
        staffId: uid,
        date: timePopup.date,
        status: 'present'
      };

      // Update Local State
      setAttendanceMap(prev => ({
        ...prev,
        [timePopup.date]: newRecord
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
        updatedAt: new Date().toISOString()
      };

      setDressMap(prev => ({ ...prev, [date]: newRecord }));
      await setDoc(ref, newRecord, { merge: true });

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
        date,
        duties: nextDuties,
        markedBy: session?.uid,
        updatedAt: new Date().toISOString()
      };

      setDutyMap(prev => ({ ...prev, [date]: newRecord }));
      await setDoc(ref, newRecord, { merge: true });

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
        assignedBy: session?.uid || '',
        assignedByName: session?.name || '',
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, `${slug}_special_tasks`), newTask);
      setSpecialTasks([{ id: docRef.id, ...newTask } as HqSpecialTask, ...specialTasks]);
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
      }
      toast.success(`Task marked as ${newStatus}`);
      fetchData();
    } catch (e) {
      toast.error("Failed to update task");
    }
  };

  const handleGenerateSlip = async () => {
    try {
      if (!staff) return;
      const [y, m] = payrollForm.month.split('-');
      const workingDays = new Date(Number(y), Number(m), 0).getDate();
      const netSalary = Math.round((payrollForm.basicSalary / workingDays) * payrollForm.presentDays) + payrollForm.bonuses - payrollForm.deductions;

      const slip: Partial<SalarySlip> = {
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
        leaveDays: 0,
        absentDeduction: 0,
        bonus: payrollForm.bonuses,
        bonusReason: payrollForm.bonusReason,
        otherDeductions: payrollForm.deductions,
        deductionReason: payrollForm.deductionReason,
        netSalary,
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: session?.uid || ''
      };
      const salaryPrefix = getDeptPrefix(staff.dept);
      await addDoc(collection(db, `${salaryPrefix}_salary_records`), slip);
      toast.success("Salary Slip Generated");
      setShowPayrollModal(false);
      fetchData();
    } catch (e) {
      toast.error("Failed to generate slip");
    }
  };

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'manager' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    fetchData();
  }, [session, sessionLoading, fetchData, router]);

  const handleMarkDuty = async () => {
    try {
      setMarkingDuty(true);
      if (!staff) return;
      const slug = getDeptPrefix(staff.dept);
      const uid = staff.staffId;

      // 1. Record Duty Log
      await addDoc(collection(db, `${slug}_duty_logs`), {
        staffId: uid,
        dutyType: dutyForm.type,
        status: dutyForm.status,
        comment: dutyForm.comment || (dutyForm.status === 'not_completed' ? `Fine: ${dutyForm.fineReason}` : ''),
        points: dutyForm.status === 'completed' ? 10 : -5, // Penalty points
        date: serverTimestamp(),
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
          date: serverTimestamp(),
          createdAt: serverTimestamp(),
          markedBy: session?.uid,
          source: 'duty_assessment'
        });
      }

      toast.success(dutyForm.status === 'completed' ? "Duty marked successfully" : "Fine recorded successfully");
      setDutyForm({
        type: 'morning_shift',
        status: 'completed',
        comment: '',
        fineAmount: '',
        fineReason: ''
      });
      fetchData();
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
        departureTime: status === 'present' ? '17:00' : null
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


  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !staff) return;

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


  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      if (!staff) return;

      const res = await updateStaffProfile(staff.id, {
        ...editForm,
        updatedAt: serverTimestamp()
      });

      if (!res.success) throw new Error(res.error);

      toast.success("Profile updated successfully");
      fetchData();
    } catch (error) {
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

  if (loading || sessionLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-black" />
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 pb-20 ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8FAFC] text-gray-900'}`}>
      {/* Dynamic Header */}
      <div className={`border-b sticky top-0 z-20 shadow-sm transition-colors ${isDark ? 'bg-zinc-900/90 backdrop-blur-xl border-zinc-800' : 'bg-white border-gray-100'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/hq/dashboard/manager/staff" className={`flex items-center gap-2 group transition-colors ${isDark ? 'text-black hover:text-white' : 'text-black hover:text-gray-900'}`}>
            <div className={`p-2 rounded-xl ${isDark ? 'group-hover:bg-black/90' : 'group-hover:bg-gray-100'}`}><ArrowLeft size={18} /></div>
            <span className="text-xs font-black uppercase tracking-widest leading-none">Directory</span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRecalculate}
              className={`p-2.5 rounded-xl transition-all shadow-sm ${isDark ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-orange-50 text-orange-600 shadow-orange-100'}`}
              title="Recalculate Growth Points"
            >
              <Target size={18} />
            </button>
            <div className={`h-6 w-px ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`} />
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-black uppercase tracking-widest">Growth Points</p>
              <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{growthPoints?.total || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`rounded-[2.5rem] p-8 shadow-sm border flex flex-col items-center text-center relative overflow-hidden transition-colors ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
              }`}>
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-indigo-600 to-blue-700 opacity-20" />

              <div className="relative mt-4 mb-6 group">
                {staff?.photoUrl ? (
                  <img src={staff.photoUrl} className="w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-transparent shadow-2xl" />
                ) : (
                  <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-4xl font-black ring-8 shadow-inner ${isDark ? 'bg-zinc-800 text-black ring-zinc-900/50' : 'bg-gray-100 text-black ring-white'
                    }`}>
                    {staff?.name?.[0]}
                  </div>
                )}
                <label className={`absolute bottom-0 right-0 p-3 rounded-2xl shadow-xl cursor-pointer hover:scale-110 transition-transform ${isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
                  }`}>
                  <Camera size={18} />
                  <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                </label>
              </div>

              <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{staff?.name || 'Unknown Staff'}</h2>
              <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1 mb-4">{staff?.designation || 'Position N/A'}</p>

              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isDark ? 'bg-zinc-800/50 border-zinc-700 text-black' : 'bg-gray-50 border-gray-100 text-black'
                  }`}>
                  ID: {staff?.employeeId || staff?.customId || '—'}
                </span>
                {staff?.seniority && (
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-indigo-500/10 text-indigo-500 border-indigo-500/20`}>
                    {staff.seniority}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${staff?.dept === 'rehab' ? 'bg-teal-500/10 text-teal-500 border-teal-500/20' : (isDark ? 'bg-zinc-800 text-black border-zinc-700' : 'bg-gray-50 text-black')
                  }`}>
                  {staff?.dept || 'General'}
                </span>
              </div>

              <div className="w-full grid grid-cols-2 gap-4 mt-4">
                <div className={`rounded-2xl p-4 text-left ${isDark ? 'bg-zinc-800/30' : 'bg-gray-50'}`}>
                  <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1">Status</p>
                  <p className={`font-black text-xs uppercase ${staff?.isActive !== false ? 'text-teal-500' : 'text-rose-500'}`}>
                    {staff?.isActive !== false ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className={`rounded-2xl p-4 text-left ${isDark ? 'bg-zinc-800/30' : 'bg-gray-50'}`}>
                  <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1">Base Salary</p>
                  <p className={`font-black text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>₨{Number(staff?.monthlySalary || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className={`w-full mt-4 rounded-2xl p-5 text-left border-2 transition-all hover:scale-[1.02] ${isDark ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-indigo-50 border-indigo-100 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Till Date Salary</p>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500 text-white text-[8px] font-black uppercase">{presentDaysCount} Days</span>
                </div>
                <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-indigo-600'}`}>₨{tillDateSalary.toLocaleString()}</p>
                <p className="text-[9px] text-black font-bold uppercase tracking-widest mt-1">Calculated minus ₨{staff?.totalFines?.toLocaleString() || 0} fines</p>
              </div>

              <div className={`w-full mt-4 rounded-2xl p-4 text-left border ${isDark ? 'bg-zinc-800/20 border-zinc-700/50' : 'bg-amber-50/50 border-amber-100'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className={`w-3 h-3 ${isDark ? 'text-black' : 'text-amber-500'}`} />
                  <p className="text-[10px] font-black text-black uppercase tracking-widest">Portal Credentials</p>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[9px] font-black text-black uppercase tracking-widest mb-0.5">Login Email / ID</p>
                    <p className={`font-mono text-xs font-bold ${isDark ? 'text-teal-400' : 'text-indigo-600'}`}>{staff?.email || staff?.customId || 'No Email Registered'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-black uppercase tracking-widest mb-0.5">Password</p>
                    <p className={`font-mono text-xs font-bold ${isDark ? 'text-teal-400' : 'text-indigo-600'}`}>{staff?.defaultPassword || 'Custom (Reset Required)'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Card */}
            <ScoreCard
              staffName={staff?.name || 'Staff'}
              month={growthPoints?.month || new Date().toISOString().slice(0, 7)}
              scores={growthPoints ? {
                attendance: (growthPoints.attendance || 0) + (growthPoints.punctuality || 0),
                uniform: growthPoints.dressCode || 0,
                working: growthPoints.duties || 0,
                growthPoint: (growthPoints.contributions || 0) + (growthPoints.extra || 0)
              } : { attendance: 0, uniform: 0, working: 0, growthPoint: 0 }}
              darkMode={isDark}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-6">


            {/* Tabs */}
            <div className={`p-1 rounded-[1.2rem] md:rounded-[1.5rem] border flex flex-wrap items-center justify-center gap-1 transition-colors ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
              }`}>
              {[
                { id: 'profile', label: 'View Profile', icon: <User size={12} /> },
                { id: 'edit', label: 'Edit Profile', icon: <Lock size={12} /> },
                { id: 'overview', label: 'Actions', icon: <Activity size={12} /> },
                { id: 'attendance', label: 'Attendance', icon: <Calendar size={12} /> },
                { id: 'payroll', label: 'Payroll', icon: <DollarSign size={12} /> },
                { id: 'dress', label: 'Dress Code', icon: <Shield size={12} /> },
                { id: 'duties', label: 'Duty Logs', icon: <ClipboardList size={12} /> },
                { id: 'score', label: 'Score Analysis', icon: <TrendingUp size={12} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1 px-2 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl text-[7px] min-[400px]:text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                    ? (isDark ? 'bg-white text-black shadow-xl shadow-white/5' : 'bg-gray-900 text-white shadow-lg shadow-gray-900/20')
                    : 'text-black hover:text-indigo-500'
                    }`}
                >
                  <span className="opacity-70">{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>

            {/* Panels */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className={`rounded-[2.5rem] p-10 border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Staff Information Card</h3>
                        <p className="text-[10px] font-bold text-black uppercase tracking-widest">Public profile details</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('edit')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                      Request Update
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Full Identity Name</p>
                      <p className="text-sm font-black">{staff?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Professional Designation</p>
                      <p className="text-sm font-black">{staff?.designation || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Primary Department</p>
                      <p className="text-sm font-black uppercase">{staff?.dept || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Contact Phone</p>
                      <p className="text-sm font-black">{staff?.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Gender Identification</p>
                      <p className="text-sm font-black capitalize">{staff?.gender || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Blood Group</p>
                      <p className="text-sm font-black uppercase">{staff?.bloodGroup || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Joining Date</p>
                      <p className="text-sm font-black uppercase">{formatDateDMY(staff?.joiningDate)}</p>
                    </div>
                    {staff?.seniority && (
                      <div>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Staff Seniority Level</p>
                        <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-400">{staff.seniority}</p>
                      </div>
                    )}
                  </div>

                  <div className={`mt-10 p-8 rounded-3xl border border-dashed flex flex-col md:flex-row items-center justify-between gap-6 ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Clock size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Calculated Shift Duration</p>
                        <h4 className="text-2xl font-[1000] tracking-tighter text-emerald-700 dark:text-emerald-400">
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
                  <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-6 flex items-center gap-2">
                      <Shield size={14} className="text-indigo-500" /> Active Dress Code
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {staff?.dressCodeConfig?.length ? staff.dressCodeConfig.map(i => (
                        <span key={i.key} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-100'}`}>{i.label}</span>
                      )) : <p className="text-xs text-black italic">No configuration found</p>}
                    </div>
                  </div>
                  <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-6 flex items-center gap-2">
                      <ClipboardList size={14} className="text-teal-500" /> Operational Duties
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {staff?.dutyConfig?.length ? staff.dutyConfig.map(i => (
                        <span key={i.key} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-100'}`}>{i.label}</span>
                      )) : <p className="text-xs text-black italic">No configuration found</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-6">

                {/* Special Tasks Module */}
                <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-colors ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
                  }`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <Sparkles className="text-purple-500" /> Special Tasks & Missions
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mb-6">
                    <input
                      type="text"
                      className={`flex-1 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ${isDark ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-gray-900'
                        }`}
                      placeholder="Describe the temporary task..."
                      value={newTaskText}
                      onChange={e => setNewTaskText(e.target.value)}
                    />
                    <select
                      className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none border-none ${isDark ? 'bg-zinc-800 text-purple-400' : 'bg-gray-50 text-purple-600'}`}
                      value={newTaskRecurrence}
                      onChange={e => setNewTaskRecurrence(e.target.value as any)}
                    >
                      <option value="once">Once</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
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
                        <div key={task.id} className={`p-4 rounded-2xl border flex items-center justify-between ${task.status === 'completed' ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100') :
                          isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-gray-50 border-gray-100'
                          }`}>
                          <div>
                            <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-black font-bold uppercase tracking-widest">By {task.assignedByName}</p>
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

                {/* Today's Quick Operations Assessment */}
                <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-colors ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
                  }`}>
                  <div className="flex flex-col sm:flex-row justify-between mb-8">
                    <div>
                      <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <Award className="text-indigo-500" /> Today&apos;s Daily Checklist
                      </h3>
                      <p className="text-[10px] text-black font-bold uppercase tracking-widest mt-1">{formatDateDMY(new Date(todayStr))}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                              <span className={`text-xs font-bold ${isDark ? 'text-black' : 'text-black'}`}>{dress.label}</span>
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
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${attendanceMap[todayStr]?.arrivalTime ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20" : (isDark ? "bg-zinc-800 text-black" : "bg-gray-100 text-black")}`}
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
                              <span className={`text-xs font-bold ${isDark ? 'text-black' : 'text-black'}`}>{duty.label}</span>
                              <HqCheckCell type="duty" size="md" value={status} onToggle={(next) => toggleDuty(todayStr, duty.key, next)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={`mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
                    <span className="text-[10px] font-black text-black uppercase tracking-widest">Attendance</span>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => toggleAttendance(todayStr, 'present')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${attendanceMap[todayStr]?.status === 'present' ? 'bg-teal-500 text-white' : (isDark ? 'bg-zinc-800 text-black' : 'bg-gray-100 text-black')}`}>Present</button>
                      <button onClick={() => toggleAttendance(todayStr, 'absent')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${attendanceMap[todayStr]?.status === 'absent' ? 'bg-rose-500 text-white' : (isDark ? 'bg-zinc-800 text-black' : 'bg-gray-100 text-black')}`}>Absent</button>
                      <button onClick={() => toggleAttendance(todayStr, 'paid_leave')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${attendanceMap[todayStr]?.status === 'paid_leave' ? 'bg-blue-500 text-white' : (isDark ? 'bg-zinc-800 text-black' : 'bg-gray-100 text-black')}`}>Paid Leave</button>
                      <button onClick={() => toggleAttendance(todayStr, 'unpaid_leave')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${attendanceMap[todayStr]?.status === 'unpaid_leave' ? 'bg-purple-500 text-white' : (isDark ? 'bg-zinc-800 text-black' : 'bg-gray-100 text-black')}`}>Unpd Leave</button>
                    </div>
                  </div>
                </div>

                {/* Mark Duty Module */}
                <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-colors ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
                  }`}>
                  <h3 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <Award className="text-indigo-500" /> Assess Daily Duty
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1 mb-1 block">Duty Type</label>
                        <select
                          className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ${isDark ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-gray-900'
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
                            : (isDark ? 'bg-zinc-800 border-zinc-700 text-black' : 'bg-white border-gray-100 text-black')
                            }`}
                        >Completed</button>
                        <button
                          onClick={() => setDutyForm({ ...dutyForm, status: 'not_completed' })}
                          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${dutyForm.status === 'not_completed'
                            ? 'bg-rose-500 border-rose-500 text-white shadow-lg'
                            : (isDark ? 'bg-zinc-800 border-zinc-700 text-black' : 'bg-white border-gray-100 text-black')
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
                              className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ${isDark ? 'bg-zinc-800 text-white' : 'bg-rose-50 text-rose-900 placeholder:text-rose-300'}`}
                              value={dutyForm.fineAmount}
                              onChange={e => setDutyForm({ ...dutyForm, fineAmount: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1 mb-1 block">Reason for Fine</label>
                            <input
                              type="text"
                              placeholder="Late arrival / Misbehavior / etc."
                              className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ${isDark ? 'bg-zinc-800 text-white' : 'bg-rose-50 text-rose-900 placeholder:text-rose-300'}`}
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
                        className={`w-full border-none rounded-2xl px-4 py-4 text-sm font-medium outline-none h-full min-h-[120px] md:min-h-[100px] ${isDark ? 'bg-zinc-800 text-white placeholder:text-black' : 'bg-gray-50 text-gray-900'
                          }`}
                        value={dutyForm.comment}
                        onChange={e => setDutyForm({ ...dutyForm, comment: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleMarkDuty}
                    disabled={markingDuty}
                    className={`w-full py-4 mt-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all ${isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-gray-900 text-white hover:bg-black'
                      }`}
                  >
                    {markingDuty ? 'Recording...' : 'Finalize Assessment'}
                  </button>
                </div>

                {dutyLogs.length === 0 ? <div className="p-20 text-center text-black font-bold uppercase tracking-widest text-[10px]">No history found</div> : (
                  dutyLogs.map(log => (
                    <div key={log.id} className={`p-6 rounded-[2.5rem] shadow-sm border flex items-start gap-4 transition-all hover:scale-[1.01] ${isDark ? 'bg-zinc-900/50 border-zinc-800 hover:border-indigo-500/50' : 'bg-white border-gray-100 hover:border-indigo-200'
                      }`}>
                      <div className={`p-3 rounded-2xl ${log.status === 'completed' ? 'bg-teal-500/10 text-teal-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        <Award size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-black capitalize text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{log.dutyType?.replace(/_/g, ' ')}</h4>
                            <p className="text-[10px] text-black font-bold uppercase tracking-widest mt-0.5">{formatStaffDate(log.date || log.createdAt)}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.status === 'completed' ? 'bg-teal-500/20 text-teal-500' : 'bg-rose-500/20 text-rose-500'
                            }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className={`text-sm mt-3 italic leading-relaxed ${isDark ? 'text-black' : 'text-black'}`}>{log.comment || 'No assessment recorded'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Monthly Attendance Grid</h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black border-none outline-none ${isDark ? 'bg-zinc-800 text-white' : 'bg-gray-100 text-gray-900'}`}
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
                                  ? (isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600')
                                  : (isDark ? 'bg-zinc-800 text-black' : 'bg-gray-100 text-black')
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
                                  value={attendanceMap[d]?.arrivedOnTime ? 'yes' : attendanceMap[d]?.arrivedOnTime === false ? 'no' : 'na'}
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
                                  ? (isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-50 text-rose-600')
                                  : (isDark ? 'bg-zinc-800 text-black' : 'bg-gray-100 text-black')
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
                                value={attendanceMap[d]?.departedOnTime ? 'yes' : attendanceMap[d]?.departedOnTime === false ? 'no' : 'na'}
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
              <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
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
              <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
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
                <div className={`rounded-[2.5rem] p-10 border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'}`}>
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
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Synchronizing...' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                {/* Section 1: Work Identity */}
                <div className={`rounded-[2.5rem] p-10 border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
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
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
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
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-900 border-indigo-500/30 text-indigo-300 focus:border-indigo-500' : 'bg-indigo-50 border-indigo-100 text-indigo-700 focus:border-indigo-500'}`}
                      />
                      <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-2 ml-2">Warning: Changes affect login</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Full Legal Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Professional Designation</label>
                      <input
                        type="text"
                        value={editForm.designation}
                        placeholder="Senior Nurse / Manager"
                        onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Seniority Status</label>
                      <select
                        value={editForm.seniority}
                        onChange={e => setEditForm({ ...editForm, seniority: e.target.value })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-indigo-500/30 text-indigo-300 focus:border-indigo-500' : 'bg-indigo-50 border-indigo-100 text-indigo-700 focus:border-indigo-500'}`}
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
                          className={`w-full h-14 pl-14 pr-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Primary Department</label>
                      <select
                        value={editForm.department}
                        onChange={e => setEditForm({ ...editForm, department: e.target.value as StaffDept })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
                      >
                        {['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'].map(d => (
                          <option key={d} value={d}>{d.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className={`p-4 rounded-2xl border border-dashed flex flex-col justify-center ${isDark ? 'border-zinc-800 bg-zinc-900/20' : 'border-gray-200 bg-gray-50/50'}`}>
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
                              : (isDark ? 'bg-zinc-800 border-zinc-700 text-black' : 'bg-white border-gray-200 text-black')
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
                <div className={`rounded-[2.5rem] p-10 border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
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
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Gender</label>
                        <select
                          value={editForm.gender}
                          onChange={e => setEditForm({ ...editForm, gender: e.target.value as any })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
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
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Joining Date</label>
                        <input
                          type="date"
                          value={editForm.joiningDate}
                          onChange={e => setEditForm({ ...editForm, joiningDate: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
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
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
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
                            className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-orange-500/20 text-white focus:border-orange-500' : 'bg-orange-50/30 border-orange-100 text-gray-900 focus:border-orange-500'}`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Emergency Phone</label>
                          <input
                            type="text"
                            placeholder="03xx-xxxxxxx"
                            value={editForm.emergencyPhone}
                            onChange={e => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                            className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-orange-500/20 text-white focus:border-orange-500' : 'bg-orange-50/30 border-orange-100 text-gray-900 focus:border-orange-500'}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Operations & Extensions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Custom Basic Info */}
                  <div className={`rounded-[2.5rem] p-10 border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
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
                          <div className={`flex-1 p-4 rounded-2xl text-[10px] font-bold border transition-all flex flex-wrap gap-x-2 items-center ${isDark ? 'bg-zinc-800/50 border-zinc-700 text-black' : 'bg-gray-50 border-gray-100 text-black'}`}>
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
                        className={`flex-1 min-w-0 h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-amber-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500'}`}
                        value={newExtraField.key}
                        onChange={e => setNewExtraField({ ...newExtraField, key: e.target.value })}
                      />
                      <input
                        placeholder="Value"
                        className={`flex-1 min-w-0 h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-amber-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500'}`}
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
                  <div className={`rounded-[2.5rem] p-10 border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
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
                          className={`w-full h-16 px-6 rounded-[2rem] text-xl font-black outline-none border-4 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500'}`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Duty End</label>
                        <input
                          type="time"
                          value={editForm.dutyEndTime}
                          onChange={e => setEditForm({ ...editForm, dutyEndTime: e.target.value })}
                          className={`w-full h-16 px-6 rounded-[2rem] text-xl font-black outline-none border-4 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Advanced Configuration */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Dress Code Config */}
                  <div className={`p-10 rounded-[2.5rem] border transition-all ${isDark ? 'bg-zinc-800/20 border-zinc-700/50' : 'bg-gray-100/50 border-gray-200'}`}>
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
                      <div className={`p-6 rounded-[2rem] border-2 mb-8 transition-all animate-in zoom-in-95 duration-200 ${isDark ? 'bg-zinc-900/80 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'bg-white border-indigo-200 shadow-xl shadow-indigo-500/10'}`}>
                        <div className="flex flex-col gap-4">
                          {addingConfig.mode === 'select' ? (
                            <select
                              className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`}
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
                              className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 focus:border-indigo-500 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
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
                            <button onClick={() => { setAddingConfig(null); setAddingConfigSelection(''); setAddingConfigCustom(''); }} className={`px-8 h-14 text-[10px] font-black uppercase tracking-widest border-2 rounded-2xl transition-all ${isDark ? 'border-zinc-700 text-black hover:bg-black/90' : 'border-gray-200 text-black hover:bg-white'}`}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {editForm.dressCodeConfig.map((item, idx) => (
                        <div key={item.key} className={`flex items-center justify-between p-5 rounded-2xl border transition-all hover:scale-[1.02] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-200'}`}>
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
                  <div className={`p-10 rounded-[2.5rem] border transition-all ${isDark ? 'bg-zinc-800/20 border-zinc-700/50' : 'bg-gray-100/50 border-gray-200'}`}>
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
                      <div className={`p-6 rounded-[2rem] border-2 mb-8 transition-all animate-in zoom-in-95 duration-200 ${isDark ? 'bg-zinc-900/80 border-teal-500/30 shadow-[0_0_30px_rgba(20,184,166,0.2)]' : 'bg-white border-teal-200 shadow-xl shadow-teal-500/10'}`}>
                        <div className="flex flex-col gap-4">
                          {addingConfig.mode === 'select' ? (
                            <select
                              className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-teal-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-teal-500'}`}
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
                              className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 focus:border-teal-500 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
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
                            <button onClick={() => { setAddingConfig(null); setAddingConfigSelection(''); setAddingConfigCustom(''); }} className={`px-8 h-14 text-[10px] font-black uppercase tracking-widest border-2 rounded-2xl transition-all ${isDark ? 'border-zinc-700 text-black hover:bg-black/90' : 'border-gray-200 text-black hover:bg-white'}`}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {editForm.dutyConfig.map((item, idx) => (
                        <div key={item.key} className={`flex items-center justify-between p-5 rounded-2xl border transition-all hover:scale-[1.02] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-200'}`}>
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
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-black' : 'text-black'}`}>
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
                  <div className={`p-8 rounded-[2.5rem] border transition-all ${isDark ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-50 border-rose-100'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0`}>
                          <AlertTriangle size={32} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-rose-500 mb-1">Danger Zone</h4>
                          <p className={`text-xs font-bold leading-relaxed ${isDark ? 'text-black' : 'text-black'}`}>
                            Permanently delete this staff profile and all associated data records.<br />
                            This action cannot be undone and will revoke all access immediately.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-8 py-4 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all hover:scale-105 shadow-xl shadow-rose-500/20 flex items-center gap-3"
                      >
                        <Trash2 size={16} />
                        Delete Staff Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deletion Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />
                <div className={`relative w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-100'}`}>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
                      <Trash2 size={40} />
                    </div>
                    <h3 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>Confirm Deletion</h3>
                    <p className={`text-sm font-bold leading-relaxed mb-8 ${isDark ? 'text-black' : 'text-black'}`}>
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
                        className={`flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${isDark ? 'border-zinc-700 text-black hover:bg-black/90' : 'border-gray-200 text-black hover:bg-white'
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

            {activeTab === 'payroll' && (
              <div className="space-y-6">
                <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                        <DollarSign size={16} /> Payroll History
                      </h3>
                      <p className="text-[10px] font-black text-black uppercase tracking-widest">Financial Performance Audit</p>
                    </div>
                    <button
                      onClick={() => {
                        setPayrollForm(p => ({ ...p, basicSalary: staff?.monthlySalary || 0 }));
                        setShowPayrollModal(!showPayrollModal);
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showPayrollModal ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : (isDark ? 'bg-zinc-800 text-amber-500' : 'bg-amber-50 text-amber-600')}`}
                    >
                      {showPayrollModal ? 'Cancel' : 'Generate Slip'}
                    </button>
                  </div>

                  {showPayrollModal && (
                    <div className={`p-6 rounded-3xl border mb-8 ${isDark ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50/50 border-amber-100'}`}>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-4">Draft New Salary Record</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Month (YYYY-MM)</label>
                          <input type="month" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}`} value={payrollForm.month} onChange={e => setPayrollForm({ ...payrollForm, month: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Basic Salary (PKR)</label>
                          <input type="number" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}`} value={payrollForm.basicSalary} onChange={e => setPayrollForm({ ...payrollForm, basicSalary: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Present Days</label>
                          <input type="number" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}`} value={payrollForm.presentDays} onChange={e => setPayrollForm({ ...payrollForm, presentDays: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Bonuses (PKR)</label>
                          <input type="number" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}`} value={payrollForm.bonuses} onChange={e => setPayrollForm({ ...payrollForm, bonuses: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Bonus Reason</label>
                          <input type="text" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}`} value={payrollForm.bonusReason} onChange={e => setPayrollForm({ ...payrollForm, bonusReason: e.target.value })} placeholder="e.g. Performance" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Deductions (PKR)</label>
                          <input type="number" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}`} value={payrollForm.deductions} onChange={e => setPayrollForm({ ...payrollForm, deductions: Number(e.target.value) })} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black ml-2 mb-1 block">Deduction Reason</label>
                          <input type="text" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border-none ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}`} value={payrollForm.deductionReason} onChange={e => setPayrollForm({ ...payrollForm, deductionReason: e.target.value })} placeholder="e.g. Absences" />
                        </div>
                      </div>
                      <button onClick={handleGenerateSlip} className="w-full py-3 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20">Finalize Slip</button>
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
                        <div key={record.id} className={`p-6 rounded-[2.5rem] border transition-all hover:scale-[1.01] ${isDark ? 'bg-zinc-800/30 border-zinc-700/50 hover:border-amber-500/30' : 'bg-gray-50 border-gray-100 hover:border-amber-200'
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
                                <h4 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>
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
                                    {(record as any).presentDays || 0} Working Days
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="md:text-right">
                              <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>₨{Number((record as any).netSalary || (record as any).amount || 0).toLocaleString()}</p>
                              <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">Net Payable Amount</p>
                            </div>
                          </div>

                          <div className={`mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-dashed ${isDark ? 'border-dashed border-zinc-700/50' : 'border-gray-200'}`}>
                            <div>
                              <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Base Earnings</p>
                              <p className={`text-xs font-bold ${isDark ? 'text-black' : 'text-black'}`}>
                                ₨{Math.round(((record as any).basicSalary || 0) / 30 * ((record as any).presentDays || 0)).toLocaleString()}
                              </p>
                              <p className="text-[9px] text-black mt-1 uppercase font-black">Pro-rated attendance</p>
                            </div>

                            {((record as any).bonus > 0) && (
                              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Performance Bonus (+)</p>
                                <p className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  ₨{(record as any).bonus.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-emerald-500/60 mt-1 font-medium leading-tight">Reason: {(record as any).bonusReason || 'Incentive'}</p>
                              </div>
                            )}

                            {((record as any).otherDeductions > 0) && (
                              <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Other Deductions (-)</p>
                                <p className={`text-xs font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
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
                </div>
              </div>
            )}

            {/* Score History (Always show in Score tab) */}
            {activeTab === 'score' && (
              <div className="space-y-6">
                {/* Score Breakdown Analysis */}
                <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'}`}>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Performance Breakdown</h3>
                      <p className="text-[10px] font-bold text-black uppercase tracking-widest mt-1">
                        Cycle: {growthPoints?.month ? new Date(growthPoints.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Current Month'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest ${isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}>
                        Total: {growthPoints?.total || 0}
                      </span>
                      <button onClick={handleRecalculate} className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-sm">
                        <RefreshCw size={14} className={saving ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Attendance', score: growthPoints?.attendance || 0, max: (growthPoints?.workingDays || 0) * 1, icon: <Calendar size={18} />, color: 'text-teal-500', bg: 'bg-teal-500/10' },
                      { label: 'Punctuality', score: growthPoints?.punctuality || 0, max: (growthPoints?.workingDays || 0) * 2, icon: <Clock size={18} />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                      { label: 'Uniform', score: growthPoints?.dressCode || 0, max: (growthPoints?.workingDays || 0) * (staff?.dressCodeConfig?.length || 4), icon: <Shield size={18} />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                      { label: 'Duties', score: growthPoints?.duties || 0, max: (growthPoints?.workingDays || 0) * (staff?.dutyConfig?.length || 4), icon: <ClipboardList size={18} />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    ].map((stat, i) => (
                      <div key={i} className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-gray-50 border-gray-200/50'} flex flex-col items-center text-center group hover:scale-[1.02] transition-all`}>
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                          {stat.icon}
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-1">{stat.label}</h4>
                        <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.score}</p>
                        <div className="w-full h-1 bg-zinc-700/20 rounded-full mt-4 overflow-hidden">
                          <div
                            className={`h-full ${stat.bg.replace('/10', '')} transition-all duration-1000`}
                            style={{ width: `${Math.min(100, (stat.score / (stat.max || 1)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[9px] font-bold text-black uppercase tracking-widest mt-2">
                          Efficiency: {Math.round((stat.score / (stat.max || 1)) * 100)}%
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-8 p-6 rounded-3xl border border-dashed ${isDark ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50/50 border-indigo-100'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                        <Sparkles size={14} />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Merits & Contributions</h4>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Extra Points: {growthPoints?.extra || 0}</p>
                        <p className="text-[10px] font-bold text-black uppercase tracking-widest leading-relaxed">Recorded for volunteer work, over-time, and exceptional behavior.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Global Ranking</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-black' : 'text-black'}`}>T-3 Management Candidate</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-black italic">Chronological Growth Audit</h3>
                      <p className="text-[10px] font-bold text-black uppercase tracking-widest mt-1">Verified historical data blocks</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {growthHistory.length === 0 ? (
                      <div className="py-12 text-center text-black font-bold uppercase tracking-widest text-[10px]">No historical cycles found</div>
                    ) : (
                      growthHistory.map((h: any) => (
                        <div key={h.id} className={`p-5 rounded-[2rem] border flex items-center justify-between transition-all hover:border-indigo-500/30 ${isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-zinc-900 text-indigo-400' : 'bg-white text-indigo-600 shadow-sm'}`}>
                              <Calendar size={20} />
                            </div>
                            <div>
                              <p className={`text-md font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-tighter`}>{new Date(h.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                              <p className="text-[10px] font-bold text-black uppercase tracking-widest">Aggregated Strength: {h.total || 0} pts</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${(h.total || 0) >= 100 ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'
                              }`}>
                              {(h.total || 0) >= 100 ? 'Senior Expert' : 'Standard Staff'}
                            </span>
                            <p className="text-[8px] font-black text-black uppercase tracking-[0.2em]">Validated Cycle</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Time Entry Popup */}
      {timePopup.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setTimePopup({ ...timePopup, isOpen: false })} />
          <div className={`relative w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border animate-in zoom-in-95 duration-200 ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 text-gray-900'
            }`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black italic tracking-tight">Shift Timing</h3>
                <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">
                  Entry for {formatDateDMY(new Date(timePopup.date))}
                </p>
              </div>
              <button
                onClick={() => setTimePopup({ ...timePopup, isOpen: false })}
                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-black/90 text-black' : 'hover:bg-gray-100 text-black'}`}
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
                  className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-indigo-500'
                    }`}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-2 mb-2 block">Departure Time</label>
                <input
                  type="time"
                  value={timePopup.departureTime}
                  onChange={e => setTimePopup({ ...timePopup, departureTime: e.target.value })}
                  className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-indigo-500'
                    }`}
                />
              </div>

              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${isDark ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                <AlertCircle size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-[9px] font-bold leading-relaxed text-indigo-500/70 uppercase tracking-wider">
                  Setting these times will mark the staff as present for this specific date only.
                </p>
              </div>

              <button
                onClick={handleTimePopupSave}
                disabled={saving}
                className="w-full h-14 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
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
          <div className={`relative w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border animate-in zoom-in-95 duration-200 ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 text-gray-900'
            }`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black italic tracking-tight text-amber-500">Attendance Note</h3>
                <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">
                  Context for {formatDateDMY(new Date(notePopup.date))}
                </p>
              </div>
              <button
                onClick={() => setNotePopup({ ...notePopup, isOpen: false })}
                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-black/90 text-black' : 'hover:bg-gray-100 text-black'}`}
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
                  className={`w-full min-h-[120px] p-6 rounded-2xl text-sm font-bold outline-none border-2 transition-all resize-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-amber-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-amber-500'
                    }`}
                />
              </div>

              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${isDark ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50 border-amber-100'}`}>
                <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[9px] font-bold leading-relaxed text-amber-500/70 uppercase tracking-wider">
                  This note will be visible in the attendance audit history.
                </p>
              </div>

              <button
                onClick={handleSaveNote}
                className="w-full h-14 rounded-2xl bg-amber-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}