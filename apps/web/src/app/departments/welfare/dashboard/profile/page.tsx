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
  TrendingUp, Activity, MapPin, Mail,
  AlertCircle, Sparkles, Trophy, FileText, CreditCard
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
  
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'special_tasks' | 'attendance' | 'finance' | 'dress' | 'duty' | 'score' | 'profile'>('special_tasks');
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [duties, setDuties] = useState<DutyRecord[]>([]);
  const [dressLogs, setDressLogs] = useState<DressRecord[]>([]);
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [growthPointsHistory, setGrowthPointsHistory] = useState<any[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalarySlip[]>([]);

  // Clean Minimalist Styles
  const cardStyle = "bg-white border border-slate-100 shadow-sm rounded-[1.5rem]";
  const inputCardStyle = "bg-slate-50 border border-slate-100 rounded-2xl";

  const fetchMetrics = useCallback(async (sId: string) => {
    const alternativeSId = sId.startsWith('welfare_') ? sId.replace('welfare_', '') : `welfare_${sId}`;
    
    const fetchParallel = async (collectionName: string, dateField: string = 'date') => {
      try {
        const [snap1, snap2] = await Promise.all([
          getDocs(query(collection(db, collectionName), where('staffId', '==', sId))),
          getDocs(query(collection(db, collectionName), where('staffId', '==', alternativeSId)))
        ]);
        
        const combined = [...snap1.docs, ...snap2.docs].map(d => ({ id: d.id, ...d.data() } as any));
        // Remove duplicates by document ID
        const uniqueMap = new Map();
        combined.forEach(item => uniqueMap.set(item.id, item));
        const uniqueList = Array.from(uniqueMap.values());

        // Client-side sorting to circumvent any missing index error on complex multi-queries
        uniqueList.sort((a, b) => {
          const valA = a[dateField] || '';
          const valB = b[dateField] || '';
          return valB.toString().localeCompare(valA.toString());
        });

        return uniqueList;
      } catch (err) {
        console.error(`Error in fetchParallel for ${collectionName}:`, err);
        return [];
      }
    };

    try {
      const [att, dts, drs, tks, fns, salaries] = await Promise.all([
        fetchParallel('welfare_attendance', 'date'),
        fetchParallel('welfare_duty_logs', 'date'),
        fetchParallel('welfare_dress_logs', 'date'),
        fetchParallel('welfare_special_tasks', 'createdAt'),
        fetchParallel('welfare_fines', 'date'),
        fetchParallel('welfare_salary_records', 'month')
      ]);

      setAttendance(att as AttendanceRecord[]);
      setDuties(dts as DutyRecord[]);
      setDressLogs(drs as DressRecord[]);
      setSpecialTasks(tks as SpecialTask[]);
      setFines(fns as FineRecord[]);
      setSalaryRecords(salaries as SalarySlip[]);

      // Fetch Growth Points History (both variations of IDs)
      const [gp1, gp2] = await Promise.all([
        getDocs(query(collection(db, 'welfare_growth_points'), where('staffId', '==', sId))),
        getDocs(query(collection(db, 'welfare_growth_points'), where('staffId', '==', alternativeSId)))
      ]);

      const combinedGP = [...gp1.docs, ...gp2.docs].map(d => ({ id: d.id, ...d.data() } as any));
      const gpMap = new Map();
      combinedGP.forEach(gp => gpMap.set(gp.id, gp));
      
      const gpList = Array.from(gpMap.values());
      gpList.sort((a, b) => {
        const keyA = a.id.includes('_') ? a.id.split('_')[1] : '';
        const keyB = b.id.includes('_') ? b.id.split('_')[1] : '';
        return keyB.localeCompare(keyA);
      });

      setGrowthPointsHistory(gpList);
    } catch (error) {
      console.error("Error fetching combined metrics:", error);
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

  const totalEarnings = useMemo(() => {
    if (!profile?.monthlySalary) return 0;
    const fineTotal = fines.reduce((acc, f) => acc + (f.amount || 0), 0);
    return Math.max(0, profile.monthlySalary - fineTotal);
  }, [profile, fines]);

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
            <p className="text-[9px] font-bold uppercase text-amber-700 tracking-wider">Growth Points</p>
            <p className="text-base font-bold text-amber-900 leading-none mt-0.5">{profile?.totalGrowthPoints || 0}</p>
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
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="animate-spin text-slate-600" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 text-white border-2 border-white shadow-md hover:scale-105 transition-all"
              >
                <Camera size={14} />
              </button>
              <input 
                ref={fileRef} 
                type="file" 
                className="hidden" 
                accept="image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.type !== 'image/webp') {
                    toast.error('Only WebP images are allowed');
                    return;
                  }
                  handleUploadPhoto(file);
                }} 
              />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-5 rounded-2xl bg-slate-900 text-white">
                     <p className="text-[9px] font-bold uppercase opacity-70 tracking-wider">Net Earnings</p>
                     <h4 className="text-2xl font-bold mt-1">Rs. {totalEarnings.toLocaleString()}</h4>
                  </div>
                  <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50">
                     <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Deductions</p>
                     <h4 className="text-2xl font-bold mt-1 text-rose-600">Rs. {fines.reduce((a,c)=>a+(c.amount||0), 0).toLocaleString()}</h4>
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
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-50">
                  <TrendingUp size={16} className="text-slate-700" />
                  <h3 className="text-base font-bold">Performance History</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center justify-center text-center">
                     <Award className="text-amber-600 mb-2" size={24} />
                     <p className="text-[9px] font-bold uppercase text-amber-700 tracking-wider">Overall Rank Points</p>
                     <h4 className="text-xl font-black text-amber-900 mt-1">{profile?.totalGrowthPoints || 0}</h4>
                  </div>
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-center col-span-1 sm:col-span-2">
                     <Sparkles className="text-emerald-600 mb-2" size={24} />
                     <p className="text-[9px] font-bold uppercase text-emerald-700 tracking-wider">Active Record Month Count</p>
                     <h4 className="text-xl font-black text-emerald-900 mt-1">{growthPointsHistory.length} Active Months</h4>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Monthly Scorecard Breakdown</h4>
                  {growthPointsHistory.map(gp => {
                    const parts = gp.id.split('_');
                    const monthStr = parts.length > 1 ? parts[1] : 'Cumulative';
                    const [year, monthNum] = monthStr.includes('-') ? monthStr.split('-') : ['', ''];
                    let monthName = monthStr;
                    
                    try {
                      if (monthNum && year) {
                        monthName = new Date(Number(year), Number(monthNum) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                      }
                    } catch (e) {}

                    return (
                      <div key={gp.id} className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100/60">
                          <div>
                            <p className="text-sm font-extrabold text-slate-800">{monthName}</p>
                            <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">Monthly Aggregates</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 text-amber-800 font-black text-sm">
                            <Trophy size={12} className="text-amber-600" />
                            {gp.total || 0} PTS
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/50">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Attendance</p>
                            <p className="text-sm font-bold text-slate-800 mt-1">+{gp.attendance || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/50">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Dress Code</p>
                            <p className="text-sm font-bold text-slate-800 mt-1">+{gp.dress || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/50">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Daily Work</p>
                            <p className="text-sm font-bold text-slate-800 mt-1">+{gp.duty || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/50">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Bonus / Extra</p>
                            <p className="text-sm font-bold text-slate-800 mt-1">+{gp.extra || gp.contributions || 0}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {growthPointsHistory.length === 0 && (
                    <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <TrendingUp className="mx-auto text-slate-300 mb-2" size={28} />
                      <p className="text-xs font-medium text-slate-400">No monthly breakdown history stored yet</p>
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

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
