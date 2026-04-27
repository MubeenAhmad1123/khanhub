// src/app/departments/social-media/dashboard/profile/page.tsx
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
  AlertCircle, ChevronRight, Download, Info, Share2, Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY, toDate } from '@/lib/utils';
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

  // Styles
  const glassStyle = "bg-white/70 backdrop-blur-xl border border-white shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff]";
  const neumorphicOutset = "shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff]";
  const neumorphicInset = "shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]";

  const fetchMetrics = useCallback(async (sId: string) => {
    try {
      const [attSnap, dutySnap, dressSnap, pointsSnap, taskSnap, fineSnap] = await Promise.all([
        getDocs(query(collection(db, `media_attendance`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `media_duty_logs`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `media_dress_logs`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `media_growth_points`), where('staffId', '==', sId), limit(1))),
        getDocs(query(collection(db, `media_special_tasks`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, `media_fines`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30)))
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
    const sessionData = localStorage.getItem('media_session');
    if (!sessionData) { router.push('/departments/social-media/login'); return; }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);
        const userRef = doc(db, 'media_users', parsed.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) { router.push('/departments/social-media/login'); return; }
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
      const url = await uploadToCloudinary(file, 'Khan Hub/media/profile');
      await updateDoc(doc(db, 'media_users', session.uid), { photoUrl: url });
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
    <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8]">
      <div className="animate-spin text-indigo-600"><Loader2 size={40} /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FCFBF8] pb-24 text-slate-900 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-6 md:px-12 bg-[#FCFBF8]/80 backdrop-blur-md border-b border-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${glassStyle} text-indigo-600`}>
              <Share2 size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Media Hub</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Creator Profile • Live</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className={`px-6 py-3 rounded-2xl ${glassStyle} flex items-center gap-3`}>
              <Award className="text-amber-500" size={20} />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Growth Points</p>
                <p className="text-lg font-black">{profile?.totalGrowthPoints || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className={`p-8 rounded-[3rem] ${glassStyle} flex flex-col items-center relative overflow-hidden`}>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
            
            <div className="relative group">
              <div className={`w-32 h-32 rounded-[2.5rem] overflow-hidden ${neumorphicOutset} border-4 border-white/50 relative`}>
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-50 flex items-center justify-center text-4xl font-black text-slate-200 uppercase">
                    {profile?.displayName?.[0]}
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="animate-spin text-indigo-600" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-indigo-600 text-white shadow-xl hover:scale-110 transition-all active:scale-95"
              >
                <Camera size={18} />
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

            <h2 className="mt-6 text-2xl font-black text-center">{profile?.displayName}</h2>
            <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest mt-2">{profile?.designation || 'Content Specialist'}</p>
            
            <div className="mt-8 w-full space-y-3">
              <div className={`flex items-center gap-4 p-4 rounded-2xl ${neumorphicInset}`}>
                <Mail className="text-slate-300" size={16} />
                <span className="text-xs font-bold text-slate-600 truncate">{profile?.email}</span>
              </div>
              <div className={`flex items-center gap-4 p-4 rounded-2xl ${neumorphicInset}`}>
                <Phone className="text-slate-300" size={16} />
                <span className="text-xs font-bold text-slate-600">{profile?.phone || 'No Phone'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="lg:col-span-8 space-y-8">
          <div className={`p-2 rounded-[2rem] ${glassStyle} flex overflow-x-auto no-scrollbar gap-1`}>
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
                className={`flex items-center gap-2 px-6 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                  ${activeTab === tab.id 
                    ? `bg-indigo-600 text-white shadow-xl scale-105` 
                    : `text-slate-400 hover:text-indigo-600 hover:bg-indigo-50`}`}
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
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Target size={20} /></div>
                  <h3 className="text-xl font-black">Campaign Assignments</h3>
                </div>
                <div className="space-y-4">
                  {specialTasks.length > 0 ? specialTasks.map(task => (
                    <div key={task.id} className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8] flex items-center justify-between group transition-transform hover:scale-[1.01]`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {task.status === 'completed' ? <CheckCircle size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.task}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{formatDateDMY(task.date)}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-indigo-600 shadow-sm">+{task.points || 0} PTS</div>
                    </div>
                  )) : (
                    <div className="py-20 flex flex-col items-center opacity-30">
                      <Sparkles size={48} className="text-slate-400 mb-4" />
                      <p className="font-black uppercase tracking-widest">No Active Campaigns</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Calendar size={20} /></div>
                  <h3 className="text-xl font-black">Session History</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attendance.map(log => (
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
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-indigo-600 text-white relative overflow-hidden`}>
                     <DollarSign size={80} className="absolute -right-4 -bottom-4 opacity-10" />
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Estimated Payable</p>
                     <h4 className="text-3xl font-black mt-2">Rs. {totalEarnings.toLocaleString()}</h4>
                  </div>
                  <div className={`p-8 rounded-[3rem] ${glassStyle} text-slate-900`}>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Deductions</p>
                     <h4 className="text-3xl font-black mt-2 text-rose-500">Rs. {fines.reduce((a,c)=>a+(c.amount||0), 0).toLocaleString()}</h4>
                  </div>
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

            {activeTab === 'duty' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Activity size={20} /></div>
                  <h3 className="text-xl font-black">Content Creation Logs</h3>
                </div>
                <div className="space-y-4">
                  {duties.map(duty => (
                    <div key={duty.id} className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8] flex items-center justify-between`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${duty.status === 'completed' ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-400'}`}>
                          <Activity size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold capitalize">{duty.dutyType.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{formatDateDMY(duty.date)}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-indigo-600">+{duty.points} PTS</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'dress' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Shirt size={20} /></div>
                  <h3 className="text-xl font-black">On-Screen Compliance</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dressLogs.map(log => (
                    <div key={log.id} className={`p-6 rounded-3xl ${neumorphicOutset} bg-[#FCFBF8] flex items-center justify-between`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${log.status === 'yes' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-300'}`}>
                          <Shirt size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{formatDateDMY(log.date)}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{log.status === 'yes' ? 'Compliant' : 'Non-Compliant'}</p>
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
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><TrendingUp size={20} /></div>
                  <h3 className="text-xl font-black">Growth Analysis</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className={`p-8 rounded-[3rem] ${neumorphicOutset} bg-[#FCFBF8] text-center`}>
                      <Award className="mx-auto text-amber-500 mb-2" size={32} />
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Growth Points</p>
                      <h4 className="text-3xl font-black mt-2">{profile?.totalGrowthPoints || 0}</h4>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><User size={20} /></div>
                  <h3 className="text-xl font-black">Creator Dossier</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div>
                         <p className="text-[9px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">National ID (CNIC)</p>
                         <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-center gap-4`}>
                            <Shield className="text-indigo-500" size={18} />
                            <p className="text-sm font-bold text-slate-700">{profile?.cnic || 'Not provided'}</p>
                         </div>
                      </div>
                      <div>
                         <p className="text-[9px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">Portfolio Link</p>
                         <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-start gap-4`}>
                            <Share2 className="text-indigo-500 mt-1" size={18} />
                            <p className="text-sm font-bold text-slate-700 leading-relaxed truncate">{profile?.portfolioUrl || 'No portfolio linked.'}</p>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div>
                         <p className="text-[9px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">Work Schedule</p>
                         <div className={`p-5 rounded-[2rem] ${neumorphicInset} bg-white flex items-center gap-4`}>
                            <Clock className="text-indigo-500" size={18} />
                            <p className="text-sm font-bold text-slate-700">{profile?.dutyStartTime || '09:00'} - {profile?.dutyEndTime || '17:00'}</p>
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
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-4 { from { transform: translateY(1rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.5s ease-out, slide-in-from-bottom-4 0.5s ease-out; }
      `}</style>
    </div>
  );
}
