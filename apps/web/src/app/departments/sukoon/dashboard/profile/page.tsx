// src/app/departments/sukoon/dashboard/profile/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  doc, getDoc, updateDoc, collection, query, where, getDocs, 
  orderBy, limit 
} from 'firebase/firestore';
import { 
  User, Camera, Loader2, Shield, 
  CheckCircle, Phone, Calendar, 
  Shirt, Award, Clock, Target, DollarSign,
  TrendingUp, Activity, MapPin, Mail, Briefcase,
  AlertCircle, ChevronRight, Download, Info, Sparkles,
  Heart, CheckCircle2, XCircle, FileText, Eye, LogOut, CreditCard,
  ClipboardList, Coins
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY, toDate } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { useVisibleSections } from '@/hooks/useVisibleSections';

// --- Enhanced Types matched with HQ data schema ---
interface AttendanceLog {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'late' | 'paid_leave' | 'unpaid_leave' | 'unmarked';
  arrivalTime?: string;
  departureTime?: string;
  arrivedOnTime?: boolean;
  departedOnTime?: boolean;
  note?: string;
}

interface DutyRecord {
  id: string;
  date: string;
  dutyType?: string; // Legacy backup
  status?: string; // Legacy backup
  duties?: Array<{ key: string; label: string; status: 'done' | 'not_done' | 'na' }>;
}

interface DressRecord {
  id: string;
  date: string;
  status?: 'yes' | 'no'; // Legacy backup
  items?: Array<{ key: string; label: string; status: 'yes' | 'no' | 'na' }>;
}

interface SpecialTask {
  id: string;
  description: string;
  status: 'assigned' | 'acknowledged' | 'completed';
  date?: string;
  dueDate?: string;
  createdAt?: string;
  points?: number;
}

interface FineRecord {
  id: string;
  amount: number;
  reason: string;
  date: string;
}

interface GrowthRecord {
  id: string;
  points: number;
  reason: string;
  category: string;
  date?: string;
  createdAt?: any;
  month?: string;
}

interface SalarySlip {
  id: string;
  month: string;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid';
  basicSalary: number;
  absentDeduction: number;
  bonus: number;
  otherDeductions: number;
  presentDays: number;
  dailyWage?: number;
  leaveDays?: number;
  unpaidLeaveDays?: number;
  absentDays?: number;
  bonusReason?: string;
  deductionReason?: string;
}

