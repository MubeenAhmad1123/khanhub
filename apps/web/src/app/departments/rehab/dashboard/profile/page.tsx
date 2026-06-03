// src/app/departments/rehab/dashboard/profile/page.tsx
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
  Heart, CheckCircle2, XCircle, FileText, Eye, LogOut, CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY, toDate } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

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
  isCompliant?: boolean; // Regional manager logs boolean
  items?: Array<{ key: string; label: string; status: 'yes' | 'no' | 'na' }>;
}

interface SpecialTask {
  id: string;
  description?: string;
  task?: string; // Legacy fallback
  status: 'assigned' | 'acknowledged' | 'completed' | 'pending';
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
  return item.key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'attendance' | 'duty' | 'dress' | 'score' | 'finance' | 'profile'>('tasks');
  
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

  // Design Tokens for Clean Minimalism
  const cardStyle = "bg-white border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl transition-all";
  const inputStyle = "bg-gray-50 border-gray-100 rounded-xl px-4 py-3 w-full border focus:ring-2 focus:ring-[#1D9E75]/20 outline-none text-sm transition-all text-gray-800";

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

  const fetchMetrics = useCallback(async (sId: string, authUid?: string, customId?: string, employeeId?: string) => {
    try {
      const prefix = 'rehab';
      
      const candidateIds = new Set<string>();
      if (sId) {
        candidateIds.add(sId);
        candidateIds.add(sId.startsWith('rehab_') ? sId.replace('rehab_', '') : sId);
        candidateIds.add(sId.startsWith('rehab_') ? sId : `rehab_${sId}`);
      }
      if (authUid) {
        candidateIds.add(authUid);
        candidateIds.add(authUid.startsWith('rehab_') ? authUid.replace('rehab_', '') : authUid);
        candidateIds.add(authUid.startsWith('rehab_') ? authUid : `rehab_${authUid}`);
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
        growthSnap,
        salarySnap,
        contribSnap
      ] = await Promise.all([
        fetchForCandidates(`${prefix}_attendance`),
        fetchForCandidates(`${prefix}_duty_logs`),
        fetchForCandidates(`${prefix}_dress_logs`),
        fetchForCandidates(`${prefix}_special_tasks`),
        fetchForCandidates(`${prefix}_fines`),
        fetchForCandidates(`${prefix}_growth_points`),
        fetchForCandidates(`${prefix}_salary_records`),
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

      const cMap: Record<string, any> = {};
      contribSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.date) {
          cMap[data.date] = data;
        }
      });
      setContributionsMap(cMap);

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
      setGrowthHistory(uniqueGrowth as GrowthRecord[]);

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
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) { router.push('/departments/rehab/login'); return; }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);

