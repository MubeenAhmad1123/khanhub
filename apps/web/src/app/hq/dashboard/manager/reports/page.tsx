'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import { 
  Loader2, Printer, Award, Clock, XCircle, ArrowRight, ArrowLeft, 
  Search, Filter, Calendar, Crown, Trophy, Medal, ChevronRight, 
  Coins, Sparkles, AlertCircle, AlertTriangle, ExternalLink, Shield,
  ThumbsUp, Check, X, ClipboardList, Star
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getDeptPrefix, getDeptCollection, StaffDept } from '@/lib/hq/superadmin/staff';
import type { HqStaff } from '@/types/hq';

const getSimpleId = (id: string) => {
  if (!id) return '';
  const prefixes = ['hq_', 'rehab_', 'spims_', 'hospital_', 'sukoon_', 'welfare_', 'jobcenter_', 'media_', 'it_', 'job-center_', 'social-media_'];
  for (const pref of prefixes) {
    if (id.startsWith(pref)) {
      return id.substring(pref.length);
    }
  }
  return id;
};

export default function ManagerReportsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staff, setStaff] = useState<HqStaff[]>([]);
  const [logs, setLogs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewingStaff, setViewingStaff] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<any | null>(null);
  
  // Real-time filters state
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [desigFilter, setDesigFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'points' | 'seniority'>('points');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || !['manager', 'superadmin'].includes(session.role)) {
      router.push('/hq/login');
    }
  }, [session, sessionLoading, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const depts = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'] as StaffDept[];

      // 1. Fetch active staff across all departments
      const staffSnaps = await Promise.all(
        depts.map(d => getDocs(collection(db, getDeptCollection(d))))
      );

      const allStaff: HqStaff[] = [];
      const seenIds = new Set<string>();

      const isEligibleStaff = (s: any) => {
        const r = String(s.role || '').toLowerCase();
        const desig = String(s.designation || '').toLowerCase();
        const n = String(s.name || s.displayName || '').toLowerCase();
        const e = String(s.email || '').toLowerCase();
        
        if (n.includes('super') || n.includes('network') || e.includes('super') || e.includes('network')) {
          return false;
        }

        const nameVal = (s.name || s.displayName || '').trim();
        if (!nameVal || nameVal === '—' || nameVal === '-') {
          return false;
        }

        const EXCLUDED_ROLES = ['patient', 'family', 'student', 'client', 'seeker', 'user', 'superadmin'];
        if (EXCLUDED_ROLES.some(ex => r.includes(ex) || desig.includes(ex))) {
          return false;
        }

        const statusStr = String(s.status || '').toLowerCase();
        const isActive = statusStr === 'active' && s.isActive !== false;

        return isActive;
      };

      staffSnaps.forEach((snap, i) => {
        snap.docs.forEach((docSnap: any) => {
          const data = docSnap.data();
          const sid = docSnap.id;
          if (isEligibleStaff(data) && !seenIds.has(sid)) {
            allStaff.push({
              id: sid,
              department: depts[i],
              ...data
            } as any);
            seenIds.add(sid);
          }
        });
      });

      // 2. Query logs date range for selectedMonth (optimized query performance)
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;

      let permissionErrorCount = 0;
      const handleQueryError = (err: any) => {
        console.error("[monthly page query error]:", err);
        const errMsg = String(err || '').toLowerCase();
        if (err?.code === 'permission-denied' || errMsg.includes('permission') || errMsg.includes('insufficient')) {
          permissionErrorCount++;
        }
        return { docs: [] } as any;
      };

      const [attSnaps, dressSnaps, dutySnaps, contribSnaps, fineSnaps] = await Promise.all([
        Promise.all(depts.map(d => 
          getDocs(query(collection(db, `${getDeptPrefix(d)}_attendance`), where('date', '>=', startDate), where('date', '<=', endDate)))
            .catch(handleQueryError)
        )),
        Promise.all(depts.map(d => 
          getDocs(query(collection(db, `${getDeptPrefix(d)}_dress_logs`), where('date', '>=', startDate), where('date', '<=', endDate)))
            .catch(handleQueryError)
        )),
        Promise.all(depts.map(d => 
          getDocs(query(collection(db, `${getDeptPrefix(d)}_duty_logs`), where('date', '>=', startDate), where('date', '<=', endDate)))
            .catch(handleQueryError)
        )),
        Promise.all(depts.map(d => 
          getDocs(query(collection(db, `${getDeptPrefix(d)}_contributions`), where('date', '>=', startDate), where('date', '<=', endDate)))
            .catch(handleQueryError)
        )),
        Promise.all(depts.map(d => 
          getDocs(query(collection(db, `${getDeptPrefix(d)}_fines`), where('date', '>=', startDate), where('date', '<=', endDate)))
            .catch(handleQueryError)
        ))
      ]);

      if (permissionErrorCount > 0) {
        toast.error("Database permission errors encountered. Re-login suggested.", { duration: 5000 });
      }

      // Aggregate maps by `${simpleSid}_${date}`
      const attMap = new Map();
      const dressMap = new Map();
      const dutyMap = new Map();
      const contribMap = new Map();
      const fineMap = new Map();

      attSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        const date = data.date;
        if (!data.staffId && sid.endsWith(`_${date}`)) {
          sid = sid.slice(0, -(date.length + 1));
        }
        const simpleSid = getSimpleId(sid);
        attMap.set(`${simpleSid}_${date}`, data);
      }));

      dressSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        const date = data.date;
        if (!data.staffId && sid.endsWith(`_${date}`)) {
          sid = sid.slice(0, -(date.length + 1));
        }
        const simpleSid = getSimpleId(sid);
        dressMap.set(`${simpleSid}_${date}`, data);
      }));

      dutySnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        const date = data.date;
        if (!data.staffId && sid.endsWith(`_${date}`)) {
          sid = sid.slice(0, -(date.length + 1));
        }
        const simpleSid = getSimpleId(sid);
        dutyMap.set(`${simpleSid}_${date}`, data);
      }));

      contribSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        const date = data.date;
        if (!data.staffId && sid.endsWith(`_${date}`)) {
          sid = sid.slice(0, -(date.length + 1));
        }
        const simpleSid = getSimpleId(sid);
        contribMap.set(`${simpleSid}_${date}`, data);
      }));

      fineSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        const date = data.date;
        if (!data.staffId && sid.endsWith(`_${date}`)) {
          sid = sid.slice(0, -(date.length + 1));
        }
        const simpleSid = getSimpleId(sid);
        const key = `${simpleSid}_${date}`;
        const existing = fineMap.get(key) || [];
        fineMap.set(key, [...existing, data]);
      }));

      setStaff(allStaff);
      setLogs({ attMap, dressMap, dutyMap, contribMap, fineMap });
    } catch (err) {
      console.error("Error fetching report data:", err);
      toast.error("Failed to fetch monthly reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchData();
  }, [session, selectedMonth]);

  // Aggregate monthly stats exactly like the daily page
  const getStaffStats = (member: HqStaff) => {
    if (!logs) return { 
      attPct: 0, dressPct: 0, dutyPct: 0, gpPct: 0, 
      totalPoints: 0, presents: 0, absents: 0, lates: 0, leaves: 0, unmarked: 0,
      finesTotal: 0, maxPoints: 120, dailyBreakdown: [] 
    };

    const { attMap, dressMap, dutyMap, contribMap, fineMap } = logs;
    const simpleSid = getSimpleId(member.id);

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const maxPoints = daysInMonth * 4;

    let presents = 0;
    let absents = 0;
    let lates = 0;
    let leaves = 0;
    let unmarked = 0;

    let dressCompliantDays = 0;
    let dressTotalDays = 0;

    let dutyCompliantDays = 0;
    let dutyTotalDays = 0;

    let gpApprovedDays = 0;
    let gpTotalDays = 0;

    let totalPoints = 0;
    let finesTotal = 0;

    const dailyBreakdown: any[] = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      const date = `${selectedMonth}-${dayStr}`;
      const logKey = `${simpleSid}_${date}`;

      const att = attMap.get(logKey);
      const dress = dressMap.get(logKey);
      const duty = dutyMap.get(logKey);
      const contrib = contribMap.get(logKey);
      const fines = fineMap.get(logKey) || [];

      // Day Fines
      const dayFines = fines.reduce((acc: number, f: any) => acc + (Number(f.amount) || 0), 0);
      finesTotal += dayFines;

      // Attendance point calculations
      let attStatus = 'unmarked';
      let isLate = false;
      if (att) {
        attStatus = att.status || 'unmarked';
        isLate = att.isLate || false;
      }

      let attendanceStatus = 'unmarked';
      if (attStatus === 'paid_leave' || attStatus === 'unpaid_leave' || attStatus === 'leave') {
        attendanceStatus = 'leave';
      } else if (['present', 'absent', 'late', 'unmarked', 'leave'].includes(attStatus)) {
        attendanceStatus = attStatus;
      }
      if (isLate && attendanceStatus === 'present') {
        attendanceStatus = 'late';
      }

      if (attendanceStatus === 'present') presents++;
      else if (attendanceStatus === 'late') lates++;
      else if (attendanceStatus === 'absent') absents++;
      else if (attendanceStatus === 'leave') leaves++;
      else unmarked++;

      const onLeave = attendanceStatus === 'leave';

      // Dress compliance points
      let uniformStatus = 'no';
      if (onLeave) {
        uniformStatus = 'na';
      } else if (dress) {
        uniformStatus = dress.status || 'no';
      } else {
        uniformStatus = 'unmarked';
      }

      if (!onLeave && uniformStatus !== 'unmarked') {
        dressTotalDays++;
        if (uniformStatus === 'yes') dressCompliantDays++;
      }

      // Duty compliance points
      let dutyStatus = 'no';
      if (onLeave) {
        dutyStatus = 'na';
      } else if (duty) {
        dutyStatus = duty.status || 'no';
      } else {
        dutyStatus = 'unmarked';
      }

      if (!onLeave && dutyStatus !== 'unmarked') {
        dutyTotalDays++;
        if (dutyStatus === 'yes') dutyCompliantDays++;
      }

      // Growth Point (GP) compliance points
      const contribScore = (contrib && (contrib.status === 'yes' || contrib.isApproved === true)) ? 1 : 0;
      if (!onLeave) {
        gpTotalDays++;
        if (contribScore > 0) gpApprovedDays++;
      }

      // Exact points rules
      const attPoint = (attendanceStatus === 'present') ? 1 : 0;
      const uniformPoint = (!onLeave && uniformStatus === 'yes') ? 1 : 0;
      const dutyPoint = (!onLeave && dutyStatus === 'yes') ? 1 : 0;
      const contribPoint = (!onLeave && contribScore > 0) ? 1 : 0;

      const dailyPoints = attPoint + uniformPoint + dutyPoint + contribPoint;

      if (!onLeave && attendanceStatus !== 'unmarked') {
        totalPoints += dailyPoints;
      }

      dailyBreakdown.push({
        date,
        day: i,
        attendance: attendanceStatus,
        uniform: uniformStatus,
        duty: dutyStatus,
        gp: contribScore > 0 ? 'yes' : (contrib ? 'pending' : 'no'),
        gpLink: contrib?.link || '',
        score: dailyPoints,
        fines: dayFines,
        fineReasons: fines.map((f: any) => `${f.reason} (₨${f.amount})`).join(', '),
        details: {
          uniformItems: dress?.items || [],
          dutyItems: duty?.duties || []
        }
      });
    }

    const totalLogged = presents + lates + absents;
    const attPct = totalLogged > 0 ? Math.round((presents / totalLogged) * 100) : 0;
    const dressPct = dressTotalDays > 0 ? Math.round((dressCompliantDays / dressTotalDays) * 100) : 0;
    const dutyPct = dutyTotalDays > 0 ? Math.round((dutyCompliantDays / dutyTotalDays) * 100) : 0;
    const gpPct = gpTotalDays > 0 ? Math.round((gpApprovedDays / gpTotalDays) * 100) : 0;

    return {
      attPct,
      dressPct,
      dutyPct,
      gpPct,
      totalPoints,
      presents,
      absents,
      lates,
      leaves,
      unmarked,
      finesTotal,
      maxPoints,
      dailyBreakdown
    };
  };

  const getSeniorityRank = (desig: string) => {
    const d = String(desig || '').toLowerCase();
    if (d.includes('executive') || d.includes('director')) return 10;
    if (d.includes('manager')) return 9;
    if (d.includes('supervisor')) return 8;
    if (d.includes('doctor') || d.includes('clinical') || d.includes('physiotherapist')) return 7;
    if (d.includes('nurse') || d.includes('teacher') || d.includes('lecturer') || d.includes('counselor') || d.includes('personnel')) return 6;
    if (d.includes('worker') || d.includes('junior')) return 5;
    if (d.includes('contract')) return 4;
    if (d.includes('trial')) return 3;
    if (d.includes('internee') || d.includes('intern')) return 2;
    if (d.includes('volunteer')) return 1;
    return 0;
  };

  // Process and sort staff listings
  const processedStaff = useMemo(() => {
    let result = staff.map(m => {
      const stats = getStaffStats(m);
      return { ...m, stats };
    });

    // Apply real-time filters
    result = result.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.designation || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.employeeId || '').toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === 'all' || r.department === deptFilter;
      const matchesDesig = desigFilter === 'all' || r.designation === desigFilter;
      return matchesSearch && matchesDept && matchesDesig;
    });

    // Apply sorting
    if (sortBy === 'points') {
      result.sort((a, b) => b.stats.totalPoints - a.stats.totalPoints || getSeniorityRank(b.designation || '') - getSeniorityRank(a.designation || ''));
    } else {
      result.sort((a, b) => getSeniorityRank(b.designation || '') - getSeniorityRank(a.designation || '') || b.stats.totalPoints - a.stats.totalPoints);
    }

    return result;
  }, [staff, logs, search, deptFilter, desigFilter, sortBy]);

  // Designations extractor for the drop-down filter
  const designations = useMemo(() => {
    const set = new Set<string>();
    staff.forEach(s => {
      if (s.designation) set.add(s.designation.trim());
    });
    return Array.from(set).sort();
  }, [staff]);

  // Podium Positions (Top 3 overall)
  const podiumStaff = useMemo(() => {
    // We get the overall top 3 active staff in the list before specific visual search filters are applied
    const overallRanked = staff.map(m => {
      const stats = getStaffStats(m);
      return { ...m, stats };
    }).sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);

    return {
      first: overallRanked[0] || null,
      second: overallRanked[1] || null,
      third: overallRanked[2] || null,
    };
  }, [staff, logs]);

  const handleOpenStaffModal = (member: any) => {
    setViewingStaff(member);
    // Auto-select the first logged day or today
    const logged = member.stats.dailyBreakdown.find((b: any) => b.attendance !== 'unmarked');
    setSelectedDay(logged || member.stats.dailyBreakdown[0] || null);
  };

  const getCalendarCells = () => {
    if (!selectedMonth) return [];
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    
    // Day index of 1st day of month (0 = Sun, 1 = Mon...)
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Convert to Monday start index (0 = Mon, 6 = Sun)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const cells = [];
    // Pad initial days
    for (let i = 0; i < adjustedFirstDay; i++) {
      cells.push(null);
    }
    // Add real days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push(i);
    }
    return cells;
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Loading Performance Intelligence...</p>
        </div>
      </div>
    );
  }

  const { first, second, third } = podiumStaff;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans p-3 sm:p-6 md:p-8 pb-32 max-w-full overflow-x-hidden print:bg-white print:p-0" id="reports-print">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Modern Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link
              href="/hq/dashboard/manager"
              className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl hover:shadow-md active:scale-95 transition-all duration-200"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Monthly Staff Audit Ledger</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 font-medium text-xs sm:text-sm text-slate-500">
                <span>Unified Monthly Performance Analytics</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <Link href="/hq/dashboard/manager/reports/daily" className="text-indigo-600 font-bold hover:underline flex items-center gap-1 hover:text-indigo-700 transition-colors">
                  Open Daily Audit Log <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 w-4 h-4 pointer-events-none" />
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)} 
                className="w-full sm:w-auto bg-white border border-slate-100 rounded-2xl pl-11 pr-5 py-3 text-slate-800 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm cursor-pointer" 
              />
            </div>
            <button 
              onClick={() => window.print()} 
              className="bg-white hover:bg-slate-50 border border-slate-100 text-slate-700 font-bold text-xs px-5 py-3 rounded-2xl transition-all shadow-sm flex items-center gap-2 hover:shadow-md active:scale-95 duration-200"
            >
              <Printer size={16} className="text-slate-500" /> Print Table
            </button>
          </div>
        </div>

        {/* ==================== PODIUM TOP 3 SECTION ==================== */}
        {first && (
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl border border-indigo-900/50 print:hidden">
            {/* Visual background decorations */}
            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-[30rem] h-[30rem] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4 bg-indigo-900/40 border border-indigo-700/30 px-4 py-1.5 rounded-full">
                <Sparkles className="text-amber-400 w-4 h-4 animate-bounce" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-indigo-200">Departmental Leaderboard Champions</span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white text-center tracking-tight">Top Performers Podium</h2>
              <p className="text-xs text-indigo-300 font-medium text-center mt-1">Rewarding consistent daily execution, uniform adherence, and contribution points</p>
              
              {/* Podium Base Layout */}
              <div className="grid grid-cols-3 items-end gap-3 sm:gap-6 md:gap-10 w-full max-w-3xl mt-12">
                
                {/* 2nd Place (Silver) */}
                {second ? (
                  <div className="flex flex-col items-center group cursor-pointer" onClick={() => handleOpenStaffModal(second)}>
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-slate-800/80 border-2 border-slate-300 flex items-center justify-center text-lg sm:text-2xl font-black text-slate-100 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                        {second.photoUrl ? (
                          <img src={second.photoUrl} alt={second.name} className="w-full h-full object-cover" />
                        ) : (
                          second.name?.[0]
                        )}
                      </div>
                      <div className="absolute -top-3 -right-2 bg-slate-300 border border-slate-100 text-slate-900 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md">2</div>
                    </div>
                    
                    <div className="text-center mt-3 max-w-full">
                      <p className="font-extrabold text-xs sm:text-sm truncate w-24 sm:w-36 text-white group-hover:text-indigo-200 transition-colors">{second.name}</p>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">{second.designation || 'Staff'}</p>
                    </div>

                    {/* Silver Stand */}
                    <div className="w-full bg-gradient-to-t from-slate-700/80 to-slate-800/40 border border-slate-700/50 rounded-t-2xl mt-4 h-24 sm:h-32 flex flex-col justify-between p-3 text-center shadow-lg">
                      <div className="flex justify-center">
                        <Medal size={22} className="text-slate-300" />
                      </div>
                      <div>
                        <p className="text-slate-100 font-extrabold text-sm sm:text-base">{second.stats.totalPoints}</p>
                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">Points</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-10" />
                )}

                {/* 1st Place (Gold Champion) */}
                {first ? (
                  <div className="flex flex-col items-center group cursor-pointer -translate-y-2 relative" onClick={() => handleOpenStaffModal(first)}>
                    
                    {/* Crown badge */}
                    <div className="absolute -top-10 animate-pulse">
                      <Crown size={36} className="text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    </div>

                    <div className="relative">
                      <div className="w-18 h-18 sm:w-24 sm:h-24 rounded-[1.5rem] bg-indigo-900 border-3 border-amber-400 flex items-center justify-center text-2xl sm:text-4xl font-black text-amber-400 overflow-hidden shadow-2xl ring-4 ring-amber-400/20 group-hover:scale-105 transition-transform">
                        {first.photoUrl ? (
                          <img src={first.photoUrl} alt={first.name} className="w-full h-full object-cover" />
                        ) : (
                          first.name?.[0]
                        )}
                      </div>
                      <div className="absolute -top-3 -right-2 bg-amber-400 border border-amber-200 text-indigo-950 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md">1</div>
                    </div>
                    
                    <div className="text-center mt-3 max-w-full">
                      <p className="font-black text-xs sm:text-base truncate w-24 sm:w-44 text-white group-hover:text-amber-200 transition-colors">{first.name}</p>
                      <p className="text-[9px] sm:text-[10px] font-bold text-amber-400/80 uppercase tracking-wider mt-0.5 truncate">{first.designation || 'Champion'}</p>
                    </div>

                    {/* Gold Stand */}
                    <div className="w-full bg-gradient-to-t from-amber-600/50 via-amber-600/20 to-amber-700/50 border border-amber-500/50 rounded-t-3xl mt-4 h-32 sm:h-44 flex flex-col justify-between p-4 text-center shadow-2xl relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 rounded-t-3xl pointer-events-none" />
                      <div className="flex justify-center relative z-10">
                        <Trophy size={28} className="text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
                      </div>
                      <div className="relative z-10">
                        <p className="text-white font-black text-base sm:text-2xl tracking-tight leading-none">{first.stats.totalPoints}</p>
                        <p className="text-[9px] sm:text-[10px] font-black text-amber-200 uppercase tracking-widest mt-1">Points</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-10" />
                )}

                {/* 3rd Place (Bronze) */}
                {third ? (
                  <div className="flex flex-col items-center group cursor-pointer" onClick={() => handleOpenStaffModal(third)}>
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-amber-950/80 border-2 border-amber-700/80 flex items-center justify-center text-lg sm:text-2xl font-black text-amber-600 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                        {third.photoUrl ? (
                          <img src={third.photoUrl} alt={third.name} className="w-full h-full object-cover" />
                        ) : (
                          third.name?.[0]
                        )}
                      </div>
                      <div className="absolute -top-3 -right-2 bg-amber-700 border border-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md">3</div>
                    </div>
                    
                    <div className="text-center mt-3 max-w-full">
                      <p className="font-extrabold text-xs sm:text-sm truncate w-24 sm:w-36 text-white group-hover:text-indigo-200 transition-colors">{third.name}</p>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">{third.designation || 'Staff'}</p>
                    </div>

                    {/* Bronze Stand */}
                    <div className="w-full bg-gradient-to-t from-amber-900/60 to-amber-950/40 border border-amber-900/40 rounded-t-2xl mt-4 h-20 sm:h-28 flex flex-col justify-between p-3 text-center shadow-lg">
                      <div className="flex justify-center">
                        <Medal size={22} className="text-amber-700" />
                      </div>
                      <div>
                        <p className="text-amber-100 font-extrabold text-sm sm:text-base">{third.stats.totalPoints}</p>
                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">Points</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-10" />
                )}

              </div>
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm print:hidden space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search staff by name, designation, or ID..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100/80 rounded-2xl pl-11 pr-5 py-3.5 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-800"
              />
            </div>
            
            {/* Dropdowns & Sorts */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Department Dropdown */}
              <div className="relative flex-1 sm:flex-initial min-w-[130px]">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 w-3.5 h-3.5" />
                <select 
                  value={deptFilter} 
                  onChange={e => setDeptFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-8 py-3 text-[11px] font-extrabold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer appearance-none capitalize"
                >
                  <option value="all">All Departments</option>
                  <option value="hq">HQ</option>
                  <option value="rehab">Rehab</option>
                  <option value="spims">SPIMS</option>
                  <option value="hospital">Hospital</option>
                  <option value="sukoon">Sukoon</option>
                  <option value="welfare">Welfare</option>
                  <option value="job-center">Job Center</option>
                  <option value="social-media">Social Media</option>
                  <option value="it">IT</option>
                </select>
              </div>

              {/* Designation Dropdown */}
              <div className="relative flex-1 sm:flex-initial min-w-[130px]">
                <select 
                  value={desigFilter} 
                  onChange={e => setDesigFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-extrabold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer appearance-none"
                >
                  <option value="all">All Designations</option>
                  {designations.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Sort Toggle */}
              <div className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl p-1">
                <button 
                  onClick={() => setSortBy('points')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${sortBy === 'points' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  By Points
                </button>
                <button 
                  onClick={() => setSortBy('seniority')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${sortBy === 'seniority' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  By Seniority
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Leaderboard Table Container */}
        <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
          <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-55/10">
            <div className="flex items-center gap-2.5">
              <Award className="text-indigo-600 w-5 h-5" />
              <h3 className="text-slate-900 font-extrabold text-base">Monthly Scoreboard Ledgers</h3>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{processedStaff.length} active staff found</span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['Rank', 'Staff Member', 'Department', 'Attendance Compliance', 'Dress Code', 'Duty Accomplished', 'Contributions', 'Fines', 'Monthly Points'].map(h => (
                    <th key={h} className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedStaff.map((member, index) => {
                  const { stats } = member;
                  const hasFines = stats.finesTotal > 0;
                  
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors duration-200 group">
                      <td className="px-6 py-4.5">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border ${
                          index === 0 ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm' : 
                          index === 1 ? 'bg-slate-50 text-slate-600 border-slate-200' : 
                          index === 2 ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                          'bg-slate-50/50 text-slate-400 border-slate-100'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4.5 cursor-pointer min-w-[200px]" onClick={() => handleOpenStaffModal(member)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-sm text-indigo-600 overflow-hidden shadow-inner shrink-0">
                            {member.photoUrl ? (
                              <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              member.name?.[0]
                            )}
                          </div>
                          <div>
                            <p className="text-slate-900 font-extrabold text-sm group-hover:text-indigo-600 transition-colors leading-snug">{member.name}</p>
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mt-0.5">{member.designation || 'Staff Member'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4.5">
                        <span className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-black border border-slate-100 uppercase tracking-wide">
                          {member.department}
                        </span>
                      </td>

                      {/* Progress Metrics */}
                      {[
                        { val: stats.attPct, color: 'emerald' },
                        { val: stats.dressPct, color: 'blue' },
                        { val: stats.dutyPct, color: 'purple' },
                        { val: stats.gpPct, color: 'pink' }
                      ].map((item, i) => (
                        <td key={i} className="px-6 py-4.5">
                          <div className="flex items-center gap-3.5">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100 shrink-0">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  item.val >= 85 ? 'bg-emerald-500' : item.val >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`} 
                                style={{ width: `${item.val}%` }} 
                              />
                            </div>
                            <span className={`text-[11px] font-black ${
                              item.val >= 85 ? 'text-emerald-600' : item.val >= 50 ? 'text-amber-600' : 'text-rose-600'
                            }`}>{item.val}%</span>
                          </div>
                        </td>
                      ))}

                      {/* Fines */}
                      <td className="px-6 py-4.5">
                        {hasFines ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 font-extrabold text-[10px] tracking-wide shrink-0">
                            <Coins size={12} /> ₨{stats.finesTotal.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold text-xs">—</span>
                        )}
                      </td>

                      {/* Cumulative points */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-600 font-black text-sm bg-indigo-50 border border-indigo-100/50 px-3 py-2 rounded-xl shadow-inner min-w-[70px] text-center">
                            {stats.totalPoints} <span className="text-[10px] text-indigo-400 font-bold">/ {stats.maxPoints}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {processedStaff.length === 0 && (
            <div className="flex flex-col items-center justify-center p-16 text-center border-t border-slate-100">
              <AlertTriangle className="text-slate-300 w-12 h-12 mb-3" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">No matching staff audits found</p>
              <p className="text-slate-400 text-xs mt-1">Try relaxing your search query or department filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== STAFF DETAILED REPORT MODAL ==================== */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 max-h-screen overflow-hidden print:static print:z-0 print:p-0 print:overflow-visible">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm print:hidden" onClick={() => setViewingStaff(null)} />
          
          <div className="relative bg-white border border-slate-100 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-full print:rounded-none print:overflow-visible print:bg-white">
            
            <div className="p-5 sm:p-8 space-y-6">
              
              {/* Modal Header */}
              <div className="flex justify-between items-start print:hidden">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl font-black text-indigo-600 overflow-hidden shadow-inner">
                    {viewingStaff.photoUrl ? (
                      <img src={viewingStaff.photoUrl} alt={viewingStaff.name} className="w-full h-full object-cover" />
                    ) : (
                      viewingStaff.name?.[0]
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">{viewingStaff.name}</h2>
                    <p className="text-indigo-600 text-xs font-extrabold tracking-wide mt-1.5 uppercase">{viewingStaff.designation || 'Staff Member'}</p>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1.5 capitalize">{viewingStaff.department} Department • ID: {viewingStaff.employeeId || viewingStaff.customId}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setViewingStaff(null)} 
                  className="text-slate-400 hover:text-slate-600 transition-all bg-slate-50 hover:bg-slate-100 border border-slate-100 p-2.5 rounded-full"
                >
                  <XCircle size={22} />
                </button>
              </div>

              {/* Print Only Title Block */}
              <div className="hidden print:block border-b border-slate-200 pb-4 mb-6">
                <h1 className="text-3xl font-black text-slate-900">Monthly Performance Intelligence Audit Ledger</h1>
                <p className="text-sm font-bold text-indigo-600 mt-1 uppercase tracking-wider">Staff Ledger: {viewingStaff.name} ({viewingStaff.designation})</p>
                <p className="text-xs text-slate-400 mt-1">Audit Month: {selectedMonth} • Department: {viewingStaff.department.toUpperCase()} • Generated Ref: KH-MPL-{selectedMonth.replace('-', '')}</p>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Cumulative Score', val: `${viewingStaff.stats.totalPoints} / ${viewingStaff.stats.maxPoints}`, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100/50' },
                  { label: 'Attendance Rate', val: `${viewingStaff.stats.attPct}%`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100/50' },
                  { label: 'Dress Code Rate', val: `${viewingStaff.stats.dressPct}%`, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100/50' },
                  { label: 'Duty Done Rate', val: `${viewingStaff.stats.dutyPct}%`, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100/50' },
                  { label: 'Fines Total', val: `₨${viewingStaff.stats.finesTotal.toLocaleString()}`, color: viewingStaff.stats.finesTotal > 0 ? 'text-rose-600' : 'text-slate-400', bg: viewingStaff.stats.finesTotal > 0 ? 'bg-rose-50 border-rose-100/50' : 'bg-slate-50 border-slate-100/50' },
                ].map(s => (
                  <div key={s.label} className={`border rounded-2xl p-4 text-center ${s.bg}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 truncate">{s.label}</p>
                    <p className={`text-base sm:text-lg font-black ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Interactive Calendar Heatmap */}
              <div className="bg-slate-50 border border-slate-100/80 rounded-3xl p-4 sm:p-6 print:hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-slate-900 font-extrabold text-sm sm:text-base flex items-center gap-2">
                      <Calendar size={18} className="text-indigo-600 animate-pulse" />
                      Monthly Performance Calendar Heatmap
                    </h3>
                    <p className="text-slate-400 text-[11px] font-medium mt-0.5">Click any day box below to audit daily granular logs</p>
                  </div>
                  
                  {/* Heatmap Legend */}
                  <div className="flex flex-wrap gap-2 text-[9px] font-extrabold uppercase tracking-wide">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-600 block shadow-sm" /> 4/4 Pts</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-200 block" /> 2-3 Pts</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-200 block" /> 1 Pt</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-200 block" /> Absent</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-200 block" /> Leave</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-200 block" /> Unmarked</div>
                  </div>
                </div>

                {/* Calendar Layout */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {/* Weekday headers */}
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => (
                    <div key={w} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-1">{w}</div>
                  ))}
                  
                  {/* Calendar cells */}
                  {getCalendarCells().map((cell, idx) => {
                    if (cell === null) {
                      return <div key={`empty-${idx}`} className="aspect-square bg-slate-100/30 rounded-xl" />;
                    }

                    const dayStr = String(cell).padStart(2, '0');
                    const dayDate = `${selectedMonth}-${dayStr}`;
                    const dayLog = viewingStaff.stats.dailyBreakdown.find((b: any) => b.date === dayDate);
                    
                    let cellBg = 'bg-slate-200 hover:bg-slate-300';
                    let cellText = 'text-slate-600 font-extrabold';
                    let borderClass = 'border border-slate-100';

                    if (dayLog) {
                      const isUnmarked = dayLog.attendance === 'unmarked';
                      const isAbsent = dayLog.attendance === 'absent';
                      const isLeave = dayLog.attendance === 'leave';

                      if (isLeave) {
                        cellBg = 'bg-purple-100 hover:bg-purple-200';
                        cellText = 'text-purple-700 font-extrabold';
                        borderClass = 'border border-purple-200';
                      } else if (isAbsent) {
                        cellBg = 'bg-rose-100 hover:bg-rose-200';
                        cellText = 'text-rose-700 font-extrabold';
                        borderClass = 'border border-rose-200';
                      } else if (isUnmarked) {
                        cellBg = 'bg-slate-100 hover:bg-slate-250';
                        cellText = 'text-slate-400 font-semibold';
                      } else {
                        // Numeric scores
                        if (dayLog.score === 4) {
                          cellBg = 'bg-emerald-600 hover:bg-emerald-700';
                          cellText = 'text-white font-black';
                        } else if (dayLog.score >= 2) {
                          cellBg = 'bg-emerald-100 hover:bg-emerald-200';
                          cellText = 'text-emerald-800 font-extrabold';
                          borderClass = 'border border-emerald-300';
                        } else {
                          cellBg = 'bg-amber-100 hover:bg-amber-250';
                          cellText = 'text-amber-800 font-extrabold';
                          borderClass = 'border border-amber-300';
                        }
                      }
                    }

                    const isCurrentlySelected = selectedDay && selectedDay.date === dayDate;

                    return (
                      <button 
                        key={`cell-${cell}`}
                        onClick={() => setSelectedDay(dayLog || null)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200 ${cellBg} ${cellText} ${borderClass} ${
                          isCurrentlySelected ? 'ring-4 ring-indigo-500 shadow-lg scale-105 z-10' : 'hover:scale-103'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">{cell}</span>
                        {dayLog && dayLog.attendance !== 'unmarked' && dayLog.attendance !== 'leave' && dayLog.attendance !== 'absent' && (
                          <span className="text-[8px] sm:text-[9px] opacity-80 leading-none mt-0.5">{dayLog.score}★</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day details subpanel */}
              {selectedDay && (
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 shadow-inner print:hidden animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Granular Day Audit Logs</h4>
                      <p className="text-xs text-indigo-600 font-extrabold mt-0.5">Selected Date: {selectedDay.date}</p>
                    </div>
                    <span className="text-xs font-black bg-indigo-100 border border-indigo-200/50 text-indigo-700 px-3 py-1 rounded-xl">
                      Score: {selectedDay.score} / 4 Pts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    {/* Attendance */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">1. Attendance</p>
                      <span className={`inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                        selectedDay.attendance === 'present' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        selectedDay.attendance === 'late' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                        selectedDay.attendance === 'absent' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                        selectedDay.attendance === 'leave' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                        'bg-slate-100 border-slate-200 text-slate-400'
                      }`}>
                        {selectedDay.attendance}
                      </span>
                    </div>

                    {/* Dress Code */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">2. Dress Compliance</p>
                      <span className={`inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                        selectedDay.uniform === 'yes' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        selectedDay.uniform === 'incomplete' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                        selectedDay.uniform === 'na' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                        'bg-rose-50 border-rose-100 text-rose-700'
                      }`}>
                        {selectedDay.uniform === 'yes' ? 'Full Compliant' : selectedDay.uniform === 'incomplete' ? 'Incomplete' : selectedDay.uniform === 'na' ? 'Not Applicable' : 'Non Compliant'}
                      </span>
                      
                      {/* Detailed dress missing items */}
                      {selectedDay.uniform === 'incomplete' && selectedDay.details?.uniformItems && (
                        <div className="mt-2 text-[9px] font-bold text-amber-600/80">
                          Missing: {selectedDay.details.uniformItems.filter((i: any) => i.status === 'no').map((i: any) => i.key).join(', ') || 'Dress items'}
                        </div>
                      )}
                    </div>

                    {/* Duties Checklist */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">3. Duty Checklist</p>
                      <span className={`inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                        selectedDay.duty === 'yes' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        selectedDay.duty === 'incomplete' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                        selectedDay.duty === 'na' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                        'bg-rose-50 border-rose-100 text-rose-700'
                      }`}>
                        {selectedDay.duty === 'yes' ? 'Accomplished' : selectedDay.duty === 'incomplete' ? 'Incomplete' : selectedDay.duty === 'na' ? 'Not Applicable' : 'Incomplete'}
                      </span>

                      {/* Detailed pending duties */}
                      {selectedDay.duty === 'incomplete' && selectedDay.details?.dutyItems && (
                        <div className="mt-2 text-[9px] font-bold text-amber-600/80">
                          Pending: {selectedDay.details.dutyItems.filter((i: any) => i.status !== 'done').map((i: any) => i.key).join(', ') || 'Duties'}
                        </div>
                      )}
                    </div>

                    {/* Contributions */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">4. Contributions / GP</p>
                      <span className={`inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                        selectedDay.gp === 'yes' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        selectedDay.gp === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                        'bg-slate-100 border-slate-200 text-slate-400'
                      }`}>
                        {selectedDay.gp === 'yes' ? 'GP Approved' : selectedDay.gp === 'pending' ? 'GP Pending' : 'No Submission'}
                      </span>
                      {selectedDay.gpLink && (
                        <a 
                          href={selectedDay.gpLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="mt-2 text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          View Link <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Fines Subcard */}
                  {selectedDay.fines > 0 && (
                    <div className="mt-4 bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
                      <Shield className="text-rose-600 shrink-0" size={20} />
                      <div>
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Incurred Penalty Fines</p>
                        <p className="text-xs font-extrabold text-rose-800 mt-0.5">₨{selectedDay.fines.toLocaleString()} — {selectedDay.fineReasons || 'Unexcused audit failure'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Printable day-by-day table */}
              <div className="space-y-4">
                <h3 className="text-slate-900 font-extrabold text-sm sm:text-base flex items-center gap-2">
                  <ClipboardList size={18} className="text-indigo-600" /> Complete Day-by-Day Historical Log
                </h3>
                
                <div className="overflow-x-auto w-full border border-slate-100 rounded-3xl max-h-72 overflow-y-auto print:max-h-none print:overflow-visible">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150">
                        {['Date', 'Attendance', 'Uniform', 'Duties', 'GP Contribution', 'Fines', 'Daily Score'].map(h => (
                          <th key={h} className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {viewingStaff.stats.dailyBreakdown.map((b: any, idx: number) => {
                        const isActive = b.attendance !== 'unmarked';
                        
                        return (
                          <tr key={idx} className={`hover:bg-slate-50/50 ${!isActive ? 'opacity-50 bg-slate-50/30' : ''}`}>
                            <td className="px-5 py-3 font-extrabold text-slate-800">{b.date}</td>
                            
                            <td className="px-5 py-3 font-semibold uppercase text-[10px]">
                              <span className={`px-2.5 py-1 rounded-lg font-black tracking-wide ${
                                b.attendance === 'present' ? 'bg-emerald-50 text-emerald-700' :
                                b.attendance === 'late' ? 'bg-amber-50 text-amber-700' :
                                b.attendance === 'absent' ? 'bg-rose-50 text-rose-700' :
                                b.attendance === 'leave' ? 'bg-purple-50 text-purple-700' :
                                'text-slate-400'
                              }`}>
                                {b.attendance}
                              </span>
                            </td>

                            <td className="px-5 py-3 font-bold uppercase text-[9px]">
                              <span className={b.uniform === 'yes' ? 'text-emerald-600' : b.uniform === 'incomplete' ? 'text-amber-600' : b.uniform === 'na' ? 'text-purple-600' : 'text-rose-600'}>
                                {b.uniform === 'yes' ? 'yes' : b.uniform === 'incomplete' ? 'incomplete' : b.uniform === 'na' ? 'na' : 'no'}
                              </span>
                            </td>

                            <td className="px-5 py-3 font-bold uppercase text-[9px]">
                              <span className={b.duty === 'yes' ? 'text-emerald-600' : b.duty === 'incomplete' ? 'text-amber-600' : b.duty === 'na' ? 'text-purple-600' : 'text-rose-600'}>
                                {b.duty === 'yes' ? 'yes' : b.duty === 'incomplete' ? 'incomplete' : b.duty === 'na' ? 'na' : 'no'}
                              </span>
                            </td>

                            <td className="px-5 py-3">
                              {b.gpLink ? (
                                <a href={b.gpLink} target="_blank" rel="noreferrer" className="text-indigo-600 font-extrabold hover:underline inline-flex items-center gap-0.5">
                                  Link <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-slate-400 font-bold uppercase text-[9px]">{b.gp}</span>
                              )}
                            </td>

                            <td className="px-5 py-3 font-extrabold text-slate-800">
                              {b.fines > 0 ? (
                                <span className="text-rose-600 font-black">₨{b.fines.toLocaleString()}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            <td className="px-5 py-3 font-black text-slate-800">
                              {isActive ? `${b.score} / 4` : <span className="text-slate-300 font-bold">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action row */}
              <div className="flex gap-4 pt-6 border-t border-slate-200 print:hidden">
                <button 
                  onClick={() => {
                    const attCount = viewingStaff.stats.presents + viewingStaff.stats.lates;
                    if (attCount < 7) {
                      toast.error("Audit requires at least 7 active logs inside the selected month");
                      return;
                    }
                    window.print();
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 duration-200"
                >
                  <Printer size={16} /> Print Monthly Audit Record
                </button>
                <button 
                  onClick={() => router.push(`/hq/dashboard/manager/staff/${viewingStaff.department}_${viewingStaff.id}`)}
                  className="px-6 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs uppercase tracking-wider py-4 rounded-2xl transition-all border border-slate-200 active:scale-95 duration-200 shadow-sm"
                >
                  Go to Employee Profile
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
