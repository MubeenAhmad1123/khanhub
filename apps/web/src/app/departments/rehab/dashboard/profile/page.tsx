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
  User, Camera, Loader2, Calendar, ClipboardCheck,
  Shirt, Award, Clock, Target, DollarSign,
  Activity, MapPin, Mail, Briefcase,
  AlertCircle, ChevronRight, Info, Phone
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

// --- Types ---
interface AttendanceRecord { id: string; date: string; status: 'present' | 'absent' | 'leave' | 'late'; arrivalTime?: string; departureTime?: string; }
interface DutyRecord { id: string; date: string; dutyType: string; status: 'completed' | 'not_done'; points: number; }
interface DressRecord { id: string; date: string; status: 'yes' | 'no'; points: number; }
interface ContributionRecord { id: string; date: any; title: string; content: string; isApproved: boolean; points: number; }
interface SpecialTask { id: string; task: string; status: 'pending' | 'completed'; date: string; points: number; }
interface FineRecord { id: string; amount: number; reason: string; date: string; status: 'paid' | 'unpaid'; }

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [staffDoc, setStaffDoc] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'finance' | 'tasks'>('overview');

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [duties, setDuties] = useState<DutyRecord[]>([]);
  const [dressLogs, setDressLogs] = useState<DressRecord[]>([]);
  const [contributions, setContributions] = useState<ContributionRecord[]>([]);
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);

  const safeGetDocs = async (q: any) => {
    try {
      const snap = await getDocs(q);
      return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("Permission or index error on query:", e);
      return [];
    }
  };

  const fetchMetrics = useCallback(async (sId: string, dept: string) => {
    const prefix = dept === 'hq' ? 'hq' : dept === 'rehab' ? 'rehab' : 'spims';

    const [att, duty, dress, contrib, pointsSnap, task, fine] = await Promise.all([
      safeGetDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
      safeGetDocs(query(collection(db, `${prefix}_duty_logs`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
      safeGetDocs(query(collection(db, `${prefix}_dress_logs`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
      safeGetDocs(query(collection(db, `${prefix}_contributions`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
      safeGetDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', sId), limit(1))),
      safeGetDocs(query(collection(db, `${prefix}_special_tasks`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30))),
      safeGetDocs(query(collection(db, `${prefix}_fines`), where('staffId', '==', sId), orderBy('date', 'desc'), limit(30)))
    ]);

    setAttendance(att as AttendanceRecord[]);
    setDuties(duty as DutyRecord[]);
    setDressLogs(dress as DressRecord[]);
    setContributions(contrib as ContributionRecord[]);
    setSpecialTasks(task as SpecialTask[]);
    setFines(fine as FineRecord[]);
    if (pointsSnap.length > 0) setGrowthPoints(pointsSnap[0]);
  }, []);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) { router.push('/departments/rehab/login'); return; }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);
        let userSnap;
        try {
          userSnap = await getDoc(doc(db, 'rehab_users', parsed.uid));
        } catch (e) { }

        if (!userSnap || !userSnap.exists()) {
          try { userSnap = await getDoc(doc(db, 'spims_users', parsed.uid)); } catch (e) { }
        }

        if (userSnap && userSnap.exists()) {
          setProfile({ id: userSnap.id, ...userSnap.data() });
        } else {
          setProfile({ id: parsed.uid, displayName: parsed.displayName, role: parsed.role, email: parsed.email });
        }

        if (parsed.role === 'admin' || parsed.role === 'staff') {
          let sSnap = await safeGetDocs(query(collection(db, 'rehab_staff'), where('loginUserId', '==', parsed.uid)));
          if (sSnap.length === 0) sSnap = await safeGetDocs(query(collection(db, 'spims_staff'), where('loginUserId', '==', parsed.uid)));
          if (sSnap.length === 0) sSnap = await safeGetDocs(query(collection(db, 'hq_staff'), where('loginUserId', '==', parsed.uid)));

          if (sSnap.length > 0) {
            const sd = sSnap[0];
            setStaffDoc(sd);
            fetchMetrics(sd.id, sd.department || 'rehab');
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
      const url = await uploadToCloudinary(file, 'Khan Hub/rehab/profile');
      await updateDoc(doc(db, 'rehab_users', session.uid), { photoUrl: url }).catch(() => { });
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
    <div className="min-h-[60vh] flex items-center justify-center bg-[#FCFAF2]">
      <Loader2 className="animate-spin text-teal-600 w-8 h-8" />
    </div>
  );

  return (
    <div className="pb-24 text-gray-900 font-sans">
      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Minimalist Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-center shadow-sm relative text-center">
            <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 relative bg-gray-100">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-300">
                    {profile?.displayName?.[0]}
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

            <h2 className="text-xl font-black text-gray-900">{profile?.displayName}</h2>
            <p className="text-teal-600 font-bold text-xs uppercase tracking-widest mt-1">{profile?.designation || 'Staff Member'}</p>

            <div className="mt-8 w-full space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Mail className="text-gray-400" size={16} />
                <span className="text-xs font-bold text-gray-600 truncate">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Phone className="text-gray-400" size={16} />
                <span className="text-xs font-bold text-gray-600">{profile?.phone || 'No Phone'}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 w-full">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Emp ID</p>
                <p className="text-sm font-black text-gray-900">#{profile?.employeeId || '---'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Joined</p>
                <p className="text-sm font-black text-gray-900">{profile?.joiningDate ? formatDateDMY(profile.joiningDate).split('-')[2] : '2024'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contribution</p>
                <p className="text-sm font-black text-gray-900 mt-0.5">Growth Points</p>
              </div>
              <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl flex items-center gap-2">
                <Award size={18} />
                <span className="font-black text-lg">{growthPoints?.totalPoints || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Main Content */}
        <div className="lg:col-span-8 space-y-6">

          {/* Navigation Tabs - Flat Style */}
          <div className="bg-white rounded-2xl border border-gray-100 p-2 flex overflow-x-auto no-scrollbar gap-2 shadow-sm">
            {[
              { id: 'overview', label: 'Overview', icon: <Info size={16} /> },
              { id: 'tasks', label: 'Tasks & Growth', icon: <Target size={16} /> },
              { id: 'attendance', label: 'Attendance', icon: <Calendar size={16} /> },
              { id: 'finance', label: 'Finance', icon: <DollarSign size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? `bg-teal-50 text-teal-700`
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
                <h3 className="text-xl font-black text-gray-900 mb-6">Personal Records</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 px-1">National ID (CNIC)</p>
                      <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-900">
                        {profile?.cnic || 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 px-1">Date of Birth</p>
                      <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-900">
                        {profile?.dob ? formatDateDMY(profile.dob) : 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 px-1">Home Address</p>
                      <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-900">
                        {profile?.address || 'No address registered.'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 px-1">Work Schedule</p>
                      <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-900">
                        {profile?.dutyStartTime || '09:00'} - {profile?.dutyEndTime || '17:00'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-gray-900">Tasks & Contributions</h3>
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
                          <p className={`font-bold text-sm ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.task}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{formatDateDMY(task.date)}</p>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[10px] font-black text-teal-600">
                        +{task.points} PTS
                      </div>
                    </div>
                  )) : (
                    <div className="py-12 text-center">
                      <p className="text-gray-400 text-sm font-bold">No active tasks assigned.</p>
                    </div>
                  )}
                </div>

                {contributions.length > 0 && (
                  <>
                    <h3 className="text-lg font-black text-gray-900 mt-10 mb-4">Approved Contributions</h3>
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
                <h3 className="text-xl font-black text-gray-900 mb-6">Attendance Log (30 Days)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attendance.map(log => (
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
                        {log.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="p-6 rounded-2xl bg-teal-50 border border-teal-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600/70">Estimated Payable</p>
                    <h4 className="text-3xl font-black mt-1 text-teal-800">Rs. {totalEarnings.toLocaleString()}</h4>
                  </div>
                  <div className="p-6 rounded-2xl bg-white border border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Deductions</p>
                    <h4 className="text-3xl font-black mt-1 text-red-500">Rs. {fines.reduce((a, c) => a + (c.amount || 0), 0).toLocaleString()}</h4>
                  </div>
                </div>

                <h4 className="text-sm font-black text-gray-900 mb-4">Recent Fines</h4>
                <div className="space-y-3">
                  {fines.length > 0 ? fines.map(fine => (
                    <div key={fine.id} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-50 text-red-500"><AlertCircle size={16} /></div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{fine.reason}</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-0.5">{formatDateDMY(fine.date)}</p>
                        </div>
                      </div>
                      <p className="font-black text-sm text-red-500">- Rs. {fine.amount}</p>
                    </div>
                  )) : (
                    <div className="py-6 text-center">
                      <p className="text-sm font-bold text-gray-400">No recent fines recorded.</p>
                    </div>
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
      `}</style>
    </div>
  );
}
