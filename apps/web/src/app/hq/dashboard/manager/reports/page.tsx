'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import { Loader2, Printer, Award, Clock, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getDeptPrefix, getDeptCollection, StaffDept } from '@/lib/hq/superadmin/staff';
import type { HqStaff } from '@/types/hq';

export default function ManagerReportsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staff, setStaff] = useState<HqStaff[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [dressLogs, setDressLogs] = useState<any[]>([]);
  const [dutyLogs, setDutyLogs] = useState<any[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewingStaff, setViewingStaff] = useState<any | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || !['manager', 'superadmin'].includes(session.role)) {
      router.push('/hq/login');
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session) return;
    
    const depts = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'] as StaffDept[];
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [staffSnaps, attSnaps, dressSnaps, dutySnaps, gpSnaps] = await Promise.all([
          Promise.all(depts.map(d => getDocs(query(collection(db, getDeptCollection(d)), where('isActive', '==', true))))),
          Promise.all(depts.map(d => getDocs(collection(db, `${getDeptPrefix(d)}_attendance`)))),
          Promise.all(depts.map(d => getDocs(collection(db, `${getDeptPrefix(d)}_dress_logs`)))),
          Promise.all(depts.map(d => getDocs(collection(db, `${getDeptPrefix(d)}_duty_logs`)))),
          Promise.all(depts.map(d => getDocs(collection(db, `${getDeptPrefix(d)}_growth_points`)))),
        ]);

        const allStaff: HqStaff[] = [];
        const STAFF_ROLES = ['admin', 'staff', 'cashier', 'manager', 'superadmin', 'doctor', 'nurse', 'counselor'];

        staffSnaps.forEach((snap, i) => {
          snap.docs.forEach(d => {
            const data = d.data() as any;
            const role = String(data.role || '').toLowerCase();
            
            // Only include staff with names and valid staff roles
            if (data.name && STAFF_ROLES.includes(role)) {
              allStaff.push({ id: d.id, department: depts[i], ...data } as unknown as HqStaff);
            }
          });
        });

        const allAtt = attSnaps.flatMap(snap => snap.docs.map(d => d.data()));
        const allDress = dressSnaps.flatMap(snap => snap.docs.map(d => d.data()));
        const allDuty = dutySnaps.flatMap(snap => snap.docs.map(d => d.data()));
        const allGP = gpSnaps.flatMap(snap => snap.docs.map(d => d.data()));

        setStaff(allStaff);
        setAttendance(allAtt);
        setDressLogs(allDress);
        setDutyLogs(allDuty);
        setGrowthPoints(allGP);
      } catch (err) {
        console.error("Error fetching report data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const getStaffStats = (staffId: string) => {
    const isSameMonth = (dateVal: any) => {
      if (!dateVal) return false;
      try {
        const dateStr = typeof dateVal === 'string' 
          ? dateVal 
          : (dateVal && typeof dateVal.toDate === 'function')
            ? dateVal.toDate().toISOString()
            : (dateVal instanceof Date)
              ? dateVal.toISOString()
              : String(dateVal);
        
        return String(dateStr || "").startsWith(String(selectedMonth || ""));
      } catch (e) {
        console.error("isSameMonth error:", e);
        return false;
      }
    };

    const monthAtt = attendance.filter(a => a.staffId === staffId && isSameMonth(a.date));
    const present = monthAtt.filter(a => a.status === 'present').length;
    const total = monthAtt.length || 1;
    const attPct = Math.round((present / total) * 100);

    const monthDress = dressLogs.filter(d => d.staffId === staffId && isSameMonth(d.date));
    const dressCompliant = monthDress.filter(d => d.items?.every((i: any) => i.status === 'yes' || i.status === 'na')).length;
    const dressPct = monthDress.length > 0 ? Math.round((dressCompliant / monthDress.length) * 100) : 0;

    const monthDuty = dutyLogs.filter(d => d.staffId === staffId && isSameMonth(d.date));
    const dutyDone = monthDuty.filter(d => d.duties?.every((i: any) => i.status === 'done' || i.status === 'na')).length;
    const dutyPct = monthDuty.length > 0 ? Math.round((dutyDone / monthDuty.length) * 100) : 0;

    const gp = growthPoints
      .filter(g => g.staffId === staffId && (
        (typeof g.month === 'string' && g.month.startsWith(selectedMonth)) || 
        (g.date ? isSameMonth(g.date) : false) ||
        (g.month && typeof g.month.toDate === 'function' && g.month.toDate().toISOString().startsWith(String(selectedMonth || "")))
      ))
      .reduce((s, g) => s + (g.points || 0), 0);

    return { attPct, dressPct, dutyPct, gp, present, total };
  };

  const staffWithStats = staff.map(m => ({ ...m, stats: getStaffStats(m.id) }))
    .sort((a, b) => (b.stats.gp + b.stats.attPct) - (a.stats.gp + a.stats.attPct));

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8 pb-24" id="reports-print">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Staff Reports</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Monthly performance overview</p>
              <div className="w-1 h-1 rounded-full bg-gray-700" />
              <Link href="/hq/dashboard/manager/reports/daily" className="text-blue-500 text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                View Daily Audit <ArrowRight size={12} />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 [color-scheme:dark]" 
            />
            <button 
              onClick={() => window.print()} 
              className="bg-white/5 hover:bg-white/10 border border-white/8 text-gray-400 hover:text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl transition-all active:scale-95 flex items-center gap-2"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/8 rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Award className="text-amber-500" size={16} />
            <h3 className="text-white font-black text-xs uppercase tracking-widest">Performance Leaderboard</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  {['#', 'Staff', 'Dept', 'Attendance', 'Dress Code', 'Duty', 'Growth Pts'].map(h => (
                    <th key={h} className="px-4 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staffWithStats.map((member, index) => (
                  <tr key={member.id} className="animate-in fade-in duration-300 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-amber-500 text-black' : index === 1 ? 'bg-gray-400 text-black' : index === 2 ? 'bg-amber-800 text-white' : 'bg-white/5 text-gray-500'}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4 cursor-pointer group" onClick={() => setViewingStaff(member)}>
                      <p className="text-white font-bold text-sm group-hover:text-amber-500 transition-colors">{member.name}</p>
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{member.designation}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded-lg bg-white/5 text-gray-400 text-[9px] font-black uppercase tracking-widest">
                        {member.department}
                      </span>
                    </td>
                    {[
                      { value: member.stats.attPct, threshold: 80 },
                      { value: member.stats.dressPct, threshold: 80 },
                      { value: member.stats.dutyPct, threshold: 80 },
                    ].map((stat, i) => (
                      <td key={i} className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${stat.value >= stat.threshold ? 'bg-emerald-500' : stat.value >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${stat.value}%` }} />
                          </div>
                          <span className={`text-xs font-black ${stat.value >= stat.threshold ? 'text-emerald-400' : stat.value >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{stat.value}%</span>
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-4">
                      <span className="text-amber-400 font-black text-sm">{member.stats.gp}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff Detailed Report Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setViewingStaff(null)} />
          <div className="relative bg-zinc-900 border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-8" id="staff-report-modal">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl font-black text-black uppercase">
                    {viewingStaff.name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{viewingStaff.name}</h2>
                    <p className="text-amber-500 text-xs font-black uppercase tracking-[0.2em]">{viewingStaff.designation}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">{viewingStaff.department} Department</p>
                  </div>
                </div>
                <button onClick={() => setViewingStaff(null)} className="text-gray-500 hover:text-white transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Attendance', val: `${viewingStaff.stats.attPct}%`, color: 'text-emerald-500' },
                  { label: 'Dress Code', val: `${viewingStaff.stats.dressPct}%`, color: 'text-blue-500' },
                  { label: 'Duty Done', val: `${viewingStaff.stats.dutyPct}%`, color: 'text-purple-500' },
                  { label: 'Growth Pts', val: viewingStaff.stats.gp, color: 'text-amber-500' },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <Clock size={14} className="text-amber-500" /> Recent Attendance Logs
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {attendance.filter(a => a.staffId === viewingStaff.id).slice(0, 10).map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-xs font-bold text-gray-300">{a.date}</p>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${a.status === 'present' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                  {attendance.filter(a => a.staffId === viewingStaff.id).length === 0 && (
                    <p className="text-gray-500 text-xs italic text-center py-4">No recent logs available</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => {
                    // Logic: at least one week of data in current month selection
                    const attCount = attendance.filter(a => a.staffId === viewingStaff.id && String(a.date).startsWith(selectedMonth)).length;
                    if (attCount < 7) {
                       toast.error("Performance report requires at least 7 days of activity in the selected month");
                       return;
                    }
                    window.print();
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Printer size={16} /> Generate Performance Report
                </button>
                <button 
                  onClick={() => router.push(`/hq/dashboard/manager/staff/${viewingStaff.department}_${viewingStaff.id}`)}
                  className="px-6 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all border border-white/10"
                >
                  Visit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

