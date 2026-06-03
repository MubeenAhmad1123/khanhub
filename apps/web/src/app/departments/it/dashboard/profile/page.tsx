// src/app/departments/it/dashboard/profile/page.tsx
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
  AlertCircle, Sparkles, FileText, CreditCard, CheckCircle2, XCircle, Terminal, Info, LogOut
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY, toDate } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

// --- Enhanced Types matched with HQ data schema ---
interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'late' | 'paid_leave' | 'unpaid_leave' | 'unmarked';
  arrivalTime?: string;
  departureTime?: string;
  arrivedOnTime?: boolean;
}

interface DutyRecord {
  id: string;
  date: string;
  dutyType?: string;
  status?: string;
  duties?: Array<{ key: string; label: string; status: 'done' | 'not_done' | 'na' }>;
  points?: number;
}

interface DressRecord {
  id: string;
  date: string;
  status?: 'yes' | 'no';
  isCompliant?: boolean;
  items?: Array<{ key: string; label: string; status: 'yes' | 'no' | 'na' }>;
  points?: number;
}

interface SpecialTask {
  id: string;
  task?: string;
  description?: string;
  status: 'pending' | 'completed' | 'assigned' | 'acknowledged';
  date?: string;
  createdAt?: string;
  points?: number;
}

interface FineRecord {
  id: string;
  amount: number;
  reason: string;
  date: string;
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
  if (!item) return 'General Task';
  if (item.label) return item.label;
  if (!item.key) return 'General Task';
  
  const configItem = profile?.dutyConfig?.find((c: any) => c.key === item.key);
  if (configItem?.label) return configItem.label;
  
  const keyMap: Record<string, string> = {
    'server_maintenance': 'Server Maintenance & Health Check',
    'network_check': 'Network Diagnostics',
    'code_review': 'Code Quality Review',
    'deploy_patch': 'Deployment & System Patching',
    'helpdesk_support': 'Helpdesk Support Resolution',
    'backup_verification': 'Database Backup Verification',
    'system_audit': 'Security & Compliance Audit',
    'asset_tracking': 'IT Hardware Asset Tracking',
    'user_provisioning': 'Access Provisioning Control'
  };

  if (keyMap[item.key]) return keyMap[item.key];
  return item.key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Helper to translate raw dress item keys to beautiful labels
function getDressLabel(item: any, profile: any) {
  if (!item) return 'Uniform Item';
  if (item.label) return item.label;
  if (!item.key) return 'Uniform Item';
  
  const configItem = profile?.dressCodeConfig?.find((c: any) => c.key === item.key);
  if (configItem?.label) return configItem.label;

  const keyMap: Record<string, string> = {
    'uniform': 'IT Department Uniform',
    'id_card': 'Employee Smart Card',
    'card': 'Employee Smart Card',
    'shoes': 'Polished Professional Shoes',
    'dress_pant': 'Dark Dress Pants',
    'collar_shirt': 'IT Polo / Collar Shirt'
  };

  if (keyMap[item.key]) return keyMap[item.key];
  return item.key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'special_tasks' | 'attendance' | 'finance' | 'dress' | 'duty' | 'score' | 'profile'>('special_tasks');
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [duties, setDuties] = useState<DutyRecord[]>([]);
  const [dressLogs, setDressLogs] = useState<DressRecord[]>([]);
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);
  const [salaryRecords, setSalaryRecords] = useState<SalarySlip[]>([]);
  const [growthHistory, setGrowthHistory] = useState<any[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showSalaryBreakdownModal, setShowSalaryBreakdownModal] = useState(false);
  const [contributionsMap, setContributionsMap] = useState<Record<string, any>>({});

  // Premium Luxury Cyber Obsidian Glass Styles
  const glassStyle = "bg-white/[0.02] border border-white/[0.06] backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:border-indigo-500/20 hover:shadow-indigo-500/5 duration-300 transition-all";
  const inputStyle = "bg-white/[0.02] border border-white/[0.06] rounded-2xl px-5 py-4 w-full text-white placeholder-slate-500 outline-none text-sm focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/40 transition-all";

