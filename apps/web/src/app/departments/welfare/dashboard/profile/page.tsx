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
  AlertCircle, Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'special_tasks' | 'attendance' | 'finance' | 'dress' | 'duty' | 'score' | 'profile'>('special_tasks');
  
  const [attendance, setAttendance] = useState<any[]>([]);
  const [duties, setDuties] = useState<any[]>([]);
  const [dressLogs, setDressLogs] = useState<any[]>([]);
  const [specialTasks, setSpecialTasks] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);

  // Clean Minimalist Styles
  const cardStyle = "bg-white border border-slate-100 shadow-sm rounded-[1.5rem]";
  const inputCardStyle = "bg-slate-50 border border-slate-100 rounded-2xl";

  const fetchMetrics = useCallback(async (sId: string) => {
    try {
      const [attSnap, dutySnap, dressSnap, pointsSnap, taskSnap, fineSnap] = await Promise.all([
        getDocs(query(collection(db, `welfare_attendance`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `welfare_duty_logs`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `welfare_dress_logs`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `welfare_growth_points`), where('staffId', '==', sId), limit(1))),
        getDocs(query(collection(db, `welfare_special_tasks`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `welfare_fines`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30)))
      ]);

      setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDuties(dutySnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDressLogs(dressSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSpecialTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFines(fineSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (!pointsSnap.empty) setGrowthPoints(pointsSnap.docs[0].data());
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
        const userRef = doc(db, 'welfare_users', parsed.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) { router.push('/departments/welfare/login'); return; }
        const uData = userSnap.data();
        setProfile({ id: userSnap.id, ...uData });

        fetchMetrics(userSnap.id);
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
      const url = await uploadToCloudinary(file, 'Khan Hub/welfare/profile');
      await updateDoc(doc(db, 'welfare_users', session.uid), { photoUrl: url });
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
    return profile.monthlySalary - fineTotal;
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
                    {profile?.displayName?.[0]}
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

            <h2 className="mt-4 text-lg font-bold text-center text-slate-900">{profile?.displayName}</h2>
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
                <span className="text-xs font-medium text-slate-700">{profile?.phone || 'No Phone'}</span>
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
              { id: 'finance', label: 'Finance', icon: <DollarSign size={14} /> },
              { id: 'duty', label: 'Work Logs', icon: <Activity size={14} /> },
              { id: 'dress', label: 'Dress', icon: <Shirt size={14} /> },
              { id: 'score', label: 'Performance', icon: <TrendingUp size={14} /> },
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
                          <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.task}</p>
                          <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">{formatDateDMY(task.date)}</p>
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
                       <p className="font-bold text-rose-600 text-sm">- Rs. {fine.amount}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'duty' && (
              <div>
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-50">
                  <Activity size={16} className="text-slate-700" />
                  <h3 className="text-base font-bold">Work Logging</h3>
                </div>
                <div className="space-y-3">
                  {duties.map(duty => (
                    <div key={duty.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between bg-slate-50/30">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${duty.status === 'completed' ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
                          <Activity size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize text-slate-800">{duty.dutyType.replace(/_/g, ' ')}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{formatDateDMY(duty.date)}</p>
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded-md bg-white border border-slate-100 text-[10px] font-bold text-slate-600">+{duty.points} PTS</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'dress' && (
              <div>
                 <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-50">
                  <Shirt size={16} className="text-slate-700" />
                  <h3 className="text-base font-bold">Dress Compliance</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dressLogs.map(log => (
                    <div key={log.id} className="p-4 rounded-xl border border-slate-100 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${log.status === 'yes' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                          <Shirt size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{formatDateDMY(log.date)}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{log.status === 'yes' ? 'Compliant' : 'Non-Compliant'}</p>
                        </div>
                      </div>
                      {log.status === 'yes' && <div className="px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-600">+{log.points} PTS</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'score' && (
              <div>
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-50">
                  <TrendingUp size={16} className="text-slate-700" />
                  <h3 className="text-base font-bold">Performance Summary</h3>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center max-w-xs mx-auto">
                   <Award className="mx-auto text-amber-500 mb-2" size={28} />
                   <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Cumulative Growth Points</p>
                   <h4 className="text-2xl font-bold text-slate-900 mt-1">{profile?.totalGrowthPoints || 0}</h4>
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
