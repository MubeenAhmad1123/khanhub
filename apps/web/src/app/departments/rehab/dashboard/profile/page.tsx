// src/app/departments/rehab/dashboard/profile/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  doc, getDoc, updateDoc, collection, query, where, getDocs, 
  addDoc, serverTimestamp, deleteDoc, orderBy, limit, setDoc 
} from 'firebase/firestore';
import { 
  User, Camera, Save, Loader2, Shield, UserCog, 
  Heart, CheckCircle, Phone, X, Calendar, ClipboardCheck, 
  Shirt, Award, Plus, Trash2, Clock, Target, DollarSign,
  TrendingUp, Activity, CreditCard, MapPin, Mail, Briefcase,
  AlertCircle, ChevronRight, Download, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY, toDate } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

// --- Types ---
interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'late';
  arrivalTime?: string;
  departureTime?: string;
  note?: string;
}

interface DutyRecord {
  id: string;
  date: string;
  dutyType: string;
  status: 'completed' | 'not_done';
  points: number;
  comment?: string;
}

interface DressRecord {
  id: string;
  date: string;
  status: 'yes' | 'no';
  points: number;
  comment?: string;
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
  task: string;
  status: 'pending' | 'completed';
  date: string;
  points: number;
}

interface FineRecord {
  id: string;
  amount: number;
  reason: string;
  date: string;
  status: 'paid' | 'unpaid';
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Profile Data
  const [profile, setProfile] = useState<any>(null);
  const [staffDoc, setStaffDoc] = useState<any>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'special_tasks' | 'attendance' | 'finance' | 'dress' | 'duty' | 'score' | 'profile'>('special_tasks');
  
