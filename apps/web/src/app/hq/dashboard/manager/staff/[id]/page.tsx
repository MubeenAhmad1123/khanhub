// src/app/hq/dashboard/manager/staff/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
  doc, getDoc, collection, getDocs, query, where, orderBy,
  updateDoc, addDoc, serverTimestamp, setDoc, limit 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import { 
  Target, Camera,
  ArrowLeft, Award, Clock, Calendar, Shield, DollarSign,
  Loader2, TrendingUp, ChevronDown, ChevronUp, RefreshCw,
  User, ClipboardList, CheckCircle2, XCircle, AlertCircle, MinusCircle,
  ChevronLeft, ChevronRight, Star, Plus, Trash2
} from 'lucide-react';
import { increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { recalculateGrowthPoints } from '@/lib/rehab/growthPoints';
import { Timestamp } from 'firebase/firestore';
import ScoreCard from '@/components/rehab/ScoreCard';
import { SCORE_CATEGORIES, MONTHLY_REWARDS, WEEKLY_RULE } from '@/data/scoreRules';
import { HqCheckCell } from '@/components/hq/HqCheckCell';
import { 
  HqDailyAttendanceRecord, 
  HqDailyDressCodeRecord, 
  HqDailyDutyRecord,
  HqDressCodeItem,
  HqDutyItem
} from '@/types/hq';

interface Staff {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  isActive?: boolean;
  monthlySalary?: number;
  photoUrl?: string;
  phone?: string;
  dutyStartTime?: string;
  dutyEndTime?: string;
  role?: string;
  email?: string;
  userId?: string;
  // Configuration for monthly grids
  dressCodeConfig?: { key: string; label: string }[];
  dutyConfig?: { key: string; label: string }[];
}

interface AttendanceLog {
  id: string;
  date: any;
  status: 'present' | 'absent' | 'leave';
  arrivalTime?: string;
  departureTime?: string;
}

function formatStaffDate(input: any): string {
  if (!input) return 'N/A';
  if (input instanceof Timestamp) return input.toDate().toLocaleDateString('en-GB');
  if (input?.seconds) return new Date(input.seconds * 1000).toLocaleDateString('en-GB');
  const d = new Date(input);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-GB');
}

export default function StaffProfilePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const staffId = params.id as string;
  const colPrefix = searchParams.get('collection') || 'rehab';
  const { session, loading: sessionLoading } = useHqSession();
  
  const [staff, setStaff] = useState<Staff | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'duties' | 'dress' | 'salary' | 'score' | 'edit'>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDark, setIsDark] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: '',
    designation: '',
    monthlySalary: 0,
    dutyStartTime: '',
    dutyEndTime: '',
    isActive: true,
    phone: '',
    employeeId: '',
    userId: '',
    dressCodeConfig: [] as { key: string; label: string }[],
    dutyConfig: [] as { key: string; label: string }[]
  });

  useEffect(() => {
    const saved = localStorage.getItem('hq_dark_mode') === 'true';
    setIsDark(saved);
  }, []);
  
  // Data States
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [dutyLogs, setDutyLogs] = useState<any[]>([]);
  const [dressLogs, setDressLogs] = useState<any[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);
  const [growthHistory, setGrowthHistory] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loadingScore, setLoadingScore] = useState(false);
  const [openRule, setOpenRule] = useState<string | null>(null);

  // Duty Marking State
  const [markingDuty, setMarkingDuty] = useState(false);
  const [dutyForm, setDutyForm] = useState({ type: 'morning_shift', status: 'completed', comment: '' });

  // ─── Monthly Grid Logic ───────────────────────────────────────────────────
  
  const [attendanceMap, setAttendanceMap] = useState<Record<string, HqDailyAttendanceRecord>>({});
  const [dressMap, setDressMap] = useState<Record<string, HqDailyDressCodeRecord>>({});
  const [dutyMap, setDutyMap] = useState<Record<string, HqDailyDutyRecord>>({});
  const [timePopup, setTimePopup] = useState<{
    isOpen: boolean;
    date: string;
    arrivalTime: string;
    departureTime: string;
  }>({ isOpen: false, date: '', arrivalTime: '', departureTime: '' });

  const daysInMonth = useCallback(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const days = [];
    while (date.getMonth() === month - 1) {
      days.push(new Date(date).toISOString().slice(0, 10));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedMonth]);

  const fetchData = useCallback(async () => {
    if (!staffId) return;
    try {
      setLoading(true);
      const collectionName = colPrefix === 'hq' ? 'hq_staff' : 'rehab_staff';
      const staffDoc = await getDoc(doc(db, collectionName, staffId));
      
      if (!staffDoc.exists()) {
        toast.error("Staff member not found");
        router.push('/hq/dashboard/manager/staff');
        return;
      }
      
      const sData = { id: staffDoc.id, ...staffDoc.data() } as Staff;
      setStaff(sData);
      setEditForm({
        name: sData.name || '',
        designation: sData.designation || '',
        monthlySalary: Number(sData.monthlySalary || 0),
        dutyStartTime: sData.dutyStartTime || '',
        dutyEndTime: sData.dutyEndTime || '',
        isActive: sData.isActive !== false,
        phone: sData.phone || '',
        employeeId: sData.employeeId || '',
        userId: sData.userId || '',
        dressCodeConfig: sData.dressCodeConfig || [
          { key: 'pant', label: 'Dress Pant' },
          { key: 'shirt', label: 'Uniform Shirt' },
          { key: 'shoes', label: 'Black Shoes' },
          { key: 'id_card', label: 'ID Card' }
        ],
        dutyConfig: sData.dutyConfig || [
          { key: 'attendance_portal', label: 'Attendance Entry' },
          { key: 'patient_vitals', label: 'Patient Vitals' },
          { key: 'ward_round', label: 'Ward Round' },
          { key: 'cleanliness', label: 'Area Cleanliness' }
        ]
      });

      // ─── Fetch Monthly Logs ───────────────────────────────────────────────
      const prefix = colPrefix;
      const days = daysInMonth();
      const start = days[0];
      const end = days[days.length - 1];

      const [attSnap, dressSnap, dutySnap, pointsSnap] = await Promise.all([
        getDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', staffId), where('date', '>=', start), where('date', '<=', end))),
        getDocs(query(collection(db, `${prefix}_dress_logs`), where('staffId', '==', staffId), where('date', '>=', start), where('date', '<=', end))),
        getDocs(query(collection(db, `${prefix}_duty_logs`), where('staffId', '==', staffId), where('date', '>=', start), where('date', '<=', end))),
        getDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', staffId), limit(1)))
      ]);

      const aMap: Record<string, HqDailyAttendanceRecord> = {};
      attSnap.docs.forEach(d => { aMap[d.data().date] = d.data() as HqDailyAttendanceRecord; });
      setAttendanceMap(aMap);

      const drMap: Record<string, HqDailyDressCodeRecord> = {};
      dressSnap.docs.forEach(d => { drMap[d.data().date] = d.data() as HqDailyDressCodeRecord; });
      setDressMap(drMap);

      const duMap: Record<string, HqDailyDutyRecord> = {};
      dutySnap.docs.forEach(d => { duMap[d.data().date] = d.data() as HqDailyDutyRecord; });
      setDutyMap(duMap);

      if (!pointsSnap.empty) setGrowthPoints(pointsSnap.docs[0].data());

      // Fetch growth history (all months)
      const historySnap = await getDocs(
        query(collection(db, `${prefix}_growth_points`), where('staffId', '==', staffId), orderBy('month', 'desc'))
      );
      setGrowthHistory(historySnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error(err);
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  }, [staffId, colPrefix, router, daysInMonth]);

  const toggleAttendance = async (date: string, next: any) => {
    try {
      const prefix = colPrefix;
      const ref = doc(db, `${prefix}_attendance`, `${staffId}_${date}`);
      
      const newRecord: HqDailyAttendanceRecord = {
        staffId,
        date,
        status: next,
        markedBy: session?.uid,
        updatedAt: new Date().toISOString()
      };

      // Set default times if presenting for the first time
      if (next === 'present') {
        newRecord.arrivalTime = '09:00';
        newRecord.departureTime = '17:00';
      }

      setAttendanceMap(prev => ({ ...prev, [date]: newRecord }));
      await setDoc(ref, newRecord, { merge: true });
    } catch (err) {
      toast.error("Update failed");
      fetchData(); // Rollback
    }
  };

  const handleAttendanceCell = (dateStr: string) => {
    const existing = attendanceMap[dateStr];
    setTimePopup({
      isOpen: true,
      date: dateStr,
      arrivalTime: existing?.arrivalTime || '09:00',
      departureTime: existing?.departureTime || '' // Per instructions: set to empty by default
    });
  };

  const handleTimePopupSave = async () => {
    if (!timePopup.date) return;
    
    try {
      setSaving(true);
      const prefix = colPrefix;
      const ref = doc(db, `${prefix}_attendance`, `${staffId}_${timePopup.date}`);
      
      // Payloads are PURELY strings, NO date objects used to prevent double-day entries
      const payload = {
        arrivalTime: timePopup.arrivalTime,
        departureTime: timePopup.departureTime,
        status: 'present', // If manager sets time, it's present
        updatedAt: new Date().toISOString(),
        markedBy: session?.uid
      };

      // Update Local State
      setAttendanceMap(prev => ({
        ...prev,
        [timePopup.date]: { ...prev[timePopup.date], ...payload, staffId, date: timePopup.date }
      }));

      // Single setDoc call as requested
      await setDoc(ref, payload, { merge: true });
      
      toast.success("Timing updated");
      setTimePopup({ ...timePopup, isOpen: false });
    } catch (err) {
      toast.error("Failed to save timing");
    } finally {
      setSaving(false);
    }
  };

  const toggleDress = async (date: string, itemKey: string, next: any) => {
    try {
      const prefix = colPrefix;
      const ref = doc(db, `${prefix}_dress_logs`, `${staffId}_${date}`);
      const current = dressMap[date]?.items || [];
      const exists = current.find(i => i.key === itemKey);
      
      let nextItems: HqDressCodeItem[] = [];
      if (exists) {
        nextItems = current.map(i => i.key === itemKey ? { ...i, status: next } : i);
      } else {
        const label = staff?.dressCodeConfig?.find(c => c.key === itemKey)?.label || itemKey;
        nextItems = [...current, { key: itemKey, label, status: next }];
      }

      const newRecord: HqDailyDressCodeRecord = {
        staffId,
        date,
        items: nextItems,
        markedBy: session?.uid,
        updatedAt: new Date().toISOString()
      };

      setDressMap(prev => ({ ...prev, [date]: newRecord }));
      await setDoc(ref, newRecord, { merge: true });
    } catch (err) {
      toast.error("Update failed");
      fetchData();
    }
  };

  const toggleDuty = async (date: string, dutyKey: string, next: any) => {
    try {
      const prefix = colPrefix;
      const ref = doc(db, `${prefix}_duty_logs`, `${staffId}_${date}`);
      const current = dutyMap[date]?.duties || [];
      const exists = current.find(d => d.key === dutyKey);

      let nextDuties: HqDutyItem[] = [];
      if (exists) {
        nextDuties = current.map(d => d.key === dutyKey ? { ...d, status: next } : d);
      } else {
        const label = staff?.dutyConfig?.find(c => c.key === dutyKey)?.label || dutyKey;
        nextDuties = [...current, { key: dutyKey, label, status: next }];
      }

      const newRecord: HqDailyDutyRecord = {
        staffId,
        date,
        duties: nextDuties,
        markedBy: session?.uid,
        updatedAt: new Date().toISOString()
      };

      setDutyMap(prev => ({ ...prev, [date]: newRecord }));
      await setDoc(ref, newRecord, { merge: true });
    } catch (err) {
      toast.error("Update failed");
      fetchData();
    }
  };

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'manager' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    fetchData();
  }, [session, sessionLoading, fetchData, router]);

  const handleMarkDuty = async () => {
    try {
      setMarkingDuty(true);
      const prefix = colPrefix === 'hq' ? 'hq' : 'rehab';
      await addDoc(collection(db, `${prefix}_duty_logs`), {
        staffId,
        dutyType: dutyForm.type,
        status: dutyForm.status,
        comment: dutyForm.comment,
        points: dutyForm.status === 'completed' ? 10 : 0,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        markedBy: session?.uid
      });

      toast.success("Duty marked successfully");
      setDutyForm({ type: 'morning_shift', status: 'completed', comment: '' });
      fetchData();
    } catch (error) {
      toast.error("Failed to mark duty");
    } finally {
      setMarkingDuty(false);
    }
  };

  const handleMarkAttendance = async (dateStr: string, status: 'present' | 'absent' | 'leave') => {
    try {
      const prefix = colPrefix === 'hq' ? 'hq' : 'rehab';
      const attId = `${staffId}_${dateStr}`;
      await setDoc(doc(db, `${prefix}_attendance`, attId), {
        staffId,
        date: dateStr,
        status,
        markedAt: serverTimestamp(),
        markedBy: session?.uid,
        arrivalTime: status === 'present' ? '09:00' : null,
        departureTime: status === 'present' ? '17:00' : null
      });
      toast.success(`Marked as ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to mark attendance");
    }
  };

  const handleMarkDress = async (dateStr: string, isCompliant: boolean) => {
    try {
      const prefix = colPrefix === 'hq' ? 'hq' : 'rehab';
      const logId = `${staffId}_${dateStr}`;
      await setDoc(doc(db, `${prefix}_dress_logs`, logId), {
        staffId,
        date: dateStr,
        isCompliant,
        markedAt: serverTimestamp(),
        markedBy: session?.uid
      });
      toast.success("Dress code logged");
      fetchData();
    } catch (error) {
      toast.error("Failed to log dress code");
    }
  };

  const handleRecalculate = async () => {
    try {
      toast.loading("Recalculating points...", { id: 'recalc' });
      const month = selectedMonth || new Date().toISOString().slice(0, 7);
      await recalculateGrowthPoints(staffId, month, colPrefix || 'rehab');
      toast.success("Points updated", { id: 'recalc' });
      fetchData();
    } catch (error) {
      toast.error("Recalculation failed", { id: 'recalc' });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'khanhub_profiles'); 

    try {
      toast.loading("Uploading photo...", { id: 'upload' });
      const res = await fetch('https://api.cloudinary.com/v1_1/dr6m99scu/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      const collectionName = colPrefix === 'hq' ? 'hq_staff' : 'rehab_staff';
      await updateDoc(doc(db, collectionName, staffId), {
        photoUrl: data.secure_url
      });

      toast.success("Photo updated", { id: 'upload' });
      fetchData();
    } catch (error) {
      toast.error("Upload failed", { id: 'upload' });
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const collectionName = colPrefix === 'hq' ? 'hq_staff' : 'rehab_staff';
      await updateDoc(doc(db, collectionName, staffId), {
        ...editForm,
        updatedAt: serverTimestamp()
      });
      toast.success("Profile updated successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading || sessionLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 pb-20 ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8FAFC] text-gray-900'}`}>
      {/* Dynamic Header */}
      <div className={`border-b sticky top-0 z-20 shadow-sm transition-colors ${isDark ? 'bg-zinc-900/90 backdrop-blur-xl border-zinc-800' : 'bg-white border-gray-100'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/hq/dashboard/manager/users" className={`flex items-center gap-2 group transition-colors ${isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            <div className={`p-2 rounded-xl ${isDark ? 'group-hover:bg-zinc-800' : 'group-hover:bg-gray-100'}`}><ArrowLeft size={18} /></div>
            <span className="text-xs font-black uppercase tracking-widest leading-none">Management</span>
          </Link>

          <div className="flex items-center gap-4">
             <button 
               onClick={handleRecalculate}
               className={`p-2.5 rounded-xl transition-all shadow-sm ${isDark ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-orange-50 text-orange-600 shadow-orange-100'}`}
               title="Recalculate Growth Points"
             >
               <Target size={18} />
             </button>
             <div className={`h-6 w-px ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`} />
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Growth Points</p>
               <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{growthPoints?.total || 0}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`rounded-[2.5rem] p-8 shadow-sm border flex flex-col items-center text-center relative overflow-hidden transition-colors ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
            }`}>
               <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-indigo-600 to-blue-700 opacity-20" />
               
               <div className="relative mt-4 mb-6 group">
                 {staff?.photoUrl ? (
                   <img src={staff.photoUrl} className="w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-transparent shadow-2xl" />
                 ) : (
                   <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-4xl font-black ring-8 shadow-inner ${
                     isDark ? 'bg-zinc-800 text-zinc-600 ring-zinc-900/50' : 'bg-gray-100 text-gray-400 ring-white'
                   }`}>
                     {staff?.name?.[0]}
                   </div>
                 )}
                 <label className={`absolute bottom-0 right-0 p-3 rounded-2xl shadow-xl cursor-pointer hover:scale-110 transition-transform ${
                   isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
                 }`}>
                    <Camera size={18} />
                    <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                 </label>
               </div>

               <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{staff?.name || 'Unknown Staff'}</h2>
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1 mb-4">{staff?.designation || 'Position N/A'}</p>
               
               <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    isDark ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400' : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}>
                    ID: {staff?.employeeId || 'N/A'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                     staff?.department === 'rehab' ? 'bg-teal-500/10 text-teal-500 border-teal-500/20' : (isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-gray-50 text-gray-600')
                  }`}>
                    {staff?.department || 'General'}
                  </span>
               </div>

               <div className="w-full grid grid-cols-2 gap-4 mt-4">
                  <div className={`rounded-2xl p-4 ${isDark ? 'bg-zinc-800/30' : 'bg-gray-50'}`}>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</p>
                     <p className={`font-black text-xs uppercase ${staff?.isActive !== false ? 'text-teal-500' : 'text-rose-500'}`}>
                       {staff?.isActive !== false ? 'Active' : 'Inactive'}
                     </p>
                  </div>
                  <div className={`rounded-2xl p-4 ${isDark ? 'bg-zinc-800/30' : 'bg-gray-50'}`}>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Salary</p>
                     <p className={`font-black text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>₨{Number(staff?.monthlySalary || 0).toLocaleString()}</p>
                  </div>
               </div>
            </div>

            {/* Score Card */}
            <ScoreCard 
              staffName={staff?.name || 'Staff'} 
              month={growthPoints?.month || new Date().toISOString().slice(0, 7)}
              scores={growthPoints ? {
                attendance: (growthPoints.attendance || 0) + (growthPoints.punctuality || 0),
                uniform: growthPoints.dressCode || 0,
                working: growthPoints.duties || 0,
                growthPoint: (growthPoints.contributions || 0) + (growthPoints.extra || 0)
              } : { attendance: 0, uniform: 0, working: 0, growthPoint: 0 }}
              darkMode={isDark}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Tabs */}
            <div className={`p-2 rounded-[2.5rem] shadow-sm border flex overflow-x-auto no-scrollbar transition-colors ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
            }`}>
               {[
                 { id: 'overview', label: 'History', icon: <Clock size={14}/> },
                 { id: 'attendance', label: 'Attendance', icon: <Calendar size={14}/> },
                 { id: 'dress', label: 'Dress Code', icon: <Shield size={14}/> },
                 { id: 'duties', label: 'Duty Logs', icon: <ClipboardList size={14}/> },
                 { id: 'score', label: 'Score Analysis', icon: <TrendingUp size={14}/> },
                 { id: 'edit', label: 'Edit Profile', icon: <User size={14}/> },
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                     activeTab === tab.id 
                       ? (isDark ? 'bg-white text-black shadow-xl shadow-white/5' : 'bg-gray-900 text-white shadow-lg shadow-gray-900/20') 
                       : 'text-gray-500 hover:text-indigo-500'
                   }`}
                 >
                   {tab.icon} {tab.label}
                 </button>
               ))}
            </div>

            {/* Panels */}
            {activeTab === 'overview' && (
               <div className="space-y-4">
                  {/* Mark Duty Module */}
                  <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-colors ${
                    isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
                  }`}>
                     <h3 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                       <Award className="text-indigo-500" /> Assess Daily Duty
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                           <div>
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Duty Type</label>
                              <select 
                                className={`w-full border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ${
                                  isDark ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-gray-900'
                                }`}
                                value={dutyForm.type}
                                onChange={e => setDutyForm({...dutyForm, type: e.target.value})}
                              >
                                <option value="morning_shift">Morning Shift</option>
                                <option value="evening_shift">Evening Shift</option>
                                <option value="night_shift">Night Shift</option>
                                <option value="special_duty">Special Duty</option>
                              </select>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => setDutyForm({...dutyForm, status: 'completed'})}
                                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                                  dutyForm.status === 'completed' 
                                    ? 'bg-teal-500 border-teal-500 text-white shadow-lg' 
                                    : (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-white border-gray-100 text-gray-400')
                                }`}
                              >Completed</button>
                              <button 
                                onClick={() => setDutyForm({...dutyForm, status: 'not_completed'})}
                                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                                  dutyForm.status === 'not_completed' 
                                    ? 'bg-rose-500 border-rose-500 text-white shadow-lg' 
                                    : (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-white border-gray-100 text-gray-400')
                                }`}
                              >Penalty</button>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <textarea 
                              placeholder="Operational performance notes..."
                              className={`w-full border-none rounded-2xl px-4 py-4 text-sm font-medium outline-none h-full min-h-[120px] md:min-h-[100px] ${
                                isDark ? 'bg-zinc-800 text-white placeholder:text-zinc-600' : 'bg-gray-50 text-gray-900'
                              }`}
                              value={dutyForm.comment}
                              onChange={e => setDutyForm({...dutyForm, comment: e.target.value})}
                           />
                        </div>
                     </div>
                     <button 
                        onClick={handleMarkDuty}
                        disabled={markingDuty}
                        className={`w-full py-4 mt-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all ${
                          isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-gray-900 text-white hover:bg-black'
                        }`}
                     >
                        {markingDuty ? 'Recording...' : 'Finalize Assessment'}
                     </button>
                  </div>

                  {dutyLogs.length === 0 ? <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No history found</div> : (
                    dutyLogs.map(log => (
                      <div key={log.id} className={`p-6 rounded-[2.5rem] shadow-sm border flex items-start gap-4 transition-all hover:scale-[1.01] ${
                        isDark ? 'bg-zinc-900/50 border-zinc-800 hover:border-indigo-500/50' : 'bg-white border-gray-100 hover:border-indigo-200'
                      }`}>
                        <div className={`p-3 rounded-2xl ${log.status === 'completed' ? 'bg-teal-500/10 text-teal-500' : 'bg-rose-500/10 text-rose-500'}`}>
                           <Award size={20} />
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-start">
                              <div>
                                <h4 className={`font-black capitalize text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{log.dutyType?.replace(/_/g, ' ')}</h4>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{formatStaffDate(log.date || log.createdAt)}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                log.status === 'completed' ? 'bg-teal-500/20 text-teal-500' : 'bg-rose-500/20 text-rose-500'
                              }`}>
                                {log.status}
                              </span>
                           </div>
                           <p className={`text-sm mt-3 italic leading-relaxed ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>{log.comment || 'No assessment recorded'}</p>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            )}

            {activeTab === 'attendance' && (
              <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Monthly Attendance Grid</h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input 
                      type="month" 
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black border-none outline-none ${isDark ? 'bg-zinc-800 text-white' : 'bg-gray-100 text-gray-900'}`}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto no-scrollbar -mx-4 sm:-mx-8 px-4 sm:px-8">
                   <div className="inline-block min-w-[800px] w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-inherit pr-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">Day of Month</th>
                          {daysInMonth().map(d => (
                            <th key={d} className="px-1 py-4 text-center min-w-[40px]">
                              <span className="text-[10px] font-black opacity-40">{d.split('-')[2]}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-zinc-800/10">
                          <td className="sticky left-0 z-10 bg-inherit pr-8 py-6 text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest">Status</span>
                          </td>
                          {daysInMonth().map(d => (
                            <td key={d} className="px-1 py-6 text-center">
                              <HqCheckCell 
                                type="attendance"
                                size="md"
                                value={attendanceMap[d]?.status || 'unmarked'} 
                                onToggle={(next) => toggleAttendance(d, next)}
                              />
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-zinc-800/10 transition-colors hover:bg-zinc-500/5">
                          <td className="sticky left-0 z-10 bg-inherit pr-8 py-4 text-left">
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500/50">Shift In</span>
                          </td>
                          {daysInMonth().map(d => (
                            <td 
                              key={d} 
                              className="px-1 py-4 text-center cursor-pointer hover:bg-indigo-500/10 rounded-lg group transition-all"
                              onClick={() => handleAttendanceCell(d)}
                            >
                              <span className={`text-[10px] font-black transition-all ${attendanceMap[d]?.arrivalTime ? (isDark ? 'text-white' : 'text-gray-900') : 'text-zinc-500/30'}`}>
                                {attendanceMap[d]?.arrivalTime || '--'}
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr className="transition-colors hover:bg-zinc-500/5">
                          <td className="sticky left-0 z-10 bg-inherit pr-8 py-4 text-left">
                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500/50">Shift Out</span>
                          </td>
                          {daysInMonth().map(d => (
                            <td 
                              key={d} 
                              className="px-1 py-4 text-center cursor-pointer hover:bg-rose-500/10 rounded-lg group transition-all"
                              onClick={() => handleAttendanceCell(d)}
                            >
                              <span className={`text-[10px] font-black transition-all ${attendanceMap[d]?.departureTime ? (isDark ? 'text-white' : 'text-gray-900') : 'text-zinc-500/30'}`}>
                                {attendanceMap[d]?.departureTime || '--'}
                              </span>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dress' && (
              <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Dress Code Compliance</h3>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Monthly Item Grids</p>
                </div>

                <div className="overflow-x-auto no-scrollbar -mx-4 sm:-mx-8 px-4 sm:px-8">
                  <div className="inline-block min-w-[800px] w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-inherit pr-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">Uniform Items</th>
                          {daysInMonth().map(d => (
                            <th key={d} className="px-1 py-4 text-center min-w-[40px]">
                              <span className="text-[10px] font-black opacity-40">{d.split('-')[2]}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(staff?.dressCodeConfig || [
                          { key: 'pant', label: 'Dress Pant' },
                          { key: 'shirt', label: 'Uniform Shirt' },
                          { key: 'shoes', label: 'Black Shoes' },
                          { key: 'id_card', label: 'ID Card' }
                        ]).map((item) => (
                          <tr key={item.key} className="border-t border-zinc-800/10">
                            <td className="sticky left-0 z-10 bg-inherit pr-8 py-6 text-left">
                              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{item.label}</span>
                            </td>
                            {daysInMonth().map(d => {
                              const dayRecord = dressMap[d];
                              const itemStatus = dayRecord?.items?.find(i => i.key === item.key)?.status || 'na';
                              return (
                                <td key={d} className="px-1 py-6 text-center">
                                  <HqCheckCell 
                                    type="dresscode"
                                    size="md"
                                    value={itemStatus as any} 
                                    onToggle={(next) => toggleDress(d, item.key, next)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'duties' && (
              <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Daily Duty Logs</h3>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Performance Tracking</p>
                </div>

                <div className="overflow-x-auto no-scrollbar -mx-4 sm:-mx-8 px-4 sm:px-8">
                  <div className="inline-block min-w-[800px] w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-inherit pr-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">Assigned Duties</th>
                          {daysInMonth().map(d => (
                            <th key={d} className="px-1 py-4 text-center min-w-[40px]">
                              <span className="text-[10px] font-black opacity-40">{d.split('-')[2]}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(staff?.dutyConfig || [
                          { key: 'attendance_portal', label: 'Attendance Entry' },
                          { key: 'patient_vitals', label: 'Patient Vitals' },
                          { key: 'ward_round', label: 'Ward Round' },
                          { key: 'cleanliness', label: 'Area Cleanliness' }
                        ]).map((duty) => (
                          <tr key={duty.key} className="border-t border-zinc-800/10">
                            <td className="sticky left-0 z-10 bg-inherit pr-8 py-6 text-left">
                              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{duty.label}</span>
                            </td>
                            {daysInMonth().map(d => {
                              const dayRecord = dutyMap[d];
                              const dutyStatus = dayRecord?.duties?.find(i => i.key === duty.key)?.status || 'na';
                              return (
                                <td key={d} className="px-1 py-6 text-center">
                                  <HqCheckCell 
                                    type="duty"
                                    size="md"
                                    value={dutyStatus as any} 
                                    onToggle={(next) => toggleDuty(d, duty.key, next)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'edit' && (
              <div className={`rounded-[2.5rem] p-10 shadow-sm border transition-all ${
                isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic">Profile Optimization</h3>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Surgical updates to staff credentials</p>
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14}/>}
                    {saving ? 'Synchronizing...' : 'Save Changes'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Full Legal Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${
                          isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Official Designation</label>
                      <input
                        type="text"
                        value={editForm.designation}
                        onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${
                          isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Monthly Gross Salary (₨)</label>
                      <input
                        type="number"
                        value={editForm.monthlySalary}
                        onChange={e => setEditForm({ ...editForm, monthlySalary: Number(e.target.value) })}
                        className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${
                          isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Duty Start</label>
                        <input
                          type="time"
                          value={editForm.dutyStartTime}
                          onChange={e => setEditForm({ ...editForm, dutyStartTime: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${
                            isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-indigo-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Duty End</label>
                        <input
                          type="time"
                          value={editForm.dutyEndTime}
                          onChange={e => setEditForm({ ...editForm, dutyEndTime: e.target.value })}
                          className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${
                            isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-indigo-500'
                          }`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Operations Status</label>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setEditForm({ ...editForm, isActive: true })}
                          className={`flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                            editForm.isActive 
                              ? 'bg-teal-500 border-teal-500 text-white shadow-lg' 
                              : (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-white border-gray-100 text-gray-400')
                          }`}
                        >Active</button>
                        <button
                          onClick={() => setEditForm({ ...editForm, isActive: false })}
                          className={`flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                            !editForm.isActive 
                              ? 'bg-rose-500 border-rose-500 text-white shadow-lg' 
                              : (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-white border-gray-100 text-gray-400')
                          }`}
                        >Inactive</button>
                      </div>
                    </div>
                    <div className={`p-6 rounded-[2rem] border transition-colors ${isDark ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                       <div className="flex items-center gap-3 mb-2 text-indigo-500">
                         <Shield size={16} />
                         <p className="text-[10px] font-black uppercase tracking-widest">Security Credentials</p>
                       </div>
                       <p className={`text-[10px] font-bold leading-relaxed ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                         User Login: <span className={isDark ? 'text-white' : 'text-gray-900'}>{editForm.userId}</span><br />
                         Internal ID: <span className={isDark ? 'text-white' : 'text-gray-900'}>{editForm.employeeId}</span>
                         <br /><br />
                         Unique identifiers are permanently locked to ensure data integrity across historical logs.
                       </p>
                    </div>
                  </div>
                </div>

                {/* Configuration Grids */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Dress Code Config */}
                  <div className={`p-8 rounded-[2.5rem] border transition-all ${isDark ? 'bg-zinc-800/20 border-zinc-700/50' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Dress Code Items</h4>
                      <button 
                        onClick={() => {
                          const label = prompt("Enter new dress item label (e.g. White Coat):");
                          if (label) {
                            const key = label.toLowerCase().replace(/\s+/g, '_');
                            setEditForm(prev => ({
                              ...prev,
                              dressCodeConfig: [...prev.dressCodeConfig, { key, label }]
                            }));
                          }
                        }}
                        className="p-2.5 rounded-xl bg-indigo-500 text-white hover:scale-105 transition-all shadow-lg shadow-indigo-500/20"
                      >
                         <Plus size={14} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {editForm.dressCodeConfig.map((item, idx) => (
                        <div key={item.key} className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
                          <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                          <button 
                            onClick={() => {
                              setEditForm(prev => ({
                                ...prev,
                                dressCodeConfig: prev.dressCodeConfig.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Duty Config */}
                  <div className={`p-8 rounded-[2.5rem] border transition-all ${isDark ? 'bg-zinc-800/20 border-zinc-700/50' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500">Scheduled Duties</h4>
                      <button 
                        onClick={() => {
                          const label = prompt("Enter new duty label (e.g. Morning Rounds):");
                          if (label) {
                            const key = label.toLowerCase().replace(/\s+/g, '_');
                            setEditForm(prev => ({
                              ...prev,
                              dutyConfig: [...prev.dutyConfig, { key, label }]
                            }));
                          }
                        }}
                        className="p-2.5 rounded-xl bg-teal-500 text-white hover:scale-105 transition-all shadow-lg shadow-teal-500/20"
                      >
                         <Plus size={14} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {editForm.dutyConfig.map((item, idx) => (
                        <div key={item.key} className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
                          <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                          <button 
                            onClick={() => {
                              setEditForm(prev => ({
                                ...prev,
                                dutyConfig: prev.dutyConfig.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Score History (Always show in Score tab) */}
            {activeTab === 'score' && (
              <div className="space-y-6">
                <div className={`p-6 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Growth Point History</h3>
                    <button onClick={handleRecalculate} className="p-2 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"><RefreshCw size={14}/></button>
                  </div>
                  <div className="space-y-4">
                    {growthHistory.map((h: any) => (
                      <div key={h.id} className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-gray-50 border-gray-100'}`}>
                        <div>
                          <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{new Date(h.month + '-01').toLocaleDateString('en-PK', { month:'long', year:'numeric' })}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Points: {h.total || 0}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          (h.total || 0) >= 100 ? 'bg-teal-500/10 text-teal-500' : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {(h.total || 0) >= 100 ? 'Expert' : 'Developing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Time Entry Popup */}
      {timePopup.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setTimePopup({...timePopup, isOpen: false})} />
          <div className={`relative w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 text-gray-900'
          }`}>
             <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black italic tracking-tight">Shift Timing</h3>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
                    Entry for {new Date(timePopup.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button 
                  onClick={() => setTimePopup({...timePopup, isOpen: false})}
                  className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-gray-100 text-gray-400'}`}
                >
                  <RefreshCw size={18} className="rotate-45" />
                </button>
             </div>

             <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Arrival Time</label>
                  <input
                    type="time"
                    value={timePopup.arrivalTime}
                    onChange={e => setTimePopup({ ...timePopup, arrivalTime: e.target.value })}
                    className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-indigo-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 mb-2 block">Departure Time</label>
                  <input
                    type="time"
                    value={timePopup.departureTime}
                    onChange={e => setTimePopup({ ...timePopup, departureTime: e.target.value })}
                    className={`w-full h-14 px-6 rounded-2xl text-sm font-black outline-none border-2 transition-all ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-indigo-500'
                    }`}
                  />
                </div>
                
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${isDark ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                  <AlertCircle size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  <p className="text-[9px] font-bold leading-relaxed text-indigo-500/70 uppercase tracking-wider">
                    Setting these times will mark the staff as present for this specific date only.
                  </p>
                </div>

                <button
                  onClick={handleTimePopupSave}
                  disabled={saving}
                  className="w-full h-14 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16}/>}
                  {saving ? 'Synchronizing...' : 'Update Record'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}