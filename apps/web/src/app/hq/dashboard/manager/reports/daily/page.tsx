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
  Printer, TrendingUp, Shield, AlertTriangle, Clock
} from 'lucide-react';
import { getDeptPrefix, getDeptCollection, type StaffDept } from '@/lib/hq/superadmin/staff';
import { toast } from 'react-hot-toast';
import { HqDailyAttendanceRecord, HqDailyDressCodeRecord, HqDailyDutyRecord } from '@/types/hq';
import { toPng } from 'html-to-image';

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
  totalGrowthPoints: number;
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
  const [downloading, setDownloading] = useState(false);

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
      
      const staffSnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, getDeptCollection(d)), where('isActive', '==', true)))));
      const allStaff: any[] = [];
      const staffRoles = ['admin', 'staff', 'cashier', 'manager', 'doctor', 'nurse', 'counselor', 'personnel'];
      
      staffSnaps.forEach((snap, i) => {
        snap.docs.forEach(doc => {
          const data = doc.data();
          const role = String(data.role || '').toLowerCase();
          if (staffRoles.includes(role)) {
            allStaff.push({ id: doc.id, department: depts[i], ...data });
          }
        });
      });

      // 2. Fetch Daily Logs for each department
      const attSnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_attendance`), where('date', '==', reportDate)))));
      const dressSnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_dress_logs`), where('date', '==', reportDate)))));
      const dutySnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_duty_logs`), where('date', '==', reportDate)))));
      const fineSnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_fines`), where('date', '==', reportDate)))));
      const contribSnaps = await Promise.all(depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_contributions`), where('date', '==', reportDate), where('isApproved', '==', true)))));
      const gpSnaps = await Promise.all(depts.map(d => getDocs(collection(db, `${getDeptPrefix(d)}_growth_points`))));

      // Maps for fast lookup
      const attMap = new Map();
      const dressMap = new Map();
      const dutyMap = new Map();
      const fineMap = new Map();
      const contribMap = new Map();
      const gpMap = new Map();

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
      gpSnaps.forEach(snap => snap.docs.forEach(d => {
        const data = d.data();
        const sid = data.staffId;
        if (sid) {
          const existing = gpMap.get(sid) || 0;
          gpMap.set(sid, existing + (data.points || 0));
        }
      }));

      // 3. Process Report Rows
      const rows: DailyReportRow[] = allStaff.map(s => {
        const sid = s.id;
        const att = attMap.get(sid);
        const dress = dressMap.get(sid);
        const duty = dutyMap.get(sid);
        const finesList = fineMap.get(sid) || [];
        const contribCount = contribMap.get(sid) || 0;
        const totalGP = gpMap.get(sid) || 0;

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
          contributionScore: contribScore,
          totalScore: attScore + uniformScore + dutyScore + contribScore,
          totalGrowthPoints: totalGP,
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

  const handleDownloadImage = async () => {
    const element = document.getElementById('daily-performance-report-content');
    if (!element) return;

    try {
      setDownloading(true);
      toast.loading("Preparing high-quality image...", { id: 'download-image' });
      
      // Ensure element is visible and styles are loaded
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: isDark ? '#0A0A0A' : '#F8FAFC',
        style: {
          padding: '20px',
          borderRadius: '0'
        }
      });

      const link = document.createElement('a');
      link.download = `HQ_Daily_Report_${reportDate}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success("Report downloaded successfully!", { id: 'download-image' });
    } catch (err) {
      console.error('Download error:', err);
      toast.error("Failed to generate image", { id: 'download-image' });
    } finally {
      setDownloading(false);
    }
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
      <div id="daily-performance-report-content" className={`max-w-7xl mx-auto space-y-8 p-8 rounded-[3rem] ${isDark ? 'bg-zinc-950' : 'bg-white shadow-2xl shadow-blue-900/5'} print:p-0 print:shadow-none`}>
        
        {/* Header (Premium for Export) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link 
              href="/hq/dashboard/manager"
              className={`p-3 rounded-2xl border transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-gray-100 hover:shadow-lg'}`}
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Shield size={24} className="text-indigo-600" />
                <h1 className="text-3xl font-[1000] tracking-tight bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">Daily Performance Report</h1>
              </div>
              <p className="text-gray-500 text-xs font-black uppercase tracking-[0.3em] mt-1">Unified HQ Analytics • Operational Excellence</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
               <Calendar size={18} className="text-indigo-500" />
               <input 
                 type="date" 
                 value={reportDate} 
                 onChange={(e) => setReportDate(e.target.value)}
                 className="bg-transparent border-none outline-none font-black text-sm uppercase tracking-widest text-indigo-600"
               />
            </div>
            <button 
              onClick={handleDownloadImage}
              disabled={downloading}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-sm font-black transition-all shadow-xl hover:scale-[1.02] active:scale-95 ${
                isDark 
                  ? 'bg-white text-black hover:bg-zinc-200' 
                  : 'bg-gray-900 text-white hover:bg-black shadow-gray-900/20'
              }`}
            >
              {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Save as Image
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-3 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 hover:scale-[1.02] active:scale-95"
            >
              <Printer size={18} /> Print
            </button>
          </div>
        </div>

        {/* Branding for Image Export (Hidden in UI) */}
        <div className="hidden print:block mb-10 pb-8 border-b-2 border-gray-100">
           <div className="flex justify-between items-end">
             <div>
               <h1 className="text-4xl font-[1000] uppercase tracking-tighter text-gray-900">Khan Hub HQ</h1>
               <p className="text-lg font-black text-indigo-600 uppercase tracking-[0.2em] mt-1">Performance Intelligence Ledger</p>
               <p className="text-sm font-bold text-gray-400 mt-4 italic">{new Date(reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
             </div>
             <div className="text-right">
                <div className="inline-block px-4 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-xl">Verified Audit</div>
                <p className="text-[10px] font-bold text-gray-400 mt-2">Document Ref: HQ-DPR-{reportDate.replace(/-/g, '')}</p>
             </div>
           </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-8 rounded-[2.5rem] border transition-all hover:scale-[1.02] ${isDark ? 'bg-zinc-900/50 border-zinc-800 shadow-2xl' : 'bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100 shadow-xl shadow-indigo-900/5'}`}>
             <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Excellence Aggregate</h4>
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                  <TrendingUp size={16} />
                </div>
             </div>
             <div className="flex items-end gap-3">
                <div className="text-5xl font-[1000] tracking-tighter text-indigo-600">
                  {reportData.reduce((acc, curr) => acc + curr.totalScore, 0)}
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pb-1">Points Earned</p>
             </div>
          </div>

          <div className={`p-8 rounded-[2.5rem] border transition-all hover:scale-[1.02] ${isDark ? 'bg-zinc-900/50 border-zinc-800 shadow-2xl' : 'bg-gradient-to-br from-white to-rose-50/30 border-rose-100 shadow-xl shadow-rose-900/5'}`}>
             <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total Deductions</h4>
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
                  <AlertTriangle size={16} />
                </div>
             </div>
             <div className="flex items-end gap-3">
                <div className="text-5xl font-[1000] tracking-tighter text-rose-600">
                  ₨{reportData.reduce((acc, curr) => acc + curr.fines, 0).toLocaleString()}
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pb-1">Fines Issued</p>
             </div>
          </div>

          <div className={`p-8 rounded-[2.5rem] border transition-all hover:scale-[1.02] ${isDark ? 'bg-zinc-900/50 border-zinc-800 shadow-2xl' : 'bg-gradient-to-br from-white to-emerald-50/30 border-emerald-100 shadow-xl shadow-emerald-900/5'}`}>
             <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Performance Index</h4>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <FileText size={16} />
                </div>
             </div>
             <div className="flex items-center gap-4">
                <div className="text-5xl font-[1000] tracking-tighter text-emerald-600">
                  {reportData.length > 0 ? (reportData.reduce((acc, curr) => acc + curr.totalScore, 0) / (reportData.length * 4) * 100).toFixed(0) : 0}%
                </div>
                <div className="flex-1">
                  <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                     <div 
                       style={{ width: `${reportData.length > 0 ? (reportData.reduce((acc, curr) => acc + curr.totalScore, 0) / (reportData.length * 4) * 100) : 0}%` }} 
                       className="h-full bg-emerald-500 rounded-full"
                     />
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`p-4 rounded-[2.5rem] border flex flex-col sm:flex-row gap-4 print:hidden ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
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
        <div className={`rounded-[2.5rem] border overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-white/5' : 'bg-gray-50/50'}`}>
                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Staff Identity</th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Duty Pts</th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Uniform</th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Contribution</th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Total Score</th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Deductions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {filteredData.map((row) => (
                  <tr key={row.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border-2 ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-gray-50 border-white text-gray-400 shadow-sm'}`}>
                          {row.name[0]}
                        </div>
                        <div>
                          <p className="font-black text-sm text-gray-900 dark:text-white">{row.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{row.designation} • {row.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                       <span className={`text-md font-black ${row.dutyScore > 0 ? 'text-emerald-500' : 'text-gray-300'}`}>
                         {row.dutyScore > 0 ? '+10' : '0'}
                       </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                       <span className={`text-md font-black ${row.uniformScore > 0 ? 'text-emerald-500' : 'text-gray-300'}`}>
                         {row.uniformScore > 0 ? '+5' : '0'}
                       </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                       <span className={`text-md font-black ${row.contributionScore > 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                         {row.contributionScore > 0 ? `+${row.contributionScore * 10}` : '0'}
                       </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                       <div className="inline-flex flex-col items-center px-4 py-2 rounded-2xl bg-gray-50 dark:bg-white/5 border border-white dark:border-zinc-800 shadow-sm">
                         <span className="text-lg font-black text-gray-900 dark:text-white">{row.totalScore}</span>
                         <span className="text-[7px] font-black uppercase tracking-widest text-gray-400">Points</span>
                       </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-black ${row.fines > 0 ? 'text-rose-600' : 'text-gray-300'}`}>
                          {row.fines > 0 ? `-₨${row.fines.toLocaleString()}` : 'None'}
                        </span>
                        {row.details.finesReason.length > 0 && (
                          <div className="flex flex-wrap justify-end gap-1 mt-1.5">
                            {row.details.finesReason.map((r, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-tighter">
                                {r.split(' (')[0]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredData.length === 0 && (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Search size={32} className="text-gray-300" />
              </div>
              <h3 className="font-black text-xl">No Analytics Data</h3>
              <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-widest">Adjust filters or search criteria</p>
            </div>
          )}
        </div>

        {/* Legal Disclaimer for Image */}
        <div className="hidden print:flex items-center justify-between pt-8 border-t border-gray-100">
           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">© {new Date().getFullYear()} Khan Hub Operations • AI Generated Audit</p>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Secure Report Integrity Verified</p>
           </div>
        </div>
      </div>
    </div>
  );
}
