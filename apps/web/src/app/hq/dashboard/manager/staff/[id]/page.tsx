// src/app/hq/dashboard/manager/staff/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
  doc, getDoc, collection, getDocs, query, where, 
  updateDoc, addDoc, serverTimestamp, setDoc, limit 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import { 
  Target, Camera, Save, Plus, Trash2, ChevronRight,
  User as UserIcon, Briefcase, Hash, Info, CreditCard,
  ArrowLeft, Award, Clock, Calendar, Shield, DollarSign,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { recalculateGrowthPoints } from '@/lib/rehab/growthPoints';
import { Timestamp } from 'firebase/firestore';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'duties' | 'dress' | 'salary'>('overview');
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('hq_dark_mode') === 'true';
    setIsDark(saved);
  }, []);
  
  // Data States
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [dutyLogs, setDutyLogs] = useState<any[]>([]);
  const [dressLogs, setDressLogs] = useState<any[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);

  // Duty Marking State
  const [markingDuty, setMarkingDuty] = useState(false);
  const [dutyForm, setDutyForm] = useState({ type: 'morning_shift', status: 'completed', comment: '' });

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
      
      const sData = { id: staffDoc.id, ...staffDoc.data() };
      setStaff(sData);

      // Fetch Metrics
      const prefix = colPrefix === 'hq' ? 'hq' : 'rehab';
      const [attSnap, dutySnap, dressSnap, pointsSnap] = await Promise.all([
        getDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', staffId))),
        getDocs(query(collection(db, `${prefix}_duty_logs`), where('staffId', '==', staffId))),
        getDocs(query(collection(db, `${prefix}_dress_logs`), where('staffId', '==', staffId))),
        getDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', staffId), limit(1)))
      ]);

      const sortByDate = (docs: any[]) => [...docs].sort((a, b) => {
        const getMs = (val: any) => {
          if (val instanceof Timestamp) return val.toMillis();
          if (val?.seconds) return val.seconds * 1000;
          if (val) return new Date(val).getTime();
          return 0;
        };
        return getMs(b.date || b.createdAt) - getMs(a.date || a.createdAt);
      });

      setAttendance(sortByDate(attSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
      setDutyLogs(sortByDate(dutySnap.docs.map(d => ({ id: d.id, ...d.data() }))));
      setDressLogs(sortByDate(dressSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
      if (!pointsSnap.empty) setGrowthPoints(pointsSnap.docs[0].data());

    } catch (err) {
      console.error(err);
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  }, [staffId, colPrefix, router]);

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

  const handleRecalculate = async () => {
    try {
      toast.loading("Recalculating points...", { id: 'recalc' });
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      await recalculateGrowthPoints(staffId, month);
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
    formData.append('upload_preset', 'khanhub_profiles'); // Ensure this exists in Cloudinary

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

  if (loading || sessionLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 pb-20 ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8FAFC] text-gray-900'}`}>
      <style>{`
        .checkbox-wrapper-39 *,
        .checkbox-wrapper-39 *::before,
        .checkbox-wrapper-39 *::after {
          box-sizing: border-box;
        }

        .checkbox-wrapper-39 label {
          display: block;
          width: 24px;
          height: 24px;
          cursor: pointer;
        }

        .checkbox-wrapper-39 input {
          visibility: hidden;
          display: none;
        }

        .checkbox-wrapper-39 input:checked ~ .checkbox {
         transform: rotate(45deg);
         width: 10px;
         height: 18px;
         margin-left: 8px;
         border-color: #24c78e;
         border-top-color: transparent;
         border-left-color: transparent;
         border-radius: 0;
        }

        .checkbox-wrapper-39 .checkbox {
          display: block;
          width: inherit;
          height: inherit;
          border: 2px solid #434343;
          border-radius: 4px;
          transition: all 0.375s;
        }
      `}</style>
      {/* Premium Header */}
      <div className={`border-b sticky top-0 z-20 shadow-sm transition-colors ${isDark ? 'bg-zinc-900/90 backdrop-blur-xl border-zinc-800' : 'bg-white border-gray-100'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/hq/dashboard/manager/staff" className={`flex items-center gap-2 group transition-colors ${isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            <div className={`p-2 rounded-xl ${isDark ? 'group-hover:bg-zinc-800' : 'group-hover:bg-gray-100'}`}><ArrowLeft size={18} /></div>
            <span className="text-xs font-black uppercase tracking-widest leading-none">Back</span>
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
               <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{growthPoints?.totalPoints || 0}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar / Identity */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`rounded-[2.5rem] p-8 shadow-sm border flex flex-col items-center text-center relative overflow-hidden transition-colors ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
            }`}>
               <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-zinc-900 to-black" />
               
               <div className="relative mt-8 mb-6 group">
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

            {/* Quick Actions / Duty Marking */}
            <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-colors ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
            }`}>
               <h3 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                 <Award className="text-teal-500" /> Mark Today's Duty
               </h3>
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
                  <textarea 
                    placeholder="Duty comments (e.g. well handled patient x)"
                    className={`w-full border-none rounded-2xl px-4 py-4 text-sm font-medium outline-none min-h-[80px] ${
                      isDark ? 'bg-zinc-800 text-white placeholder:text-zinc-600' : 'bg-gray-50 text-gray-900'
                    }`}
                    value={dutyForm.comment}
                    onChange={e => setDutyForm({...dutyForm, comment: e.target.value})}
                  />
                  <button 
                    onClick={handleMarkDuty}
                    disabled={markingDuty}
                    className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all ${
                      isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    {markingDuty ? 'Processing...' : 'Record Duty Status'}
                  </button>
               </div>
            </div>
          </div>

          {/* Main Content Areas */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Tabs */}
            <div className={`p-2 rounded-[2.5rem] shadow-sm border flex overflow-x-auto no-scrollbar transition-colors ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
            }`}>
               {[
                 { id: 'overview', label: 'History', icon: <Clock size={14}/> },
                 { id: 'attendance', label: 'Attendance', icon: <Calendar size={14}/> },
                 { id: 'dress', label: 'Dress Logs', icon: <Shield size={14}/> },
                 { id: 'salary', label: 'Salary/Files', icon: <DollarSign size={14}/> },
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                     activeTab === tab.id 
                       ? (isDark ? 'bg-white text-black' : 'bg-gray-900 text-white shadow-lg') 
                       : 'text-gray-500 hover:text-teal-500'
                   }`}
                 >
                   {tab.icon} {tab.label}
                 </button>
               ))}
            </div>

            {/* Tab Panels */}
            {activeTab === 'overview' && (
               <div className="space-y-4">
                  {dutyLogs.length === 0 ? <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No history found</div> : (
                    dutyLogs.map(log => (
                      <div key={log.id} className={`p-6 rounded-[2.5rem] shadow-sm border flex items-start gap-4 transition-all hover:scale-[1.01] ${
                        isDark ? 'bg-zinc-900/50 border-zinc-800 hover:border-teal-500/50' : 'bg-white border-gray-100 hover:border-teal-200'
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
              <div className={`rounded-[2.5rem] p-8 shadow-sm border transition-colors ${
                isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
              }`}>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attendance.map((att: AttendanceLog) => (
                      <div key={att.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <p className={`font-black text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatStaffDate(att.date)}</p>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              att.status === 'present' ? 'bg-teal-500/20 text-teal-500' : 'bg-rose-500/20 text-rose-500'
                            }`}>{att.status}</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                            <span>{att.arrivalTime || '--:--'}</span>
                            <span>{att.departureTime || '--:--'}</span>
                          </div>
                        </div>
                        
                        <div className="checkbox-wrapper-39 ml-4">
                          <label>
                            <input 
                              type="checkbox" 
                              checked={att.status === 'present'} 
                              readOnly
                            />
                            <span className="checkbox"></span>
                          </label>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {/* Other tabs placeholder... */}
            {activeTab === 'dress' && (
              <div className={`rounded-[2.5rem] p-8 shadow-sm border flex items-center justify-center min-h-[300px] ${
                isDark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-600' : 'bg-white border-gray-100 text-gray-400'
              }`}>
                <p className="font-bold uppercase tracking-widest text-[10px]">Dress code module coming soon</p>
              </div>
            )}
            
            {activeTab === 'salary' && (
              <div className={`rounded-[2.5rem] p-8 shadow-sm border flex items-center justify-center min-h-[300px] ${
                isDark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-600' : 'bg-white border-gray-100 text-gray-400'
              }`}>
                <p className="font-bold uppercase tracking-widest text-[10px]">Salary records & files coming soon</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}