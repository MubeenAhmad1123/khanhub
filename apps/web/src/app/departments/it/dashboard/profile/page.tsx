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
        pointsSnap
      ] = await Promise.all([
        fetchForCandidates(`${prefix}_attendance`),
        fetchForCandidates(`${prefix}_duty_logs`),
        fetchForCandidates(`${prefix}_dress_logs`),
        fetchForCandidates(`${prefix}_special_tasks`),
        fetchForCandidates(`${prefix}_fines`),
        fetchForCandidates(`${prefix}_salary_records`),
        fetchForCandidates(`${prefix}_growth_points`)
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

      const salaryCombined = salarySnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SalarySlip));
      const uniqueSalaries = Array.from(new Map(salaryCombined.map(item => [item.id, item])).values())
        .sort((a: SalarySlip, b: SalarySlip) => b.month.localeCompare(a.month));
      setSalaryRecords(uniqueSalaries);

      if (pointsSnap.docs.length > 0) {
        setGrowthPoints(pointsSnap.docs[0].data());
      }
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

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const handleUploadPhoto = async (file: File) => {
    try {
      setUploadingPhoto(true);
      const url = await uploadToCloudinary(file, 'Khan Hub/it/profile');
      const targetCol = (session.role === 'superadmin' || session.role === 'manager') ? 'hq_users' : 'it_users';
      await updateDoc(doc(db, targetCol, session.uid), { photoUrl: url }).catch(() => {});
      setProfile((p: any) => ({ ...p, photoUrl: url }));
      toast.success('Photo updated successfully');
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('it_session');
    localStorage.removeItem('hq_session');
    router.push('/departments/it/login');
  };

  const totalEarnings = useMemo(() => {
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
                <p className="text-sm font-black text-white mt-0.5">{growthPoints?.total || profile?.totalGrowthPoints || 0} PTS</p>
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

          {/* Performance Analytics metrics */}
          <div className={`p-6 rounded-[2.5rem] ${glassStyle} border-white/[0.05]`}>
            <h3 className="text-xs font-black text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
              <TrendingUp size={15} className="text-indigo-400" />
              Efficiency Ledger
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] mb-2 font-medium">
                  <span className="text-slate-400">Punctuality Timeline (30d)</span>
                  <span className="font-bold text-indigo-400">{attendancePerformance}%</span>
                </div>
                <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden border border-white/[0.02]">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${attendancePerformance}%` }} />
                </div>
              </div>
              <div className="flex justify-between items-center pt-3.5 border-t border-white/[0.04] text-xs">
                <span className="text-slate-400 font-medium">Resolution Success</span>
                <span className="font-bold text-slate-200">
                  {specialTasks.filter(t => t.status === 'completed').length} / {specialTasks.length} Assignments
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Tabs & Main Panel */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Glassmorphic Tab Navigator */}
          <nav className="flex gap-1 overflow-x-auto no-scrollbar bg-white/[0.01] border border-white/[0.04] p-1.5 rounded-[2rem] backdrop-blur-2xl">
            {[
              { id: 'special_tasks', label: 'Tasks', icon: Target },
              { id: 'attendance', label: 'Timeline', icon: Calendar },
              { id: 'duty', label: 'Duties', icon: Activity },
              { id: 'dress', label: 'Apparel', icon: Shirt },
              { id: 'score', label: 'Score', icon: TrendingUp },
              { id: 'finance', label: 'Ledger', icon: DollarSign },
              { id: 'profile', label: 'Security', icon: Info },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2.5 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative whitespace-nowrap
                    ${isActive 
                      ? `bg-white/[0.04] text-white shadow-xl shadow-black/20 border border-white/[0.05] scale-105` 
                      : `text-slate-500 hover:text-slate-300 hover:bg-white/[0.01]`}`}
                >
                  <Icon size={14} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Tab Display Panel */}
          <div className={`p-8 md:p-10 rounded-[3rem] min-h-[500px] relative overflow-hidden border-white/[0.05] ${glassStyle}`}>
            
            {/* --- SPECIAL TASKS TAB --- */}
            {activeTab === 'special_tasks' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Mission Critical Tasks</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Special directives issued by operations administration</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {specialTasks.length > 0 ? specialTasks.map(task => {
                    const isDone = task.status === 'completed';
                    return (
                      <div key={task.id} className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] flex items-center justify-between hover:border-white/[0.08] transition-all duration-300 group">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${isDone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {isDone ? <CheckCircle size={20} /> : <Clock size={20} />}
                          </div>
                          <div>
                            <p className={`text-sm font-bold tracking-tight ${isDone ? 'text-slate-500 line-through opacity-70' : 'text-slate-200'}`}>
                              {task.task || task.description || 'System Operations Duty'}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1.5 flex items-center gap-2">
                              <span>Assigned {formatDateDMY(task.date || task.createdAt)}</span>
                              <span className="w-1 h-1 bg-slate-600 rounded-full" />
                              <span className="text-indigo-400">{task.status}</span>
                            </p>
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[10px] font-black text-indigo-400 shadow-sm flex-shrink-0">
                          +{task.points || 0} PTS
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-20 flex flex-col items-center opacity-30">
                      <Sparkles size={48} className="text-slate-500 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clear Assignment Board</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- ATTENDANCE TAB --- */}
            {activeTab === 'attendance' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Punctuality Timeline</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Timeline logs of professional presence & clock-ins</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attendance.length > 0 ? attendance.map(log => {
                    const isLate = log.status === 'late' || !log.arrivedOnTime;
                    return (
                      <div key={log.id} className="p-5 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08] transition-all flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-200">{formatDateDMY(log.date)}</span>
                            {isLate && log.status !== 'absent' && (
                              <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">Late</span>
                            )}
                          </div>
                          <p className="text-[10px] font-black text-slate-500 uppercase mt-1.5 tracking-wider">
                            Clock: {log.arrivalTime || '--:--'} - {log.departureTime || '--:--'}
                          </p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                          log.status === 'present' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {log.status}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="col-span-2 py-20 text-center bg-white/[0.01] border border-white/[0.04] border-dashed rounded-[2rem] opacity-40">
                      <Calendar size={36} className="mx-auto text-slate-600 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active attendance logs parsed</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- DUTY LOGS TAB --- */}
            {activeTab === 'duty' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Deployment & Duty Checklist</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Daily task diagnostics logged by operations manager</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {duties.length > 0 ? duties.map(duty => (
                    <div key={duty.id} className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08] transition-all">
                      <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 mb-4">
                        <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
                          <Calendar size={14} className="text-slate-500"/>
                          {formatDateDMY(duty.date)}
                        </span>
                        <div className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20 shadow-sm flex-shrink-0">
                          +{duty.points || 0} PTS
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {duty.duties && duty.duties.length > 0 ? (
                          duty.duties.map((sub: any, idx: number) => (
                            <div 
                              key={idx}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors
                                ${sub.status === 'done' 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : sub.status === 'na'
                                    ? 'bg-white/5 border-white/10 text-slate-500'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                  }`}
                            >
                              {sub.status === 'done' ? <CheckCircle size={11} /> : sub.status === 'na' ? <MinusCircle size={11} /> : <XCircle size={11} />}
                              {getDutyLabel(sub, profile)}
                            </div>
                          ))
                        ) : (
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                            duty.status === 'completed' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {duty.status === 'completed' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                            {getDutyLabel({ key: duty.dutyType }, profile)}: {duty.status === 'completed' ? 'Completed' : 'Not Completed'}
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center bg-white/[0.01] border border-white/[0.04] border-dashed rounded-[2rem] opacity-40">
                      <Briefcase size={36} className="mx-auto text-slate-600 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active work logs documented</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- DRESS CODE TAB --- */}
            {activeTab === 'dress' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <Shirt size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Appearance Compliance</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Evaluations of professional office dress code compliance</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {dressLogs.length > 0 ? dressLogs.map(log => (
                    <div key={log.id} className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08] transition-all">
                      <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 mb-4">
                        <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
                          <Calendar size={14} className="text-slate-500"/>
                          {formatDateDMY(log.date)}
                        </span>
                        {log.points && (
                          <div className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20 shadow-sm flex-shrink-0">
                            +{log.points} PTS
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {log.items && log.items.length > 0 ? (
                          log.items.map((item: any, idx: number) => (
                            <div 
                              key={idx}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider
                                ${item.status === 'yes' 
                                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                                  : item.status === 'na'
                                    ? 'bg-white/5 border-white/10 text-slate-500'
                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                  }`}
                            >
                              {item.status === 'yes' ? <CheckCircle2 size={11} /> : item.status === 'na' ? <MinusCircle size={11} /> : <AlertTriangle size={11} />}
                              {getDressLabel(item, profile)}
                            </div>
                          ))
                        ) : (
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                            (log.isCompliant !== undefined ? log.isCompliant : log.status === 'yes') 
                              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {(log.isCompliant !== undefined ? log.isCompliant : log.status === 'yes') ? <CheckCircle size={11} /> : <XCircle size={11} />}
                            {(log.isCompliant !== undefined ? log.isCompliant : log.status === 'yes') ? 'Compliant' : 'Non-Compliant'}
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center bg-white/[0.01] border border-white/[0.04] border-dashed rounded-[2rem] opacity-40">
                      <Shirt size={36} className="mx-auto text-slate-600 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active dress logs evaluations saved</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- SCORING TAB --- */}
            {activeTab === 'score' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Growth Performance metrics</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Aggregated scoring logs reflecting professional growth</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-900/30 to-purple-950/20 border border-white/[0.05] text-center relative overflow-hidden group">
                    <Sparkles className="absolute right-[-10px] bottom-[-10px] text-indigo-500 opacity-[0.03] w-24 h-24 -rotate-12 transition-transform duration-500 group-hover:rotate-0" />
                    <Award className="mx-auto text-amber-500 mb-2 animate-bounce" size={32} />
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total Growth Point Vault</p>
                    <h4 className="text-3xl font-black mt-2 text-white">{growthPoints?.total || profile?.totalGrowthPoints || 0} PTS</h4>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.04] text-center flex flex-col justify-center">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Punctuality Score</p>
                    <h4 className="text-3xl font-black mt-2 text-indigo-400">{attendancePerformance}%</h4>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.04] text-center flex flex-col justify-center">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Completed Assignments</p>
                    <h4 className="text-3xl font-black mt-2 text-slate-200">
                      {specialTasks.filter(t => t.status === 'completed').length}
                    </h4>
                  </div>
                </div>
              </div>
            )}

            {/* --- FINANCE TAB --- */}
            {activeTab === 'finance' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-indigo-400">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Secure Ledger System</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Live financial audits adjusted for enforced system fines</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-900 to-indigo-950 text-white relative overflow-hidden border border-indigo-400/20 shadow-xl shadow-indigo-500/[0.03]">
                    <div className="absolute right-[-10px] bottom-[-10px] text-white opacity-[0.03] w-28 h-28 rotate-12">
                      <DollarSign size={110} />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Estimated Retainable Net</p>
                    <h4 className="text-3xl font-black mt-2">Rs. {totalEarnings.toLocaleString()}</h4>
                    <p className="text-[9px] opacity-50 mt-1 font-bold">Computed dynamically from master contract</p>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.04] text-white relative overflow-hidden">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Logged Deductions</p>
                    <h4 className="text-3xl font-black mt-2 text-rose-500">Rs. {totalFines.toLocaleString()}</h4>
                    <p className="text-[9px] text-slate-500 mt-1 font-bold">Enforced through systemic compliance audits</p>
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
      
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-4 { from { transform: translateY(1rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.4s ease-out, slide-in-from-bottom-4 0.4s ease-out; }
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
