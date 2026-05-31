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
  AlertCircle, ChevronRight, Download, Info, Heart, Sparkles, FileText, CreditCard
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
  const [patientDoc, setPatientDoc] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'special_tasks' | 'attendance' | 'finance' | 'dress' | 'duty' | 'score' | 'profile'>('special_tasks');
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [duties, setDuties] = useState<DutyRecord[]>([]);
  const [dressLogs, setDressLogs] = useState<DressRecord[]>([]);
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);
  const [salaryRecords, setSalaryRecords] = useState<SalarySlip[]>([]);

  // Styles
  const glassStyle = "bg-white/70 backdrop-blur-xl border border-white shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff]";
  const neumorphicOutset = "shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff]";
  const neumorphicInset = "shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]";

  const fetchMetrics = useCallback(async (sId: string) => {
    try {
      const prefix = 'sukoon';
      const rawId = sId.startsWith('sukoon_') ? sId.replace('sukoon_', '') : sId;
      const prefixedId = sId.startsWith('sukoon_') ? sId : `sukoon_${sId}`;

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

      const [att, duty, dress, tasks, fns, salaries, pointsSnap] = await Promise.all([
        fetchParallel(`${prefix}_attendance`, 'date'),
        fetchParallel(`${prefix}_duty_logs`, 'date'),
        fetchParallel(`${prefix}_dress_logs`, 'date'),
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

      if (pointsSnap && !pointsSnap.empty) {
        setGrowthPoints(pointsSnap.docs[0].data());
      } else {
        const pointsSnapPref = await getDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', prefixedId))).catch(() => null);
        if (pointsSnapPref && !pointsSnapPref.empty) {
          setGrowthPoints(pointsSnapPref.docs[0].data());
        }
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
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
        let finalId = parsed.uid;

        if (userSnap.exists()) {
          uData = userSnap.data();
        } else {
          const fallbackSnap = await getDocs(query(collection(db, 'sukoon_staff'), where('loginUserId', '==', parsed.uid))).catch(() => ({ docs: [] } as any));
          if (!fallbackSnap.empty) {
            userSnap = fallbackSnap.docs[0] as any;
            uData = userSnap.data();
            finalId = userSnap.id;
          }
        }

        if (!uData) {
          toast.error("User profile not found.");
          router.push('/departments/sukoon/login');
          return;
        }

        setProfile({ 
          id: finalId, 
          ...uData,
          phone: uData.phone || uData.phoneNumber || uData.mobile || parsed.phone || parsed.phoneNumber || ''
        });

        if (parsed.role === 'family' && uData.patientId) {
          const sSnap = await getDoc(doc(db, 'sukoon_patients', uData.patientId));
          if (sSnap.exists()) setPatientDoc({ id: sSnap.id, ...sSnap.data() });
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
      const url = await uploadToCloudinary(file, 'Khan Hub/sukoon/profile');
      await updateDoc(doc(db, 'sukoon_users', session.uid), { photoUrl: url }).catch(() => {});
      setProfile((p: any) => ({ ...p, photoUrl: url }));
      toast.success('Photo updated');
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

    // Standardized Dynamic Finance Calculations
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
        fines: 0
      };
    }

    const monthlySalary = Number(profile.monthlySalary || profile.salary || 0);
    const dailyWage = monthlySalary / 30;

    let presentDays = 0;
    let lateDays = 0;
    let leavesCount = 0;
    let paidLeaves = 0;
    let unpaidLeaves = 0;
    let absentDays = 0;
    let unmarkedDays = 0;

    attendance.forEach(a => {
      const status = a.status;
      if (status === 'present') {
        presentDays++;
      } else if (status === 'late') {
        lateDays++;
      } else if (status === 'leave' || status === 'paid_leave') {
        leavesCount++;
        if (leavesCount <= 2) {
          paidLeaves++;
        } else {
          unpaidLeaves++;
        }
      } else if (status === 'unpaid_leave') {
        unpaidLeaves++;
      } else if (status === 'absent') {
        absentDays++;
      } else {
        unmarkedDays++;
      }
    });

    const payableDays = presentDays + lateDays + paidLeaves;
    const unpaidDays = absentDays + unpaidLeaves + unmarkedDays;

    const earnings = payableDays * dailyWage;
    const absentDeduction = unpaidDays * dailyWage;
    const totalFines = fines.reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const estimatedSalary = Math.floor(Math.max(0, earnings - totalFines));

    return {
      dailyWage,
      presentDays,
      lateDays,
      paidLeaves,
      unpaidLeaves,
      absentDays,
      payableDays,
      unpaidDays,
      earnings,
      absentDeduction,
      estimatedSalary,
      fines: totalFines
    };
  }, [profile, attendance, fines]);

  const currentMonthTotalPayable = useMemo(() => {
    return salaryDetails.estimatedSalary;
  }, [salaryDetails]);

  const totalEarnings = useMemo(() => {
    return salaryDetails.estimatedSalary;
  }, [salaryDetails]);

  const totalFines = useMemo(() => {
    return salaryDetails.fines;
  }, [salaryDetails]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8]">
      <Loader2 className="animate-spin text-teal-600 w-10 h-10" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FCFBF8] pb-24 text-slate-900 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-6 md:px-12 bg-[#FCFBF8]/80 backdrop-blur-md border-b border-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${glassStyle} text-teal-600`}>
              <Activity size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Sukoon Portal</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Profile • Live</p>
            </div>
          </div>
          {session?.role !== 'family' && (
            <div className="hidden md:flex items-center gap-4">
              <div className={`px-6 py-3 rounded-2xl ${glassStyle} flex items-center gap-3`}>
                <Award className="text-amber-500" size={20} />
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Growth Points</p>
                  <p className="text-lg font-black">{growthPoints?.total || profile?.totalGrowthPoints || 0}</p>
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
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl" />
            
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
            <p className="text-teal-600 font-black text-[10px] uppercase tracking-widest mt-2">{profile?.designation || (session?.role === 'family' ? 'Family Member' : 'Care Staff')}</p>
            
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
          {session?.role === 'family' ? (
             <div className={`p-8 md:p-10 rounded-[3.5rem] ${glassStyle}`}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><Heart size={20} /></div>
                  <h3 className="text-xl font-black">Linked Patient Details</h3>
                </div>
                {patientDoc ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8]`}>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Patient Name</p>
                      <p className="text-md font-black">{patientDoc.name}</p>
                    </div>
                    <div className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8]`}>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Admission Date</p>
                      <p className="text-md font-black">{formatDateDMY(patientDoc.admissionDate)}</p>
                    </div>
                    <div className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8]`}>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Status</p>
                      <span className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${patientDoc.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {patientDoc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-30">
                    <Info size={48} className="mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest">No Linked Patient</p>
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
                        ? `bg-teal-600 text-white shadow-xl scale-105` 
                        : `text-slate-400 hover:text-teal-600 hover:bg-teal-50`}`}
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
                      <div className="p-2 bg-teal-50 rounded-xl text-teal-600"><Target size={20} /></div>
                      <h3 className="text-xl font-black">Special Tasks</h3>
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
                          <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-teal-600 shadow-sm">+{task.points || 0} PTS</div>
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
                      <div className="p-2 bg-teal-50 rounded-xl text-teal-600"><Calendar size={20} /></div>
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
                          <p className="text-sm font-bold">No presence logs found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'duty' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-teal-50 rounded-xl text-teal-600"><Activity size={20} /></div>
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
                          <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-teal-600">+{duty.points || 0} PTS</div>
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
                      <div className="p-2 bg-teal-50 rounded-xl text-teal-600"><Shirt size={20} /></div>
                      <h3 className="text-xl font-black">Dress Compliance</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dressLogs.length > 0 ? dressLogs.map(log => (
                        <div key={log.id} className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8] flex items-center justify-between`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${log.status === 'yes' ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-300'}`}>
                              <Shirt size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{formatDateDMY(log.date)}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{log.status === 'yes' ? 'Compliant' : 'Non-Compliant'}</p>
                            </div>
                          </div>
                          {log.status === 'yes' && <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-teal-600">+{log.points || 0} PTS</div>}
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
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-teal-50 rounded-xl text-teal-600"><TrendingUp size={20} /></div>
                      <h3 className="text-xl font-black">Performance Analysis</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-[#FCFBF8] text-center`}>
                          <Award className="mx-auto text-amber-500 mb-2" size={32} />
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Growth Points</p>
                          <h4 className="text-3xl font-black mt-2">{growthPoints?.total || profile?.totalGrowthPoints || 0}</h4>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'finance' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                      <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-teal-600 text-white relative overflow-hidden`}>
                         <DollarSign size={80} className="absolute -right-4 -bottom-4 opacity-10" />
                         <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Estimated Payable</p>
                         <h4 className="text-3xl font-black mt-2">Rs. {totalEarnings.toLocaleString()}</h4>
                      </div>
                      <div className={`p-8 rounded-[3rem] ${glassStyle} text-slate-900`}>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Deductions</p>
                         <h4 className="text-3xl font-black mt-2 text-rose-500">Rs. {totalFines.toLocaleString()}</h4>
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
                    
                    <div className="space-y-3">
                      {fines.length > 0 ? fines.map(fine => (
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
                      )) : (
                        <div className="py-6 text-center border border-dashed border-gray-100 rounded-xl opacity-40">
                          <p className="text-sm font-bold">No fines logged.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'profile' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-teal-50 rounded-xl text-teal-600"><User size={20} /></div>
                      <h3 className="text-xl font-black">Personal Dossier</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div>
                             <p className="text-[9px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">National ID (CNIC)</p>
                             <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-center gap-4`}>
                                <Shield className="text-teal-500" size={18} />
                                <p className="text-sm font-bold text-slate-700">{profile?.cnic || 'Not provided'}</p>
                             </div>
                          </div>
                          <div>
                             <p className="text-[9px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">Home Address</p>
                             <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-start gap-4`}>
                                <MapPin className="text-teal-500 mt-1" size={18} />
                                <p className="text-sm font-bold text-slate-700 leading-relaxed">{profile?.address || 'No address registered.'}</p>
                             </div>
                          </div>
                       </div>
                       <div className="space-y-6">
                          <div>
                             <p className="text-[9px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">Work Schedule</p>
                             <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-center gap-4`}>
                                <Clock className="text-teal-500" size={18} />
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