// Helper to translate raw duty item keys to beautiful labels
function getDutyLabel(item: any, profile: any) {
  if (item.label) return item.label;
  
  // Look up in profile's dutyConfig
  const configItem = profile?.dutyConfig?.find((c: any) => c.key === item.key);
  if (configItem?.label) return configItem.label;
  
  // Custom manual mappings matching HQ configurations and user requests
  const keyMap: Record<string, string> = {
    'morning': 'Morning Duty',
    'afternoon': 'Afternoon Duty',
    'evening': 'Evening Duty',
    'attendance': 'Attendance Entry',
    'vitals': 'Patient Vitals',
    'ward_round': 'Ward Round',
    'cleanliness': 'Area Cleanliness',
    'prayer': 'Morning Prayer Supervision',
    'fajar': 'Fajar Wake-up Round',
    'meds_morning': 'Medication Distribution (Morning)',
    'meds_night': 'Medication Distribution (Night)',
    'meal_breakfast': 'Meal Supervision (Breakfast)',
    'meal_lunch': 'Meal Supervision (Lunch)',
    'meal_dinner': 'Meal Supervision (Dinner)',
    'monitoring': 'Patient Activity Monitoring',
    'counselling': 'Counselling Session Support',
    'vital_signs': 'Vital Signs Check',
    'security_round': 'Night Security Round',
    'gate': 'Gate/Entry Management',
    'cleaning_supervision': 'Cleaning Supervision',
    'visitor_management': 'Visitor Management'
  };

  if (keyMap[item.key]) return keyMap[item.key];
  
  // Fallback to capitalizing the key
  return item.key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Helper to translate raw dress item keys to beautiful labels
function getDressLabel(item: any, profile: any) {
  if (item.label) return item.label;
  
  // Look up in profile's dressCodeConfig
  const configItem = profile?.dressCodeConfig?.find((c: any) => c.key === item.key);
  if (configItem?.label) return configItem.label;

  // Custom manual mappings matching HQ configurations, UNIFORM_RULES, and user requests
  const keyMap: Record<string, string> = {
    'uniform': 'Uniform Shirt',
    'black_suit': 'Black OT Kit / Black Suit',
    'black_ot_kit': 'Black OT Kit / Black Suit',
    'white_overall': 'White Overall',
    'shoes': 'Polished Shoes',
    'id_card': 'Employee Card',
    'card': 'Employee Card',
    'hijab': 'Hijab',
    'pant': 'Dress Pant',
    'shirt': 'Dress Shirt',
    'tie': 'Tie',
    'lab_coat': 'Lab Coat',
    'security_uniform': 'Security Uniform',
    'security_cap': 'Security Cap',
    'torch': 'Torch',
    'whistle': 'Whistle'
  };

  if (keyMap[item.key]) return keyMap[item.key];

  // Fallback to capitalizing the key
  return item.key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const getDeptPrefix = (dept: string): string => {
  const d = String(dept || '').toLowerCase();
  if (d === 'job-center' || d === 'job_center') return 'jobcenter';
  if (d === 'social-media' || d === 'social_media') return 'media';
  return d.replace('-', '_');
};

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [profile, setProfile] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string>('tasks');
  
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [duties, setDuties] = useState<DutyRecord[]>([]);
  const [dressLogs, setDressLogs] = useState<DressRecord[]>([]);
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [growthHistory, setGrowthHistory] = useState<GrowthRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalarySlip[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showSalaryBreakdownModal, setShowSalaryBreakdownModal] = useState(false);
  const [contributionsMap, setContributionsMap] = useState<Record<string, any>>({});
  const [selectedDay, setSelectedDay] = useState<any | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Fetch visibility settings using standard hook
  const { sections, loading: visibilityLoading } = useVisibleSections('sukoon', 'staff', session?.uid || '');

  // Design Tokens for Clean Minimalism
  const cardStyle = "bg-white border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl transition-all";
  const inputStyle = "bg-gray-50 border-gray-100 rounded-xl px-4 py-3 w-full border focus:ring-2 focus:ring-sky-500/20 outline-none text-sm transition-all text-gray-800";

  // Dynamic Navigation Tabs filtered by visibleSections claims
  const visibleTabs = useMemo(() => {
    const list = [
      { id: 'tasks' as const, label: 'Special Tasks', icon: Target, visible: sections.reports !== false },
      { id: 'attendance' as const, label: 'Attendance', icon: Calendar, visible: sections.attendance !== false },
      { id: 'duty' as const, label: 'Duties', icon: Briefcase, visible: sections.duties !== false },
      { id: 'dress' as const, label: 'Dress Code', icon: Shirt, visible: sections.uniform !== false },
      { id: 'score' as const, label: 'Score', icon: Award, visible: sections.growthPoints !== false },
      { id: 'finance' as const, label: 'Financial', icon: DollarSign, visible: sections.salary !== false },
      { id: 'documents' as const, label: 'Documents', icon: FileText, visible: true },
      { id: 'profile' as const, label: 'Identity', icon: Info, visible: true },
    ];
    return list.filter(t => t.visible);
  }, [sections]);

  // IntersectionObserver: update active tab as user scrolls
  useEffect(() => {
    if (visibilityLoading) return;
    const observers: IntersectionObserver[] = [];
    visibleTabs.forEach(tab => {
      const el = sectionRefs.current[tab.id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(tab.id); },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [visibleTabs, visibilityLoading]);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    try {
      setUploadingPhoto(true);
      const url = await uploadToCloudinary(file, 'Khan Hub/sukoon/profile');
      await updateDoc(doc(db, 'sukoon_users', session.uid), { photoUrl: url });
      setProfile((p: any) => ({ ...p, photoUrl: url }));
      toast.success('Official identity photograph updated');
    } catch (e) {
      toast.error('Upload transmission failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sukoon_session');
    router.push('/departments/sukoon/login');
  };

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

  const getCalendarCells = () => {
    if (!selectedMonth) return [];
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    
    // Day index of 1st day of month (0 = Sun, 1 = Mon...)
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonthList = new Date(year, month, 0).getDate();
    
    // Convert to Monday start index (0 = Mon, 6 = Sun)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const cells = [];
    // Pad initial days
    for (let i = 0; i < adjustedFirstDay; i++) {
      cells.push(null);
    }
    // Add real days
    for (let i = 1; i <= daysInMonthList; i++) {
      cells.push(i);
    }
    return cells;
  };

  const computedScores = useMemo(() => {
    const days = daysInMonth();
    let attScore = 0;
    let punctScore = 0;
    let uniScore = 0;
    let workScore = 0;
    let finesTotal = 0;

    let presents = 0;
    let absents = 0;
    let lates = 0;
    let leaves = 0;
    let unmarked = 0;

    let dressTotalDays = 0;
    let dutyTotalDays = 0;
    let totalDailyPointsSum = 0;

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

    const attMap: Record<string, any> = {};
    attendance.forEach(a => { 
      const existing = attMap[a.date];
      if (!existing || getAttendancePriority(a.status) > getAttendancePriority(existing.status)) {
        attMap[a.date] = a; 
      }
    });

    const dressMap: Record<string, any> = {};
    dressLogs.forEach(d => { 
      const existing = dressMap[d.date];
      if (!existing || getDressPriority(d.status) > getDressPriority(existing.status)) {
        dressMap[d.date] = d; 
      }
    });

    const dutyMap: Record<string, any> = {};
    duties.forEach(d => { 
      const existing = dutyMap[d.date];
      if (!existing || getDutyPriority(d.status) > getDutyPriority(existing.status)) {
        dutyMap[d.date] = d; 
      }
    });

    const fineMap: Record<string, any[]> = {};
    fines.forEach(f => {
      if (f.date) {
        if (!fineMap[f.date]) fineMap[f.date] = [];
        fineMap[f.date].push(f);
      }
    });

    const dailyBreakdown: any[] = [];

    days.forEach(day => {
      // Day Fines
      const dayFinesList = fineMap[day] || [];
      const dayFines = dayFinesList.reduce((acc: number, f: any) => acc + (Number(f.amount) || 0), 0);
      finesTotal += dayFines;

      // 1. Attendance: 1 point if present and NOT late
      const att = attMap[day];
      let attStatus = 'unmarked';
      let isLate = false;
      if (att) {
        attStatus = att.status || 'unmarked';
        isLate = (att.isLate === true || attStatus === 'late') && attStatus !== 'present';
        if (attStatus === 'present' && !isLate) {
          attScore++;
        }
        if (att.arrivedOnTime !== false && !isLate) {
          punctScore++;
        }
      }

      let attendanceStatus = 'unmarked';
      if (attStatus === 'paid_leave' || attStatus === 'unpaid_leave' || attStatus === 'leave') {
        attendanceStatus = 'leave';
      } else if (['present', 'absent', 'late', 'unmarked', 'leave'].includes(attStatus)) {
        attendanceStatus = attStatus;
      }
      if (isLate && attendanceStatus === 'present') {
        attendanceStatus = 'late';
      }

      if (attendanceStatus === 'present') presents++;
      else if (attendanceStatus === 'late') lates++;
      else if (attendanceStatus === 'absent') absents++;
      else if (attendanceStatus === 'leave') leaves++;
      else unmarked++;

      const onLeave = attendanceStatus === 'leave';

      // 3. Uniform: 1 point if all items are compliant
      const dress = dressMap[day];
      let uniformStatus = 'no';
      if (onLeave) {
        uniformStatus = 'na';
      } else if (dress) {
        uniformStatus = dress.status || 'no';
      } else {
        uniformStatus = 'unmarked';
      }

      if (!onLeave && uniformStatus !== 'unmarked') {
        dressTotalDays++;
        let isDressCompliant = false;
        if (dress) {
          if (dress.status === 'yes' || dress.isCompliant === true) {
            isDressCompliant = true;
          } else {
            const config = profile?.dressCodeConfig || [];
            const items = dress.items || [];
            if (config.length === 0) {
              if (dress.status !== 'no') isDressCompliant = true;
            } else {
              const missing = config.filter((c: any) => {
                const item = items.find((i: any) => i.key === c.key);
                return !item || item.status === 'no' || item.wearing === false;
              });
              if (missing.length === 0) isDressCompliant = true;
            }
          }
        }
        if (isDressCompliant) {
          uniScore++;
          uniformStatus = 'yes';
        } else {
          uniformStatus = 'incomplete';
        }
      }

      // 4. Working (Duties): 1 point if all duties are done
      const duty = dutyMap[day];
      let dutyStatus = 'no';
      if (onLeave) {
        dutyStatus = 'na';
      } else if (duty) {
        dutyStatus = duty.status || 'no';
      } else {
        dutyStatus = 'unmarked';
      }

      if (!onLeave && dutyStatus !== 'unmarked') {
        dutyTotalDays++;
        let isDutyCompliant = false;
        if (duty) {
          if (duty.status === 'yes' || duty.status === 'completed') {
            isDutyCompliant = true;
          } else {
            const config = profile?.dutyConfig || [];
            const items = duty.duties || [];
            if (config.length === 0) {
              if (duty.status !== 'no' && duty.status !== 'failed') isDutyCompliant = true;
            } else {
              const pending = config.filter((c: any) => {
                const item = items.find((i: any) => i.key === c.key);
                return !item || item.status === 'pending' || item.status === 'not_done';
              });
              if (pending.length === 0) isDutyCompliant = true;
            }
          }
        }
        if (isDutyCompliant) {
          workScore++;
          dutyStatus = 'yes';
        } else {
          dutyStatus = 'incomplete';
        }
      }

      // Daily point rules
      const attPoint = (attendanceStatus === 'present') ? 1 : 0;
      const uniformPoint = (!onLeave && uniformStatus === 'yes') ? 1 : 0;
      const dutyPoint = (!onLeave && dutyStatus === 'yes') ? 1 : 0;
      const dailyPoints = attPoint + uniformPoint + dutyPoint;

      if (!onLeave && attendanceStatus !== 'unmarked') {
        totalDailyPointsSum += dailyPoints;
      }

      const dayNum = parseInt(day.split('-')[2], 10);

      dailyBreakdown.push({
        date: day,
        day: dayNum,
        attendance: attendanceStatus,
        uniform: uniformStatus,
        duty: dutyStatus,
        score: dailyPoints,
        fines: dayFines,
        fineReasons: dayFinesList.map((f: any) => `${f.reason} (₨${f.amount})`).join(', '),
        details: {
          uniformItems: dress?.items || [],
          dutyItems: duty?.duties || []
        }
      });
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
      .filter(item => {
        const itemMonth = item.month || (item.date ? item.date.substring(0, 7) : '');
        return itemMonth === selectedMonth && item.category === 'Growth Point Bonus';
      })
      .reduce((acc, curr) => acc + (Number(curr.points) || 0), 0);
    gpScore += extraPoints;

    const totalLogged = presents + lates + absents;
    const attPct = totalLogged > 0 ? Math.round((presents / totalLogged) * 100) : 0;
    const dressPct = dressTotalDays > 0 ? Math.round((uniScore / dressTotalDays) * 100) : 0;
    const dutyPct = dutyTotalDays > 0 ? Math.round((workScore / dutyTotalDays) * 100) : 0;
    const normalizedDaily = days.length > 0 ? Math.round((totalDailyPointsSum / (days.length * 3)) * 90) : 0;
    const totalPoints = Math.min(100, normalizedDaily + gpScore);

    return {
      attendance: attScore,
      punctuality: punctScore,
      uniform: uniScore,
      working: workScore,
      growthPoint: gpScore,
      workingDays: days.length,
      dailyBreakdown,
      finesTotal,
      attPct,
      dressPct,
      dutyPct,
      totalPoints,
      maxPoints: 100
    };
  }, [profile, attendance, dressLogs, duties, contributionsMap, growthHistory, fines, selectedMonth, daysInMonth]);

  // Standardized Dynamic Finance Calculations (Leaves are Paid)
  const salaryDetails = useMemo(() => {
    if (!profile) {
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

    const monthlySalary = Number(profile.monthlySalary || profile.salary || 0);
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
    let absentDays = 0;
    let unmarkedDays = 0;

    const payableDatesList: { date: string; status: string }[] = [];
    const deductedDatesList: { date: string; status: string; deduction: number }[] = [];

    const getAttendancePriority = (status?: string) => {
      if (!status) return 0;
      const s = status.toLowerCase();
      if (s === 'present') return 4;
      if (s === 'late') return 3;
      if (s === 'leave' || s === 'paid_leave' || s === 'unpaid_leave') return 2;
      if (s === 'absent') return 1;
      return 0;
    };

    const attMap: Record<string, any> = {};
    attendance.forEach(a => {
      const existing = attMap[a.date];
      if (!existing || getAttendancePriority(a.status) > getAttendancePriority(existing.status)) {
        attMap[a.date] = a;
      }
    });

    days.forEach(dayStr => {
      const att = attMap[dayStr];
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
    const monthlyFinesList = fines.filter(f => f.date && f.date.startsWith(selectedMonth));
    const totalFines = monthlyFinesList.reduce((a, c) => a + (Number(c.amount) || 0), 0);

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
        fines: slip.otherDeductions || 0,
        bonus: slip.bonus || 0,
        bonusReason: slip.bonusReason || '',
        deductionReason: slip.deductionReason || '',
        payableDatesList,
        deductedDatesList,
        isFinalized: true,
        status: slip.status
      };
    }

    const estimatedSalary = Math.floor(Math.max(0, earnings - totalFines));

    return {
      dailyWage,
      presentDays,
      lateDays,
      paidLeaves,
      unpaidLeaves: 0,
      absentDays,
      payableDays,
      unpaidDays: totalAbsentDays,
      earnings,
      absentDeduction,
      estimatedSalary,
      fines: totalFines,
      bonus: 0,
      bonusReason: '',
      deductionReason: '',
      payableDatesList,
      deductedDatesList,
      isFinalized: false,
      status: ''
    };
  }, [profile, attendance, fines, salaryRecords, selectedMonth, daysInMonth]);

  const totalEarnings = useMemo(() => {
    return salaryDetails.estimatedSalary;
  }, [salaryDetails]);

  const totalFines = useMemo(() => {
    return salaryDetails.fines;
  }, [salaryDetails]);

  const attendancePerformance = useMemo(() => {
    if (!attendance.length) return 0;
    const recent30 = attendance.slice(0, 30);
    const present = recent30.filter(a => ['present', 'late'].includes(a.status)).length;
    return Math.round((present / recent30.length) * 100);
  }, [attendance]);

  // Robust Dual Fetcher matching HQ dashboard patterns
  const fetchMetrics = useCallback(async (
    sId: string, 
    authUid?: string, 
    customId?: string, 
    employeeId?: string,
    prefixes: string[] = ['sukoon']
  ) => {
    try {
      const candidateIds = new Set<string>();
      if (sId) {
        candidateIds.add(sId);
        prefixes.forEach(p => {
          candidateIds.add(sId.startsWith(`${p}_`) ? sId.replace(`${p}_`, '') : sId);
          candidateIds.add(sId.startsWith(`${p}_`) ? sId : `${p}_${sId}`);
        });
      }
      if (authUid) {
        candidateIds.add(authUid);
        prefixes.forEach(p => {
          candidateIds.add(authUid.startsWith(`${p}_`) ? authUid.replace(`${p}_`, '') : authUid);
          candidateIds.add(authUid.startsWith(`${p}_`) ? authUid : `${p}_${authUid}`);
        });
      }
      if (customId) {
        candidateIds.add(customId);
      }
      if (employeeId) {
        candidateIds.add(employeeId);
      }

      const uniqueIds = Array.from(candidateIds).filter(Boolean);

      const fetchForCandidates = async (suffix: string) => {
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
        return { docs: docsList };
      };

      const [
        attSnap,
        dutySnap,
        dressSnap,
        taskSnap,
        fineSnap,
        growthSnap,
        salarySnap,
        contribSnap
      ] = await Promise.all([
        fetchForCandidates(`attendance`),
        fetchForCandidates(`duty_logs`),
        fetchForCandidates(`dress_logs`),
        fetchForCandidates(`special_tasks`),
        fetchForCandidates(`fines`),
        fetchForCandidates(`growth_points`),
        fetchForCandidates(`salary_records`),
        fetchForCandidates(`contributions`)
      ]);

      const mergeAndSort = (snap: any, dateField: string = 'date') => {
        const combined = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        const unique = Array.from(new Map(combined.map((item: any) => [item.id, item])).values());
        return unique.sort((a: any, b: any) => {
          const da = a[dateField] || '';
          const db = b[dateField] || '';
          return db.toString().localeCompare(da.toString());
        });
      };

      setAttendance(mergeAndSort(attSnap, 'date') as any);
      setDuties(mergeAndSort(dutySnap, 'date') as any);
      setDressLogs(mergeAndSort(dressSnap, 'date') as any);
      setSpecialTasks(mergeAndSort(taskSnap, 'createdAt') as any);
      setFines(mergeAndSort(fineSnap, 'date') as any);

      // Extract contributions map
      const cMap: Record<string, any> = {};
      contribSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.date) {
          cMap[data.date] = data;
        }
      });
      setContributionsMap(cMap);

      // Process growth points / extra monthly bonus points
      const rawGrowth = mergeAndSort(growthSnap, 'date') as any;
      const extraRows: any[] = [];
      growthSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (Number(data.extra) > 0) {
          extraRows.push({
            id: `${d.id}_extra`,
            points: data.extra,
            reason: 'Monthly Bonus/Extra Points',
            category: 'Growth Point Bonus',
            date: `${data.month || '2026-06'}-28`,
            month: data.month || '2026-06'
          });
        }
      });
      
      const contribRows = contribSnap.docs
        .map((d: any) => d.data())
        .filter((item: any) => item.status === 'yes' || item.isApproved === true)
        .map((item: any) => ({
          id: item.date,
          points: 1,
          reason: item.link ? `Contribution: ${item.link}` : 'Daily Growth Contribution',
          category: 'Growth Point',
          date: item.date,
          month: item.date && typeof item.date === 'string' ? item.date.substring(0, 7) : ''
        }));

      const combinedGrowth = [...rawGrowth, ...extraRows, ...contribRows];
      const uniqueGrowth = Array.from(new Map(combinedGrowth.map((item: any) => [item.id + '_' + item.category, item])).values())
        .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
      setGrowthHistory(uniqueGrowth);

      const salaryCombined = salarySnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SalarySlip));
      const uniqueSalaries = Array.from(new Map(salaryCombined.map(item => [item.id, item])).values())
        .sort((a: SalarySlip, b: SalarySlip) => b.month.localeCompare(a.month));
      setSalaryRecords(uniqueSalaries);

    } catch (error) {
      console.error("Critical sync failure in fetchMetrics:", error);
      toast.error("Some system synchronization logs were unavailable.");
    }
  }, []);

  useEffect(() => {
    const sessionData = localStorage.getItem('sukoon_session');
    if (!sessionData) { router.push('/departments/sukoon/login'); return; }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);
        const userRef = doc(db, 'sukoon_users', parsed.uid);
        let userSnap = await getDoc(userRef);
        let uData = null;
        if (userSnap.exists()) {
          uData = userSnap.data();
        }

        const fallbackSnap = await getDocs(query(collection(db, 'sukoon_staff'), where('loginUserId', '==', parsed.uid)));
        let sData = null;
        let staffId = parsed.uid;
        if (!fallbackSnap.empty) {
          sData = fallbackSnap.docs[0].data();
          staffId = fallbackSnap.docs[0].id;
        }

        if (!uData && !sData) {
          toast.error("Profile registry not found.");
          return;
        }

        const merged = { ...sData, ...uData, staffId } as any;
        setProfile(merged);

        const primaryDept = merged.department || 'sukoon';
        const secondaryDepts = merged.secondaryDepts || [];
        const prefixes = Array.from(new Set([
          getDeptPrefix(primaryDept),
          ...secondaryDepts.map((d: any) => getDeptPrefix(d))
        ])).filter(Boolean);

        await fetchMetrics(staffId, parsed.uid, merged.customId, merged.employeeId, prefixes);
      } catch (err) {
        console.error("Profile load failure:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router, fetchMetrics]);

  if (loading || visibilityLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa]">
      <Loader2 className="animate-spin text-sky-600 w-10 h-10 mb-4" />
      <p className="text-xs font-medium text-gray-400 tracking-widest uppercase">Synchronizing Data Nexus...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans selection:bg-sky-100">
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Sukoon Gateway</h1>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <span>Staff Portal</span>
                <span className="w-1 h-1 bg-green-500 rounded-full inline-block"></span>
                <span className="text-green-600">Live</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {sections.growthPoints !== false && (
                <div className="hidden md:flex bg-gray-50 px-4 py-2 rounded-full border border-gray-100 items-center gap-2">
                   <Award className="text-amber-500" size={16} />
                   <span className="text-xs font-bold text-gray-700">{computedScores.attendance + computedScores.uniform + computedScores.working + computedScores.growthPoint} Points</span>
                </div>
             )}
             <button 
               onClick={handleLogout}
               className="p-2.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all tooltip" 
               title="Sign Out"
             >
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar Profile Card */}
        <aside className="lg:col-span-4 space-y-6">
          <div className={`${cardStyle} p-8 text-center relative overflow-hidden`}>
            {/* Minimal geometric flair */}
            <div className="absolute top-0 left-0 w-full h-1 bg-sky-500"></div>
            
            <div className="relative inline-block group mx-auto mb-6">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gray-100 border-4 border-white shadow-md ring-1 ring-gray-100 relative">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="User Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl font-bold text-gray-400 uppercase">
                    {profile?.displayName?.[0] || profile?.name?.[0]}
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900">{profile?.displayName || profile?.name}</h2>
            
            {sections.designation !== false && (
              <p className="text-sky-600 font-semibold text-xs uppercase tracking-wider mt-1 bg-sky-50 px-3 py-1 rounded-full inline-block">
                {profile?.designation || 'Care Practitioner'}
              </p>
            )}

            <div className="mt-8 space-y-2">
              <div className="flex items-center gap-3 p-3.5 bg-gray-50/50 rounded-xl border border-gray-50 text-left group hover:border-gray-200 transition-colors">
                <Mail size={16} className="text-gray-400 group-hover:text-sky-500 transition-colors" />
                <span className="text-sm text-gray-600 font-medium truncate">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 p-3.5 bg-gray-50/50 rounded-xl border border-gray-50 text-left group hover:border-gray-200 transition-colors">
                <Phone size={16} className="text-gray-400 group-hover:text-sky-500 transition-colors" />
                <span className="text-sm text-gray-600 font-medium">{profile?.phone || 'No contact linked'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Staff ID</div>
                <div className="text-sm font-bold text-gray-800 mt-0.5">{profile?.employeeId || profile?.customId || '---'}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Dept</div>
                <div className="text-sm font-bold text-gray-800 mt-0.5 uppercase">Hospital</div>
              </div>
            </div>
          </div>

          {/* Quick Overview Analytics Card */}
          {(sections.attendance !== false || sections.reports !== false) && (
            <div className={`${cardStyle} p-6`}>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-sky-500" />
                Performance Index
              </h3>
              <div className="space-y-5">
                {sections.attendance !== false && (
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500 font-medium">Attendance Rate (Past 30d)</span>
                      <span className="font-bold text-gray-900">{attendancePerformance}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 transition-all duration-700" style={{ width: `${attendancePerformance}%` }}></div>
                    </div>
                  </div>
                )}
                {sections.reports !== false && (
                  <div className={`flex justify-between items-center ${sections.attendance !== false ? 'pt-2 border-t border-gray-50' : ''}`}>
                    <span className="text-xs text-gray-500 font-medium">Task Success Ratio</span>
                    <span className="text-sm font-bold text-gray-800">
                      {specialTasks.filter(t => t.status === 'completed').length} / {specialTasks.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Right Content Block */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Sticky Section Navigation */}
          <nav className="sticky top-[80px] z-40 flex gap-1 overflow-x-auto no-scrollbar bg-white/95 backdrop-blur-sm p-1.5 rounded-xl border border-gray-100 shadow-sm">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => scrollToSection(tab.id)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200
                    ${isActive 
                      ? 'bg-gray-900 text-white shadow-md shadow-gray-200' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Icon size={16} className={isActive ? 'text-sky-400' : 'text-gray-400'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* All Sections Stacked — scroll-based */}
          <div className="space-y-6">
            
            {/* --- TASKS SECTION --- */}
            {sections.reports !== false && (
              <div ref={el => { sectionRefs.current['tasks'] = el; }} id="section-tasks" className={`${cardStyle} p-6 scroll-mt-[140px]`}>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Assigned Special Tasks</h3>
                      <p className="text-xs text-gray-500 font-medium">Review special tasks designated by administration</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {specialTasks.length > 0 ? specialTasks.map(task => {
                    const isDone = task.status === 'completed';
                    return (
                      <div key={task.id} className="group bg-white border border-gray-100 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-gray-300 transition-all shadow-sm hover:shadow-md">
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${isDone ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                          {isDone ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold text-sm text-gray-900 ${isDone ? 'line-through opacity-60' : ''}`}>
                            {task.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            <span>{formatDateDMY(task.createdAt || task.date)}</span>
                            {task.dueDate && (
                              <>
                                <span>•</span>
                                <span className="text-rose-500 flex items-center gap-1"><AlertCircle size={12} /> Due: {formatDateDMY(task.dueDate)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-black uppercase px-3 py-1.5 rounded-md ${isDone ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                            {task.status}
                          </span>
                          {task.points && (
                            <span className="text-[11px] font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded-md">
                              +{task.points} PTS
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <Sparkles size={36} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Clear board. No active tasks assigned.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- ATTENDANCE SECTION --- */}
            {sections.attendance !== false && (
              <div ref={el => { sectionRefs.current['attendance'] = el; }} id="section-attendance" className={`${cardStyle} p-6 scroll-mt-[140px]`}>
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-950">Time & Attendance Audit</h3>
                      <p className="text-xs text-gray-500 font-medium">Official timeline of check-ins and daily presence</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attendance.length > 0 ? attendance.map(log => {
                    const isLate = (log.status === 'late' || !log.arrivedOnTime) && log.status !== 'present';
                    
                    return (
                      <div key={log.id} className="p-4 border border-gray-100 bg-white rounded-xl flex items-center justify-between shadow-sm hover:border-gray-300 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="font-bold text-sm text-gray-900">{formatDateDMY(log.date)}</span>
                             {isLate && log.status !== 'absent' && (
                                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">Late</span>
                             )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className={log.arrivedOnTime === false ? 'text-rose-500' : 'text-emerald-500'} />
                              <span>{log.arrivalTime || '--:--'}</span>
                            </div>
                            <span className="opacity-30">/</span>
                            <div className="flex items-center gap-1.5">
                              <span>{log.departureTime || '--:--'}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border ${
                           log.status === 'present' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : log.status === 'absent'
                              ? 'bg-red-50 text-red-700 border-red-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {log.status.replace('_', ' ')}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="col-span-full py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <Calendar size={36} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">No attendance history documented yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- DUTIES SECTION --- */}
            {sections.duties !== false && (
              <div ref={el => { sectionRefs.current['duty'] = el; }} id="section-duty" className={`${cardStyle} p-6 scroll-mt-[140px]`}>
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Deployment & Routine Audit</h3>
                      <p className="text-xs text-gray-500 font-medium">Daily checklist logs tracked by regional supervisor</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {duties.length > 0 ? duties.map(rec => (
                    <div key={rec.id} className="border border-gray-100 bg-gray-50/30 rounded-xl p-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                        <span className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400"/>
                          {formatDateDMY(rec.date)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rec.duties && rec.duties.length > 0 ? rec.duties.map((sub, idx) => (
                          <div 
                            key={idx}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors
                              ${sub.status === 'done' 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                : sub.status === 'na'
                                  ? 'bg-gray-100 border-gray-200 text-gray-500 opacity-60'
                                  : 'bg-red-50 border-red-100 text-red-600'
                                }`}
                          >
                            {sub.status === 'done' ? <CheckCircle size={12} /> : sub.status === 'na' ? <MinusCircle size={12} /> : <XCircle size={12} />}
                            {getDutyLabel(sub, profile)}
                          </div>
                        )) : (
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold bg-gray-100 border-gray-200 text-gray-700`}>
                            {rec.status === 'completed' ? <CheckCircle size={12} className="text-emerald-600" /> : <AlertCircle size={12} className="text-amber-600"/>}
                            <span className="capitalize">{(rec.dutyType || 'General Routine').replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <Briefcase size={36} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">No operational duty records found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- DRESS CODE SECTION --- */}
            {sections.uniform !== false && (
              <div ref={el => { sectionRefs.current['dress'] = el; }} id="section-dress" className={`${cardStyle} p-6 scroll-mt-[140px]`}>
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Shirt size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Dress Code Compliance</h3>
                      <p className="text-xs text-gray-500 font-medium">Review uniform code status evaluations</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {dressLogs.length > 0 ? dressLogs.map(rec => (
                    <div key={rec.id} className="border border-gray-100 bg-gray-50/30 rounded-xl p-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                        <span className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400"/>
                          {formatDateDMY(rec.date)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rec.items && rec.items.length > 0 ? rec.items.map((item, idx) => (
                          <div 
                            key={idx}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold
                              ${item.status === 'yes' 
                                ? 'bg-blue-50 border-blue-100 text-blue-700' 
                                : item.status === 'na'
                                  ? 'bg-gray-100 border-gray-200 text-gray-500'
                                  : 'bg-orange-50 border-orange-100 text-orange-700'
                                }`}
                          >
                            {item.status === 'yes' ? <CheckCircle2 size={12} /> : item.status === 'na' ? <MinusCircle size={12} /> : <AlertTriangle size={12} />}
                            {getDressLabel(item, profile)}
                          </div>
                        )) : (
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold ${rec.status === 'yes' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                            {rec.status === 'yes' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {rec.status === 'yes' ? 'Compliant' : 'Non-Compliant'}
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <Shirt size={36} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">No appearance logs have been processed.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- SCORE SECTION --- */}
            {sections.growthPoints !== false && (
              <div ref={el => { sectionRefs.current['score'] = el; }} id="section-score" className={`${cardStyle} p-6 scroll-mt-[140px]`}>
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                      <Award size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Growth Metrics Ledger</h3>
                      <p className="text-xs text-gray-500 font-medium">Performance points assigned for excellence</p>
                    </div>
                  </div>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setSelectedDay(null); // Reset selected day on month change
                    }}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-sky-500/20 w-full sm:w-auto"
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
                  {[
                    { label: 'Cumulative Score', val: `${computedScores.totalPoints} / ${computedScores.maxPoints}`, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100/50' },
                    { label: 'Attendance Rate', val: `${computedScores.attPct}%`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100/50' },
                    { label: 'Dress Code Rate', val: `${computedScores.dressPct}%`, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100/50' },
                    { label: 'Duty Done Rate', val: `${computedScores.dutyPct}%`, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100/50' },
                    { label: 'Fines Total', val: `₨${computedScores.finesTotal.toLocaleString()}`, color: computedScores.finesTotal > 0 ? 'text-rose-600' : 'text-slate-400', bg: computedScores.finesTotal > 0 ? 'bg-rose-50 border-rose-100/50' : 'bg-slate-50 border-slate-100/50' },
                  ].map(s => (
                    <div key={s.label} className={`border rounded-2xl p-4 text-center ${s.bg}`}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 truncate">{s.label}</p>
                      <p className={`text-base sm:text-lg font-black ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Interactive Calendar Heatmap */}
                <div className="bg-slate-50 border border-slate-100/80 rounded-3xl p-4 sm:p-6 mb-8 print:hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-slate-900 font-extrabold text-sm sm:text-base flex items-center gap-2">
                        <Calendar size={18} className="text-indigo-600 animate-pulse" />
                        Performance Calendar Heatmap
                      </h3>
                      <p className="text-slate-400 text-[11px] font-medium mt-0.5">Click any day box below to audit daily granular logs</p>
                    </div>
                    
                    {/* Heatmap Legend */}
                    <div className="flex flex-wrap gap-2 text-[9px] font-extrabold uppercase tracking-wide">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-600 block shadow-sm" /> 3/3 Pts</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-200 block" /> 2 Pts</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-200 block" /> 1 Pt</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-200 block" /> Absent</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-200 block" /> Leave</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-200 block" /> Unmarked</div>
                    </div>
                  </div>

                  {/* Calendar Layout */}
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {/* Weekday headers */}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => (
                      <div key={w} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-1">{w}</div>
                    ))}
                    
                    {/* Calendar cells */}
                    {getCalendarCells().map((cell, idx) => {
                      if (cell === null) {
                        return <div key={`empty-${idx}`} className="aspect-square bg-slate-100/30 rounded-xl" />;
                      }

                      const dayStr = String(cell).padStart(2, '0');
                      const dayDate = `${selectedMonth}-${dayStr}`;
                      const dayLog = computedScores.dailyBreakdown.find((b: any) => b.date === dayDate);
                      
                      let cellBg = 'bg-slate-200 hover:bg-slate-300';
                      let cellText = 'text-slate-600 font-extrabold';
                      let borderClass = 'border border-slate-100';

                      if (dayLog) {
                        const isUnmarked = dayLog.attendance === 'unmarked';
                        const isAbsent = dayLog.attendance === 'absent';
                        const isLeave = dayLog.attendance === 'leave';

                        if (isLeave) {
                          cellBg = 'bg-purple-100 hover:bg-purple-200';
                          cellText = 'text-purple-700 font-extrabold';
                          borderClass = 'border border-purple-200';
                        } else if (isAbsent) {
                          cellBg = 'bg-rose-100 hover:bg-rose-200';
                          cellText = 'text-rose-700 font-extrabold';
                          borderClass = 'border border-rose-200';
                        } else if (isUnmarked) {
                          cellBg = 'bg-slate-100 hover:bg-slate-250';
                          cellText = 'text-slate-400 font-semibold';
                        } else {
                          // Numeric scores
                          if (dayLog.score === 3) {
                            cellBg = 'bg-emerald-600 hover:bg-emerald-700';
                            cellText = 'text-white font-black';
                          } else if (dayLog.score === 2) {
                            cellBg = 'bg-emerald-100 hover:bg-emerald-200';
                            cellText = 'text-emerald-800 font-extrabold';
                            borderClass = 'border border-emerald-300';
                          } else {
                            cellBg = 'bg-amber-100 hover:bg-amber-255 hover:bg-amber-250';
                            cellText = 'text-amber-800 font-extrabold';
                            borderClass = 'border border-amber-300';
                          }
                        }
                      }

                      const isCurrentlySelected = selectedDay && selectedDay.date === dayDate;

                      return (
                        <button 
                          type="button"
                          key={`cell-${cell}`}
                          onClick={() => setSelectedDay(dayLog || null)}
                          className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200 ${cellBg} ${cellText} ${borderClass} ${
                            isCurrentlySelected ? 'ring-4 ring-indigo-500 shadow-lg scale-105 z-10' : 'hover:scale-103'
                          }`}
                        >
                          <span className="text-xs sm:text-sm">{cell}</span>
                          {dayLog && dayLog.attendance !== 'unmarked' && dayLog.attendance !== 'leave' && dayLog.attendance !== 'absent' && (
                            <span className="text-[8px] sm:text-[9px] opacity-80 leading-none mt-0.5">{dayLog.score}★</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Day details subpanel */}
                {selectedDay && (
                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 shadow-inner mb-8 print:hidden animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Granular Day Audit Logs</h4>
                        <p className="text-xs text-indigo-600 font-extrabold mt-0.5">Selected Date: {selectedDay.date}</p>
                      </div>
                      <span className="text-xs font-black bg-indigo-100 border border-indigo-200/50 text-indigo-700 px-3 py-1 rounded-xl">
                        Score: {selectedDay.score} / 3 Pts
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                      {/* Attendance */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">1. Attendance</p>
                        <span className={`inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                          selectedDay.attendance === 'present' ? 'bg-emerald-55 bg-emerald-55/10 bg-emerald-50 border-emerald-100 text-emerald-700' :
                          selectedDay.attendance === 'late' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                          selectedDay.attendance === 'absent' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                          selectedDay.attendance === 'leave' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                          'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          {selectedDay.attendance}
                        </span>
                      </div>

                      {/* Dress Code */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">2. Dress Compliance</p>
                        <span className={`inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                          selectedDay.uniform === 'yes' ? 'bg-emerald-55 bg-emerald-55/10 bg-emerald-50 border-emerald-100 text-emerald-700' :
                          selectedDay.uniform === 'incomplete' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                          selectedDay.uniform === 'na' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                          'bg-rose-50 border-rose-100 text-rose-700'
                        }`}>
                          {selectedDay.uniform === 'yes' ? 'Full Compliant' : selectedDay.uniform === 'incomplete' ? 'Incomplete' : selectedDay.uniform === 'na' ? 'Not Applicable' : 'Non Compliant'}
                        </span>
                        
                        {/* Detailed dress missing items */}
                        {selectedDay.uniform === 'incomplete' && selectedDay.details?.uniformItems && (
                          <div className="mt-2 text-[9px] font-bold text-amber-600/80">
                            Missing: {selectedDay.details.uniformItems.filter((i: any) => i.status === 'no').map((i: any) => i.key).join(', ') || 'Dress items'}
                          </div>
                        )}
                      </div>

                      {/* Duties Checklist */}
                      <div className="bg-white border border-slate-105 bg-white border border-slate-100 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">3. Duty Checklist</p>
                        <span className={`inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                          selectedDay.duty === 'yes' ? 'bg-emerald-55 bg-emerald-55/10 bg-emerald-50 border-emerald-100 text-emerald-700' :
                          selectedDay.duty === 'incomplete' ? 'bg-amber-55 bg-amber-55/10 bg-amber-50 border-amber-100 text-amber-700' :
                          selectedDay.duty === 'na' ? 'bg-purple-55 bg-purple-55/10 bg-purple-50 border-purple-100 text-purple-700' :
                          'bg-rose-55 bg-rose-55/10 bg-rose-50 border-rose-100 text-rose-700'
                        }`}>
                          {selectedDay.duty === 'yes' ? 'Accomplished' : selectedDay.duty === 'incomplete' ? 'Incomplete' : selectedDay.duty === 'na' ? 'Not Applicable' : 'Incomplete'}
                        </span>

                        {/* Detailed pending duties */}
                        {selectedDay.duty === 'incomplete' && selectedDay.details?.dutyItems && (
                          <div className="mt-2 text-[9px] font-bold text-amber-600/80">
                            Pending: {selectedDay.details.dutyItems.filter((i: any) => i.status !== 'done').map((i: any) => i.key).join(', ') || 'Duties'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fines Subcard */}
                    {selectedDay.fines > 0 && (
                      <div className="mt-4 bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
                        <Shield className="text-rose-600 shrink-0" size={20} />
                        <div>
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Incurred Penalty Fines</p>
                          <p className="text-xs font-extrabold text-rose-800 mt-0.5">₨{selectedDay.fines.toLocaleString()} — {selectedDay.fineReasons || 'Unexcused audit failure'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Complete Day-by-Day Historical Log */}
                <div className="space-y-4 mb-8">
                  <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-slate-900">
                    <ClipboardList size={18} className="text-indigo-600" /> Complete Day-by-Day Historical Log
                  </h3>
                  
                  <div className="overflow-x-auto w-full border border-slate-100 rounded-3xl max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150">
                          {['Date', 'Attendance', 'Uniform', 'Duties', 'Fines', 'Daily Score'].map(h => (
                            <th key={h} className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {computedScores.dailyBreakdown.map((b: any, idx: number) => {
                          const isActive = b.attendance !== 'unmarked';
                          
                          return (
                            <tr key={idx} className={`hover:bg-slate-50/50 ${!isActive ? 'opacity-50 bg-slate-50/30' : ''}`}>
                              <td className="px-5 py-3 font-extrabold text-slate-800">{b.date}</td>
                              
                              <td className="px-5 py-3 font-semibold uppercase text-[10px]">
                                <span className={`px-2.5 py-1 rounded-lg font-black tracking-wide ${
                                  b.attendance === 'present' ? 'bg-emerald-50 text-emerald-700' :
                                  b.attendance === 'late' ? 'bg-amber-50 text-amber-700' :
                                  b.attendance === 'absent' ? 'bg-rose-50 text-rose-700' :
                                  b.attendance === 'leave' ? 'bg-purple-50 text-purple-700' :
                                  'text-slate-400'
                                }`}>
                                  {b.attendance}
                                </span>
                              </td>

                              <td className="px-5 py-3 font-bold uppercase text-[9px]">
                                <span className={b.uniform === 'yes' ? 'text-emerald-600' : b.uniform === 'incomplete' ? 'text-amber-600' : b.uniform === 'na' ? 'text-purple-600' : 'text-rose-600'}>
                                  {b.uniform === 'yes' ? 'yes' : b.uniform === 'incomplete' ? 'incomplete' : b.uniform === 'na' ? 'na' : 'no'}
                                </span>
                              </td>

                              <td className="px-5 py-3 font-bold uppercase text-[9px]">
                                <span className={b.duty === 'yes' ? 'text-emerald-600' : b.duty === 'incomplete' ? 'text-amber-600' : b.duty === 'na' ? 'text-purple-600' : 'text-rose-600'}>
                                  {b.duty === 'yes' ? 'yes' : b.duty === 'incomplete' ? 'incomplete' : b.duty === 'na' ? 'na' : 'no'}
                                </span>
                              </td>

                              <td className="px-5 py-3 font-extrabold text-slate-800">
                                {b.fines > 0 ? (
                                  <span className="text-rose-600 font-black">₨{b.fines.toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-350">—</span>
                                )}
                              </td>

                              <td className="px-5 py-3 font-black text-slate-800">
                                {isActive ? `${b.score} / 3` : <span className="text-slate-300 font-bold">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Acquisition History ({selectedMonth})</h4>
                <div className="space-y-3">
                  {growthHistory.filter(r => (r.month || (r.date ? r.date.substring(0, 7) : '')) === selectedMonth).length > 0 ? (
                    growthHistory.filter(r => (r.month || (r.date ? r.date.substring(0, 7) : '')) === selectedMonth).map(record => (
                      <div key={record.id} className="p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-sm hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0">
                            <Award size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-800">{record.reason || 'Performance Recognition'}</p>
                            <p className="text-xs text-gray-400 font-medium">{record.date ? formatDateDMY(record.date) : 'Date Unspecified'}</p>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-amber-600">
                           +{record.points} PTS
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <span className="text-xs font-medium text-gray-400">No detailed points ledger yet for {selectedMonth}.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- FINANCE SECTION --- */}
            {sections.salary !== false && (
              <div ref={el => { sectionRefs.current['finance'] = el; }} id="section-finance" className={`${cardStyle} p-6 scroll-mt-[140px]`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-gray-50">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Financial Overview</h3>
                    <p className="text-xs text-gray-500 font-medium">Dynamic wage calculations and ledger</p>
                  </div>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-sky-500/20 w-full sm:w-auto"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                       <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                          <CreditCard size={18} />
                       </div>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Cycle Current</span>
                     </div>
                     <p className="text-xs font-medium text-gray-500">Total Monthly Salary</p>
                     <h4 className="text-2xl font-black text-gray-900">Rs. {(profile?.monthlySalary || 0).toLocaleString()}</h4>
                     
                     <div className="border-t border-gray-50 mt-4 pt-4 space-y-1.5 text-[10px] font-bold text-gray-700 uppercase">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Daily Rate (Base / 30):</span>
                          <span className="font-black text-gray-900">Rs. {Math.round(salaryDetails.dailyWage).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Payable Days:</span>
                          <span className="font-black text-emerald-600">{salaryDetails.payableDays} Days</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Unpaid Deductions:</span>
                          <span className="font-black text-rose-500">{salaryDetails.unpaidDays} Days (-Rs. {Math.round(salaryDetails.absentDeduction).toLocaleString()})</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Total Fines:</span>
                          <span className="font-black text-rose-500">-Rs. {totalFines.toLocaleString()}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div 
                    onClick={() => setShowSalaryBreakdownModal(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden shadow-teal-100 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-all"
                  >
                     <div className="absolute -right-4 -bottom-4 text-white opacity-10 w-24 h-24 rotate-12">
                        <DollarSign size={96} />
                     </div>
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Est. Retainable Net (Click for breakdown)</p>
                       <h4 className="text-3xl font-black">Rs. {totalEarnings.toLocaleString()}</h4>
                     </div>
                     <p className="text-xs mt-2 font-medium opacity-70 border-t border-teal-500 pt-2">
                       Calculated dynamically for current month's marked logs. All leaves are paid.
                     </p>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText size={14} className="text-emerald-600" />
                  Official Payroll Ledger
                </h4>
                
                <div className="space-y-3 mb-8">
                   {salaryRecords.length > 0 ? salaryRecords.map(rec => (
                     <div key={rec.id} className="p-4 border border-gray-100 bg-white rounded-xl flex items-center justify-between shadow-sm transition-all hover:shadow-md">
                       <div>
                         <p className="font-bold text-gray-900">{new Date(rec.month + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                         <p className="text-xs text-gray-400 font-medium">Net Disbursed: Rs. {rec.netSalary.toLocaleString()}</p>
                       </div>
                       <div className={`px-3 py-1 text-[11px] font-black uppercase tracking-wide rounded-md ${rec.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                         {rec.status}
                       </div>
                     </div>
                   )) : (
                      <div className="text-center py-6 border border-dashed border-gray-100 rounded-xl bg-gray-50/50 text-xs font-medium text-gray-400">
                        No finalized payroll documents exist in system.
                      </div>
                   )}
                </div>

                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-600" />
                  Logged Fine History
                </h4>
                
                <div className="space-y-2">
                  {fines.length > 0 ? fines.map(fine => (
                    <div key={fine.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                       <div>
                        <p className="font-bold text-sm text-gray-800">{fine.reason}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{formatDateDMY(fine.date)}</p>
                       </div>
                       <div className="text-sm font-bold text-rose-600">-Rs. {fine.amount}</div>
                    </div>
                  )) : (
                    <div className="p-4 text-center text-xs text-gray-400 font-medium border border-dashed border-gray-100 rounded-xl">No system fines enforced.</div>
                  )}
                </div>
              </div>
            )}

            {/* --- DOCUMENTS SECTION --- */}
            {
              <div ref={el => { sectionRefs.current['documents'] = el; }} id="section-documents" className={`${cardStyle} p-6 scroll-mt-[140px]`}>
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Documents Vault</h3>
                      <p className="text-xs text-gray-500 font-medium">Uploaded verification files, credentials, and attachments</p>
                    </div>
                  </div>
                </div>

                {profile?.documents && profile.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profile.documents.map((doc: any, idx: number) => (
                      <div key={idx} className="p-4 border border-gray-100 bg-white rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md hover:border-emerald-100 transition-all duration-300">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate" title={doc.title || `Document ${idx + 1}`}>
                              {doc.title || `Document ${idx + 1}`}
                            </p>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Attachment</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 rounded-xl transition-colors"
                            title="View Document"
                          >
                            <Eye size={16} />
                          </a>
                          <a
                            href={doc.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 rounded-xl transition-colors"
                            title="Download Document"
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center border-2 border-dashed border-gray-150 rounded-2xl bg-gray-50/50">
                    <FileText className="mx-auto text-gray-300 mb-3" size={36} strokeWidth={1.5} />
                    <h4 className="text-sm font-bold text-gray-700">No Documents Uploaded</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Documents and pictures uploaded by management will be displayed here.</p>
                  </div>
                )}
              </div>
            }

            {/* --- IDENTITY SECTION --- */}
            {
              <div ref={el => { sectionRefs.current['profile'] = el; }} id="section-profile" className={`${cardStyle} p-6 scroll-mt-[140px]`}>
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Personal Credentials Vault</h3>
                      <p className="text-xs text-gray-500 font-medium">Secure registry of personal identification and info</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <InfoRow label="National Identification (CNIC)" value={profile?.cnic || 'N/A'} icon={Shield} />
                    <InfoRow label="Residential Coordinates" value={profile?.address || 'N/A'} icon={MapPin} multiline />
                    <InfoRow label="Father Name" value={profile?.fatherName || 'N/A'} icon={User} />
                  </div>
                  <div className="space-y-6">
                    <InfoRow label="Designated Operational Shift" value={`${profile?.dutyStartTime || '09:00'} - ${profile?.dutyEndTime || '17:00'}`} icon={Clock} />
                    <InfoRow label="Blood Group Matrix" value={profile?.bloodGroup || 'N/A'} icon={Heart} />
                    <InfoRow label="Emergency Contact Protocol" value={(() => {
                      let name = 'Contact';
                      let phone = 'N/A';
                      const rawName = profile?.emergencyContactName || profile?.emergencyContact;
                      if (rawName) {
                        if (typeof rawName === 'object') {
                          name = rawName.name || rawName.displayName || rawName.label || 'Contact';
                        } else {
                          name = rawName;
                        }
                      }
                      const rawPhone = profile?.emergencyPhone || profile?.emergencyContactPhone;
                      if (rawPhone) {
                        if (typeof rawPhone === 'object') {
                          phone = rawPhone.phone || rawPhone.phoneNumber || rawPhone.number || 'N/A';
                        } else {
                          phone = rawPhone;
                        }
                      } else if (typeof profile?.emergencyContact === 'object') {
                        phone = profile.emergencyContact.phone || profile.emergencyContact.phoneNumber || profile.emergencyContact.number || 'N/A';
                      }
                      if (name.includes('[object Object]')) name = 'Contact';
                      if (phone.includes('[object Object]')) phone = 'N/A';
                      return `${name} (${phone})`;
                    })()} icon={AlertCircle} />
                  </div>
                </div>
                
                <div className="mt-8 bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center text-sky-600">
                        <Award size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Official Staff Clearance</p>
                        <p className="text-xs text-gray-500 font-medium">Issued for internal operational validation.</p>
                      </div>
                   </div>
                   <button disabled className="px-6 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-400 uppercase tracking-wider shadow-sm opacity-70 cursor-not-allowed">
                     Download Identification Token
                   </button>
                 </div>

                {((profile?.education?.length > 0) || (profile?.experience?.length > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {profile?.education?.length > 0 && (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Award size={14} className="text-indigo-500" /> Education
                        </h4>
                        <div className="space-y-3">
                          {profile.education.map((edu: any, idx: number) => (
                            <div key={idx} className="p-3 bg-white rounded-xl border border-gray-100">
                              <p className="text-sm font-bold text-gray-900">{edu.degree || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{edu.institution || ''}</p>
                              {edu.year && <p className="text-[10px] text-gray-400 uppercase font-semibold mt-1">{edu.year}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {profile?.experience?.length > 0 && (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Briefcase size={14} className="text-teal-500" /> Work Experience
                        </h4>
                        <div className="space-y-3">
                          {profile.experience.map((exp: any, idx: number) => (
                            <div key={idx} className="p-3 bg-white rounded-xl border border-gray-100">
                              <p className="text-sm font-bold text-gray-900">{exp.title || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{exp.company || ''}</p>
                              {exp.duration && <p className="text-[10px] text-gray-400 uppercase font-semibold mt-1">{exp.duration}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            }

          </div>
        </div>
      </main>
      
      {/* Salary Calculation Breakdown Modal */}
      {showSalaryBreakdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 text-gray-900">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-sky-500">Salary Breakdown</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                  Cycle: {selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Current Month'}
                </p>
              </div>
              <button 
                onClick={() => setShowSalaryBreakdownModal(false)}
                className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
              >
                <XCircle size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Top Overview Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-sky-50/30 rounded-2xl border border-sky-100/50">
                  <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest mb-1">Monthly Base Salary</p>
                  <p className="text-lg font-black text-gray-900">₨{Number(profile?.monthlySalary || profile?.salary || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-sky-50/30 rounded-2xl border border-sky-100/50">
                  <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest mb-1">Net Till Date Earned</p>
                  <p className="text-lg font-black text-sky-600">₨{salaryDetails.estimatedSalary.toLocaleString()}</p>
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
                    <span>₨{Number(profile?.monthlySalary || profile?.salary || 0).toLocaleString()} / 30 = ₨{Math.round(salaryDetails.dailyWage).toLocaleString()} / Day</span>
                  </div>
                  {salaryDetails.isFinalized ? (
                    <>
                      <div className="flex justify-between text-emerald-600">
                        <span>Base Monthly Salary:</span>
                        <span>+ ₨{Number(profile?.monthlySalary || profile?.salary || 0).toLocaleString()}</span>
                      </div>
                      {salaryDetails.absentDeduction > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>Absent Deductions:</span>
                          <span>- ₨{Math.round(salaryDetails.absentDeduction).toLocaleString()}</span>
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
                    Fine Deductions Details ({fines.filter(f => f.date && f.date.startsWith(selectedMonth)).length})
                  </h4>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[200px] overflow-y-auto space-y-1 p-2 bg-gray-50/50">
                    {fines.filter(f => f.date && f.date.startsWith(selectedMonth)).length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic text-center py-4">No fines enforced this month</p>
                    ) : (
                      fines.filter(f => f.date && f.date.startsWith(selectedMonth)).map((item, idx) => (
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
      
      {/* Add generic custom styles for the transitions if needed */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-2 { from { transform: translateY(0.5rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out, slide-in-from-bottom-2 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// Custom subcomponent for reusability in Info grids
function InfoRow({ label, value, icon: Icon, multiline = false }: { label: string, value: string, icon: any, multiline?: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100">
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`font-semibold text-gray-800 ${multiline ? 'text-sm leading-relaxed' : 'text-base'}`}>{value}</p>
      </div>
    </div>
  );
}

// Helper icons from lucide
function MinusCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
