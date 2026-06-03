// src/app/departments/spims/dashboard/profile/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs,
  orderBy, limit
} from 'firebase/firestore';
import {
  User, Camera, Loader2, Calendar, ClipboardCheck,
  Shirt, Award, Clock, Target, DollarSign,
  Activity, MapPin, Mail, Briefcase,
  AlertCircle, ChevronRight, Info, Phone, LogOut, CheckCircle, XCircle, Heart, Sparkles, Trophy, FileText, CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

// --- Types ---
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

interface ContributionRecord { 
  id: string; 
  date: any; 
  title: string; 
  content: string; 
  isApproved: boolean; 
  points: number; 
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
  status?: 'paid' | 'unpaid'; 
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

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [staffDoc, setStaffDoc] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'attendance' | 'duty' | 'dress' | 'finance'>('overview');

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

  const fetchMetrics = useCallback(async (sId: string, dept: string) => {
    try {
      const prefix = dept === 'hq' ? 'hq' : dept === 'spims' ? 'spims' : 'rehab';
      const rawId = sId.startsWith(`${prefix}_`) ? sId.replace(`${prefix}_`, '') : sId;
      const prefixedId = sId.startsWith(`${prefix}_`) ? sId : `${prefix}_${sId}`;

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
          console.warn(`Query sync warning for ${col}:`, e);
          return [];
        }
      };

      const [att, duty, dress, contrib, tasks, fns, salaries, pointsSnap] = await Promise.all([
        fetchParallel(`${prefix}_attendance`, 'date'),
        fetchParallel(`${prefix}_duty_logs`, 'date'),
        fetchParallel(`${prefix}_dress_logs`, 'date'),
        fetchParallel(`${prefix}_contributions`, 'date'),
        fetchParallel(`${prefix}_special_tasks`, 'createdAt'),
        fetchParallel(`${prefix}_fines`, 'date'),
        fetchParallel(`${prefix}_salary_records`, 'month'),
        getDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', rawId))).catch(() => ({ docs: [] } as any))
      ]);

      setAttendance(att as AttendanceRecord[]);
      setDuties(duty as DutyRecord[]);
      setDressLogs(dress as DressRecord[]);
      setSpecialTasks(tasks as SpecialTask[]);
      setFines(fns as FineRecord[]);
      setSalaryRecords(salaries as SalarySlip[]);

      const cMap: Record<string, any> = {};
      contrib.forEach((d: any) => {
        if (d.date) {
          cMap[d.date] = d;
        }
      });
      setContributionsMap(cMap);

      const rawGrowth = pointsSnap.docs ? pointsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [];
      const extraRows: any[] = [];
      if (pointsSnap.docs) {
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
      }

      const contribRows = (contrib as any[])
        .filter((item: any) => item.status === 'yes' || item.isApproved === true)
        .map((item: any) => ({
          id: item.id || item.date,
          points: item.points || 1,
          reason: item.title || item.link ? `Contribution: ${item.title || item.link}` : 'Daily Growth Contribution',
          category: 'Growth Point',
          date: item.date,
          month: item.date && typeof item.date === 'string' ? item.date.substring(0, 7) : ''
        }));

      const combinedGrowth = [...rawGrowth, ...extraRows, ...contribRows];
      const uniqueGrowth = Array.from(new Map(combinedGrowth.map((item: any) => [item.id + '_' + item.category, item])).values())
        .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
      setGrowthHistory(uniqueGrowth as GrowthRecord[]);

    } catch (error) {
      console.error("Critical metric query failure:", error);
    }
  }, []);

  useEffect(() => {
    const sessionData = localStorage.getItem('spims_session');
    if (!sessionData) { router.push('/departments/spims/login'); return; }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);
        let userSnap = null;
        try {
          userSnap = await getDoc(doc(db, 'spims_users', parsed.uid));
        } catch (e) { }

        if (!userSnap || !userSnap.exists()) {
          try { userSnap = await getDoc(doc(db, 'rehab_users', parsed.uid)); } catch (e) { }
        }

        let uData = null;
        let finalId = parsed.uid;
        if (userSnap && userSnap.exists()) {
          uData = userSnap.data();
          setProfile({ 
            id: userSnap.id, 
            ...uData,
            phone: uData.phone || uData.phoneNumber || uData.mobile || parsed.phone || parsed.phoneNumber || ''
          });
          finalId = userSnap.id;
        } else {
          setProfile({ 
            id: parsed.uid, 
            displayName: parsed.displayName, 
            role: parsed.role, 
            email: parsed.email,
            phone: parsed.phone || parsed.phoneNumber || ''
          });
        }

        const finalRole = uData?.role || parsed.role;
        if (finalRole === 'student' || finalRole === 'family') {
          const sid = parsed.studentId || parsed.patientId || parsed.uid;
          router.replace(`/departments/spims/dashboard/student/${sid}`);
          return;
        }

        if (finalRole !== 'student' && finalRole !== 'family') {
          let sSnap = await getDocs(query(collection(db, 'spims_staff'), where('loginUserId', '==', parsed.uid))).catch(() => ({ docs: [] } as any));
          if (sSnap.empty) {
            sSnap = await getDocs(query(collection(db, 'rehab_staff'), where('loginUserId', '==', parsed.uid))).catch(() => ({ docs: [] } as any));
          }

          if (!sSnap.empty) {
            const sd = { id: sSnap.docs[0].id, ...sSnap.docs[0].data() as any };
            setStaffDoc(sd);
            await fetchMetrics(sd.id, sd.department || 'spims');
          } else {
            await fetchMetrics(finalId, 'spims');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [router, fetchMetrics]);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const handleUploadPhoto = async (file: File) => {
    if (!session?.uid) return;
    try {
      setUploadingPhoto(true);
      const url = await uploadToCloudinary(file, 'Khan Hub/spims/profile');
      await updateDoc(doc(db, 'spims_users', session.uid), { photoUrl: url }).catch(() => { });
      setProfile((p: any) => ({ ...p, photoUrl: url }));
      toast.success('Photo updated');
    } catch (e: any) {
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spims_session');
    router.push('/departments/spims/login');
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

  const assignedDuties = useMemo(() => {
    return profile?.dutyConfig || profile?.duties || [];
  }, [profile]);

  const assignedDress = useMemo(() => {
    return profile?.dressCodeConfig || [];
  }, [profile]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB]">
      <Loader2 className="animate-spin text-teal-600 w-10 h-10 mb-4" />
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Synchronizing Profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24 text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">SPIMS Gateway</h1>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <span>Staff Portal</span>
                <span className="w-1 h-1 bg-green-500 rounded-full inline-block"></span>
                <span className="text-green-600">Live</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden md:flex bg-gray-50 px-4 py-2 rounded-full border border-gray-100 items-center gap-2">
                <Award className="text-amber-500" size={16} />
                <span className="text-xs font-bold text-gray-700">
                  {computedScores.attendance + computedScores.uniform + computedScores.working + computedScores.growthPoint} Points
                </span>
             </div>
             <button 
               onClick={handleLogout}
               className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" 
               title="Sign Out"
             >
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Minimalist Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-center shadow-sm relative text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-teal-500"></div>
            
            <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 relative bg-gray-100">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-300">
                    {profile?.displayName?.[0] || profile?.name?.[0]}
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-xl font-black text-gray-900">{profile?.displayName || profile?.name}</h2>
            <p className="text-teal-600 font-bold text-xs uppercase tracking-widest mt-1 bg-teal-50 px-3 py-1 rounded-full inline-block">
              {profile?.designation || 'Educator Member'}
            </p>

            <div className="mt-8 w-full space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-left">
                <Mail className="text-gray-400 flex-shrink-0" size={16} />
                <span className="text-xs font-bold text-gray-600 truncate">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-left">
                <Phone className="text-gray-400 flex-shrink-0" size={16} />
                <span className="text-xs font-bold text-gray-600">{profile?.phone || 'No Contact Linked'}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 w-full">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Emp ID</p>
                <p className="text-sm font-black text-gray-900">#{profile?.employeeId || profile?.customId || '---'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Joined</p>
                <p className="text-sm font-black text-gray-900">{profile?.joiningDate ? formatDateDMY(profile.joiningDate).split('-')[2] : '2024'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Main Content */}
        <div className="lg:col-span-8 space-y-6">

          {/* Navigation Tabs - Minimalist Style */}
          <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex overflow-x-auto no-scrollbar gap-1 shadow-sm">
            {[
              { id: 'overview', label: 'Overview', icon: <Info size={16} /> },
              { id: 'tasks', label: 'Tasks & Growth', icon: <Target size={16} /> },
              { id: 'attendance', label: 'Attendance', icon: <Calendar size={16} /> },
              { id: 'duty', label: 'Duties', icon: <Briefcase size={16} /> },
              { id: 'dress', label: 'Apparel', icon: <Shirt size={16} /> },
              { id: 'finance', label: 'Finance', icon: <DollarSign size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? `bg-gray-900 text-white shadow-md`
                    : `text-gray-500 hover:text-gray-900 hover:bg-gray-50`}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dynamic Content Area */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm min-h-[500px]">

            {activeTab === 'overview' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-lg font-black text-gray-900 mb-6">Personal Registry & Credentials</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 px-1">National ID (CNIC)</p>
                      <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-900">
                        {profile?.cnic || 'Not registered'}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 px-1">Date of Birth</p>
                      <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-900">
                        {profile?.dob ? formatDateDMY(profile.dob) : 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 px-1">Residential Address</p>
                      <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-900">
                        {profile?.address || 'No registered home address.'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 px-1">Designated Schedule Slot</p>
                      <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-900">
                        {profile?.dutyStartTime || '09:00'} - {profile?.dutyEndTime || '17:00'}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 px-1">Blood Group Signature</p>
                      <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-900">
                        {profile?.bloodGroup || 'Not specified'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h3 className="text-lg font-black text-gray-900">Assigned Operational Assignments</h3>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                    <Trophy className="mx-auto text-amber-500 mb-1" size={24} />
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Growth points ({selectedMonth})</p>
                    <h4 className="text-xl font-black mt-1">{computedScores.growthPoint} PTS</h4>
                  </div>
                  <div className="p-5 rounded-2xl bg-teal-50 border border-teal-100 text-center">
                    <Award className="mx-auto text-teal-600 mb-1" size={24} />
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Total Score ({selectedMonth})</p>
                    <h4 className="text-xl font-black mt-1">
                      {computedScores.attendance + computedScores.uniform + computedScores.working + computedScores.growthPoint} PTS
                    </h4>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tasks Timeline</h4>
                <div className="space-y-3">
                  {specialTasks.length > 0 ? specialTasks.map(task => (
                    <div key={task.id} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${task.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                          {task.status === 'completed' ? <ClipboardCheck size={18} /> : <Clock size={18} />}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.task || task.description}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{formatDateDMY(task.date || task.createdAt)}</p>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[10px] font-black text-teal-600">
                        +{task.points || 0} PTS
                      </div>
                    </div>
                  )) : (
                    <div className="py-12 text-center border border-dashed border-gray-100 rounded-xl">
                      <p className="text-gray-400 text-sm font-bold">No active tasks designated by administration.</p>
                    </div>
                  )}
                </div>

                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-8 mb-3">Contributions Timeline ({selectedMonth})</h4>
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

            {activeTab === 'attendance' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-lg font-black text-gray-900 mb-6">Presence & Punctuality Audit (30 Days)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attendance.length > 0 ? attendance.map(log => (
                    <div key={log.id} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-black text-sm text-gray-900">{formatDateDMY(log.date)}</p>
                        <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                          {log.arrivalTime || '--:--'} - {log.departureTime || '--:--'}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${log.status === 'present' ? 'bg-green-50 text-green-700' :
                          log.status === 'late' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {log.status.replace('_', ' ')}
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-16 text-center border border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                      <Calendar size={36} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">No attendance ledger found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'duty' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-lg font-black text-gray-900 mb-6">Duty Log Deployment History</h3>

                <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Briefcase size={14} className="text-teal-600" />
                    Assigned Master Duties
                  </h4>
                  {assignedDuties.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {assignedDuties.map((duty: any, idx: number) => {
                        const label = duty.label || duty.description || (typeof duty === 'string' ? duty : 'General Duty');
                        return (
                          <span key={idx} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold shadow-sm">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-gray-400">No master duties assigned by administration.</p>
                  )}
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
                            {sub.status === 'done' ? <CheckCircle size={12} /> : sub.status === 'na' ? <Info size={12} /> : <XCircle size={12} />}
                            {sub.label}
                          </div>
                        )) : (
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold bg-gray-100 border-gray-200 text-gray-700`}>
                            {rec.status === 'completed' ? <CheckCircle size={12} className="text-emerald-600" /> : <AlertCircle size={12} className="text-amber-600"/>}
                            <span className="capitalize">{(rec.dutyType || 'General routine deployment').replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <Briefcase size={36} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">No operational duties registered.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dress' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-lg font-black text-gray-900 mb-6">Dress & Attire Compliance History</h3>

                <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Shirt size={14} className="text-teal-600" />
                    Assigned Dress Code Requirements
                  </h4>
                  {assignedDress.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {assignedDress.map((item: any, idx: number) => {
                        const label = item.label || (typeof item === 'string' ? item : 'Uniform Item');
                        return (
                          <span key={idx} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold shadow-sm">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-gray-400">No specific dress code requirements assigned by administration.</p>
                  )}
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
                            {item.status === 'yes' ? <CheckCircle size={12} /> : item.status === 'na' ? <Info size={12} /> : <AlertCircle size={12} />}
                            {item.label}
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
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">No appearance evaluations recorded.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="animate-in fade-in duration-300">
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

                {/* Salary Slips */}
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
                    <div key={fine.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                       <div>
                        <p className="font-bold text-sm text-gray-800">{fine.reason}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{formatDateDMY(fine.date)}</p>
                      </div>
                      <div className="text-sm font-bold text-rose-600">-Rs. {fine.amount}</div>
                    </div>
                  ))}
                  {fines.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 font-medium border border-dashed border-gray-100 rounded-xl">No system fines enforced.</div>
                  )}
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
                <h3 className="text-sm font-black uppercase tracking-widest text-[#1D9E75]">Salary Breakdown</h3>
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
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-4 { from { transform: translateY(1rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.5s ease-out, slide-in-from-bottom-4 0.5s ease-out; }
      `}</style>
    </div>
  );
}
