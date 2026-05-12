// src/app/departments/hospital/dashboard/profile/page.tsx
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
  const fileRef = useRef<HTMLInputElement>(null);
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

  // Design Tokens for Clean Minimalism
  const cardStyle = "bg-white border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl transition-all";
  const inputStyle = "bg-gray-50 border-gray-100 rounded-xl px-4 py-3 w-full border focus:ring-2 focus:ring-rose-500/20 outline-none text-sm transition-all text-gray-800";

  // Robust Dual Fetcher matching HQ dashboard patterns
  const fetchMetrics = useCallback(async (sId: string) => {
    try {
      const prefix = 'hospital';
      const prefixedId = `${prefix}_${sId}`;

      // Parallel resolution covering both traditional staff ID and prefixed staff ID formats from HQ
      const [
        attSnap1, attSnap2,
        dutySnap1, dutySnap2,
        dressSnap1, dressSnap2,
        taskSnap1, taskSnap2,
        fineSnap1, fineSnap2,
        growthSnap1, growthSnap2,
        salarySnap
      ] = await Promise.all([
        getDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', sId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_duty_logs`), where('staffId', '==', sId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_duty_logs`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_dress_logs`), where('staffId', '==', sId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_dress_logs`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_special_tasks`), where('staffId', '==', sId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_special_tasks`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_fines`), where('staffId', '==', sId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_fines`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', sId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, `${prefix}_salary_records`), where('staffId', '==', sId))).catch(() => ({ docs: [] } as any)),
      ]);

      // Helper to properly merge, deduplicate, and sort data from both lookup streams
      const mergeAndSort = (snap1: any, snap2: any, dateField: string = 'date') => {
        const combined = [...snap1.docs, ...snap2.docs].map((d: any) => ({ id: d.id, ...d.data() }));
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique.sort((a: any, b: any) => {
          const da = a[dateField] || '';
          const db = b[dateField] || '';
          return db.toString().localeCompare(da.toString());
        });
      };

      setAttendance(mergeAndSort(attSnap1, attSnap2, 'date') as any);
      setDuties(mergeAndSort(dutySnap1, dutySnap2, 'date') as any);
      setDressLogs(mergeAndSort(dressSnap1, dressSnap2, 'date') as any);
      setSpecialTasks(mergeAndSort(taskSnap1, taskSnap2, 'createdAt') as any);
      setFines(mergeAndSort(fineSnap1, fineSnap2, 'date') as any);
      setGrowthHistory(mergeAndSort(growthSnap1, growthSnap2, 'date') as any);
      setSalaryRecords(salarySnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SalarySlip)).sort((a: SalarySlip, b: SalarySlip) => b.month.localeCompare(a.month)));

    } catch (error) {
      console.error("Critical sync failure in fetchMetrics:", error);
      toast.error("Some system synchronization logs were unavailable.");
    }
  }, []);

  useEffect(() => {
    const sessionData = localStorage.getItem('hospital_session');
    if (!sessionData) { router.push('/departments/hospital/login'); return; }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);
        const userRef = doc(db, 'hospital_users', parsed.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) { 
          toast.error("User profile not found in active ledger.");
          router.push('/departments/hospital/login'); 
          return; 
        }
        const uData = userSnap.data();
        setProfile({ id: userSnap.id, ...uData });

        // Execute comprehensive data synchronization
        await fetchMetrics(userSnap.id);
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
      const url = await uploadToCloudinary(file, 'Khan Hub/hospital/profile');
      await updateDoc(doc(db, 'hospital_users', session.uid), { photoUrl: url });
      setProfile((p: any) => ({ ...p, photoUrl: url }));
      toast.success('Official identity photograph updated');
    } catch (e) {
      toast.error('Upload transmission failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hospital_session');
    router.push('/departments/hospital/login');
  };

  // Dynamic Finance Calculations
  const currentMonthTotalPayable = useMemo(() => {
    if (!profile?.monthlySalary) return 0;
    const fineTotal = fines.reduce((acc, f) => acc + (f.amount || 0), 0);
    return Math.max(0, profile.monthlySalary - fineTotal);
  }, [profile, fines]);

  const totalFines = useMemo(() => fines.reduce((a, c) => a + (c.amount || 0), 0), [fines]);

  const attendancePerformance = useMemo(() => {
    if (!attendance.length) return 0;
    const recent30 = attendance.slice(0, 30);
    const present = recent30.filter(a => ['present', 'late'].includes(a.status)).length;
    return Math.round((present / recent30.length) * 100);
  }, [attendance]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa]">
      <Loader2 className="animate-spin text-rose-600 w-10 h-10 mb-4" />
      <p className="text-xs font-medium text-gray-400 tracking-widest uppercase">Synchronizing Data Nexus...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans selection:bg-rose-100">
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Hospital Gateway</h1>
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
                <span className="text-xs font-bold text-gray-700">{profile?.totalGrowthPoints || 0} Points</span>
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
            {/* Minimal geometric flair */}
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
            
            <div className="relative inline-block group mx-auto mb-6">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gray-100 border-4 border-white shadow-md ring-1 ring-gray-100 relative">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="User Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl font-bold text-gray-400 uppercase">
                    {profile?.displayName?.[0] || profile?.name?.[0]}
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="animate-spin text-rose-600 w-6 h-6" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-rose-600 text-white p-2 rounded-lg shadow-lg cursor-pointer hover:bg-rose-700 transition-transform hover:scale-105 active:scale-95 border-2 border-white">
                <Camera size={16} />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadPhoto(file);
                  }}
                />
              </label>
            </div>

            <h2 className="text-xl font-bold text-gray-900">{profile?.displayName || profile?.name}</h2>
            <p className="text-rose-600 font-semibold text-xs uppercase tracking-wider mt-1 bg-rose-50 px-3 py-1 rounded-full inline-block">
              {profile?.designation || 'Healthcare Member'}
            </p>

            <div className="mt-8 space-y-2">
              <div className="flex items-center gap-3 p-3.5 bg-gray-50/50 rounded-xl border border-gray-50 text-left group hover:border-gray-200 transition-colors">
                <Mail size={16} className="text-gray-400 group-hover:text-rose-500 transition-colors" />
                <span className="text-sm text-gray-600 font-medium truncate">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 p-3.5 bg-gray-50/50 rounded-xl border border-gray-50 text-left group hover:border-gray-200 transition-colors">
                <Phone size={16} className="text-gray-400 group-hover:text-rose-500 transition-colors" />
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
          <div className={`${cardStyle} p-6`}>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-rose-500" />
              Performance Index
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Attendance Rate (Past 30d)</span>
                  <span className="font-bold text-gray-900">{attendancePerformance}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 transition-all duration-700" style={{ width: `${attendancePerformance}%` }}></div>
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
                  <Icon size={16} className={isActive ? 'text-rose-400' : 'text-gray-400'} />
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
                            <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-md">
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
                    const isNegative = ['absent', 'unpaid_leave'].includes(log.status);
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
                        {/* Complex duties array from new sync engine */}
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
                            {sub.label}
                          </div>
                        )) : (
                          /* Legacy support fallback */
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
                        {/* Complex items array from new sync engine */}
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
                            {item.label}
                          </div>
                        )) : (
                          /* Legacy support fallback */
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
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                      <Award size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Growth Metrics Ledger</h3>
                      <p className="text-xs text-gray-500 font-medium">Performance points assigned for excellence</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl relative overflow-hidden">
                     <Sparkles className="absolute right-2 top-2 text-white opacity-10 w-20 h-20 -rotate-12" />
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total Growth Vault</p>
                     <div className="text-3xl font-black text-amber-400">{profile?.totalGrowthPoints || 0}</div>
                  </div>
                  <div className="border border-gray-100 p-6 rounded-xl">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Punctuality Ratio</p>
                     <div className="text-2xl font-black text-gray-900">
                        {attendance.length > 0 
                          ? Math.round((attendance.filter(a => a.arrivedOnTime !== false && ['present','late'].includes(a.status)).length / attendance.length) * 100) 
                          : 0}%
                     </div>
                  </div>
                  <div className="border border-gray-100 p-6 rounded-xl">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Distinct Events</p>
                     <div className="text-2xl font-black text-gray-900">{growthHistory.length}</div>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Acquisition History</h4>
                <div className="space-y-3">
                  {growthHistory.length > 0 ? growthHistory.map(record => (
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
                  )) : (
                    <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <span className="text-xs font-medium text-gray-400">No detailed points ledger yet.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- FINANCE TAB --- */}
            {activeTab === 'finance' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Financial Summary</h3>
                      <p className="text-xs text-gray-500 font-medium">Running estimates and final compensation records</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                       <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                         <CreditCard size={18} />
                       </div>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Cycle Current</span>
                     </div>
                     <p className="text-xs font-medium text-gray-500">Total Gross Structure</p>
                     <h4 className="text-2xl font-black text-gray-900">Rs. {(profile?.monthlySalary || 0).toLocaleString()}</h4>
                     <div className="border-t border-gray-50 mt-4 pt-4 flex justify-between items-center text-sm font-medium">
                        <span className="text-gray-400">Live Deductions</span>
                        <span className="text-rose-600 font-bold">-Rs. {totalFines.toLocaleString()}</span>
                     </div>
                  </div>
                  
                  <div className="bg-emerald-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden shadow-emerald-100">
                     <div className="absolute -right-4 -bottom-4 text-white opacity-10 w-24 h-24 rotate-12">
                        <DollarSign size={96} />
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Est. Retainable Net</p>
                     <h4 className="text-3xl font-black">Rs. {currentMonthTotalPayable.toLocaleString()}</h4>
                     <p className="text-xs mt-2 font-medium opacity-70">Adjusted for logged system fines.</p>
                  </div>
                </div>

                {/* Official Salary Slips Section */}
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
                    <InfoRow label="Emergency Contact Protocol" value={`${profile?.emergencyContactName || 'Contact'} (${profile?.emergencyPhone || profile?.emergencyContact || 'N/A'})`} icon={AlertCircle} />
                  </div>
                </div>
                
                <div className="mt-8 bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center text-rose-600">
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
              </div>
            )}

          </div>
        </div>
      </main>
      
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
