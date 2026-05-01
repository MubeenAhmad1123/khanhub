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
    
    const depts = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'] as StaffDept[];
    
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
        (g.month && typeof g.month.toDate === 'function' && !isNaN(g.month.toDate().getTime()) && g.month.toDate().toISOString().startsWith(String(selectedMonth || "")))
      ))
      .reduce((s, g) => s + (g.points || 0), 0);

    return { attPct, dressPct, dutyPct, gp, present, total };
  };

  const staffWithStats = staff.map(m => ({ ...m, stats: getStaffStats(m.id) }))
    .sort((a, b) => (b.stats.gp + b.stats.attPct) - (a.stats.gp + a.stats.attPct));

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-500 text-xs font-semibold">Generating Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans p-4 md:p-8 pb-32 max-w-full overflow-x-hidden" id="reports-print">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Staff Performance Reports</h1>
            <div className="flex items-center gap-3 mt-1 font-medium text-sm">
              <p className="text-gray-500">Monthly overview & leadership</p>
              <div className="w-1 h-1 rounded-full bg-gray-300" />
              <Link href="/hq/dashboard/manager/reports/daily" className="text-indigo-600 font-bold hover:underline flex items-center gap-1.5 hover:text-indigo-700 transition-all duration-200">
                View Daily Audit <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              className="bg-white border border-gray-100 rounded-2xl px-5 py-3 text-gray-900 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm cursor-pointer" 
            />
            <button 
              onClick={() => window.print()} 
              className="bg-white hover:bg-gray-50 border border-gray-100 text-gray-700 font-bold text-xs px-5 py-3 rounded-2xl transition-all shadow-sm flex items-center gap-2 hover:shadow-md active:scale-95 duration-200"
            >
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
          <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2.5 bg-gray-50/40">
            <Award className="text-indigo-600" size={20} />
            <h3 className="text-gray-900 font-bold text-base">Monthly Leaderboard</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/20 border-b border-gray-50">
                  {['#', 'Staff Member', 'Department', 'Attendance', 'Dress Code', 'Duty Completion', 'Growth Points'].map(h => (
                    <th key={h} className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/80">
                {staffWithStats.map((member, index) => (
                  <tr key={member.id} className="animate-in fade-in duration-300 hover:bg-gray-50/40 transition-colors group">
                    <td className="px-6 py-4">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border ${
                        index === 0 ? 'bg-amber-50 text-amber-600 border-amber-100/60' : 
                        index === 1 ? 'bg-slate-50 text-slate-600 border-slate-100/60' : 
                        index === 2 ? 'bg-orange-50 text-orange-600 border-orange-100/60' : 
                        'bg-gray-50 text-gray-400 border-gray-100/60'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 cursor-pointer" onClick={() => setViewingStaff(member)}>
                      <p className="text-gray-900 font-bold text-sm group-hover:text-indigo-600 transition-colors duration-200 leading-snug">{member.name}</p>
                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wider mt-0.5">{member.designation}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold border border-gray-100 capitalize">
                        {member.department}
                      </span>
                    </td>
                    {[
                      { value: member.stats.attPct, threshold: 80 },
                      { value: member.stats.dressPct, threshold: 80 },
                      { value: member.stats.dutyPct, threshold: 80 },
                    ].map((stat, i) => (
                      <td key={i} className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-2.5 bg-gray-50 border border-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${stat.value >= stat.threshold ? 'bg-emerald-500' : stat.value >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${stat.value}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${stat.value >= stat.threshold ? 'text-emerald-600' : stat.value >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{stat.value}%</span>
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <span className="text-indigo-600 font-bold text-sm bg-indigo-50/60 border border-indigo-100/50 px-3 py-1.5 rounded-xl">{member.stats.gp}</span>
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
          <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={() => setViewingStaff(null)} />
          <div className="relative bg-white border border-gray-100 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-6" id="staff-report-modal">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl font-bold text-indigo-600 border border-indigo-100">
                    {viewingStaff.name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-snug">{viewingStaff.name}</h2>
                    <p className="text-indigo-600 text-sm font-semibold mt-0.5">{viewingStaff.designation}</p>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mt-1 capitalize">{viewingStaff.department} Department</p>
                  </div>
                </div>
                <button onClick={() => setViewingStaff(null)} className="text-gray-400 hover:text-gray-600 transition-all bg-gray-50 border border-gray-100 p-2.5 rounded-full active:scale-95 duration-200">
                  <XCircle size={22} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Attendance', val: `${viewingStaff.stats.attPct}%`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Dress Code', val: `${viewingStaff.stats.dressPct}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Duty Done', val: `${viewingStaff.stats.dutyPct}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Growth Pts', val: viewingStaff.stats.gp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
                    <div className={`mx-auto w-max px-3.5 py-1.5 rounded-xl ${s.bg} border border-black/5`}>
                      <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-gray-900 font-bold text-sm flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600" /> Recent Attendance Logs
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                  {attendance.filter(a => a.staffId === viewingStaff.id).slice(0, 10).map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/40 border border-gray-100">
                      <p className="text-sm font-semibold text-gray-700">{a.date}</p>
                      <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-xl border ${a.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' : 'bg-rose-50 text-rose-700 border-rose-100/50'}`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                  {attendance.filter(a => a.staffId === viewingStaff.id).length === 0 && (
                    <p className="text-gray-400 text-xs italic text-center py-4 font-medium">No recent logs available</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => {
                    const attCount = attendance.filter(a => a.staffId === viewingStaff.id && String(a.date).startsWith(selectedMonth)).length;
                    if (attCount < 7) {
                       toast.error("Performance report requires at least 7 days of activity in the selected month");
                       return;
                    }
                    window.print();
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wide py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 duration-200"
                >
                  <Printer size={16} /> Print Report
                </button>
                <button 
                  onClick={() => router.push(`/hq/dashboard/manager/staff/${viewingStaff.department}_${viewingStaff.id}`)}
                  className="px-5 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wide py-3.5 rounded-2xl transition-all border border-gray-200 active:scale-95 duration-200"
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
