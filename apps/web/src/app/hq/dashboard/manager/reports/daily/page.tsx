'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, Timestamp, doc, setDoc, addDoc } from 'firebase/firestore';
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
  attendance: 'present' | 'absent' | 'late' | 'leave' | 'unmarked';
  uniformStatus: 'yes' | 'no' | 'incomplete' | 'na';
  dutyStatus: 'yes' | 'no' | 'incomplete' | 'na';
  gpStatus: 'yes' | 'no' | 'invalid' | 'na';
  dailyScore: number;
  totalScore?: number;
  fines: number;
  fineReason?: string;
  details: {
    uniformMissing: string[];
    dutiesPending: string[];
    finesReason: string[];
  };
  isDirty?: boolean;
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

        const fineTotal = finesList.reduce((acc: number, f: any) => acc + (Number(f.amount) || 0), 0);

        // Determine statuses based on data
        let attendanceStatus: DailyReportRow['attendance'] = att?.status || 'unmarked';
        if (att?.isLate && attendanceStatus === 'present') attendanceStatus = 'late';

        const uniformStatus: DailyReportRow['uniformStatus'] = uniformConfig.length === 0 ? 'na' : 
                            (uniformMissing.length === 0 ? 'yes' : 
                            (uniformMissing.length === uniformConfig.length ? 'no' : 'incomplete'));

        const dutyStatus: DailyReportRow['dutyStatus'] = dutyConfig.length === 0 ? 'na' :
                          (dutiesPending.length === 0 ? 'yes' :
                          (dutiesPending.length === dutyConfig.length ? 'no' : 'incomplete'));

        const gpStatus: DailyReportRow['gpStatus'] = attendanceStatus === 'present' ? 'yes' :
                        (attendanceStatus === 'late' ? 'invalid' : 'no');

        return {
          id: sid,
          name: s.name || s.displayName || 'Staff',
          department: s.department,
          designation: s.designation || 'Staff Member',
          attendance: attendanceStatus,
          uniformStatus,
          dutyStatus,
          gpStatus,
          dailyScore: (attScore + (uniformStatus === 'yes' ? 1 : 0) + (dutyStatus === 'yes' ? 1 : 0) + contribScore) * 25,
          fines: fineTotal,
          details: {
            uniformMissing,
            dutiesPending,
            finesReason: finesList.map((f: any) => `${f.reason} (₨${f.amount})`)
          }
        };
      });

      setReportData(rows.sort((a, b) => b.dailyScore - a.dailyScore));
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

  const [activeFilter, setActiveFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const getAutoValues = (status: DailyReportRow['attendance']) => {
    switch(status) {
      case 'present': 
        return { uniform: 'yes', duties: 'yes', gp: 'yes', score: 100, fine: 0 };
      case 'absent': 
        return { uniform: 'no', duties: 'no', gp: 'no', score: 0, fine: 500 };
      case 'late': 
        return { uniform: 'incomplete', duties: 'incomplete', gp: 'invalid', score: 50, fine: 0 };
      case 'leave': 
        return { uniform: 'na', duties: 'na', gp: 'na', score: 0, fine: 0 };
      default: 
        return null;
    }
  };

  const handleUpdateStatus = (id: string, status: DailyReportRow['attendance']) => {
    const auto = getAutoValues(status);
    if (!auto) return;

    setReportData(prev => prev.map(row => {
      if (row.id === id) {
        return {
          ...row,
          attendance: status,
          uniformStatus: auto.uniform as any,
          dutyStatus: auto.duties as any,
          gpStatus: auto.gp as any,
          dailyScore: auto.score,
          fines: auto.fine,
          isDirty: true
        };
      }
      return row;
    }));
  };

  const saveAssessment = async () => {
    const dirtyRows = reportData.filter(r => r.isDirty);
    if (dirtyRows.length === 0) {
      toast.error("No changes to save");
      return;
    }

    try {
      setSaving(true);
      toast.loading("Saving daily assessment...", { id: 'save-assessment' });

      for (const row of dirtyRows) {
        const prefix = getDeptPrefix(row.department as StaffDept);
        const attId = `${reportDate}_${row.id}`;
        
        // 1. Save Attendance
        await setDoc(doc(db, `${prefix}_attendance`, attId), {
          staffId: row.id,
          date: reportDate,
          status: row.attendance === 'late' ? 'present' : row.attendance,
          isLate: row.attendance === 'late',
          updatedAt: Timestamp.now(),
          markedBy: session?.uid
        }, { merge: true });

        // 2. Save Fine if any
        if (row.fines > 0) {
          await addDoc(collection(db, `${prefix}_fines`), {
            staffId: row.id,
            amount: row.fines,
            reason: row.attendance === 'absent' ? 'Absent without leave' : 'Penalty',
            status: 'unpaid',
            date: reportDate,
            createdAt: Timestamp.now(),
            markedBy: session?.uid
          });
        }
      }

      setReportData(prev => prev.map(r => ({ ...r, isDirty: false })));
      toast.success("Assessment saved successfully!", { id: 'save-assessment' });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes", { id: 'save-assessment' });
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0A0A0A]' : 'bg-[#F8FAFC]'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={`w-10 h-10 animate-spin ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 animate-pulse">Syncing Matrix</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8FAFC] text-gray-900'}`}>
      <div id="daily-performance-report-content" className={`max-w-7xl mx-auto space-y-8 p-8 rounded-[3rem] ${isDark ? 'bg-zinc-950' : 'bg-white shadow-2xl shadow-blue-900/5'} print:p-0 print:shadow-none`}>
        
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
              <h1 className="text-3xl font-[1000] tracking-tight text-gray-900 dark:text-white">Staff Performance</h1>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <Shield size={12} className="text-indigo-500" /> Operational Assessment & Audit
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-100 shadow-sm'}`}>
               <Calendar size={18} className="text-indigo-500" />
               <input 
                 type="date" 
                 value={reportDate} 
                 onChange={(e) => setReportDate(e.target.value)}
                 className="bg-transparent border-none outline-none font-black text-xs uppercase tracking-widest text-indigo-600"
               />
            </div>
            <button 
              onClick={saveAssessment}
              disabled={saving || !reportData.some(r => r.isDirty)}
              className="flex items-center gap-3 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl text-xs font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              Save Assessment
            </button>
            <button 
              onClick={handleDownloadImage}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-black transition-all shadow-xl hover:scale-[1.02] active:scale-95 ${
                isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
              }`}
            >
              <Download size={18} />
              Export Image
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Points Earned</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-[1000] text-gray-900 dark:text-white">
                {reportData.reduce((acc, curr) => acc + curr.dailyScore, 0).toLocaleString()}
              </span>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
          </div>

          <div className={`p-6 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Deductions (Fine)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-[1000] text-rose-600">
                ₨{reportData.reduce((acc, curr) => acc + curr.fines, 0).toLocaleString()}
              </span>
              <AlertTriangle size={16} className="text-rose-500" />
            </div>
          </div>

          <div className={`p-6 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Performance Index</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-[1000] text-indigo-600">
                {reportData.length > 0 ? (reportData.reduce((acc, curr) => acc + curr.dailyScore, 0) / (reportData.length * 100) * 100).toFixed(0) : 0}%
              </span>
              <CheckCircle size={16} className="text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Controls & Filter Tabs */}
        <div className="space-y-6 print:hidden">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`} size={18} />
              <input 
                type="text" 
                placeholder="Search staff by name or role..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border-none outline-none font-bold text-sm shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/10 ${isDark ? 'bg-white/5 text-white' : 'bg-white text-gray-900'}`}
              />
            </div>
            <select 
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className={`px-6 py-4 rounded-2xl border-none outline-none font-black text-[10px] uppercase tracking-[0.2em] cursor-pointer shadow-sm ${isDark ? 'bg-white/5 text-zinc-400' : 'bg-white text-gray-500'}`}
            >
              <option value="all">Global Matrix</option>
              {['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'].map(d => (
                <option key={d} value={d}>{d.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {['all', 'present', 'absent', 'late', 'leave'].map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                  activeFilter === f 
                    ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 dark:bg-white/5 dark:border-zinc-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Report Table */}
        <div className={`rounded-[2.5rem] border overflow-hidden shadow-sm ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className={`${isDark ? 'bg-zinc-900' : 'bg-gray-50'} border-b border-gray-100 dark:border-zinc-800`}>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Staff Identity</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Attendance</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Uniform</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Duties</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">GP</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Score</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Fine</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {filteredData.filter(r => activeFilter === 'all' || r.attendance === activeFilter).map((row) => (
                  <tr key={row.id} className={`group transition-all ${row.isDirty ? 'bg-amber-500/5' : 'hover:bg-gray-50/50 dark:hover:bg-white/5'}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500 group-hover:border-indigo-500' : 'bg-gray-50 border-white text-gray-400 shadow-sm group-hover:border-indigo-200'}`}>
                          {row.name[0]}
                        </div>
                        <div>
                          <p className="font-black text-xs text-gray-900 dark:text-white truncate max-w-[120px]">{row.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{row.designation}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-5 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        row.attendance === 'present' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        row.attendance === 'absent' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                        row.attendance === 'late' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        'bg-gray-100 text-gray-400 border-gray-200'
                      }`}>
                        {row.attendance === 'present' ? <CheckCircle size={10} /> : 
                         row.attendance === 'absent' ? <XCircle size={10} /> :
                         row.attendance === 'late' ? <Clock size={10} /> : <Info size={10} />}
                        {row.attendance}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${
                        row.uniformStatus === 'yes' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        row.uniformStatus === 'no' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                        row.uniformStatus === 'incomplete' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        'bg-gray-100 text-gray-400 border-gray-200'
                      }`}>
                        {row.uniformStatus === 'yes' ? <CheckCircle size={10} /> : row.uniformStatus === 'no' ? <XCircle size={10} /> : <AlertTriangle size={10} />}
                        {row.uniformStatus}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${
                        row.dutyStatus === 'yes' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        row.dutyStatus === 'no' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                        row.dutyStatus === 'incomplete' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        'bg-gray-100 text-gray-400 border-gray-200'
                      }`}>
                        {row.dutyStatus === 'yes' ? <CheckCircle size={10} /> : row.dutyStatus === 'no' ? <XCircle size={10} /> : <AlertTriangle size={10} />}
                        {row.dutyStatus}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${
                        row.gpStatus === 'yes' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        row.gpStatus === 'invalid' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                        'bg-gray-100 text-gray-400 border-gray-200'
                      }`}>
                        {row.gpStatus}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                       <span className={`text-xs font-black ${row.dailyScore >= 75 ? 'text-emerald-500' : row.dailyScore >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                         {row.dailyScore}
                       </span>
                    </td>

                    <td className="px-6 py-5 text-center">
                       <span className={`text-xs font-black ${row.fines > 0 ? 'text-rose-600' : 'text-gray-300'}`}>
                         {row.fines > 0 ? `₨${row.fines}` : '0'}
                       </span>
                       {row.fines > 0 && row.fineReason && (
                         <p className="text-[8px] font-bold text-rose-500/60 uppercase mt-1 leading-none italic">{row.fineReason}</p>
                       )}
                    </td>

                    <td className="px-6 py-5 text-right print:hidden">
                       <select 
                         value={row.attendance}
                         onChange={(e) => handleUpdateStatus(row.id, e.target.value as any)}
                         className={`px-3 py-1.5 rounded-xl border-none outline-none text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all ${
                           isDark ? 'bg-white/5 text-indigo-400 hover:bg-white/10' : 'bg-gray-50 text-indigo-600 hover:bg-indigo-50'
                         }`}
                       >
                         <option value="unmarked">Unmarked</option>
                         <option value="present">Present</option>
                         <option value="late">Late</option>
                         <option value="absent">Absent</option>
                         <option value="leave">Leave</option>
                       </select>
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
