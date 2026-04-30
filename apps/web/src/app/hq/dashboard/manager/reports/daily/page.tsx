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
  Printer, TrendingUp, Shield, AlertTriangle, Clock,
  Sparkles
} from 'lucide-react';
import { Spinner } from '@/components/ui';
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
  const [downloading, setDownloading] = useState(false);
  // UI standard - forced light theme
  const isDark = false;

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
      const depts: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];

      const staffSnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, getDeptCollection(d)), where('isActive', '==', true)))
          .catch(() => ({ docs: [] } as any))
      ));
      const allStaff: any[] = [];
      const staffRoles = ['admin', 'staff', 'cashier', 'manager', 'doctor', 'nurse', 'counselor', 'personnel'];

      staffSnaps.forEach((snap, i) => {
        snap.docs.forEach((doc: any) => {
          const data = doc.data();
          const role = String(data.role || '').toLowerCase();
          const status = String(data.status || (data.isActive !== false ? 'active' : 'inactive')).toLowerCase();
          if (staffRoles.includes(role) && status === 'active') {
            allStaff.push({ id: doc.id, department: depts[i], ...data });
          }
        });
      });

      // 2. Fetch Daily Logs for each department
      const attSnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, `${getDeptPrefix(d)}_attendance`), where('date', '==', reportDate)))
          .catch(() => ({ docs: [] } as any))
      ));
      const dressSnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, `${getDeptPrefix(d)}_dress_logs`), where('date', '==', reportDate)))
          .catch(() => ({ docs: [] } as any))
      ));
      const dutySnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, `${getDeptPrefix(d)}_duty_logs`), where('date', '==', reportDate)))
          .catch(() => ({ docs: [] } as any))
      ));
      const fineSnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, `${getDeptPrefix(d)}_fines`), where('date', '==', reportDate)))
          .catch(() => ({ docs: [] } as any))
      ));
      const contribSnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, `${getDeptPrefix(d)}_contributions`), where('date', '==', reportDate), where('isApproved', '==', true)))
          .catch(() => ({ docs: [] } as any))
      ));
      
      // Removed full growth_points fetch to prevent 429 - GP status now driven by today's contributions

      // Maps for fast lookup
      const attMap = new Map();
      const dressMap = new Map();
      const dutyMap = new Map();
      const fineMap = new Map();
      const contribMap = new Map();
      const gpMap = new Map();

      attSnaps.forEach(snap => snap.docs.forEach((d: any) => attMap.set(d.data().staffId || d.id, d.data())));
      dressSnaps.forEach(snap => snap.docs.forEach((d: any) => dressMap.set(d.data().staffId || d.id, d.data())));
      dutySnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        const sid = data.staffId || d.id;
        const existing = dutyMap.get(sid);
        if (!existing || (!existing.duties && data.duties)) {
          dutyMap.set(sid, data);
        }
      }));
      fineSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const sid = d.data().staffId || d.id;
        const existing = fineMap.get(sid) || [];
        fineMap.set(sid, [...existing, d.data()]);
      }));
      contribSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const sid = d.data().staffId || d.id;
        const existing = contribMap.get(sid) || 0;
        contribMap.set(sid, existing + 1);
      }));

      // 3. Process Report Rows
      const rows: DailyReportRow[] = allStaff.map(s => {
        // Helper to convert any time string (HH:mm, HH:mm AM/PM) to minutes from midnight
        const timeToMinutes = (timeStr?: string) => {
          if (!timeStr) return null;
          const clean = timeStr.trim().toUpperCase();
          const isPM = clean.includes('PM');
          const isAM = clean.includes('AM');
          const numeric = clean.replace(/[^0-9:]/g, '');
          const parts = numeric.split(':');
          if (parts.length < 2) return null;
          let h = parseInt(parts[0], 10);
          let m = parseInt(parts[1], 10);
          if (isNaN(h) || isNaN(m)) return null;
          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;
          return h * 60 + m;
        };

        const sid = s.id;
        const att = attMap.get(sid);
        const dress = dressMap.get(sid);
        const duty = dutyMap.get(sid);
        const finesList = fineMap.get(sid) || [];
        const contribCount = contribMap.get(sid) || 0;
        const totalGP = gpMap.get(sid) || 0;

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
          return !item || item.status !== 'done';
        }).map((c: any) => c.label);

        const dutyScore = (dutyConfig.length > 0 && dutiesPending.length === 0) ? 1 : 0;

        // Contribution Score (1 if at least one approved contribution today)
        const contribScore = contribCount > 0 ? 1 : 0;

        const fineTotal = finesList.reduce((acc: number, f: any) => acc + (Number(f.amount) || 0), 0);

        // Determine statuses based on data
        const rawStatus = att?.status || 'unmarked';
        let attendanceStatus: DailyReportRow['attendance'] = 'unmarked';

        if (rawStatus === 'paid_leave' || rawStatus === 'unpaid_leave' || rawStatus === 'leave') {
          attendanceStatus = 'leave';
        } else if (['present', 'absent', 'late', 'unmarked', 'leave'].includes(rawStatus)) {
          attendanceStatus = rawStatus as any;
        }

        // Use arrivedOnTime from new schema, fallback to isLate if it exists
        const arrivalTime = att?.arrivalTime;
        const departureTime = att?.departureTime;
        const shiftStart = s.dutyStartTime; // Strictly from profile
        const shiftEnd = s.dutyEndTime;     // Strictly from profile

        let isLate = att?.arrivedOnTime === false || (att?.isLate && (attendanceStatus === 'present' || rawStatus === 'present'));

        // Dynamic Shift Check: Strictly use profile dutyStartTime and dutyEndTime
        if ((attendanceStatus === 'present' || rawStatus === 'present')) {
          const arrMin = timeToMinutes(arrivalTime);
          const startMin = timeToMinutes(shiftStart);
          const depMin = timeToMinutes(departureTime);
          const endMin = timeToMinutes(shiftEnd);

          // Arrival Lateness (Strict: even 1 min late = penalty)
          if (arrMin !== null && startMin !== null) {
            if (arrMin > startMin) {
              isLate = true;
            } else {
              // If arriving exactly at or before start time, they are on time
              if (att?.arrivedOnTime !== false) isLate = false;
            }
          }

          // Early Departure (Strict: even 1 min early = penalty)
          if (depMin !== null && endMin !== null) {
            if (depMin < endMin) {
              isLate = true;
            }
          }
        }

        if (isLate && (attendanceStatus === 'present' || rawStatus === 'present')) attendanceStatus = 'late';

        const onLeave = attendanceStatus === 'leave';

        const uniformStatus: DailyReportRow['uniformStatus'] = onLeave ? 'na' : (uniformConfig.length === 0 ? 'na' :
          (uniformMissing.length === 0 ? 'yes' :
            (uniformMissing.length === uniformConfig.length ? 'no' : 'incomplete')));

        const dutyStatus: DailyReportRow['dutyStatus'] = onLeave ? 'na' : (dutyConfig.length === 0 ? 'na' :
          (dutiesPending.length === 0 ? 'yes' :
            (dutiesPending.length === dutyConfig.length ? 'no' : 'incomplete')));

        // Point Calculation (1 point each, total 4)
        const attPoint = (attendanceStatus === 'present') ? 1 : 0;
        const uniformPoint = (!onLeave && uniformStatus === 'yes') ? 1 : 0;
        const dutyPoint = (!onLeave && dutyStatus === 'yes') ? 1 : 0;
        const contribPoint = (!onLeave && contribScore > 0) ? 1 : 0;

        const totalDailyPoints = attPoint + uniformPoint + dutyPoint + contribPoint;

        return {
          id: sid,
          name: s.name || s.displayName || 'Staff',
          department: s.department,
          designation: s.designation || 'Staff Member',
          attendance: attendanceStatus,
          uniformStatus,
          dutyStatus,
          // GP status is specifically tied to contribution approval as requested
          gpStatus: onLeave ? 'na' : (contribScore > 0 ? 'yes' : 'no'),
          dailyScore: totalDailyPoints,
          fines: fineTotal,
          fineReason: finesList.length > 0 ? finesList[0].reason : '',
          details: {
            uniformMissing: onLeave ? [] : uniformMissing,
            dutiesPending: onLeave ? [] : dutiesPending,
            finesReason: finesList.map((f: any) => `${f.reason} (₨${f.amount})`)
          },
          arrivalTime: att?.arrivalTime
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
    switch (status) {
      case 'present':
        return { uniform: 'yes', duties: 'yes', gp: 'no', score: 3, fine: 0 };
      case 'absent':
        return { uniform: 'no', duties: 'no', gp: 'no', score: 0, fine: 500 };
      case 'late':
        return { uniform: 'incomplete', duties: 'incomplete', gp: 'invalid', score: 0, fine: 0 };
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
        <Spinner showText={true} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#FCFBF4] text-black font-bold'}`}>
      <div id="daily-performance-report-content" className={`max-w-7xl mx-auto space-y-8 p-8 rounded-[3rem] ${isDark ? 'bg-zinc-950' : 'bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]'} print:p-0 print:shadow-none`}>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link
              href="/hq/dashboard/manager"
              className={`p-3 rounded-2xl border transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-black/90' : 'bg-white border-gray-100 hover:shadow-lg'}`}
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-[1000] tracking-tight text-black">Daily Performance Report</h1>
              <p className="text-black text-[10px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <Shield size={12} className="text-black" /> Operational Assessment & Audit Log
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
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-black transition-all shadow-xl hover:scale-[1.02] active:scale-95 ${isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
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
              <p className="text-sm font-bold text-black mt-4 italic">{new Date(reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-4 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-xl">Verified Audit</div>
              <p className="text-[10px] font-bold text-black mt-2">Document Ref: HQ-DPR-{reportDate.replace(/-/g, '')}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-black mb-2">Total Points Earned</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-[1000] text-black">
                {reportData.reduce((acc, curr) => acc + curr.dailyScore, 0).toLocaleString()}
              </span>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
          </div>

          <div className={`p-6 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-black mb-2">Total Deductions (Fine)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-[1000] text-rose-600">
                ₨{reportData.reduce((acc, curr) => acc + curr.fines, 0).toLocaleString()}
              </span>
              <AlertTriangle size={16} className="text-rose-500" />
            </div>
          </div>

          <div className={`p-6 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-black mb-2">Operational GP Index</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-[1000] text-indigo-600">
                {reportData.length > 0 ? (reportData.reduce((acc, curr) => acc + curr.dailyScore, 0) / (reportData.length * 4) * 100).toFixed(0) : 0}%
              </span>
              <CheckCircle size={16} className="text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Controls & Filter Tabs */}
        <div className="space-y-6 print:hidden">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-black' : 'text-black'}`} size={18} />
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
              className={`px-6 py-4 rounded-2xl border-2 border-black outline-none font-black text-[10px] uppercase tracking-[0.2em] cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-white/5 text-black' : 'bg-white text-black'}`}
            >
              <option value="all">Global Matrix</option>
              {['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'].map(d => (
                <option key={d} value={d}>{d.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {['all', 'present', 'absent', 'late', 'leave'].map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeFilter === f
                    ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white'
                    : 'bg-white text-black border-gray-100 hover:border-gray-200 dark:bg-white/5 dark:border-zinc-800'
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
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-black">Staff Identity</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-black text-center">Attendance</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-black text-center">Uniform</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-black text-center">Duties</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-black text-center">GP</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-black text-center">Score (4)</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-black text-center">Fine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {filteredData.filter(r => activeFilter === 'all' || r.attendance === activeFilter).map((row) => (
                  <tr key={row.id} className={`group transition-all ${row.isDirty ? 'bg-amber-500/5' : 'hover:bg-white/50 dark:hover:bg-white/5'}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-black group-hover:border-indigo-500' : 'bg-gray-50 border-white text-black shadow-sm group-hover:border-indigo-200'}`}>
                          {row.name[0]}
                        </div>
                        <div>
                          <p className="font-black text-xs text-gray-900 dark:text-black truncate max-w-[120px]">{row.name}</p>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">{row.designation}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${row.attendance === 'present' ? 'bg-emerald-400 text-black' :
                          row.attendance === 'absent' ? 'bg-rose-400 text-black' :
                            row.attendance === 'late' ? 'bg-amber-400 text-black' :
                            row.attendance === 'leave' ? 'bg-cyan-400 text-black' :
                              'bg-white text-black'
                        }`}>
                        {row.attendance === 'present' ? <CheckCircle size={12} /> :
                          row.attendance === 'absent' ? <XCircle size={12} /> :
                            row.attendance === 'late' ? <Clock size={12} /> : <Info size={12} />}
                        {row.attendance}
                        {row.attendance === 'late' && (row as any).arrivalTime && (
                          <span className="ml-1 opacity-60">@{(row as any).arrivalTime}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <div className={`flex flex-col items-center gap-1`}>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${row.uniformStatus === 'yes' ? 'bg-emerald-400 text-black' :
                            row.uniformStatus === 'no' ? 'bg-rose-400 text-black' :
                              row.uniformStatus === 'incomplete' ? 'bg-amber-400 text-black' :
                                'bg-white text-black'
                          }`}>
                          {row.uniformStatus === 'yes' ? <CheckCircle size={10} /> : row.uniformStatus === 'no' ? <XCircle size={10} /> : <AlertTriangle size={10} />}
                          {row.uniformStatus}
                        </div>
                        {row.uniformStatus === 'incomplete' && (row as any).details?.uniformMissing?.length > 0 && (
                          <p className="text-[7px] font-black text-rose-600 uppercase leading-none mt-2">Missing: {(row as any).details.uniformMissing.join(', ')}</p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <div className={`flex flex-col items-center gap-1`}>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${row.dutyStatus === 'yes' ? 'bg-emerald-400 text-black' :
                            row.dutyStatus === 'no' ? 'bg-rose-400 text-black' :
                              row.dutyStatus === 'incomplete' ? 'bg-amber-400 text-black' :
                                'bg-white text-black'
                          }`}>
                          {row.dutyStatus === 'yes' ? <CheckCircle size={10} /> : row.dutyStatus === 'no' ? <XCircle size={10} /> : <AlertTriangle size={10} />}
                          {row.dutyStatus}
                        </div>
                        {row.dutyStatus === 'incomplete' && (row as any).details?.dutiesPending?.length > 0 && (
                          <p className="text-[7px] font-black text-rose-600 uppercase leading-none mt-2">Pending: {(row as any).details.dutiesPending.join(', ')}</p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${row.gpStatus === 'yes' ? 'bg-emerald-400 text-black' :
                          'bg-rose-400 text-black'
                        }`}>
                        {row.gpStatus === 'yes' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {row.gpStatus}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className={`text-sm font-black ${row.dailyScore >= 3 ? 'text-emerald-500' : row.dailyScore >= 2 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {row.dailyScore} / 4
                      </span>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className={`text-xs font-black ${row.fines > 0 ? 'text-rose-600' : 'text-black'}`}>
                        {row.fines > 0 ? `₨${row.fines}` : '0'}
                      </span>
                      {row.fines > 0 && row.fineReason && (
                        <p className="text-[8px] font-bold text-rose-500/60 uppercase mt-1 leading-none italic">{row.fineReason}</p>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Search size={32} className="text-black" />
              </div>
              <h3 className="font-black text-xl">No Analytics Data</h3>
              <p className="text-black text-sm font-medium mt-1 uppercase tracking-widest">Adjust filters or search criteria</p>
            </div>
          )}
        </div>

        {/* Signature & Legal Disclaimer */}
        <div className="flex items-center justify-between pt-12 mt-12 border-t border-gray-100 print:pt-8 print:mt-8">
          <div className="flex flex-col gap-2">
            <div className="w-48 h-px bg-black opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Manager Authorized Signature</p>
            <p className="text-[8px] font-bold text-black opacity-40 uppercase tracking-widest mt-1">Audit Log ID: {reportDate.replace(/-/g, '')}-HQ-{Math.random().toString(36).substring(7).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-black uppercase tracking-widest">© {new Date().getFullYear()} Khan Hub HQ • Growth Points Ledger</p>
            <div className="flex items-center justify-end gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Integrity Verified</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
