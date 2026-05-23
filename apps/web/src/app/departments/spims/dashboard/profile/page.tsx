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
  const [staffDoc, setStaffDoc] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'attendance' | 'duty' | 'dress' | 'finance' | 'profile'>('overview');

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [duties, setDuties] = useState<DutyRecord[]>([]);
  const [dressLogs, setDressLogs] = useState<DressRecord[]>([]);
  const [contributions, setContributions] = useState<ContributionRecord[]>([]);
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);
  const [salaryRecords, setSalaryRecords] = useState<SalarySlip[]>([]);

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
      setContributions(contrib as ContributionRecord[]);
      setSpecialTasks(tasks as SpecialTask[]);
      setFines(fns as FineRecord[]);
      setSalaryRecords(salaries as SalarySlip[]);

      if (pointsSnap && !pointsSnap.empty) {
        setGrowthPoints(pointsSnap.docs[0].data());
      } else {
        // Fallback check with prefixed
        const pointsSnapPref = await getDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', prefixedId))).catch(() => null);
        if (pointsSnapPref && !pointsSnapPref.empty) {
          setGrowthPoints(pointsSnapPref.docs[0].data());
        }
      }
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

        if (parsed.role === 'admin' || parsed.role === 'staff') {
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

  const totalEarnings = useMemo(() => {
    if (!profile?.monthlySalary) return 0;
    const fineTotal = fines.reduce((acc, f) => acc + (f.amount || 0), 0);
    return Math.max(0, profile.monthlySalary - fineTotal);
  }, [profile, fines]);

  const totalFines = useMemo(() => fines.reduce((a, c) => a + (c.amount || 0), 0), [fines]);

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
                <span className="text-xs font-bold text-gray-700">{growthPoints?.total || profile?.totalGrowthPoints || 0} Points</span>
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
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="animate-spin text-teal-600 w-6 h-6" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 rounded-full bg-teal-600 text-white shadow-md hover:bg-teal-700 transition-colors"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileRef} type="file" className="hidden" accept="image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.type !== 'image/webp') { toast.error('Only WebP images are allowed'); return; }
                  handleUploadPhoto(file);
                }}
              />
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
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-gray-900">Assigned Operational Assignments</h3>
                  <div className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-[10px] font-black uppercase">
                    {specialTasks.filter(t => t.status === 'completed').length} Resolved
                  </div>
                </div>

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

                {contributions.length > 0 && (
                  <>
                    <h3 className="text-lg font-black text-gray-900 mt-10 mb-4 font-sans">Approved Academic Contributions</h3>
                    <div className="space-y-4 border-l-2 border-gray-100 pl-6 ml-2">
                      {contributions.map((c) => (
                        <div key={c.id} className="relative">
                          <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full bg-white border-2 border-amber-500" />
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{formatDateDMY(c.date)}</p>
                          <h5 className="text-sm font-black text-gray-900 mt-1">{c.title}</h5>
                          <p className="text-xs text-gray-500 mt-1">{c.content}</p>
                          {c.isApproved && <span className="inline-block mt-2 px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg">+{c.points} Growth Points</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
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
                     <p className="text-xs font-medium text-gray-500">Total Gross Structure</p>
                     <h4 className="text-2xl font-black text-gray-900">Rs. {(profile?.monthlySalary || 0).toLocaleString()}</h4>
                     <div className="border-t border-gray-50 mt-4 pt-4 flex justify-between items-center text-sm font-medium">
                        <span className="text-gray-400">Live Deductions</span>
                        <span className="text-rose-600 font-bold">-Rs. {totalFines.toLocaleString()}</span>
                     </div>
                  </div>
                  
                  <div className="bg-teal-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden shadow-teal-100">
                     <div className="absolute -right-4 -bottom-4 text-white opacity-10 w-24 h-24 rotate-12">
                        <DollarSign size={96} />
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Est. Retainable Net</p>
                     <h4 className="text-3xl font-black">Rs. {totalEarnings.toLocaleString()}</h4>
                     <p className="text-xs mt-2 font-medium opacity-70">Adjusted for logged system fines.</p>
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

          </div>
        </div>
      </div>
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
