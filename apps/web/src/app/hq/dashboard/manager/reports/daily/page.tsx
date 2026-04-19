'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import { 
  FileText, ArrowLeft, Loader2, Search, Filter, 
  Calendar, CheckCircle, XCircle, Info, Download, 
  Printer, TrendingUp, Shield, AlertTriangle
} from 'lucide-react';
import { getDeptPrefix, getDeptCollection, type StaffDept } from '@/lib/hq/superadmin/staff';
import { toast } from 'react-hot-toast';
import { HqDailyAttendanceRecord, HqDailyDressCodeRecord, HqDailyDutyRecord } from '@/types/hq';

interface DailyReportRow {
  id: string;
  name: string;
  department: string;
  designation: string;
  attendance: string;
  uniformScore: number;
  dutyScore: number;
  contributionScore: number;
  totalScore: number;
  fines: number;
  details: {
    uniformMissing: string[];
    dutiesPending: string[];
    finesReason: string[];
  };
}

export default function DailyReportPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<DailyReportRow[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(localStorage.getItem('hq_dark_mode') === 'true');
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'manager') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const depts: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'];
      
      // 1. Fetch All Staff
      const staffSnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, getDeptCollection(d)), where('isActive', '==', true)))));
      const allStaff: any[] = [];
      staffSnaps.forEach((snap, i) => {
        snap.docs.forEach(doc => {
          allStaff.push({ id: doc.id, department: depts[i], ...doc.data() });
        });
      });

      // 2. Fetch Daily Logs for each department
      const attSnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_attendance`), where('date', '==', reportDate)))));
      const dressSnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_dress_logs`), where('date', '==', reportDate)))));
      const dutySnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_duty_logs`), where('date', '==', reportDate)))));
      const fineSnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_fines`), where('date', '==', reportDate)))));
      const contribSnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_contributions`), where('date', '==', reportDate), where('isApproved', '==', true)))));

      // Maps for fast lookup
      const attMap = new Map();
      const dressMap = new Map();
      const dutyMap = new Map();
      const fineMap = new Map();
      const contribMap = new Map();

      attSnaps.forEach(snap => snap.docs.forEach(d => attMap.set(d.data().staffId || d.id, d.data())));
      dressSnaps.forEach(snap => snap.docs.forEach(d => dressMap.set(d.data().staffId || d.id, d.data())));
      dutySnaps.forEach(snap => snap.docs.forEach(d => dutyMap.set(d.data().staffId || d.id, d.data())));
      fineSnaps.forEach(snap => snap.docs.forEach(d => {
        const sid = d.data().staffId || d.id;
        const existing = fineMap.get(sid) || [];
        fineMap.set(sid, [...existing, d.data()]);
      }));
      contribSnaps.forEach(snap => snap.docs.forEach(d => {
        const sid = d.data().staffId || d.id;
        const existing = contribMap.get(sid) || 0;
        contribMap.set(sid, existing + 1);
      }));

      // 3. Process Report Rows
      const rows: DailyReportRow[] = allStaff.map(s => {
        const sid = s.id;
        const att = attMap.get(sid);
        const dress = dressMap.get(sid);
        const duty = dutyMap.get(sid);
        const finesList = fineMap.get(sid) || [];
        const contribCount = contribMap.get(sid) || 0;

        // Attendance Score (1 if present)
        const attScore = (att?.status === 'present') ? 1 : 0;

        // Uniform Score (1 if all ticked, 0 if any missing)
        const uniformConfig = s.dressCodeConfig || [];
        const uniformItems = dress?.items || [];
        const uniformMissing = uniformConfig.filter((c: any) => {
          const item = uniformItems.find((i: any) => i.key === c.key);
          return !item || item.status === 'no';
        }).map((c: any) => c.label);
        
        const uniformScore = (uniformConfig.length > 0 && uniformMissing.length === 0) ? 1 : 0;

        // Duty Score (1 if all duties performed, 0 if any not)
        const dutyConfig = s.dutyConfig || [];
        const dutyItems = duty?.duties || [];
        const dutiesPending = dutyConfig.filter((c: any) => {
          const item = dutyItems.find((d: any) => d.key === c.key);
          return !item || item.status === 'not_done';
        }).map((c: any) => c.label);

        const dutyScore = (dutyConfig.length > 0 && dutiesPending.length === 0) ? 1 : 0;

        // Contribution Score (1 if at least one approved contribution today)
        const contribScore = contribCount > 0 ? 1 : 0;

        const totalFine = finesList.reduce((acc: number, f: any) => acc + (Number(f.amount) || 0), 0);

        return {
          id: sid,
          name: s.name || s.displayName || 'Staff',
          department: s.department,
          designation: s.designation || 'Staff Member',
          attendance: att?.status || 'unmarked',
          uniformScore,
          dutyScore,
          contributionScore,
          totalScore: attScore + uniformScore + dutyScore + contribScore,
          fines: totalFine,
          details: {
            uniformMissing,
            dutiesPending,
            finesReason: finesList.map((f: any) => `${f.reason} (₨${f.amount})`)
          }
        };
      });

      setReportData(rows.sort((a, b) => b.totalScore - a.totalScore));
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate daily report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchReport();
  }, [session, reportDate]);

  const filteredData = useMemo(() => {
    return reportData.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || 
                           r.designation.toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === 'all' || r.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [reportData, search, deptFilter]);

  const handlePrint = () => {
    window.print();
  };

  if (sessionLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0A0A0A]' : 'bg-[#F8FAFC]'}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8FAFC] text-gray-900'}`}>
      <div className="max-w-7xl mx-auto space-y-8 print:p-0">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link 
              href="/hq/dashboard/manager"
              className={`p-3 rounded-2xl border transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-gray-100 hover:shadow-lg'}`}
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-[1000] tracking-tight">Daily Performance Report</h1>
              <p className="text-gray-500 text-sm font-black uppercase tracking-widest mt-1">Unified HQ Analytics</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
               <Calendar size={16} className="text-gray-400" />
               <input 
                 type="date" 
                 value={reportDate} 
                 onChange={(e) => setReportDate(e.target.value)}
                 className="bg-transparent border-none outline-none font-black text-sm uppercase tracking-widest"
               />
            </div>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
            >
              <Printer size={18} /> Print Report
            </button>
          </div>
        </div>

        {/* Print Only Header */}
        <div className="hidden print:block text-center mb-10 border-b-4 border-gray-900 pb-8">
           <h1 className="text-4xl font-[1000] uppercase tracking-tighter mb-2">KhanHub HQ Performance Ledger</h1>
           <p className="text-xl font-bold text-gray-600 italic">Daily Operations Audit • {new Date(reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Filters */}
        <div className={`p-4 rounded-[2.5rem] border flex flex-col sm:flex-row gap-4 print:hidden ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'}`}>
          <div className="flex-1 relative group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`} size={18} />
            <input 
              type="text" 
              placeholder="Search staff by name or role..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 rounded-2xl border-none outline-none font-bold text-sm ${isDark ? 'bg-white/5 text-white' : 'bg-gray-50 text-gray-900'}`}
            />
          </div>
          <div className="flex gap-3">
             <select 
               value={deptFilter}
               onChange={(e) => setDeptFilter(e.target.value)}
               className={`px-6 py-3 rounded-2xl border-none outline-none font-black text-[10px] uppercase tracking-[0.2em] cursor-pointer ${isDark ? 'bg-white/5 text-zinc-400' : 'bg-gray-50 text-gray-500'}`}
             >
               <option value="all">Global Roster</option>
               <option value="hq">HQ Office</option>
               <option value="rehab">Rehab Center</option>
               <option value="spims">SPIMS Academy</option>
               <option value="hospital">Hospital</option>
               <option value="sukoon">Sukoon Center</option>
               <option value="welfare">Welfare</option>
               <option value="job-center">Job Center</option>
             </select>
          </div>
        </div>

        {/* Report Table */}
        <div className={`rounded-[2.5rem] border overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Staff Identity</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Attendance</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Uniform</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Duties</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Contribution</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Daily Score</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Fines/Deduction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {filteredData.map((row) => (
                  <tr key={row.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-100 text-gray-400'}`}>
                          {row.name[0]}
                        </div>
                        <div>
                          <p className="font-black text-sm">{row.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{row.designation} • {row.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col items-center">
                        {row.attendance === 'present' ? (
                          <CheckCircle size={18} className="text-emerald-500" />
                        ) : row.attendance === 'absent' ? (
                          <XCircle size={18} className="text-rose-500" />
                        ) : (
                          <Clock size={18} className="text-gray-300" />
                        )}
                        <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-50">{row.attendance}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-lg font-black ${row.uniformScore > 0 ? 'text-emerald-500' : 'text-gray-300'}`}>
                          {row.uniformScore > 0 ? '✓' : '0'}
                        </span>
                        {row.details.uniformMissing.length > 0 && (
                          <div className="group relative">
                             <AlertTriangle size={12} className="text-rose-500 mt-1 cursor-help" />
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900 text-white text-[9px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                               <p className="font-black uppercase tracking-widest mb-1 text-rose-400">Missing Uniform:</p>
                               <ul className="list-disc pl-3 font-medium">
                                 {row.details.uniformMissing.map(m => <li key={m}>{m}</li>)}
                               </ul>
                             </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-lg font-black ${row.dutyScore > 0 ? 'text-emerald-500' : 'text-gray-300'}`}>
                          {row.dutyScore > 0 ? '✓' : '0'}
                        </span>
                        {row.details.dutiesPending.length > 0 && (
                          <div className="group relative">
                             <Info size={12} className="text-amber-500 mt-1 cursor-help" />
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900 text-white text-[9px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                               <p className="font-black uppercase tracking-widest mb-1 text-amber-400">Pending Duties:</p>
                               <ul className="list-disc pl-3 font-medium">
                                 {row.details.dutiesPending.map(m => <li key={m}>{m}</li>)}
                               </ul>
                             </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`text-lg font-black ${row.contributionScore > 0 ? 'text-emerald-500' : 'text-gray-300'}`}>
                         {row.contributionScore > 0 ? '✓' : '0'}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-lg ${
                        row.totalScore === 4 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                        row.totalScore >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 dark:bg-zinc-800'
                      }`}>
                        {row.totalScore}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`font-black ${row.fines > 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                          {row.fines > 0 ? `-₨${row.fines}` : 'Nil'}
                        </span>
                        {row.details.finesReason.length > 0 && (
                          <p className="text-[8px] font-medium text-gray-400 mt-1 italic max-w-[150px] truncate">{row.details.finesReason.join(', ')}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredData.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-gray-300" />
              </div>
              <h3 className="font-black text-lg">No staff metrics found</h3>
              <p className="text-gray-500 text-sm">Either no staff is active or your filters are too strict.</p>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          <div className={`p-8 rounded-[2rem] border ${isDark ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Total Score Aggregate</h4>
             <div className="flex items-center gap-4">
                <div className="text-4xl font-[1000] tracking-tighter text-blue-500">
                  {reportData.reduce((acc, curr) => acc + curr.totalScore, 0)}
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <p className="text-xs font-bold text-gray-500 leading-relaxed italic">Cumulative excellence points across all departments for today.</p>
             </div>
          </div>
          <div className={`p-8 rounded-[2rem] border ${isDark ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Total Fine Deduction</h4>
             <div className="flex items-center gap-4">
                <div className="text-4xl font-[1000] tracking-tighter text-rose-500">
                  ₨{reportData.reduce((acc, curr) => acc + curr.fines, 0)}
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <p className="text-xs font-bold text-gray-500 leading-relaxed italic">Total penalities issued today for policy violations.</p>
             </div>
          </div>
          <div className={`p-8 rounded-[2rem] border ${isDark ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Avg. Performance</h4>
             <div className="flex items-center gap-4">
                <div className="text-4xl font-[1000] tracking-tighter text-emerald-500">
                  {reportData.length > 0 ? (reportData.reduce((acc, curr) => acc + curr.totalScore, 0) / (reportData.length * 4) * 100).toFixed(1) : 0}%
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                   <div 
                     style={{ width: `${reportData.length > 0 ? (reportData.reduce((acc, curr) => acc + curr.totalScore, 0) / (reportData.length * 4) * 100) : 0}%` }} 
                     className="h-full bg-emerald-500 rounded-full"
                   />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
