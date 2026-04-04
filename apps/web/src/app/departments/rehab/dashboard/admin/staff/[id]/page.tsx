// src/app/departments/rehab/dashboard/admin/staff/[id]/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import { 
  doc, getDoc, collection, query, where, getDocs, orderBy, limit,
  updateDoc, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { StaffMember, AttendanceRecord, DailyDutyLog, DailyDressLog, StaffContribution, MonthlyGrowthPoints } from '@/types/rehab';
import { 
  ChevronLeft, User, Calendar, ListChecks, Shirt, Heart, 
  TrendingUp, Clock, Phone, Mail, Award, AlertCircle, 
  CheckCircle2, XCircle, Info, Loader2, Save, Download
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { getGrowthPoints, calculateGrowthPoints } from '@/lib/rehab/growthPoints';
import { toast } from 'react-hot-toast';

// Helper for robust timestamp handling
const toDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (typeof ts === 'string') return new Date(ts);
  return null;
};

type TabType = 'overview' | 'attendance' | 'duties' | 'dress' | 'contributions';

export default function StaffProfilePage() {
  const { id: staffId } = useParams() as { id: string };
  const router = useRouter();
  const { session: admin, loading: sessionLoading } = useRehabSession();
  
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dutyLogs, setDutyLogs] = useState<DailyDutyLog[]>([]);
  const [dressLogs, setDressLogs] = useState<DailyDressLog[]>([]);
  const [contributions, setContributions] = useState<StaffContribution[]>([]);
  const [growthHistory, setGrowthHistory] = useState<MonthlyGrowthPoints[]>([]);
  const [currentGrowth, setCurrentGrowth] = useState<MonthlyGrowthPoints | null>(null);

  const fetchData = async () => {
    if (!staffId) return;
    setLoading(true);
    try {
      // 1. Staff Basic Info
      const staffRef = doc(db, 'rehab_staff', staffId);
      const staffSnap = await getDoc(staffRef);
      if (!staffSnap.exists()) {
        toast.error('Staff member not found');
        router.push('/departments/rehab/dashboard/admin/staff');
        return;
      }
      const staffData = { id: staffSnap.id, ...staffSnap.data() } as StaffMember;
      setStaff(staffData);

      const targetMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      // 2. Fetch all related data in parallel
      const [attSnap, dutySnap, dressSnap, contSnap, growthSnap] = await Promise.all([
        getDocs(query(collection(db, 'rehab_attendance'), where('staffId', '==', staffId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, 'rehab_duty_logs'), where('staffId', '==', staffId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, 'rehab_dress_logs'), where('staffId', '==', staffId), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, 'rehab_contributions'), where('staffId', '==', staffId), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'rehab_growth_points'), where('staffId', '==', staffId), orderBy('month', 'desc'), limit(6)))
      ]);

      setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
      
      setDutyLogs(dutySnap.docs.map(doc => {
        const data = doc.data();
        const duties = data.duties || [];
        return {
          id: doc.id,
          ...data,
          totalItems: duties.length,
          completedItems: duties.filter((d: any) => d.status === 'done').length,
          items: duties.map((d: any) => ({
            description: d.dutyName || d.description,
            completed: d.status === 'done' || d.completed
          }))
        } as DailyDutyLog;
      }));

      setDressLogs(dressSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: toDate(data.createdAt),
          remarks: data.remarks || ''
        } as DailyDressLog;
      }));

      setContributions(contSnap.docs.map(d => ({ id: d.id, ...d.data() } as StaffContribution)));
      
      const history = growthSnap.docs.map(d => ({ id: d.id, ...d.data() } as MonthlyGrowthPoints)).reverse();
      setGrowthHistory(history);
      setCurrentGrowth(history.find(h => h.month === targetMonth) || null);

    } catch (err) {
      console.error('Error fetching staff data:', err);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionLoading) return;
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      router.push('/departments/rehab/login');
      return;
    }
    fetchData();
  }, [staffId, sessionLoading]);

  const handleApproveContribution = async (contId: string, approved: boolean) => {
    try {
      const ref = doc(db, 'rehab_contributions', contId);
      await updateDoc(ref, {
        isApproved: approved,
        approvedAt: serverTimestamp(),
        approvedBy: admin?.uid
      });
      toast.success(approved ? 'Contribution approved' : 'Contribution rejected');
      fetchData(); // Refresh to recalculate points
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const growthData = useMemo(() => {
    if (!currentGrowth) return [];
    return [
      { name: 'Attendance', score: currentGrowth.attendance, fullRange: 20, color: '#06b6d4' },
      { name: 'Duties', score: currentGrowth.duties, fullRange: 20, color: '#8b5cf6' },
      { name: 'Dress Code', score: currentGrowth.dressCode, fullRange: 20, color: '#f59e0b' },
      { name: 'Contrib.', score: currentGrowth.contributions, fullRange: 20, color: '#ec4899' },
      { name: 'Extra', score: currentGrowth.extra, fullRange: 20, color: '#10b981' }
    ];
  }, [currentGrowth]);

  if (loading || sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Profile...</p>
      </div>
    );
  }

  if (!staff) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 p-4">
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-bold text-xs uppercase tracking-widest group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Staff List
      </button>

      {/* Header Profile Card */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/50 rounded-full -mr-32 -mt-32 blur-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Avatar Area */}
          <div className="relative">
            <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-gray-50 to-gray-200 border-4 border-white shadow-xl overflow-hidden group">
              {staff.photoUrl ? (
                <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={48} className="text-gray-300" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-teal-500 text-white p-2 rounded-xl shadow-lg ring-4 ring-white">
              <Award size={20} />
            </div>
          </div>

          {/* Info Area */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase leading-tight">{staff.name}</h1>
              <span className="bg-teal-50 text-teal-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-teal-100">
                {staff.role}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-400">
              <span className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <Info size={14} className="text-gray-300" /> {staff.customId || staff.employeeId}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <Calendar size={14} className="text-gray-300" /> Joined {toDate(staff.joiningDate)?.toLocaleDateString() || 'N/A'}
              </span>
              {staff.phone && (
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <Phone size={14} className="text-gray-300" /> {staff.phone}
                </span>
              )}
            </div>
          </div>

          {/* Monthly Score Highlight */}
          <div className="bg-gray-900 rounded-[2rem] p-6 text-center min-w-[160px] shadow-2xl shadow-gray-200 border-b-4 border-teal-500 transform hover:scale-105 transition-transform">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Growth Points</p>
            <p className="text-4xl font-black text-white">{currentGrowth?.total || 0}</p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <TrendingUp size={12} className="text-teal-400" />
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">TOP 10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit mx-auto md:mx-0 overflow-x-auto no-scrollbar max-w-full">
        {(['overview', 'attendance', 'duties', 'dress', 'contributions'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-white text-gray-900 shadow-md transform scale-[1.02]' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Attendance', val: currentGrowth?.attendance || 0, icon: Calendar, color: 'text-cyan-500', bg: 'bg-cyan-50' },
                  { label: 'Duties', val: currentGrowth?.duties || 0, icon: ListChecks, color: 'text-violet-500', bg: 'bg-violet-50' },
                  { label: 'Dress Code', val: currentGrowth?.dressCode || 0, icon: Shirt, color: 'text-amber-500', bg: 'bg-amber-50' },
                  { label: 'Contributions', val: currentGrowth?.contributions || 0, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-3xl p-5 border border-white/50 shadow-sm group hover:scale-[1.02] transition-transform`}>
                    <s.icon size={18} className={`${s.color} mb-3`} />
                    <p className="text-2xl font-black text-gray-900">{s.val}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Score Chart */}
              <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase">Growth Distribution</h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Point Breakdown for {currentGrowth?.month}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Month</span>
                  </div>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={growthData} margin={{ top: 0, right: 30, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                        dy={10}
                      />
                      <YAxis hide domain={[0, 20]} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-gray-900 text-white p-3 rounded-xl shadow-2xl border border-gray-800">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{payload[0].payload.name}</p>
                                <p className="text-xl font-black">{payload[0].value} <span className="text-xs text-gray-500">/ 20</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="score" radius={[8, 8, 8, 8]} barSize={40}>
                        {growthData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Duties Roster Summary */}
              <div className="bg-teal-900 rounded-[2rem] p-8 text-white shadow-xl shadow-teal-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-teal-800 rounded-xl flex items-center justify-center border border-teal-700">
                    <ListChecks size={20} className="text-teal-400" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Standard Roster</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-teal-950/30 p-4 rounded-2xl border border-teal-800/50">
                    <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Assigned Timing</p>
                    <p className="font-bold flex items-center gap-2">
                      <Clock size={14} className="text-teal-500" />
                      {staff.dutyStartTime} — {staff.dutyEndTime}
                    </p>
                  </div>
                  <div className="bg-teal-950/30 p-4 rounded-2xl border border-teal-800/50">
                    <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Total Duties</p>
                    <p className="font-bold flex items-center gap-2">
                      <ListChecks size={14} className="text-teal-500" />
                      {staff.duties?.length || 0} Main Tasks
                    </p>
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                   {staff.duties?.map((d, i) => (
                     <div key={d.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="w-5 h-5 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center text-[10px] font-black">{i+1}</span>
                        <span className="text-sm text-teal-50 font-medium">{d.description}</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            {/* Side Settings / Detailed Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2">
                  <TrendingUp size={16} className="text-teal-500" /> Performance History
                </h3>
                <div className="space-y-4">
                  {growthHistory.slice(-5).reverse().map((h, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-teal-500 group-hover:text-white transition-colors uppercase text-center">
                          {h.month.split('-')[1]}
                        </div>
                        <p className="text-xs font-bold text-gray-700">{h.month}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900">{h.total} pts</p>
                        <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden mt-1 text-center">
                          <div className="h-full bg-teal-500 transition-all" style={{ width: `${(h.total / 100) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {growthHistory.length === 0 && <p className="text-[10px] font-black text-gray-300 uppercase py-4">No history yet</p>}
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-black rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Heart size={80} />
                </div>
                <h3 className="text-sm font-black uppercase mb-6 flex items-center gap-2">
                  <Heart size={16} className="text-rose-500 fill-rose-500" /> Financial Info
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monthly Salary</p>
                    <p className="text-2xl font-black text-white">Rs. {staff.salary?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Per Growth Point</p>
                    <p className="text-xl font-black text-teal-400">Rs. {((staff.salary || 0) / 100).toFixed(0)} <span className="text-[10px] text-gray-500 font-bold">(Approx)</span></p>
                  </div>
                </div>
                <button className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">
                  Generate Payroll
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timing</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5 font-bold text-gray-900 text-sm whitespace-nowrap">{record.date}</td>
                        <td className="px-8 py-5">
                          <span className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            record.status === 'present' ? 'bg-green-50 text-green-600 border-green-100' :
                            record.status === 'absent'  ? 'bg-red-50 text-red-500 border-red-100'    : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm text-gray-500 font-mono">
                          {toDate(record.checkInTime)?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || '—'} 
                          {' → '}
                          {toDate(record.checkOutTime)?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || '—'}
                        </td>
                        <td className="px-8 py-5">
                           {record.overriddenBy ? (
                             <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Override: {record.overriddenBy.substring(0, 5)}</span>
                           ) : (
                             <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">—</span>
                           )}
                        </td>
                      </tr>
                    ))}
                    {attendance.length === 0 && (
                      <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-black uppercase text-xs">No records found</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* Duty Logs Tab */}
        {activeTab === 'duties' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dutyLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Log</p>
                    <p className="font-bold text-gray-900">{log.date}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    !log.totalItems || log.completedItems === log.totalItems ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                  }`}>
                    {log.completedItems || 0} / {log.totalItems || 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {(log.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      {item.completed ? <CheckCircle2 size={16} className="text-teal-500 mt-0.5 flex-shrink-0" /> : <XCircle size={16} className="text-red-300 mt-0.5 flex-shrink-0" />}
                      <p className={`text-xs ${item.completed ? 'text-gray-700 font-medium' : 'text-gray-400 line-through'}`}>{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {dutyLogs.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400 font-black uppercase text-xs bg-white rounded-[2rem] border border-gray-100">No duty logs recorded</div>
            )}
          </div>
        )}

        {/* Dress Code Tab */}
        {activeTab === 'dress' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-left font-sans">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Compliance</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Issues / Missed Items</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dressLogs.map((log) => {
                      const missed = (log.items || []).filter(i => !i.wearing).map(i => i.itemName);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-8 py-5 font-bold text-gray-900 text-sm whitespace-nowrap">{log.date}</td>
                          <td className="px-8 py-5">
                            <span className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              log.isPerfect ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {log.isPerfect ? 'Perfect Compliance' : 'Check Required'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            {missed.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {missed.map((m, i) => (
                                  <span key={i} className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap">{m}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">None</span>
                            )}
                          </td>
                          <td className="px-8 py-5 text-xs text-gray-400 max-w-xs truncate">{log.remarks || '—'}</td>
                        </tr>
                      );
                    })}
                    {dressLogs.length === 0 && (
                      <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-black uppercase text-xs">No dress checks yet</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* Contributions Tab */}
        {activeTab === 'contributions' && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {contributions.map((c) => (
                 <div key={c.id} className={`bg-white rounded-[2rem] p-6 border shadow-sm relative overflow-hidden transition-all hover:shadow-lg ${
                   c.isApproved === true ? 'border-green-100 bg-green-50/30' : 
                   c.isApproved === false ? 'border-red-100 bg-red-50/30' : 'border-gray-100'
                 }`}>
                   <div className="flex items-center justify-between mb-4">
                     <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                       c.type === 'service' ? 'bg-teal-100 text-teal-600' : 'bg-sky-100 text-sky-600'
                     }`}>
                       {c.type}
                     </span>
                     <span className="text-sm font-black text-gray-900">+{c.points} pts</span>
                   </div>
                   
                   <p className="text-sm text-gray-700 font-medium mb-1 line-clamp-3">{c.description}</p>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                     {toDate(c.createdAt)?.toLocaleDateString() || 'N/A'}
                   </p>

                   {c.isApproved === null && (
                     <div className="mt-6 flex gap-2">
                       <button 
                        onClick={() => handleApproveContribution(c.id!, true)}
                        className="flex-1 py-3 bg-teal-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 transition-all shadow-lg shadow-teal-100 font-sans"
                       >
                         Approve
                       </button>
                       <button 
                        onClick={() => handleApproveContribution(c.id!, false)}
                        className="flex-1 py-3 bg-white text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-200 hover:bg-red-50 transition-all font-sans"
                       >
                         Reject
                       </button>
                     </div>
                   )}

                   {c.isApproved !== null && (
                     <div className="mt-6 flex items-center gap-2 pt-4 border-t border-gray-100/50">
                       {c.isApproved ? (
                         <CheckCircle2 size={16} className="text-teal-500" />
                       ) : (
                         <XCircle size={16} className="text-red-500" />
                       )}
                       <span className={`text-[10px] font-black uppercase tracking-widest ${c.isApproved ? 'text-teal-600' : 'text-red-600'}`}>
                         {c.isApproved ? 'Approved by Admin' : 'Rejected by Admin'}
                       </span>
                     </div>
                   )}
                 </div>
               ))}
               {contributions.length === 0 && (
                 <div className="col-span-full py-20 text-center text-gray-400 font-black uppercase text-xs bg-white rounded-[2rem] border border-gray-100">No contributions found</div>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
