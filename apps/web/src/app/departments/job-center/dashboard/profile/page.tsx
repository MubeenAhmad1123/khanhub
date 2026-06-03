// src/app/departments/job-center/dashboard/profile/page.tsx
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
  AlertCircle, ChevronRight, Download, Info, Heart, Sparkles, FileText, CreditCard, XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY, toDate } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

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
}

// Helper to translate raw duty item keys to beautiful labels
function getDutyLabel(item: any, profile: any) {
  if (!item) return 'General Duty';
  if (item.label) return item.label;
  if (!item.key) return 'General Duty';
  
  const configItem = profile?.dutyConfig?.find((c: any) => c.key === item.key);
  if (configItem?.label) return configItem.label;
  
  const keyMap: Record<string, string> = {
    'morning': 'Morning Duty',
    'afternoon': 'Afternoon Duty',
    'evening': 'Evening Duty',
    'attendance': 'Attendance Entry',
    'cleanliness': 'Area Cleanliness'
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
    'uniform': 'Uniform Shirt',
    'shoes': 'Polished Shoes',
    'id_card': 'Employee Card',
    'card': 'Employee Card'
  };

  if (keyMap[item.key]) return keyMap[item.key];
  return item.key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<any>(null);
  const [seekerDoc, setSeekerDoc] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'special_tasks' | 'attendance' | 'finance' | 'dress' | 'duty' | 'score' | 'profile'>('special_tasks');
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [duties, setDuties] = useState<DutyRecord[]>([]);
  const [dressLogs, setDressLogs] = useState<DressRecord[]>([]);
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [growthHistory, setGrowthHistory] = useState<GrowthRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalarySlip[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showSalaryBreakdownModal, setShowSalaryBreakdownModal] = useState(false);
  const [contributionsMap, setContributionsMap] = useState<Record<string, any>>({});

  // Styles
  const glassStyle = "bg-white/70 backdrop-blur-xl border border-white shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff]";
  const neumorphicOutset = "shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff]";
  const neumorphicInset = "shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]";

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
      const att = attMap[day];
      if (att?.status === 'present' || att?.status === 'late') {
        attScore++;
        if (att.arrivedOnTime !== false) punctScore++;
      }

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

  const fetchMetrics = useCallback(async (sId: string) => {
    try {
      const prefix = 'jobcenter';
      const rawId = sId.startsWith('jobcenter_') ? sId.replace('jobcenter_', '') : sId;
      const prefixedId = sId.startsWith('jobcenter_') ? sId : `jobcenter_${sId}`;

      const fetchParallel = async (col: string, dateField: string = 'date') => {
        try {
          const [snap1, snap2] = await Promise.all([
            getDocs(query(collection(db, col), where('staffId', '==', rawId))),
            getDocs(query(collection(db, col), where('staffId', '==', prefixedId)))
          ]);
          const combined = [...snap1.docs, ...snap2.docs].map(d => ({ id: d.id, ...d.data() }));
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
          return unique.sort((a: any, b: any) => {
            const da = a[dateField] || '';
            const db = b[dateField] || '';
            return db.toString().localeCompare(da.toString());
          });
        } catch (e) {
          console.warn(`Query warning for ${col}:`, e);
          return [];
        }
      };

      const [att, duty, dress, tasks, fns, salaries, pointsSnap, contribSnap] = await Promise.all([
        fetchParallel(`${prefix}_attendance`, 'date'),
        fetchParallel(`${prefix}_duty_logs`, 'date'),
        fetchParallel(`${prefix}_dress_logs`, 'date'),
        fetchParallel(`${prefix}_special_tasks`, 'createdAt'),
        fetchParallel(`${prefix}_fines`, 'date'),
        fetchParallel(`${prefix}_salary_records`, 'month'),
        fetchParallel(`${prefix}_growth_points`, 'date'),
        fetchParallel(`${prefix}_contributions`, 'date')
      ]);

      setAttendance(att as AttendanceRecord[]);
      setDuties(duty as DutyRecord[]);
      setDressLogs(dress as DressRecord[]);
      setSpecialTasks(tasks as SpecialTask[]);
      setFines(fns as FineRecord[]);
      setSalaryRecords(salaries as SalarySlip[]);

      const cMap: Record<string, any> = {};
      contribSnap.forEach((d: any) => {
        if (d.date) {
          cMap[d.date] = d;
        }
      });
      setContributionsMap(cMap);

      const rawGrowth = pointsSnap as any[];
      const extraRows: any[] = [];
      pointsSnap.forEach((d: any) => {
        if (Number(d.extra) > 0) {
          extraRows.push({
            id: `${d.id}_extra`,
            points: d.extra,
            reason: 'Monthly Bonus/Extra Points',
            category: 'Growth Point Bonus',
            date: `${d.month || '2026-06'}-28`,
            month: d.month || '2026-06'
          });
        }
      });

      const contribRows = (contribSnap as any[])
        .filter((item: any) => item.status === 'yes' || item.isApproved === true)
        .map((item: any) => ({
          id: item.id,
          points: 1,
          reason: item.link ? `Contribution: ${item.link}` : 'Daily Growth Contribution',
          category: 'Growth Point',
          date: item.date,
          month: item.date && typeof item.date === 'string' ? item.date.substring(0, 7) : ''
        }));

      const combinedGrowth = [...rawGrowth, ...extraRows, ...contribRows];
      const uniqueGrowth = Array.from(new Map(combinedGrowth.map((item: any) => [item.id + '_' + item.category, item])).values())
        .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
      setGrowthHistory(uniqueGrowth as GrowthRecord[]);

    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  }, []);

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) { router.push('/departments/job-center/login'); return; }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);
        const userRef = doc(db, 'jobcenter_users', parsed.uid);
        let userSnap = await getDoc(userRef);
        let uData = null;
        let finalId = parsed.uid;

        if (userSnap.exists()) {
          uData = userSnap.data();
        } else {
          const fallbackSnap = await getDocs(query(collection(db, 'jobcenter_staff'), where('loginUserId', '==', parsed.uid))).catch(() => ({ docs: [] } as any));
          if (!fallbackSnap.empty) {
            userSnap = fallbackSnap.docs[0] as any;
            uData = userSnap.data();
            finalId = userSnap.id;
          }
        }

        if (!uData) {
          toast.error("User profile not found.");
          router.push('/departments/job-center/login');
          return;
        }

        setProfile({ 
          id: finalId, 
          ...uData,
          phone: uData.phone || uData.phoneNumber || uData.mobile || parsed.phone || parsed.phoneNumber || ''
        });

        if (parsed.role === 'seeker' && uData.seekerId) {
          const sSnap = await getDoc(doc(db, 'jobcenter_seekers', uData.seekerId));
          if (sSnap.exists()) setSeekerDoc({ id: sSnap.id, ...sSnap.data() });
        } else {
          await fetchMetrics(finalId);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [router, fetchMetrics]);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const handleUploadPhoto = async (file: File) => {
    try {
      setUploadingPhoto(true);
      const url = await uploadToCloudinary(file, 'Khan Hub/jobcenter/profile');
      await updateDoc(doc(db, 'jobcenter_users', session.uid), { photoUrl: url }).catch(() => {});
      setProfile((p: any) => ({ ...p, photoUrl: url }));
      toast.success('Photo updated');
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jobcenter_session');
    router.push('/departments/job-center/login');
  };

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
        payableDatesList: [] as { date: string; status: string }[],
        deductedDatesList: [] as { date: string; status: string; deduction: number }[]
      };
    }

    const monthlySalary = Number(profile.monthlySalary || profile.salary || 0);
    const days = daysInMonth();
    const totalDaysCount = days.length || 30;
    const dailyWage = monthlySalary / totalDaysCount;

    let presentDays = 0;
    let lateDays = 0;
    let paidLeaves = 0;
    let absentDays = 0;
    let unmarkedDays = 0;

    const payableDatesList: { date: string; status: string }[] = [];
    const deductedDatesList: { date: string; status: string; deduction: number }[] = [];

    const todayStr = new Date().toISOString().slice(0, 10);
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
        deductedDatesList.push({ date: dayStr, status: 'Absent', deduction: dailyWage });
      } else {
        if (isPast) {
          unmarkedDays++;
          deductedDatesList.push({ date: dayStr, status: 'Unmarked (Past)', deduction: dailyWage });
        }
      }
    });

    const payableDays = presentDays + lateDays + paidLeaves;
    const unpaidDaysTotal = absentDays + unmarkedDays;

    const earnings = payableDays * dailyWage;
    const absentDeduction = unpaidDaysTotal * dailyWage;
    const totalFines = fines.reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const estimatedSalary = Math.floor(Math.max(0, earnings - totalFines));

    return {
      dailyWage,
      presentDays,
      lateDays,
      paidLeaves,
      unpaidLeaves: 0,
      absentDays,
      payableDays,
      unpaidDays: unpaidDaysTotal,
      earnings,
      absentDeduction,
      estimatedSalary,
      fines: totalFines,
      payableDatesList,
      deductedDatesList
    };
  }, [profile, attendance, fines, daysInMonth]);

  const totalEarnings = useMemo(() => {
    return salaryDetails.estimatedSalary;
  }, [salaryDetails]);

  const totalFines = useMemo(() => {
    return salaryDetails.fines;
  }, [salaryDetails]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8]">
      <Loader2 className="animate-spin text-orange-600 w-10 h-10" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FCFBF8] pb-24 text-slate-900 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-6 md:px-12 bg-[#FCFBF8]/80 backdrop-blur-md border-b border-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${glassStyle} text-orange-600`}>
              <Briefcase size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Job Center</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Profile • Live</p>
            </div>
          </div>
          {session?.role !== 'seeker' && (
            <div className="hidden md:flex items-center gap-4">
              <div className={`px-6 py-3 rounded-2xl ${glassStyle} flex items-center gap-3`}>
                <Award className="text-amber-500" size={20} />
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Score</p>
                  <p className="text-lg font-black">
                    {computedScores.attendance + computedScores.uniform + computedScores.working + computedScores.growthPoint} Points
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className={`p-8 rounded-[3rem] ${glassStyle} flex flex-col items-center relative overflow-hidden`}>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl" />
            
            <div className="relative group">
              <div className={`w-32 h-32 rounded-[2.5rem] overflow-hidden ${neumorphicOutset} border-4 border-white/50 relative bg-gray-100`}>
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-50 flex items-center justify-center text-4xl font-black text-slate-200 uppercase">
                    {profile?.displayName?.[0] || profile?.name?.[0]}
                  </div>
                )}
              </div>
            </div>

            <h2 className="mt-6 text-2xl font-black text-center">{profile?.displayName || profile?.name}</h2>
            <p className="text-orange-600 font-black text-[10px] uppercase tracking-widest mt-2">{profile?.designation || (session?.role === 'seeker' ? 'Job Seeker' : 'Staff Member')}</p>
            
            <div className="mt-8 w-full space-y-3">
              <div className={`flex items-center gap-4 p-4 rounded-2xl ${neumorphicInset}`}>
                <Mail className="text-slate-300" size={16} />
                <span className="text-xs font-bold text-slate-600 truncate">{profile?.email}</span>
              </div>
              <div className={`flex items-center gap-4 p-4 rounded-2xl ${neumorphicInset}`}>
                <Phone className="text-slate-300" size={16} />
                <span className="text-xs font-bold text-slate-600">{profile?.phone || 'No Phone Linked'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="lg:col-span-8 space-y-8">
          {session?.role === 'seeker' ? (
             <div className={`p-8 md:p-10 rounded-[3.5rem] ${glassStyle}`}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><Heart size={20} /></div>
                  <h3 className="text-xl font-black">Linked Seeker Details</h3>
                </div>
                {seekerDoc ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8]`}>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Seeker Name</p>
                      <p className="text-md font-black">{seekerDoc.name}</p>
                    </div>
                    <div className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8]`}>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Admission Date</p>
                      <p className="text-md font-black">{formatDateDMY(seekerDoc.admissionDate)}</p>
                    </div>
                    <div className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8]`}>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Status</p>
                      <span className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${seekerDoc.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {seekerDoc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-30">
                    <Info size={48} className="mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest">No Linked Seeker</p>
                  </div>
                )}
             </div>
          ) : (
            <>
              <div className={`p-2 rounded-[2rem] ${glassStyle} flex overflow-x-auto no-scrollbar gap-1`}>
                {[
                  { id: 'special_tasks', label: 'Tasks', icon: <Target size={18} /> },
                  { id: 'attendance', label: 'Attendance', icon: <Calendar size={18} /> },
                  { id: 'duty', label: 'Duty Logs', icon: <Activity size={18} /> },
                  { id: 'dress', label: 'Dress', icon: <Shirt size={18} /> },
                  { id: 'score', label: 'Score', icon: <TrendingUp size={18} /> },
                  { id: 'finance', label: 'Finance', icon: <DollarSign size={18} /> },
                  { id: 'profile', label: 'Profile', icon: <Info size={18} /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                      ${activeTab === tab.id 
                        ? `bg-orange-600 text-white shadow-xl scale-105` 
                        : `text-slate-400 hover:text-orange-600 hover:bg-orange-50`}`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className={`p-8 md:p-10 rounded-[3.5rem] min-h-[500px] relative overflow-hidden ${glassStyle}`}>
                
                {activeTab === 'special_tasks' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><Target size={20} /></div>
                      <h3 className="text-xl font-black">Daily Special Tasks</h3>
                    </div>
                    <div className="space-y-4">
                      {specialTasks.length > 0 ? specialTasks.map(task => (
                        <div key={task.id} className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8] flex items-center justify-between group transition-transform hover:scale-[1.01]`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {task.status === 'completed' ? <CheckCircle size={20} /> : <Clock size={20} />}
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.task || task.description}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{formatDateDMY(task.date || task.createdAt)}</p>
                            </div>
                          </div>
                          <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-orange-600 shadow-sm">+{task.points || 0} PTS</div>
                        </div>
                      )) : (
                        <div className="py-20 flex flex-col items-center opacity-30">
                           <Sparkles size={48} className="text-slate-400 mb-4" />
                           <p className="font-black uppercase tracking-widest">No Active Tasks</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'attendance' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><Calendar size={20} /></div>
                      <h3 className="text-xl font-black">Attendance History</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {attendance.length > 0 ? attendance.map(log => (
                        <div key={log.id} className={`p-5 rounded-[2rem] ${neumorphicOutset} bg-[#FCFBF8] flex items-center justify-between`}>
                          <div>
                            <p className="font-bold text-sm text-slate-900">{formatDateDMY(log.date)}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase mt-1">
                              {log.arrivalTime || '--:--'} - {log.departureTime || '--:--'}
                            </p>
                          </div>
                          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            log.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {log.status}
                          </div>
                        </div>
                      )) : (
                        <div className="col-span-2 py-16 text-center border border-dashed border-gray-100 rounded-xl opacity-40">
                          <p className="text-sm font-bold">No attendance logs found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'duty' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><Activity size={20} /></div>
                      <h3 className="text-xl font-black">Work Logs</h3>
                    </div>
                    <div className="space-y-4">
                      {duties.length > 0 ? duties.map(duty => (
                        <div key={duty.id} className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8] flex items-center justify-between`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${duty.status === 'completed' ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-400'}`}>
                              <Activity size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold capitalize">{(duty.dutyType || 'Operations Routine').replace(/_/g, ' ')}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{formatDateDMY(duty.date)}</p>
                            </div>
                          </div>
                          <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-orange-600">+{duty.points || 0} PTS</div>
                        </div>
                      )) : (
                        <div className="py-16 text-center border border-dashed border-gray-100 rounded-xl opacity-40">
                          <p className="text-sm font-bold">No duties logged.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'dress' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><Shirt size={20} /></div>
                      <h3 className="text-xl font-black">Dress Compliance</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dressLogs.length > 0 ? dressLogs.map(log => (
                        <div key={log.id} className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8] flex items-center justify-between`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${log.status === 'yes' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300'}`}>
                              <Shirt size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{formatDateDMY(log.date)}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{log.status === 'yes' ? 'Compliant' : 'Non-Compliant'}</p>
                            </div>
                          </div>
                          {log.status === 'yes' && <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-orange-600">+{log.points || 0} PTS</div>}
                        </div>
                      )) : (
                        <div className="col-span-2 py-16 text-center border border-dashed border-gray-100 rounded-xl opacity-40">
                          <p className="text-sm font-bold">No attire logs stored.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'score' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><TrendingUp size={20} /></div>
                        <h3 className="text-xl font-black">Performance Analysis</h3>
                      </div>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-orange-500/20 w-full sm:w-auto"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                       <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-[#FCFBF8] text-center`}>
                          <Award className="mx-auto text-amber-500 mb-2" size={32} />
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Growth Vault Points</p>
                          <h4 className="text-3xl font-black mt-2">{computedScores.growthPoint}</h4>
                       </div>
                       <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-[#FCFBF8] text-center`}>
                          <TrendingUp className="mx-auto text-orange-500 mb-2" size={32} />
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Monthly Score</p>
                          <h4 className="text-3xl font-black mt-2">
                            {computedScores.attendance + computedScores.uniform + computedScores.working + computedScores.growthPoint}
                          </h4>
                       </div>
                    </div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Acquisition History ({selectedMonth})</h4>
                    <div className="space-y-3">
                      {growthHistory.filter(r => (r.month || (r.date ? r.date.substring(0, 7) : '')) === selectedMonth).length > 0 ? (
                        growthHistory.filter(r => (r.month || (r.date ? r.date.substring(0, 7) : '')) === selectedMonth).map(record => (
                          <div key={record.id} className={`p-5 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8] flex items-center justify-between`}>
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-2xl bg-orange-50 text-orange-600"><Award size={20} /></div>
                              <div>
                                <p className="font-bold text-slate-900">{record.reason || 'Performance Recognition'}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{record.date ? formatDateDMY(record.date) : 'Date Unspecified'}</p>
                              </div>
                            </div>
                            <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-orange-600">+{record.points} PTS</div>
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

                {activeTab === 'finance' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-gray-50">
                      <div>
                        <h3 className="text-xl font-black">Finance Gateway</h3>
                        <p className="text-xs text-slate-400 mt-1">Dynamic wages and checks</p>
                      </div>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-orange-500/20 w-full sm:w-auto"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                      <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-white border border-slate-100`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-slate-950 text-white rounded-2xl"><CreditCard size={20} /></div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Base Rate</span>
                        </div>
                        <p className="text-xs font-medium text-slate-500">Total Monthly Salary</p>
                        <h4 className="text-2xl font-black mt-1">Rs. {(profile?.monthlySalary || profile?.salary || 0).toLocaleString()}</h4>
                        <div className="border-t border-slate-100 mt-6 pt-4 space-y-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <div className="flex justify-between">
                            <span>Daily Wage Rate:</span>
                            <span className="text-slate-800">Rs. {Math.round(salaryDetails.dailyWage).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payable Days Count:</span>
                            <span className="text-emerald-600">{salaryDetails.payableDays} Days</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Absent Deductible:</span>
                            <span className="text-rose-500">{salaryDetails.unpaidDays} Days (-Rs. {Math.round(salaryDetails.absentDeduction).toLocaleString()})</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fines:</span>
                            <span className="text-rose-500">-Rs. {totalFines.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div 
                        onClick={() => setShowSalaryBreakdownModal(true)}
                        className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-orange-600 text-white relative overflow-hidden flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-all`}
                      >
                         <DollarSign size={80} className="absolute -right-4 -bottom-4 opacity-10" />
                         <div>
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Est. Net Salary (Click for breakdown)</p>
                           <h4 className="text-3xl font-black mt-2">Rs. {totalEarnings.toLocaleString()}</h4>
                         </div>
                         <p className="text-xs mt-4 font-medium opacity-70 border-t border-orange-500 pt-2">
                           Calculated dynamically. All leaves are paid.
                         </p>
                      </div>
                    </div>

                    {/* Payroll slips */}
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText size={14} className="text-teal-600" />
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

                    <div className="space-y-3">
                      {fines.map(fine => (
                        <div key={fine.id} className={`p-5 rounded-3xl ${neumorphicInset} flex items-center justify-between`}>
                           <div className="flex items-center gap-4">
                              <div className="p-2 bg-rose-50 rounded-xl text-rose-500"><AlertCircle size={18} /></div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{fine.reason}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase">{formatDateDMY(fine.date)}</p>
                              </div>
                           </div>
                           <p className="font-black text-rose-500">- Rs. {fine.amount}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'profile' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><User size={20} /></div>
                      <h3 className="text-xl font-black">Personal Dossier</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div>
                             <p className="text-[9px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">National ID (CNIC)</p>
                             <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-center gap-4`}>
                                <Shield className="text-orange-500" size={18} />
                                <p className="text-sm font-bold text-slate-700">{profile?.cnic || 'Not provided'}</p>
                             </div>
                          </div>
                          <div>
                             <p className="text-[9px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">Home Address</p>
                             <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-start gap-4`}>
                                <MapPin className="text-orange-500 mt-1" size={18} />
                                <p className="text-sm font-bold text-slate-700 leading-relaxed">{profile?.address || 'No address registered.'}</p>
                             </div>
                          </div>
                       </div>
                       <div className="space-y-6">
                          <div>
                             <p className="text-[9px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">Work Schedule</p>
                             <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-center gap-4`}>
                                <Clock className="text-orange-500" size={18} />
                                <p className="text-sm font-bold text-slate-700">{profile?.dutyStartTime || '09:00'} - {profile?.dutyEndTime || '17:00'}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Salary Calculation Breakdown Modal */}
      {showSalaryBreakdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 text-gray-900">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-orange-600">Salary Breakdown</h3>
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
                <div className="p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50">
                  <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Monthly Base Salary</p>
                  <p className="text-lg font-black text-gray-900">₨{Number(profile?.monthlySalary || profile?.salary || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-100/50">
                  <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1">Net Till Date Earned</p>
                  <p className="text-lg font-black text-teal-600">₨{salaryDetails.estimatedSalary.toLocaleString()}</p>
                </div>
              </div>

              {/* Calculations Formula */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <p className="text-[9px] font-black text-black uppercase tracking-widest">Calculation Formula</p>
                <div className="space-y-1 font-mono text-gray-600">
                  <div className="flex justify-between">
                    <span>Base Daily Rate:</span>
                    <span>₨{Number(profile?.monthlySalary || profile?.salary || 0).toLocaleString()} / {daysInMonth().length} = ₨{Math.round(salaryDetails.dailyWage).toLocaleString()} / Day</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Payable Days Earned ({salaryDetails.payableDays} Days):</span>
                    <span>+ ₨{Math.round(salaryDetails.earnings).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-500">
                    <span>Unmarked / Absent Deductions ({salaryDetails.unpaidDays} Days):</span>
                    <span>- ₨{Math.round(salaryDetails.absentDeduction).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-500">
                    <span>Fines:</span>
                    <span>- ₨{salaryDetails.fines.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-black text-gray-900">
                    <span>Till Date Net:</span>
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
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 text-center text-[10px] text-gray-400 italic">
              All marked leaves are fully paid. Deductions only apply to absences and past unmarked days.
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-4 { from { transform: translateY(1rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.5s ease-out, slide-in-from-bottom-4 0.5s ease-out; }
      `}</style>
    </div>
  );
}
