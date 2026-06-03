// src/app/departments/welfare/dashboard/profile/page.tsx
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
  AlertCircle, Sparkles, Trophy, FileText, CreditCard, XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY } from '@/lib/utils';
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

  // Clean Minimalist Styles
  const cardStyle = "bg-white border border-slate-100 shadow-sm rounded-[1.5rem]";
  const inputCardStyle = "bg-slate-50 border border-slate-100 rounded-2xl";

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
      const prefix = 'welfare';
      const rawId = sId.startsWith('welfare_') ? sId.replace('welfare_', '') : sId;
      const prefixedId = sId.startsWith('welfare_') ? sId : `welfare_${sId}`;

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
    const sessionData = localStorage.getItem('welfare_session');
    if (!sessionData) { router.push('/departments/welfare/login'); return; }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);
        
        let userSnap: any = null;
        let collectionName = 'welfare_users';

        try {
          const userRef = doc(db, 'welfare_users', parsed.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            userSnap = snap;
            collectionName = 'welfare_users';
          }
        } catch (e) {}

        if (!userSnap) {
          try {
            const fallbackSnap = await getDocs(query(collection(db, 'welfare_staff'), where('loginUserId', '==', parsed.uid)));
            if (!fallbackSnap.empty) {
              userSnap = fallbackSnap.docs[0];
              collectionName = 'welfare_staff';
            }
          } catch (e) {}
        }

        if (!userSnap) { 
          router.push('/departments/welfare/login'); 
          return; 
        }
        
        const uData = userSnap.data();
        setProfile({ 
          id: userSnap.id, 
          _collection: collectionName, 
          ...uData,
          phone: uData.phone || uData.phoneNumber || uData.mobile || parsed.phone || parsed.phoneNumber || ''
        });

        await fetchMetrics(userSnap.id);
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
    if (!profile) return;
    try {
      setUploadingPhoto(true);
      const url = await uploadToCloudinary(file, 'Khan Hub/welfare/profile');
      const collName = profile._collection || 'welfare_users';
      await updateDoc(doc(db, collName, profile.id), { photoUrl: url });
      setProfile((p: any) => ({ ...p, photoUrl: url }));
      toast.success('Photo updated');
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
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
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin text-slate-800"><Loader2 size={32} /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pb-24 text-slate-900">
      {/* Page Title & Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Profile</h1>
          <p className="text-xs text-slate-500 mt-1">Manage your personal and professional record</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
          <Award className="text-amber-600" size={18} />
          <div>
            <p className="text-[9px] font-bold uppercase text-amber-700 tracking-wider">Total Score</p>
            <p className="text-base font-bold text-amber-900 leading-none mt-0.5">
              {computedScores.attendance + computedScores.uniform + computedScores.working + computedScores.growthPoint} PTS
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`p-6 ${cardStyle} flex flex-col items-center relative`}>
            <div className="relative group">
              <div className={`w-28 h-28 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative`}>
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-400 uppercase">
                    {profile?.displayName?.[0] || profile?.name?.[0]}
                  </div>
                )}
              </div>
            </div>

            <h2 className="mt-4 text-lg font-bold text-center text-slate-900">{profile?.displayName || profile?.name}</h2>
            <p className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider mt-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              {profile?.designation || 'Welfare Staff'}
            </p>
            
            <div className="mt-6 w-full space-y-2">
              <div className={`flex items-center gap-3 p-3.5 ${inputCardStyle}`}>
                <Mail className="text-slate-400" size={14} />
                <span className="text-xs font-medium text-slate-700 truncate">{profile?.email}</span>
              </div>
              <div className={`flex items-center gap-3 p-3.5 ${inputCardStyle}`}>
                <Phone className="text-slate-400" size={14} />
                <span className="text-xs font-medium text-slate-700">{profile?.phone || 'No Phone Linked'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="lg:col-span-8 space-y-6">
          {/* Navigation Scroll Bar */}
          <div className="flex items-center overflow-x-auto no-scrollbar gap-1.5 p-1 bg-slate-100 rounded-2xl">
            {[
              { id: 'special_tasks', label: 'Tasks', icon: <Target size={14} /> },
              { id: 'attendance', label: 'Attendance', icon: <Calendar size={14} /> },
              { id: 'duty', label: 'Work Logs', icon: <Activity size={14} /> },
              { id: 'dress', label: 'Dress', icon: <Shirt size={14} /> },
              { id: 'score', label: 'Performance', icon: <TrendingUp size={14} /> },
              { id: 'finance', label: 'Finance', icon: <DollarSign size={14} /> },
              { id: 'profile', label: 'Personal', icon: <User size={14} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap
                  ${activeTab === tab.id 
                    ? `bg-white text-slate-900 shadow-sm` 
                    : `text-slate-500 hover:text-slate-800`}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Card Container */}
          <div className={`p-6 md:p-8 ${cardStyle} min-h-[400px]`}>
            
            {activeTab === 'special_tasks' && (
              <div>
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-50">
                  <Target size={16} className="text-slate-700" />
                  <h3 className="text-base font-bold">Special Tasks</h3>
                </div>
                <div className="space-y-3">
                  {specialTasks.length > 0 ? specialTasks.map(task => (
                    <div key={task.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {task.status === 'completed' ? <CheckCircle size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.task || task.description}</p>
                          <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">{formatDateDMY(task.date || task.createdAt)}</p>
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded-md bg-white border border-slate-100 text-[10px] font-bold text-slate-600">+{task.points || 0} PTS</div>
                    </div>
                  )) : (
                    <div className="py-16 flex flex-col items-center opacity-40">
                      <Sparkles size={32} className="text-slate-400 mb-3" />
                      <p className="text-xs font-bold uppercase tracking-wider">No tasks registered</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div>
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-50">
                  <Calendar size={16} className="text-slate-700" />
                  <h3 className="text-base font-bold">Attendance Records</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attendance.map(log => (
                    <div key={log.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{formatDateDMY(log.date)}</p>
                        <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                          {log.arrivalTime || '--:--'} - {log.departureTime || '--:--'}
                        </p>
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide ${
                        log.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {log.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold">Financial Statements</h3>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/20"
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
                     <h4 className="text-2xl font-black text-gray-900">Rs. {(profile?.monthlySalary || profile?.salary || 0).toLocaleString()}</h4>
                     
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
                       Calculated dynamically. All leaves are paid.
                     </p>
                  </div>
                </div>

                {/* Salary slips */}
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText size={14} className="text-slate-800" />
                  Official Payroll Ledger
                </h4>
                
                <div className="space-y-3 mb-8">
                   {salaryRecords.length > 0 ? salaryRecords.map(rec => (
                     <div key={rec.id} className="p-4 border border-gray-100 bg-white rounded-xl flex items-center justify-between shadow-sm transition-all hover:shadow-md">
                       <div>
                         <p className="font-bold text-gray-900">{new Date(rec.month + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                         <p className="text-xs text-gray-400 font-medium">Net Disbursed: Rs. {rec.netSalary.toLocaleString()}</p>
                       </div>
                       <div className={`px-3 py-1 text-[11px] font-black uppercase tracking-wide rounded-md ${rec.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
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
                  {fines.map(fine => (
                    <div key={fine.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between bg-white">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><AlertCircle size={14} /></div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{fine.reason}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{formatDateDMY(fine.date)}</p>
                          </div>
                       </div>
                       <p className="font-bold text-rose-500 text-sm">- Rs. {fine.amount}</p>
                    </div>
                  ))}
                  {fines.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-100 rounded-xl">No system fines.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'duty' && (
              <div>
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-50">
                  <Activity size={16} className="text-slate-700" />
                  <h3 className="text-base font-bold">Daily Duty Checks</h3>
                </div>
                <div className="space-y-4">
                  {duties.map(duty => {
                    const hasBreakdown = !!(duty.duties && Array.isArray(duty.duties));
                    const totalChecked = hasBreakdown && duty.duties ? duty.duties.length : 0;
                    const doneCount = hasBreakdown && duty.duties ? duty.duties.filter((d: any) => d.status === 'done').length : 0;
                    
                    return (
                      <div key={duty.id} className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100`}>
                              <Activity size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{formatDateDMY(duty.date)}</p>
                              <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                {hasBreakdown && duty.duties ? `${doneCount} of ${totalChecked} tasks completed` : 'General Duties'}
                              </p>
                            </div>
                          </div>
                          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                            +{duty.points || 0} PTS
                          </div>
                        </div>

                        {hasBreakdown && duty.duties ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-100/50">
                            {duty.duties.map((item: any) => (
                              <div key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100/40">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${item.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                  {item.status === 'done' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                </div>
                                <span className="text-xs font-medium text-slate-700">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100/40 text-xs font-medium text-slate-600 capitalize">
                            {duty.dutyType?.replace(/_/g, ' ') || 'Operations duty logged'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {duties.length === 0 && (
                    <div className="py-16 text-center opacity-50">
                      <Activity size={32} className="mx-auto mb-2 text-slate-400" />
                      <p className="text-xs font-bold text-slate-500 uppercase">No Work Logs Found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dress' && (
              <div>
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-50">
                  <Shirt size={16} className="text-slate-700" />
                  <h3 className="text-base font-bold">Dress Compliance Logs</h3>
                </div>
                <div className="space-y-4">
                  {dressLogs.map(log => {
                    const items = log.items || [];
                    const hasItems = items.length > 0;
                    const isAllCompliant = hasItems && items.every((i: any) => i.status === 'yes');
                    
                    return (
                      <div key={log.id} className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isAllCompliant || log.status === 'yes' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'} border`}>
                              <Shirt size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{formatDateDMY(log.date)}</p>
                              <p className={`text-[10px] font-semibold mt-0.5 ${isAllCompliant || log.status === 'yes' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {isAllCompliant || log.status === 'yes' ? 'Fully Compliant' : 'Issues Found'}
                              </p>
                            </div>
                          </div>
                          {(log.points || 0) > 0 && (
                            <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                              +{log.points} PTS
                            </div>
                          )}
                        </div>

                        {hasItems && (
                          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100/50">
                            {items.map((i: any) => (
                              <span 
                                key={i.key} 
                                className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border ${
                                  i.status === 'yes' 
                                    ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100' 
                                    : 'bg-rose-50 text-rose-700 border-rose-100'
                                }`}
                              >
                                {i.status === 'yes' ? <CheckCircle size={8} /> : <AlertCircle size={8} />}
                                {i.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dressLogs.length === 0 && (
                    <div className="py-16 text-center opacity-50">
                      <Shirt size={32} className="mx-auto mb-2 text-slate-400" />
                      <p className="text-xs font-bold text-slate-500 uppercase">No Dress Logs Registered</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'score' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-slate-700" />
                    <h3 className="text-base font-bold">Performance History</h3>
                  </div>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center justify-center text-center">
                     <Award className="text-amber-600 mb-2" size={24} />
                     <p className="text-[9px] font-bold uppercase text-amber-700 tracking-wider">Growth vault score</p>
                     <h4 className="text-xl font-black text-amber-900 mt-1">{computedScores.growthPoint}</h4>
                  </div>
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-center col-span-1 sm:col-span-2">
                     <Sparkles className="text-emerald-600 mb-2" size={24} />
                     <p className="text-[9px] font-bold uppercase text-emerald-700 tracking-wider">Total Monthly Score</p>
                     <h4 className="text-xl font-black text-emerald-900 mt-1">
                       {computedScores.attendance + computedScores.uniform + computedScores.working + computedScores.growthPoint} PTS
                     </h4>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Detailed Monthly Ledger ({selectedMonth})</h4>
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

            {activeTab === 'profile' && (
              <div>
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-50">
                  <User size={16} className="text-slate-700" />
                  <h3 className="text-base font-bold">Identity Credentials</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div>
                         <p className="text-[9px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">National CNIC</p>
                         <div className="p-3.5 rounded-xl bg-slate-50 flex items-center gap-3 text-slate-700">
                            <Shield className="text-slate-400" size={14} />
                            <p className="text-xs font-medium">{profile?.cnic || 'Not registered'}</p>
                         </div>
                      </div>
                      <div>
                         <p className="text-[9px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Home Address</p>
                         <div className="p-3.5 rounded-xl bg-slate-50 flex items-start gap-3 text-slate-700">
                            <MapPin className="text-slate-400 mt-0.5" size={14} />
                            <p className="text-xs font-medium leading-relaxed">{profile?.address || 'No registered address'}</p>
                         </div>
                      </div>
                   </div>
                   <div>
                      <div>
                         <p className="text-[9px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Schedule Slots</p>
                         <div className="p-3.5 rounded-xl bg-slate-50 flex items-center gap-3 text-slate-700">
                            <Clock className="text-slate-400" size={14} />
                            <p className="text-xs font-medium">{profile?.dutyStartTime || '09:00'} - {profile?.dutyEndTime || '17:00'}</p>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Salary Calculation Breakdown Modal */}
      {showSalaryBreakdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 text-gray-900">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-teal-650">Salary Breakdown</h3>
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
                <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-100/50">
                  <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1">Monthly Base Salary</p>
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
      `}</style>
    </div>
  );
}