  // Metrics Data
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [duties, setDuties] = useState<DutyRecord[]>([]);
  const [dressLogs, setDressLogs] = useState<DressRecord[]>([]);
  const [contributions, setContributions] = useState<ContributionRecord[]>([]);
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);

  // --- Styles ---
  const glassStyle = "bg-white/60 backdrop-blur-xl border border-white/20 shadow-[10px_10px_20px_#d1d9e6,-10px_-10px_20px_#ffffff]";
  const neumorphicInset = "shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]";
  const neumorphicOutset = "shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff]";

  const fetchMetrics = useCallback(async (sId: string, dept: string) => {
    try {
      const prefix = dept === 'hq' ? 'hq' : dept === 'rehab' ? 'rehab' : 'spims';
      
      const [attSnap, dutySnap, dressSnap, contribSnap, pointsSnap, taskSnap, fineSnap] = await Promise.all([
        getDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `${prefix}_duty_logs`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `${prefix}_dress_logs`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `${prefix}_contributions`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', sId), limit(1))),
        getDocs(query(collection(db, `${prefix}_special_tasks`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `${prefix}_fines`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30)))
      ]);

      setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
      setDuties(dutySnap.docs.map(d => ({ id: d.id, ...d.data() } as DutyRecord)));
      setDressLogs(dressSnap.docs.map(d => ({ id: d.id, ...d.data() } as DressRecord)));
      setContributions(contribSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContributionRecord)));
      setSpecialTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as SpecialTask)));
      setFines(fineSnap.docs.map(d => ({ id: d.id, ...d.data() } as FineRecord)));
      
      if (!pointsSnap.empty) {
        setGrowthPoints(pointsSnap.docs[0].data());
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  }, []);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) {
      router.push('/departments/rehab/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);
        const userSnap = await getDoc(doc(db, 'rehab_users', parsed.uid));
        if (!userSnap.exists()) {
          toast.error("User not found");
          router.push('/departments/rehab/login');
          return;
        }
        const uData = userSnap.data();
        setProfile({ id: userSnap.id, ...uData });

        if (parsed.role === 'admin' || parsed.role === 'staff') {
          let sSnap = await getDocs(query(collection(db, 'rehab_staff'), where('loginUserId', '==', parsed.uid)));
          if (sSnap.empty) sSnap = await getDocs(query(collection(db, 'hq_staff'), where('loginUserId', '==', parsed.uid)));
          
          if (!sSnap.empty) {
            const sd = sSnap.docs[0].data();
            setStaffDoc({ id: sSnap.docs[0].id, ...sd });
            fetchMetrics(sSnap.docs[0].id, sd.department || 'rehab');
          }
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
    if (!session?.uid) return;
    try {
      setUploadingPhoto(true);
      const url = await uploadToCloudinary(file, 'Khan Hub/rehab/profile');
      await updateDoc(doc(db, 'rehab_users', session.uid), { photoUrl: url });
      setProfile((p: any) => ({ ...p, photoUrl: url }));
      toast.success('Photo updated');
    } catch (e: any) {
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const totalEarnings = useMemo(() => {
    if (!profile?.monthlySalary) return 0;
    const fineTotal = fines.reduce((acc, f) => acc + (f.amount || 0), 0);
    return profile.monthlySalary - fineTotal;
  }, [profile, fines]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
      <div className="animate-spin text-indigo-600"><Loader2 size={40} /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-24 text-slate-800 font-sans selection:bg-indigo-100">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 px-4 py-6 md:px-12 bg-[#f0f2f5]/80 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${neumorphicOutset} bg-[#f0f2f5] text-indigo-600`}>
              <User size={28} className="drop-shadow-sm" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Staff Portal</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Live Dashboard • {session?.role}</p>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
             <div className={`px-6 py-3 rounded-2xl ${glassStyle} flex items-center gap-3`}>
                <Award className="text-amber-500" size={20} />
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Points</p>
                  <p className="text-lg font-black text-slate-900">{growthPoints?.totalPoints || 0}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4 space-y-8">
          <div className={`p-8 rounded-[3rem] ${glassStyle} flex flex-col items-center relative overflow-hidden`}>
            {/* Background Accent */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
            
            <div className="relative group">
              <div className={`w-32 h-32 rounded-[2.5rem] overflow-hidden ${neumorphicOutset} border-4 border-white/50 relative`}>
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-4xl font-black text-slate-300">
                    {profile?.displayName?.[0]}
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileRef.current?.click()}
                className={`absolute -bottom-2 -right-2 p-3 rounded-2xl bg-indigo-600 text-white shadow-xl hover:scale-110 transition-transform`}
              >
                <Camera size={18} />
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadPhoto(e.target.files[0])} />
            </div>

            <h2 className="mt-6 text-2xl font-black text-slate-900 text-center">{profile?.displayName}</h2>
            <p className="text-indigo-600 font-bold text-sm tracking-wide uppercase mt-1">{profile?.designation || 'Staff Member'}</p>
            
            <div className="mt-8 w-full space-y-4">
              <div className={`flex items-center gap-4 p-4 rounded-2xl ${neumorphicInset}`}>
                <Mail className="text-slate-400" size={18} />
                <span className="text-sm font-bold text-slate-600 truncate">{profile?.email}</span>
              </div>
              <div className={`flex items-center gap-4 p-4 rounded-2xl ${neumorphicInset}`}>
                <Phone className="text-slate-400" size={18} />
                <span className="text-sm font-bold text-slate-600">{profile?.phone || 'No Phone'}</span>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 w-full">
              <div className={`p-4 rounded-3xl ${neumorphicOutset} bg-[#f0f2f5] text-center`}>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Emp ID</p>
                <p className="text-lg font-black text-slate-900">#{profile?.employeeId || '---'}</p>
              </div>
              <div className={`p-4 rounded-3xl ${neumorphicOutset} bg-[#f0f2f5] text-center`}>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Joined</p>
                <p className="text-lg font-black text-slate-900">{profile?.joiningDate ? formatDateDMY(profile.joiningDate).split('-')[2] : '2024'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`p-6 rounded-[2.5rem] ${glassStyle} flex flex-col items-center justify-center text-center`}>
              <TrendingUp size={24} className="text-green-500 mb-2" />
              <p className="text-[10px] font-black uppercase text-slate-400">Attendance</p>
              <p className="text-xl font-black text-slate-900">{Math.min(100, Math.floor((attendance.filter(a=>a.status==='present').length / 30) * 100))}%</p>
            </div>
            <div className={`p-6 rounded-[2.5rem] ${glassStyle} flex flex-col items-center justify-center text-center`}>
              <Target size={24} className="text-indigo-500 mb-2" />
              <p className="text-[10px] font-black uppercase text-slate-400">Tasks</p>
              <p className="text-xl font-black text-slate-900">{specialTasks.filter(t=>t.status==='completed').length}/{specialTasks.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Main Content */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className={`p-2 rounded-[2rem] ${neumorphicOutset} bg-[#f0f2f5] flex overflow-x-auto no-scrollbar gap-1`}>
            {[
              { id: 'special_tasks', label: 'Tasks', icon: <Target size={18} /> },
              { id: 'attendance', label: 'Attendance', icon: <Calendar size={18} /> },
              { id: 'finance', label: 'Finance', icon: <DollarSign size={18} /> },
              { id: 'duty', label: 'Duty Logs', icon: <Activity size={18} /> },
              { id: 'dress', label: 'Dress', icon: <Shirt size={18} /> },
              { id: 'score', label: 'Score', icon: <TrendingUp size={18} /> },
              { id: 'profile', label: 'Profile', icon: <Info size={18} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 rounded-[1.5rem] text-sm font-black transition-all whitespace-nowrap
                  ${activeTab === tab.id 
                    ? `bg-indigo-600 text-white shadow-[4px_4px_10px_rgba(79,70,229,0.3)] scale-105` 
                    : `text-slate-400 hover:text-slate-600 hover:bg-slate-200/50`}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`p-8 md:p-10 rounded-[3.5rem] ${glassStyle} min-h-[500px]`}>
            
            {activeTab === 'special_tasks' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900">Daily Special Tasks</h3>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-600">
                    <CheckCircle size={18} />
                    <span className="text-xs font-black uppercase">{specialTasks.filter(t=>t.status==='completed').length} Resolved</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {specialTasks.length > 0 ? specialTasks.map(task => (
                    <div key={task.id} className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#f0f2f5] flex items-center justify-between group hover:scale-[1.01] transition-transform`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${task.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          {task.status === 'completed' ? <CheckCircle size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                          <p className={`font-black ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.task}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{formatDateDMY(task.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-indigo-600 shadow-sm">+{task.points} PTS</div>
                        <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 flex flex-col items-center opacity-30">
                      <Target size={60} className="text-slate-400 mb-4" />
                      <p className="text-lg font-black">No active tasks</p>
                      <p className="text-sm font-bold">You're all caught up for now!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900">Attendance Log</h3>
                  <div className={`px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2`}>
                    <Calendar size={18} className="text-slate-400" />
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Last 30 Days</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attendance.map(log => (
                    <div key={log.id} className={`p-5 rounded-[2rem] ${neumorphicOutset} bg-[#f0f2f5] flex items-center justify-between`}>
                      <div>
                        <p className="font-black text-slate-900">{formatDateDMY(log.date)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={12} className="text-slate-400" />
                          <p className="text-[10px] font-black text-slate-400 uppercase">{log.arrivalTime || '--:--'} to {log.departureTime || '--:--'}</p>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        log.status === 'present' ? 'bg-green-100 text-green-600' : 
                        log.status === 'late' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {log.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-indigo-600 text-white relative overflow-hidden`}>
                     <div className="absolute top-0 right-0 p-8 opacity-10"><DollarSign size={80} /></div>
                     <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Estimated Payable</p>
                     <h4 className="text-4xl font-black mt-2">Rs. {totalEarnings.toLocaleString()}</h4>
                     <div className="mt-6 flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-white/20 text-[10px] font-black">Month: April 2024</span>
                     </div>
                  </div>
                  <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-white text-slate-900`}>
                     <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Total Deductions</p>
                     <h4 className="text-4xl font-black mt-2 text-rose-500">Rs. {fines.reduce((a,c)=>a+(c.amount||0), 0).toLocaleString()}</h4>
                     <p className="mt-4 text-xs font-bold text-slate-400 flex items-center gap-1"><AlertCircle size={14} /> From late arrivals and fines</p>
                  </div>
                </div>

                <h4 className="text-lg font-black text-slate-900 mb-6">Recent Transactions & Fines</h4>
                <div className="space-y-4">
                  {fines.length > 0 ? fines.map(fine => (
                    <div key={fine.id} className={`p-6 rounded-3xl ${neumorphicInset} flex items-center justify-between`}>
                       <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-rose-50 text-rose-500"><AlertCircle size={20} /></div>
                          <div>
                            <p className="font-black text-slate-900">{fine.reason}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{formatDateDMY(fine.date)}</p>
                          </div>
                       </div>
                       <p className="font-black text-rose-500">- Rs. {fine.amount}</p>
                    </div>
                  )) : (
                    <div className="py-10 text-center opacity-40">
                      <p className="font-black">No recent fines recorded.</p>
                      <p className="text-xs font-bold">Maintain discipline to keep it this way!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'duty' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <h3 className="text-2xl font-black text-slate-900 mb-8">Work Logs & Duties</h3>
                 <div className="space-y-4">
                    {duties.map(duty => (
                      <div key={duty.id} className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#f0f2f5] flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                           <div className={`p-3 rounded-2xl ${duty.status === 'completed' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}><Activity size={20} /></div>
                           <div>
                              <p className="font-black text-slate-900 capitalize">{duty.dutyType.replace(/_/g, ' ')}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{formatDateDMY(duty.date)}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${duty.status === 'completed' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                             {duty.status}
                           </span>
                           <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-indigo-600">+{duty.points} PTS</div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'dress' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <h3 className="text-2xl font-black text-slate-900 mb-8">Dress Code Compliance</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dressLogs.map(log => (
                      <div key={log.id} className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#f0f2f5] flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                           <div className={`p-3 rounded-2xl ${log.status === 'yes' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}><Shirt size={20} /></div>
                           <div>
                              <p className="font-black text-slate-900">{formatDateDMY(log.date)}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{log.status === 'yes' ? 'Compliant' : 'Non-Compliant'}</p>
                           </div>
                        </div>
                        {log.status === 'yes' && <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-indigo-600">+{log.points} PTS</div>}
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'score' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-2xl font-black text-slate-900 mb-8">Performance Score Analysis</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                   <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-[#f0f2f5] text-center`}>
                      <Activity className="mx-auto text-indigo-500 mb-2" size={32} />
                      <p className="text-[10px] font-black uppercase text-slate-400">Reliability</p>
                      <h4 className="text-3xl font-black mt-2 text-slate-900">92%</h4>
                   </div>
                   <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-[#f0f2f5] text-center`}>
                      <Award className="mx-auto text-amber-500 mb-2" size={32} />
                      <p className="text-[10px] font-black uppercase text-slate-400">Total Pts</p>
                      <h4 className="text-3xl font-black mt-2 text-slate-900">{growthPoints?.totalPoints || 0}</h4>
                   </div>
                   <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-[#f0f2f5] text-center`}>
                      <TrendingUp className="mx-auto text-green-500 mb-2" size={32} />
                      <p className="text-[10px] font-black uppercase text-slate-400">Growth</p>
                      <h4 className="text-3xl font-black mt-2 text-slate-900">+12%</h4>
                   </div>
                </div>

                <div className={`p-8 rounded-[3rem] ${neumorphicInset} bg-white/50`}>
                   <h4 className="text-lg font-black text-slate-900 mb-6">Historical Point Timeline</h4>
                   <div className="space-y-6">
                      {contributions.map((c, idx) => (
                        <div key={c.id} className="flex gap-6 relative">
                           {idx !== contributions.length - 1 && <div className="absolute left-[23px] top-12 bottom-[-24px] w-[2px] bg-indigo-100" />}
                           <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${c.isApproved ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                              <Award size={20} />
                           </div>
                           <div className="pb-8">
                              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{formatDateDMY(c.date)}</p>
                              <h5 className="text-md font-black text-slate-900 mt-1">{c.title}</h5>
                              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{c.content}</p>
                              <div className="mt-4 flex items-center gap-3">
                                 <span className="px-3 py-1 rounded-xl bg-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                   {c.isApproved ? 'Approved' : 'Pending'}
                                 </span>
                                 {c.isApproved && <span className="text-sm font-black text-indigo-600">+{c.points} Growth Points</span>}
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-2xl font-black text-slate-900 mb-8">Personal Records</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div className="group">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">National ID (CNIC)</p>
                         <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-center gap-4`}>
                            <Shield className="text-indigo-500" size={20} />
                            <p className="text-sm font-bold text-slate-900">{profile?.cnic || 'Not provided'}</p>
                         </div>
                      </div>
                      <div className="group">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">Date of Birth</p>
                         <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-center gap-4`}>
                            <Calendar className="text-indigo-500" size={20} />
                            <p className="text-sm font-bold text-slate-900">{profile?.dob ? formatDateDMY(profile.dob) : 'Not provided'}</p>
                         </div>
                      </div>
                      <div className="group">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">Home Address</p>
                         <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-start gap-4`}>
                            <MapPin className="text-indigo-500 mt-1" size={20} />
                            <p className="text-sm font-bold text-slate-900 leading-relaxed">{profile?.address || 'No address registered in database.'}</p>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="group">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">Employee Role</p>
                         <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-center gap-4`}>
                            <Briefcase className="text-indigo-500" size={20} />
                            <p className="text-sm font-bold text-slate-900">{profile?.designation || 'Staff'}</p>
                         </div>
                      </div>
                      <div className="group">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">Work Schedule</p>
                         <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-center gap-4`}>
                            <Clock className="text-indigo-500" size={20} />
                            <p className="text-sm font-bold text-slate-900">{profile?.dutyStartTime || '09:00'} - {profile?.dutyEndTime || '17:00'}</p>
                         </div>
                      </div>
                      <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center`}>
                         <Award className="text-indigo-600 mb-3" size={40} />
                         <p className="text-md font-black text-indigo-900">Certified Staff Member</p>
                         <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1">Verified by HQ Administration</p>
                         <button className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all">
                           <Download size={14} /> Download ID Card
                         </button>
                      </div>
                   </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      
      <div className="mt-20 py-12 border-t border-white/20 text-center">
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Powered by KhanHub Intelligence System</p>
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