  // Parallel resolution mapping all variant IDs to bypass silent Firestore failures
  const fetchMetrics = useCallback(async (sId: string, authUid?: string, customId?: string, employeeId?: string) => {
    try {
      const prefix = 'it';
      
      const candidateIds = new Set<string>();
      if (sId) {
        candidateIds.add(sId);
        candidateIds.add(sId.startsWith('it_') ? sId.replace('it_', '') : sId);
        candidateIds.add(sId.startsWith('it_') ? sId : `it_${sId}`);
      }
      if (authUid) {
        candidateIds.add(authUid);
        candidateIds.add(authUid.startsWith('it_') ? authUid.replace('it_', '') : authUid);
        candidateIds.add(authUid.startsWith('it_') ? authUid : `it_${authUid}`);
      }
      if (customId) {
        candidateIds.add(customId);
      }
      if (employeeId) {
        candidateIds.add(employeeId);
      }

      const uniqueIds = Array.from(candidateIds).filter(Boolean);

      const fetchForCandidates = async (colName: string) => {
        const snaps = await Promise.all(
          uniqueIds.map(id => 
            getDocs(query(collection(db, colName), where('staffId', '==', id)))
              .catch(() => ({ docs: [] } as any))
          )
        );
        const allDocs = snaps.flatMap(snap => snap.docs);
        return { docs: allDocs };
      };

      const [
        attSnap,
        dutySnap,
        dressSnap,
        taskSnap,
        fineSnap,
        salarySnap,
        pointsSnap,
        contribSnap
      ] = await Promise.all([
        fetchForCandidates(`${prefix}_attendance`),
        fetchForCandidates(`${prefix}_duty_logs`),
        fetchForCandidates(`${prefix}_dress_logs`),
        fetchForCandidates(`${prefix}_special_tasks`),
        fetchForCandidates(`${prefix}_fines`),
        fetchForCandidates(`${prefix}_salary_records`),
        fetchForCandidates(`${prefix}_growth_points`),
        fetchForCandidates(`${prefix}_contributions`)
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
      const rawGrowth = mergeAndSort(pointsSnap, 'date') as any;
      const extraRows: any[] = [];
      pointsSnap.docs.forEach((d: any) => {
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

      if (pointsSnap.docs.length > 0) {
        setGrowthPoints(pointsSnap.docs[0].data());
      }

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
    const sessionData = localStorage.getItem('it_session') || localStorage.getItem('hq_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);

        const [userSnap, staffSnap] = await Promise.all([
          getDoc(doc(db, 'it_users', parsed.uid)).catch(() => null),
          getDocs(query(collection(db, 'it_staff'), where('loginUserId', '==', parsed.uid))).catch(() => null)
        ]);

        let uData: any = {};
        let finalId = parsed.uid;

        if (userSnap && userSnap.exists()) {
          uData = { ...userSnap.data() };
        }
        if (staffSnap && !staffSnap.empty) {
          const docSnap = staffSnap.docs[0];
          uData = { ...docSnap.data(), ...uData };
          finalId = docSnap.id;
        }

        // Check secure sync fallback for HQ administration roles
        if (!uData.name && !uData.displayName && (parsed.role === 'superadmin' || parsed.role === 'manager')) {
          const hqSnap = await getDoc(doc(db, 'hq_users', parsed.uid)).catch(() => null);
          if (hqSnap && hqSnap.exists()) {
            uData = { ...hqSnap.data(), ...uData };
            finalId = hqSnap.id;
          }
        }

        if (!uData.name && !uData.displayName) { 
          toast.error("User profile not found in active ledger.");
          router.push('/departments/it/login'); 
          return; 
        }

        setProfile({ 
          id: finalId, 
          ...uData,
          phone: uData.phone || uData.phoneNumber || uData.mobile || parsed.phone || parsed.phoneNumber || ''
        });

        // Execute comprehensive data synchronization across all potential employee credentials
        await fetchMetrics(finalId, parsed.uid, uData.customId, uData.employeeId);
      } catch (err) {
        console.error(err);
        toast.error("Secure synchronization failed.");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [router, fetchMetrics]);

  const handleLogout = () => {
    localStorage.removeItem('it_session');
    localStorage.removeItem('hq_session');
    router.push('/departments/it/login');
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

  const computedScores = useMemo(() => {
    const days = daysInMonth();
    let attScore = 0;
    let punctScore = 0;
    let uniScore = 0;
    let workScore = 0;

    const attMap: Record<string, any> = {};
    attendance.forEach(a => { attMap[a.date] = a; });

    const dressMap: Record<string, any> = {};
    dressLogs.forEach(d => { dressMap[d.date] = d; });

    const dutyMap: Record<string, any> = {};
    duties.forEach(d => { dutyMap[d.date] = d; });

    days.forEach(day => {
      // 1. Attendance: 1 point if present or late
      const att = attMap[day];
      if (att?.status === 'present' || att?.status === 'late') {
        attScore++;
        // 2. Punctuality: 1 point if arrived on time
        if (att.arrivedOnTime !== false) punctScore++;
      }

      // 3. Uniform: 1 point if all items are compliant
      const dress = dressMap[day];
      if (dress) {
        const config = profile?.dressCodeConfig || [];
        const items = dress.items || [];
        const missing = config.filter((c: any) => {
          const item = items.find((i: any) => i.key === c.key);
          return !item || item.status === 'no';
        });
        if (config.length > 0 && missing.length === 0) uniScore++;
      }

      // 4. Working (Duties): 1 point if all duties are done
      const duty = dutyMap[day];
      if (duty) {
        const config = profile?.dutyConfig || [];
        const items = duty.duties || [];
        const pending = config.filter((c: any) => {
          const item = items.find((i: any) => i.key === c.key);
          return !item || item.status === 'not_done';
        });
        if (config.length > 0 && pending.length === 0) workScore++;
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
      .filter(item => {
        const itemMonth = item.month || (item.date ? item.date.substring(0, 7) : '');
        return itemMonth === selectedMonth && item.category === 'Growth Point Bonus';
      })
      .reduce((acc, curr) => acc + (Number(curr.points) || 0), 0);
    gpScore += extraPoints;

    return {
      attendance: attScore,
      punctuality: punctScore,
      uniform: uniScore,
      working: workScore,
      growthPoint: gpScore,
      workingDays: days.length
    };
  }, [profile, attendance, dressLogs, duties, contributionsMap, growthHistory, selectedMonth, daysInMonth]);

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

    const attMap: Record<string, any> = {};
    attendance.forEach(a => { attMap[a.date] = a; });

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

  if (loading) return (
    <div className="min-h-screen bg-[#070913] flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin text-indigo-500 w-12 h-12 mb-4" />
      <p className="text-[10px] font-black tracking-[0.35em] text-indigo-400 uppercase">Secure Synchronization in Progress...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans antialiased pb-24 selection:bg-indigo-500/30 overflow-x-hidden relative">
      
      {/* Decorative Radial glow background overlay */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#070913]/10 to-transparent pointer-events-none z-0" />
      <div className="absolute top-[300px] right-[-100px] w-[500px] h-[500px] bg-indigo-500/[0.02] rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-6 md:px-12 bg-[#070913]/70 backdrop-blur-xl border-b border-white/[0.04] relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${glassStyle} text-indigo-400 border-white/[0.08]`}>
              <Terminal size={26} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                IT Gateway
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse inline-block" />
              </h1>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mt-0.5">Infrastructure Hub • Secure Protocol</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`hidden md:flex px-5 py-2.5 rounded-2xl ${glassStyle} items-center gap-3 border-white/[0.08]`}>
              <Award className="text-amber-500" size={18} />
              <div>
                <p className="text-[9px] font-bold uppercase text-slate-400 leading-none">Growth Level</p>
                <p className="text-sm font-black text-white mt-0.5">{computedScores.attendance + computedScores.uniform + computedScores.working + computedScores.growthPoint} PTS</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl border border-transparent hover:border-rose-500/20 transition-all active:scale-95"
              title="Terminate Session"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Profile Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className={`p-8 rounded-[2.5rem] ${glassStyle} flex flex-col items-center relative overflow-hidden border-white/[0.05]`}>
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
            
            <div className="relative group mt-4">
              <div className="w-32 h-32 rounded-[2rem] overflow-hidden bg-slate-900 border-2 border-white/[0.08] relative group-hover:border-indigo-500/40 transition-all duration-300">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-950/40 to-slate-900 flex items-center justify-center text-4xl font-black text-indigo-400 uppercase">
                    {profile?.displayName?.[0] || profile?.name?.[0]}
                  </div>
                )}
              </div>
            </div>

            <h2 className="mt-6 text-xl font-black text-white text-center leading-tight tracking-tight">{profile?.displayName || profile?.name}</h2>
            <p className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.2em] mt-2 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">
              {profile?.designation || 'Systems Engineer'}
            </p>
            
            <div className="mt-8 w-full space-y-2.5">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/[0.04] text-left hover:border-white/[0.08] transition-colors">
                <Mail className="text-slate-500 flex-shrink-0" size={15} />
                <span className="text-xs font-bold text-slate-300 truncate flex-1">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/[0.04] text-left hover:border-white/[0.08] transition-colors">
                <Phone className="text-slate-500 flex-shrink-0" size={15} />
                <span className="text-xs font-bold text-slate-300 flex-1">{profile?.phone || 'No Contact Linked'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-6">
              <div className="bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-2xl text-center">
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Node ID</div>
                <div className="text-xs font-bold text-slate-200 mt-1 truncate">{profile?.employeeId || profile?.customId || '---'}</div>
              </div>
              <div className="bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-2xl text-center">
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Department</div>
                <div className="text-xs font-black text-indigo-400 mt-1 uppercase">IT Node</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content */}
        <div className="lg:col-span-8 space-y-6">
          <nav className="flex gap-2 overflow-x-auto no-scrollbar bg-white/[0.02] border border-white/[0.06] p-2 rounded-3xl backdrop-blur-2xl">
            {[
              { id: 'special_tasks' as const, label: 'Protocols Assigned', icon: Target },
              { id: 'attendance' as const, label: 'Access Log', icon: Calendar },
              { id: 'duty' as const, label: 'Duty Matrix', icon: Briefcase },
              { id: 'dress' as const, label: 'Uniform Node', icon: Shirt },
              { id: 'score' as const, label: 'Growth Ledger', icon: TrendingUp },
              { id: 'finance' as const, label: 'Financial Vault', icon: DollarSign },
              { id: 'profile' as const, label: 'Clearance Data', icon: User },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className={`p-8 rounded-[2.5rem] ${glassStyle} min-h-[520px] border-white/[0.05]`}>
            {/* --- PROTOCOLS / TASKS TAB --- */}
            {activeTab === 'special_tasks' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Infrastructure Directives</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Direct admin instructions assigned to your terminal</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {specialTasks.length > 0 ? specialTasks.map(task => {
                    const isDone = task.status === 'completed';
                    return (
                      <div key={task.id} className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-2xl ${isDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {isDone ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                          </div>
                          <div>
                            <p className={`text-sm font-bold text-slate-100 ${isDone ? 'line-through text-slate-500' : ''}`}>
                              {task.description || task.task}
                            </p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mt-1">{formatDateDMY(task.createdAt || task.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                            isDone 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {task.status}
                          </span>
                          {task.points && (
                            <span className="px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                              +{task.points} PTS
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-16 text-center bg-white/[0.01] border border-dashed border-white/[0.04] rounded-3xl">
                      <Sparkles className="mx-auto text-slate-600 mb-3 animate-pulse" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Terminal clear. No pending protocols.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- ACCESS LOG / ATTENDANCE TAB --- */}
            {activeTab === 'attendance' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Access Log Audit</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Official time-stamp logs detailing active sessions</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attendance.length > 0 ? attendance.map(log => {
                    const isLate = log.status === 'late' || !log.arrivedOnTime;
                    return (
                      <div key={log.id} className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08] transition-all flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-200">{formatDateDMY(log.date)}</span>
                            {isLate && log.status !== 'absent' && (
                              <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Late Entry</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold mt-1">
                            Check-in: {log.arrivalTime || '--:--'} | Check-out: {log.departureTime || '--:--'}
                          </p>
                        </div>
                        <span className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                          log.status === 'present' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : log.status === 'absent'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        }`}>
                          {log.status.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  }) : (
                    <div className="col-span-full py-16 text-center bg-white/[0.01] border border-dashed border-white/[0.04] rounded-3xl">
                      <Calendar className="mx-auto text-slate-600 mb-3" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Access logs not found in storage.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- DUTY MATRIX TAB --- */}
            {activeTab === 'duty' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Routine Matrix Audit</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Infrastructure maintenance routine checklists</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {duties.length > 0 ? duties.map(rec => (
                    <div key={rec.id} className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.04]">
                      <span className="text-xs font-black text-slate-300 flex items-center gap-2 mb-4 border-b border-white/[0.03] pb-3">
                        <Calendar size={13} className="text-indigo-400" />
                        {formatDateDMY(rec.date)}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {rec.duties && rec.duties.length > 0 ? rec.duties.map((sub, idx) => (
                          <div 
                            key={idx}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-colors
                              ${sub.status === 'done' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : sub.status === 'na'
                                  ? 'bg-white/[0.02] border-white/[0.06] text-slate-500'
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                }`}
                          >
                            {sub.status === 'done' ? <CheckCircle size={11} /> : sub.status === 'na' ? <MinusCircle size={11} /> : <XCircle size={11} />}
                            {getDutyLabel(sub, profile)}
                          </div>
                        )) : (
                          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-bold bg-white/[0.02] border border-white/[0.06] text-slate-300">
                            {rec.status === 'completed' ? <CheckCircle size={11} className="text-emerald-400" /> : <AlertCircle size={11} className="text-amber-400" />}
                            <span className="capitalize">{(rec.dutyType || 'General routine').replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="py-16 text-center bg-white/[0.01] border border-dashed border-white/[0.04] rounded-3xl">
                      <Briefcase className="mx-auto text-slate-600 mb-3" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operation checklist empty.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- UNIFORM TAB --- */}
            {activeTab === 'dress' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <Shirt size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Hardware Protocol Compliance</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Professional dress code compliance audit</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {dressLogs.length > 0 ? dressLogs.map(rec => (
                    <div key={rec.id} className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.04]">
                      <span className="text-xs font-black text-slate-300 flex items-center gap-2 mb-4 border-b border-white/[0.03] pb-3">
                        <Calendar size={13} className="text-indigo-400" />
                        {formatDateDMY(rec.date)}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {rec.items && rec.items.length > 0 ? rec.items.map((item, idx) => (
                          <div 
                            key={idx}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-bold border
                              ${item.status === 'yes' 
                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                                : item.status === 'na'
                                  ? 'bg-white/[0.02] border-white/[0.06] text-slate-500'
                                  : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                }`}
                          >
                            {item.status === 'yes' ? <CheckCircle2 size={11} /> : item.status === 'na' ? <MinusCircle size={11} /> : <AlertTriangle size={11} />}
                            {getDressLabel(item, profile)}
                          </div>
                        )) : (
                          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-bold border ${rec.status === 'yes' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                            {rec.status === 'yes' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                            {rec.status === 'yes' ? 'Compliant' : 'Non-Compliant'}
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="py-16 text-center bg-white/[0.01] border border-dashed border-white/[0.04] rounded-3xl">
                      <Shirt className="mx-auto text-slate-600 mb-3" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dress logs not found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- SCORING TAB --- */}
            {activeTab === 'score' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Growth Performance metrics</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Aggregated scoring logs reflecting professional growth</p>
                    </div>
                  </div>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-indigo-500/40 w-full sm:w-auto"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-900/30 to-purple-950/20 border border-white/[0.05] text-center relative overflow-hidden group">
                    <Sparkles className="absolute right-[-10px] bottom-[-10px] text-indigo-500 opacity-[0.03] w-24 h-24 -rotate-12 transition-transform duration-500 group-hover:rotate-0" />
                    <Award className="mx-auto text-amber-500 mb-2 animate-bounce" size={32} />
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total Growth Point Vault</p>
                    <h4 className="text-3xl font-black mt-2 text-white">{computedScores.growthPoint} PTS</h4>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.04] text-center flex flex-col justify-center">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Punctuality Score</p>
                    <h4 className="text-3xl font-black mt-2 text-indigo-400">
                      {computedScores.workingDays > 0 
                        ? Math.round((computedScores.punctuality / computedScores.workingDays) * 100) 
                        : 0}%
                    </h4>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.04] text-center flex flex-col justify-center">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total Score</p>
                    <h4 className="text-3xl font-black mt-2 text-slate-200">
                      {computedScores.attendance + computedScores.uniform + computedScores.working + computedScores.growthPoint}
                    </h4>
                  </div>
                </div>

                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Award size={13} className="text-indigo-400" />
                  Acquisition History ({selectedMonth})
                </h4>
                <div className="space-y-3">
                  {growthHistory.filter(r => (r.month || (r.date ? r.date.substring(0, 7) : '')) === selectedMonth).length > 0 ? (
                    growthHistory.filter(r => (r.month || (r.date ? r.date.substring(0, 7) : '')) === selectedMonth).map(record => (
                      <div key={record.id} className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08] transition-all flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500"><Award size={16} /></div>
                          <div>
                            <p className="text-sm font-bold text-slate-200">{record.reason || 'Performance Recognition'}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase mt-1.5">{record.date ? formatDateDMY(record.date) : 'Date Unspecified'}</p>
                          </div>
                        </div>
                        <p className="font-black text-sm text-amber-500">+{record.points} PTS</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center bg-white/[0.01] border border-dashed border-white/[0.04] rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                      No points logged in ledger for {selectedMonth}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- FINANCE TAB --- */}
            {activeTab === 'finance' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Secure Ledger System</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Live financial audits adjusted for enforced system fines</p>
                    </div>
                  </div>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-indigo-500/40 w-full sm:w-auto"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.04] text-white relative overflow-hidden">
                     <p className="text-xs font-medium text-slate-400">Total Monthly Salary</p>
                     <h4 className="text-2xl font-black text-white">Rs. {Number(profile?.monthlySalary || profile?.salary || 0).toLocaleString()}</h4>
                     
                     <div className="border-t border-white/[0.06] mt-4 pt-4 space-y-1.5 text-[10px] font-bold text-slate-300 uppercase">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Daily Rate (Base / 30):</span>
                          <span className="font-black text-white">Rs. {Math.round(salaryDetails.dailyWage).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Payable Days:</span>
                          <span className="font-black text-emerald-400">{salaryDetails.payableDays} Days</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Unpaid Deductions:</span>
                          <span className="font-black text-rose-400">{salaryDetails.unpaidDays} Days (-Rs. {Math.round(salaryDetails.absentDeduction).toLocaleString()})</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Total Fines:</span>
                          <span className="font-black text-rose-400">-Rs. {salaryDetails.fines.toLocaleString()}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div 
                    onClick={() => setShowSalaryBreakdownModal(true)}
                    className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-900 to-indigo-950 text-white relative overflow-hidden border border-indigo-400/20 shadow-xl shadow-indigo-500/[0.03] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-all"
                  >
                     <div className="absolute right-[-10px] bottom-[-10px] text-white opacity-[0.03] w-28 h-28 rotate-12">
                        <DollarSign size={110} />
                     </div>
                     <div>
                       <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Estimated Retainable Net (Click for breakdown)</p>
                       <h4 className="text-3xl font-black mt-2">Rs. {salaryDetails.estimatedSalary.toLocaleString()}</h4>
                     </div>
                     <p className="text-[9px] opacity-50 mt-2 font-bold border-t border-indigo-500/20 pt-2">
                       Calculated dynamically for current month's marked logs. All leaves are paid.
                     </p>
                  </div>
                </div>

                {/* Salary slips */}
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText size={13} className="text-indigo-400" />
                  Official Payroll Documents
                </h4>
                
                <div className="space-y-3 mb-8">
                   {salaryRecords.length > 0 ? salaryRecords.map(rec => (
                     <div key={rec.id} className="p-4 bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08] transition-all rounded-[1.5rem] flex items-center justify-between shadow-sm">
                       <div>
                         <p className="font-bold text-sm text-slate-200">{new Date(rec.month + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                         <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Net Disbursed: Rs. {rec.netSalary.toLocaleString()}</p>
                       </div>
                       <div className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${
                         rec.status === 'paid' 
                           ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                           : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                       }`}>
                         {rec.status}
                       </div>
                     </div>
                   )) : (
                        <div className="text-center py-8 bg-white/[0.01] border border-dashed border-white/[0.04] rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                          No finalized payroll documents logged in ledger.
                        </div>
                     )}
                </div>

                <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertCircle size={13} className="text-rose-400" />
                  Compliance Fines Audit
                </h4>

                <div className="space-y-3">
                  {fines.length > 0 ? fines.map(fine => (
                    <div key={fine.id} className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08] transition-all flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400"><AlertCircle size={16} /></div>
                          <div>
                            <p className="text-sm font-bold text-slate-200">{fine.reason}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase mt-1.5">{formatDateDMY(fine.date)}</p>
                          </div>
                       </div>
                       <p className="font-black text-sm text-rose-500">- Rs. {fine.amount}</p>
                    </div>
                  )) : (
                    <div className="py-8 text-center bg-white/[0.01] border border-dashed border-white/[0.04] rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                      No system fines logged against user.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- SECURITY / PROFILE TAB --- */}
            {activeTab === 'profile' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Security & Identification</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Official internal employee profile clearance</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div>
                         <p className="text-[8px] font-black uppercase text-slate-500 mb-2 px-1 tracking-widest">National ID (CNIC)</p>
                         <div className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.04] flex items-center gap-4">
                            <Shield className="text-indigo-400 flex-shrink-0" size={16} />
                            <p className="text-sm font-bold text-slate-200">{profile?.cnic || 'Not registered'}</p>
                         </div>
                      </div>
                      <div>
                         <p className="text-[8px] font-black uppercase text-slate-500 mb-2 px-1 tracking-widest">Home Coordinates</p>
                         <div className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.04] flex items-start gap-4">
                            <MapPin className="text-indigo-400 mt-0.5 flex-shrink-0" size={16} />
                            <p className="text-sm font-bold text-slate-200 leading-relaxed">{profile?.address || 'No registered address.'}</p>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div>
                         <p className="text-[8px] font-black uppercase text-slate-500 mb-2 px-1 tracking-widest">Assigned IT Shift</p>
                         <div className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.04] flex items-center gap-4">
                            <Clock className="text-indigo-400 flex-shrink-0" size={16} />
                            <p className="text-sm font-bold text-slate-200">{profile?.dutyStartTime || '09:00'} - {profile?.dutyEndTime || '17:00'}</p>
                         </div>
                      </div>
                      <div>
                         <p className="text-[8px] font-black uppercase text-slate-500 mb-2 px-1 tracking-widest">Official Joining Date</p>
                         <div className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.04] flex items-center gap-4">
                            <Calendar className="text-indigo-400 flex-shrink-0" size={16} />
                            <p className="text-sm font-bold text-slate-200">{profile?.joiningDate ? formatDateDMY(profile.joiningDate) : 'Not recorded'}</p>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            )}
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
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Salary Breakdown</h3>
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
                <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Monthly Base Salary</p>
                  <p className="text-lg font-black text-gray-900">₨{Number(profile?.monthlySalary || profile?.salary || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Net Till Date Earned</p>
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

// Custom subcomponents for rendering checklists
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