        const [userSnap, staffSnap] = await Promise.all([
          getDoc(doc(db, 'rehab_users', parsed.uid)).catch(() => null),
          getDocs(query(collection(db, 'rehab_staff'), where('loginUserId', '==', parsed.uid))).catch(() => null)
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

        if (!uData.name && !uData.displayName) { 
          toast.error("User profile not found in active ledger.");
          router.push('/departments/rehab/login'); 
          return; 
        }

        setProfile({ 
          id: finalId, 
          ...uData,
          phone: uData.phone || uData.phoneNumber || uData.mobile || parsed.phone || parsed.phoneNumber || ''
        });

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

  const handleUploadPhoto = async (file: File) => {
    try {
      setUploadingPhoto(true);
      const url = await uploadToCloudinary(file, 'Khan Hub/rehab/profile');
      await updateDoc(doc(db, 'rehab_users', session.uid), { photoUrl: url });
      setProfile((p: any) => ({ ...p, photoUrl: url }));
      toast.success('Official identity photograph updated');
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rehab_session');
    router.push('/departments/rehab/login');
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

    const monthlySalary = Number(profile.monthlySalary) || 0;
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

  const attendancePerformance = useMemo(() => {
    if (!attendance.length) return 0;
    const recent30 = attendance.slice(0, 30);
    const present = recent30.filter(a => ['present', 'late'].includes(a.status)).length;
    return Math.round((present / recent30.length) * 100);
  }, [attendance]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa]">
      <Loader2 className="animate-spin text-teal-600 w-10 h-10 mb-4" />
      <p className="text-xs font-medium text-gray-400 tracking-widest uppercase">Synchronizing Data Nexus...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans selection:bg-teal-100">
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Rehab Gateway</h1>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <span>Staff Portal</span>
                <span className="w-1 h-1 bg-teal-500 rounded-full inline-block"></span>
                <span className="text-teal-600">Live</span>
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
               className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all tooltip" 
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
            <div className="absolute top-0 left-0 w-full h-1 bg-teal-500"></div>
            
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
            <p className="text-teal-600 font-semibold text-xs uppercase tracking-wider mt-1 bg-teal-50 px-3 py-1 rounded-full inline-block">
              {profile?.designation || 'Healthcare Member'}
            </p>

            <div className="mt-8 space-y-2">
              <div className="flex items-center gap-3 p-3.5 bg-gray-50/50 rounded-xl border border-gray-50 text-left group hover:border-gray-200 transition-colors">
                <Mail size={16} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
                <span className="text-sm text-gray-600 font-medium truncate">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 p-3.5 bg-gray-50/50 rounded-xl border border-gray-50 text-left group hover:border-gray-200 transition-colors">
                <Phone size={16} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
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
                <div className="text-sm font-bold text-gray-800 mt-0.5 uppercase">Rehab</div>
              </div>
            </div>
          </div>

          {/* Quick Overview Analytics Card */}
          <div className={`${cardStyle} p-6`}>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-teal-500" />
              Performance Index
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Attendance Rate (Past 30d)</span>
                  <span className="font-bold text-gray-900">{attendancePerformance}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 transition-all duration-700" style={{ width: `${attendancePerformance}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <span className="text-xs text-gray-500 font-medium">Task Success Ratio</span>
                <span className="text-sm font-bold text-gray-800">
                  {specialTasks.filter(t => t.status === 'completed').length} / {specialTasks.length}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content Block */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Minimalist Top Navigation Tabs */}
          <nav className="flex gap-1 overflow-x-auto no-scrollbar bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm">
            {[
              { id: 'tasks', label: 'Task Board', icon: Target },
              { id: 'attendance', label: 'Presence', icon: Calendar },
              { id: 'duty', label: 'Duties', icon: Briefcase },
              { id: 'dress', label: 'Apparel', icon: Shirt },
              { id: 'score', label: 'Scoring', icon: Award },
              { id: 'finance', label: 'Ledger', icon: DollarSign },
              { id: 'profile', label: 'Identity', icon: Info },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200
                    ${isActive 
                      ? 'bg-gray-900 text-white shadow-md shadow-gray-200' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Icon size={16} className={isActive ? 'text-teal-400' : 'text-gray-400'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Display Area Container */}
          <div className={`${cardStyle} p-6 min-h-[500px]`}>
            
            {/* --- TASKS TAB --- */}
            {activeTab === 'tasks' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Assigned Mission Criticals</h3>
                      <p className="text-xs text-gray-500 font-medium">Review special tasks designated by administration</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {specialTasks.length > 0 ? specialTasks.map(task => {
                    const isDone = task.status === 'completed';
                    const desc = task.description || task.task || 'Assigned Duty';
                    return (
                      <div key={task.id} className="group bg-white border border-gray-100 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-gray-300 transition-all shadow-sm hover:shadow-md">
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${isDone ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                          {isDone ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold text-sm text-gray-900 ${isDone ? 'line-through opacity-60' : ''}`}>
                            {desc}
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
                            <span className="text-[11px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-md">
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

            {/* --- ATTENDANCE TAB --- */}
            {activeTab === 'attendance' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Time & Presence Audit</h3>
                      <p className="text-xs text-gray-500 font-medium">Official timeline of check-ins and daily presence</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attendance.length > 0 ? attendance.map(log => {
                    const isLate = log.status === 'late' || !log.arrivedOnTime;
                    
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

            {/* --- DUTY LOGS TAB --- */}
            {activeTab === 'duty' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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

            {/* --- DRESS CODE TAB --- */}
            {activeTab === 'dress' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Shirt size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Appearance Compliance</h3>
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
                            {item.status === 'yes' ? <CheckCircle2 size={12} /> : item.status === 'na' ? <MinusCircle size={12} /> : <AlertCircle size={12} />}
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

            {/* --- SCORING TAB --- */}
            {activeTab === 'score' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#1D9E75]/20 w-full sm:w-auto"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl relative overflow-hidden">
                     <Sparkles className="absolute right-2 top-2 text-white opacity-10 w-20 h-20 -rotate-12" />
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total Growth Vault</p>
                     <div className="text-3xl font-black text-amber-400">{computedScores.growthPoint}</div>
                  </div>
                  <div className="border border-gray-100 p-6 rounded-xl">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Punctuality Ratio</p>
                     <div className="text-2xl font-black text-gray-900">
                        {computedScores.workingDays > 0 
                          ? Math.round((computedScores.punctuality / computedScores.workingDays) * 100) 
                          : 0}%
                     </div>
                  </div>
                  <div className="border border-gray-100 p-6 rounded-xl">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Score</p>
                     <div className="text-2xl font-black text-gray-900">
                       {computedScores.attendance + computedScores.uniform + computedScores.working + computedScores.growthPoint}
                     </div>
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

            {/* --- FINANCE TAB --- */}
            {activeTab === 'finance' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-gray-50">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Financial Overview</h3>
                    <p className="text-xs text-gray-500 font-medium">Dynamic wage calculations and ledger</p>
                  </div>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#1D9E75]/20 w-full sm:w-auto"
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
                     <h4 className="text-2xl font-black text-gray-900">Rs. {profile.monthlySalary ? Number(profile.monthlySalary).toLocaleString() : '0'}</h4>
                     
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

            {/* --- IDENTITY / PROFILE TAB --- */}
            {activeTab === 'profile' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  <p className="text-lg font-black text-gray-900">₨{Number(profile?.monthlySalary || 0).toLocaleString()}</p>
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
                    <span>₨{Number(profile?.monthlySalary || 0).toLocaleString()} / {daysInMonth().length} = ₨{Math.round(salaryDetails.dailyWage).toLocaleString()} / Day</span>
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
