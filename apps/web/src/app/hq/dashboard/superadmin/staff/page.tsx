'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { listStaffCards, type StaffDept, type StaffCardRow } from '@/lib/hq/superadmin/staff';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { 
  Users2, 
  Award, 
  Briefcase, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  Star, 
  TrendingUp,
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  Shirt,
  Clock,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEPT_INFO: Record<string, { label: string; color: string; border: string; bg: string; text: string; gradient: string }> = {
  hq: { label: 'HQ Governance', color: 'bg-purple-600', border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-600', gradient: 'from-purple-500/10 to-transparent' },
  rehab: { label: 'Rehab Center', color: 'bg-teal-600', border: 'border-teal-200', bg: 'bg-teal-50', text: 'text-teal-600', gradient: 'from-teal-500/10 to-transparent' },
  spims: { label: 'SPIMS Academy', color: 'bg-sky-600', border: 'border-sky-200', bg: 'bg-sky-50', text: 'text-sky-600', gradient: 'from-sky-500/10 to-transparent' },
  hospital: { label: 'Khan Hospital', color: 'bg-rose-600', border: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-600', gradient: 'from-rose-500/10 to-transparent' },
  sukoon: { label: 'Sukoon Center', color: 'bg-indigo-600', border: 'border-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-600', gradient: 'from-indigo-500/10 to-transparent' },
  welfare: { label: 'Welfare', color: 'bg-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-600', gradient: 'from-emerald-500/10 to-transparent' },
  'job-center': { label: 'Job Center', color: 'bg-amber-600', border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-500/10 to-transparent' },
  'social-media': { label: 'Social Media', color: 'bg-fuchsia-600', border: 'border-fuchsia-200', bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', gradient: 'from-fuchsia-500/10 to-transparent' },
  'it': { label: 'IT Department', color: 'bg-violet-600', border: 'border-violet-200', bg: 'bg-violet-50', text: 'text-violet-600', gradient: 'from-violet-500/10 to-transparent' },
};

const SENIORITY_RANKS: Record<string, number> = {
  'Senior Management': 100,
  'Department Head': 90,
  'Senior Staff': 80,
  'Middle Staff': 60,
  'Junior Staff': 40,
  'Staff': 20,
  'Trainee': 10,
};

export default function SuperadminStaffPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { session, loading: sessionLoading } = useHqSession();
  const [dept, setDept] = useState<'all' | StaffDept>((sp.get('dept') as any) || 'all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'active_vacancy' | 'executive'>('active');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<StaffCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichedDepts, setEnrichedDepts] = useState<Set<StaffDept>>(new Set());
  const [enriching, setEnriching] = useState(false);
  
  // Drill-down States
  const [drillLevel, setDrillLevel] = useState<'overview' | 'presence' | 'department' | 'list'>('overview');
  const [drillPresence, setDrillPresence] = useState<'present' | 'absent' | 'leave' | null>(null);
  const [drillDept, setDrillDept] = useState<StaffDept | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent' | 'leave' | 'unmarked'>('all');
  const [activeChecklist, setActiveChecklist] = useState<{
    staffId: string;
    dept: StaffDept;
    type: 'uniform' | 'duty';
    items: { key: string; label: string }[];
    checkedKeys: string[];
    row: StaffCardRow;
  } | null>(null);

  const handleStatusChange = async (
    row: StaffCardRow,
    type: 'uniform' | 'duty',
    newStatus: 'yes' | 'no' | 'incomplete' | 'na'
  ) => {
    const config = type === 'uniform' 
      ? ((row as any).dressCodeConfig || [
          { key: 'uniform', label: 'Uniform' },
          { key: 'shoes', label: 'Polished Shoes' },
          { key: 'card', label: 'Identity Card' }
        ])
      : ((row as any).dutyConfig || [
          { key: 'morning', label: 'Morning Duty' },
          { key: 'afternoon', label: 'Afternoon Duty' },
          { key: 'evening', label: 'Evening Duty' }
        ]);

    if (newStatus === 'incomplete') {
      const checked: string[] = [];
      setActiveChecklist({
        staffId: row.staffId,
        dept: row.dept,
        type,
        items: config,
        checkedKeys: checked,
        row
      });
      return;
    }

    try {
      const { setDoc, doc, updateDoc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { getDeptPrefix } = await import('@/lib/hq/superadmin/staff');

      const todayStr = new Date().toISOString().split('T')[0];
      const prefix = getDeptPrefix(row.dept);
      const attId = `${row.staffId}_${todayStr}`;

      const items = config.map((c: any) => ({
        key: c.key,
        status: type === 'uniform' ? (newStatus === 'yes' ? 'yes' : 'no') : (newStatus === 'yes' ? 'done' : 'not_done')
      }));

      if (type === 'uniform') {
        if (newStatus !== 'na') {
          await setDoc(doc(db, `${prefix}_dress_logs`, attId), {
            staffId: row.staffId,
            date: todayStr,
            status: newStatus,
            items,
            updatedAt: Timestamp.now(),
            markedBy: session?.uid
          }, { merge: true });
        }
      } else {
        if (newStatus !== 'na') {
          await setDoc(doc(db, `${prefix}_duty_logs`, attId), {
            staffId: row.staffId,
            date: todayStr,
            status: newStatus,
            duties: items,
            updatedAt: Timestamp.now(),
            markedBy: session?.uid
          }, { merge: true });
        }
      }

      const currentUniform = type === 'uniform' ? newStatus : (row.todayUniformStatus || 'na');
      const currentDuty = type === 'duty' ? newStatus : (row.todayDutyStatus || 'na');
      
      const attPoint = row.isPresentToday || (row.todayDailyScore || 0) > 0 ? 1 : 0;
      const uniformPoint = currentUniform === 'yes' ? 1 : 0;
      const dutyPoint = currentDuty === 'yes' ? 1 : 0;
      const contribPoint = (row.todayDailyScore || 0) > (attPoint + (row.todayUniformStatus === 'yes' ? 1 : 0) + (row.todayDutyStatus === 'yes' ? 1 : 0)) ? 1 : 0;
      
      const newScore = attPoint + uniformPoint + dutyPoint + contribPoint;

      const staffDocRef = doc(db, `${prefix}_users`, row.staffId);
      await updateDoc(staffDocRef, {
        todayUniformStatus: currentUniform,
        todayDutyStatus: currentDuty,
        todayDailyScore: newScore,
        lastDailyAssessmentDate: todayStr,
        updatedAt: Timestamp.now()
      }).catch(err => {
        console.warn(`Could not sync to ${prefix}_users/${row.staffId}:`, err);
      });

      setRows(prev => prev.map(r => {
        if (r.id === row.id) {
          return {
            ...r,
            todayUniformStatus: type === 'uniform' ? newStatus : r.todayUniformStatus,
            todayDutyStatus: type === 'duty' ? newStatus : r.todayDutyStatus,
            todayDailyScore: newScore,
            isPresentToday: newScore > 0
          };
        }
        return r;
      }));

      const { toast } = await import('react-hot-toast');
      toast.success(`${type === 'uniform' ? 'Dress' : 'Duty'} status updated successfully!`);
    } catch (err) {
      console.error(err);
      const { toast } = await import('react-hot-toast');
      toast.error('Failed to update status');
    }
  };

  const handleSaveChecklist = async (
    staffId: string,
    dept: StaffDept,
    type: 'uniform' | 'duty',
    checkedKeys: string[],
    row: StaffCardRow
  ) => {
    const config = type === 'uniform' 
      ? ((row as any).dressCodeConfig || [
          { key: 'uniform', label: 'Uniform' },
          { key: 'shoes', label: 'Polished Shoes' },
          { key: 'card', label: 'Identity Card' }
        ])
      : ((row as any).dutyConfig || [
          { key: 'morning', label: 'Morning Duty' },
          { key: 'afternoon', label: 'Afternoon Duty' },
          { key: 'evening', label: 'Evening Duty' }
        ]);

    const total = config.length;
    const checkedCount = checkedKeys.length;

    let status: 'yes' | 'no' | 'incomplete' = 'no';
    if (checkedCount === total && total > 0) {
      status = 'yes';
    } else if (checkedCount > 0) {
      status = 'incomplete';
    }

    try {
      const { setDoc, doc, updateDoc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { getDeptPrefix } = await import('@/lib/hq/superadmin/staff');

      const todayStr = new Date().toISOString().split('T')[0];
      const prefix = getDeptPrefix(dept);
      const attId = `${staffId}_${todayStr}`;

      const items = config.map((c: any) => ({
        key: c.key,
        status: checkedKeys.includes(c.key) ? (type === 'uniform' ? 'yes' : 'done') : (type === 'uniform' ? 'no' : 'not_done')
      }));

      if (type === 'uniform') {
        await setDoc(doc(db, `${prefix}_dress_logs`, attId), {
          staffId,
          date: todayStr,
          status,
          items,
          updatedAt: Timestamp.now(),
          markedBy: session?.uid
        }, { merge: true });
      } else {
        await setDoc(doc(db, `${prefix}_duty_logs`, attId), {
          staffId,
          date: todayStr,
          status,
          duties: items,
          updatedAt: Timestamp.now(),
          markedBy: session?.uid
        }, { merge: true });
      }

      const currentUniform = type === 'uniform' ? status : (row.todayUniformStatus || 'na');
      const currentDuty = type === 'duty' ? status : (row.todayDutyStatus || 'na');
      
      const attPoint = row.isPresentToday || (row.todayDailyScore || 0) > 0 ? 1 : 0;
      const uniformPoint = currentUniform === 'yes' ? 1 : 0;
      const dutyPoint = currentDuty === 'yes' ? 1 : 0;
      const contribPoint = (row.todayDailyScore || 0) > (attPoint + (row.todayUniformStatus === 'yes' ? 1 : 0) + (row.todayDutyStatus === 'yes' ? 1 : 0)) ? 1 : 0;
      
      const newScore = attPoint + uniformPoint + dutyPoint + contribPoint;

      const staffDocRef = doc(db, `${prefix}_users`, staffId);
      await updateDoc(staffDocRef, {
        todayUniformStatus: currentUniform,
        todayDutyStatus: currentDuty,
        todayDailyScore: newScore,
        lastDailyAssessmentDate: todayStr,
        updatedAt: Timestamp.now()
      }).catch(err => {
        console.warn(`Could not sync to ${prefix}_users/${staffId}:`, err);
      });

      setRows(prev => prev.map(r => {
        if (r.id === row.id) {
          return {
            ...r,
            todayUniformStatus: type === 'uniform' ? status : r.todayUniformStatus,
            todayDutyStatus: type === 'duty' ? status : r.todayDutyStatus,
            todayDailyScore: newScore,
            isPresentToday: newScore > 0
          };
        }
        return r;
      }));

      const { toast } = await import('react-hot-toast');
      toast.success(`${type === 'uniform' ? 'Dress' : 'Duty'} status updated successfully!`);
    } catch (err) {
      console.error(err);
      const { toast } = await import('react-hot-toast');
      toast.error('Failed to update status');
    }

    setActiveChecklist(null);
  };

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    let alive = true;
    setLoading(true);
    // Phase 1: Load base roster data immediately (Instant paint)
    listStaffCards({ dept, status, role: 'personnel', fullEnrichment: false, includeTodayStats: false })
      .then((r) => {
        if (!alive) return;
        setRows(r);
        setLoading(false);
        // Phase 2: Layer in real-time stats in background
        listStaffCards({ dept, status, role: 'personnel', fullEnrichment: false, includeTodayStats: true })
          .then((enriched) => {
            if (alive) setRows(enriched);
          });
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [session, dept, status]);

  // Lazy Enrichment Logic
  useEffect(() => {
    if (drillLevel === 'list' && drillDept && !enrichedDepts.has(drillDept) && !enriching) {
      setEnriching(true);
      listStaffCards({ dept: drillDept, status, role: 'personnel', fullEnrichment: true })
        .then((newRows) => {
          setRows(prev => {
            const others = prev.filter(r => r.dept !== drillDept);
            return [...others, ...newRows];
          });
          setEnrichedDepts(prev => new Set(prev).add(drillDept));
        })
        .finally(() => setEnriching(false));
    }
  }, [drillLevel, drillDept, status]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.name} ${r.role} ${r.dept} ${r.seniority} ${r.designation || ''}`.toLowerCase().includes(s));
  }, [rows, q]);

  const groupedByDept = useMemo(() => {
    const groups: Record<string, StaffCardRow[]> = {};
    filtered.forEach((r) => {
      if (!groups[r.dept]) groups[r.dept] = [];
      groups[r.dept].push(r);
    });
    // Sort within group by seniority
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (SENIORITY_RANKS[b.seniority || 'Staff'] || 0) - (SENIORITY_RANKS[a.seniority || 'Staff'] || 0));
    });
    return groups;
  }, [filtered]);

  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    rows.forEach((r) => {
      counts[r.dept] = (counts[r.dept] || 0) + 1;
    });
    return counts;
  }, [rows]);

  const deptsList = ['all', 'hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'] as const;

  return (
    <div className="min-h-screen py-12 bg-[#FCFBF8] dark:bg-slate-950 font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 group overflow-hidden relative">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Users2 className="text-white relative z-10" size={36} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-gray-900 via-slate-800 to-indigo-900 dark:from-white dark:to-slate-300 bg-clip-text text-transparent uppercase leading-none">
                    Personnel
                  </h1>
                  <Sparkles size={20} className="text-indigo-500 animate-pulse" />
                </div>
                <p className="mt-3 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.5em] italic pl-1">
                  Global HQ Staff Registry Overview
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation/Drill Level Controls */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full">
            <button
              onClick={() => {
                setDrillLevel('overview');
                setDrillPresence(null);
                setDrillDept(null);
              }}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                drillLevel === 'overview' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-indigo-600 dark:text-slate-500"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => {
                setDrillLevel('list');
                setDrillPresence(null);
                setDrillDept(null);
              }}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                drillLevel === 'list' && !drillDept ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-indigo-600 dark:text-slate-500"
              )}
            >
              Full Roster
            </button>
            {drillLevel !== 'overview' && drillLevel !== 'list' && (
              <>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
                <button
                  onClick={() => {
                    setDrillLevel('presence');
                    setDrillDept(null);
                  }}
                  className={cn(
                    "px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    drillLevel === 'presence' ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-indigo-600"
                  )}
                >
                  {drillPresence === 'present' ? 'Present' : 'Absent'}
                </button>
              </>
            )}
            {drillDept && (
              <>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
                <button
                  className="px-5 py-2 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-md uppercase tracking-widest whitespace-nowrap"
                >
                  {DEPT_INFO[drillDept]?.label || drillDept.toUpperCase()}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter & Search Control Hub */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-xl shadow-slate-100/40 mb-12 space-y-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            <div className="flex-1 relative group">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, designation, department or seniority..."
                className="w-full h-16 pl-14 pr-12 rounded-full border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-sm font-bold text-slate-800 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all shadow-inner"
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={20} />
              </div>
              {q && (
                <button 
                  onClick={() => setQ('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStatus('active')}
                className={cn(
                  "h-16 px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02]",
                  status === 'active'
                    ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-300 shadow-sm'
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", status === 'active' ? 'bg-white animate-pulse' : 'bg-emerald-500')} />
                <span>Active Staff</span>
              </button>

              <button
                onClick={() => setStatus('active_vacancy')}
                className={cn(
                  "h-16 px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02]",
                  status === 'active_vacancy'
                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/10'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-indigo-300 shadow-sm'
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", status === 'active_vacancy' ? 'bg-white animate-pulse' : 'bg-indigo-500')} />
                <span>Active Vacancies</span>
              </button>

              <button
                onClick={() => setStatus('inactive')}
                className={cn(
                  "h-16 px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02]",
                  status === 'inactive'
                    ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-md shadow-emerald-500/10'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-300 shadow-sm'
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", status === 'inactive' ? 'bg-white animate-pulse' : 'bg-amber-500')} />
                <span>Inactive</span>
              </button>

              <button
                onClick={() => setStatus('executive')}
                className={cn(
                  "h-16 px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02]",
                  status === 'executive'
                    ? 'bg-purple-650 text-white border-purple-650 hover:bg-purple-700 shadow-md shadow-purple-650/10'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-300 shadow-sm'
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", status === 'executive' ? 'bg-white animate-pulse' : 'bg-purple-500')} />
                <span>Hide</span>
              </button>

              <button
                onClick={() => setStatus('all')}
                className={cn(
                  "h-16 px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02]",
                  status === 'all'
                    ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900 shadow-md shadow-slate-800/10 dark:bg-slate-700 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-300 shadow-sm'
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", status === 'all' ? 'bg-white animate-pulse' : 'bg-slate-400')} />
                <span>All Personnel</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-50 dark:border-slate-800/50 pt-5">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal size={14} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filter by Department</span>
            </div>
            
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {deptsList.map((t) => {
                const isActive = dept === t;
                const count = deptCounts[t] || 0;
                const info = DEPT_INFO[t] || { label: 'All Departments', color: 'bg-indigo-600', border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-600' };
                
                return (
                  <button
                    key={t}
                    onClick={() => setDept(t as any)}
                    className={cn(
                      "flex items-center gap-2.5 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all border shrink-0 whitespace-nowrap hover:scale-[1.02] shadow-sm",
                      isActive 
                        ? `${info.bg} ${info.text} ${info.border} dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800/50 shadow-md font-black ring-2 ring-indigo-500/5` 
                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-300 shadow-sm'
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", info.color)} />
                    <span>{info.label || 'All Departments'}</span>
                    <span className="ml-1 px-2.5 py-0.5 rounded-full text-[9px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-500 font-extrabold shadow-inner">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6">
            <InlineLoading label="Synchronizing Global Registry..." />
          </div>
        ) : !filtered.length ? (
          <div className="py-20">
            <EmptyState title="Registry Empty" message="No staff records identified matching the current query." />
          </div>
        ) : (
          <div className="space-y-12">
            {drillLevel === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div 
                  onClick={() => { setDrillLevel('presence'); setDrillPresence('present'); }}
                  className="group relative p-12 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-indigo-500/20 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                      <ShieldCheck size={40} />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Total staff</h2>
                      <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Global personnel status overview</p>
                    </div>
                    <div className="text-6xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                      {filtered.length}
                    </div>
                    <button className="px-8 py-4 bg-gray-900 dark:bg-slate-800 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] group-hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-600/5">
                      Enter Drill-down Overview
                    </button>
                  </div>
                </div>

                <div className="p-12 rounded-[3rem] bg-gray-50/50 dark:bg-slate-900/30 border border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center">
                    <TrendingUp size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">Analytics Sync</h3>
                    <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">Personnel growth overview active</p>
                  </div>
                </div>
              </div>
            )}

            {drillLevel === 'presence' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PresenceCard 
                  type="present"
                  count={filtered.filter(r => r.todayAttendanceStatus === 'present' || r.todayAttendanceStatus === 'late').length}
                  onClick={() => { setDrillLevel('department'); setDrillPresence('present'); }}
                />
                <PresenceCard 
                  type="leave"
                  count={filtered.filter(r => r.todayAttendanceStatus === 'leave').length}
                  onClick={() => { setDrillLevel('department'); setDrillPresence('leave'); }}
                />
                <PresenceCard 
                  type="absent"
                  count={filtered.filter(r => r.todayAttendanceStatus === 'absent').length}
                  onClick={() => { setDrillLevel('department'); setDrillPresence('absent'); }}
                />
              </div>
            )}

            {drillLevel === 'department' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {Object.entries(groupedByDept).map(([d, members]) => {
                  const filteredMembers = members.filter(r => {
                    if (drillPresence === 'present') return r.todayAttendanceStatus === 'present' || r.todayAttendanceStatus === 'late';
                    if (drillPresence === 'leave') return r.todayAttendanceStatus === 'leave';
                    return r.todayAttendanceStatus === 'absent';
                  });
                  if (filteredMembers.length === 0) return null;
                  
                  const info = DEPT_INFO[d] || { label: d.toUpperCase(), bg: 'bg-gray-50', text: 'text-gray-600' };
                  
                  return (
                    <div 
                      key={d}
                      onClick={() => { setDrillDept(d as StaffDept); setDrillLevel('list'); }}
                      className="group relative p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-lg hover:shadow-xl hover:border-indigo-500/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", info.bg, info.text)}>
                          <Briefcase size={28} />
                        </div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white leading-none">
                          {filteredMembers.length}
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{info.label}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                        {drillPresence === 'present' ? 'Present' : drillPresence === 'leave' ? 'On Leave' : 'Absent'} Personnel
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {drillLevel === 'list' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {enriching && (
                  <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 text-indigo-600 text-xs font-bold animate-pulse">
                    <Zap className="animate-spin" size={14} />
                    Syncing historical dossiers for {drillDept ? DEPT_INFO[drillDept]?.label : 'All Departments'}...
                  </div>
                )}
                
                {/* Attendance Filter Selector inside List Level */}
                {!drillPresence && (
                  <div className="flex flex-wrap items-center gap-2.5 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Today's Duty:</span>
                    
                    <button
                      onClick={() => setAttendanceFilter('all')}
                      className={cn(
                        "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        attendanceFilter === 'all'
                          ? "bg-slate-800 text-white dark:bg-slate-750 font-bold"
                          : "text-slate-450 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300 font-bold"
                      )}
                    >
                      All Statuses
                    </button>
                    
                    <button
                      onClick={() => setAttendanceFilter('present')}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        attendanceFilter === 'present'
                          ? "bg-emerald-500 text-white font-bold"
                          : "text-slate-450 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300 font-bold"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", attendanceFilter === 'present' ? 'bg-white' : 'bg-emerald-500')} />
                      <span>Present</span>
                    </button>
                    
                    <button
                      onClick={() => setAttendanceFilter('leave')}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        attendanceFilter === 'leave'
                          ? "bg-blue-500 text-white font-bold"
                          : "text-slate-450 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300 font-bold"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", attendanceFilter === 'leave' ? 'bg-white' : 'bg-blue-500')} />
                      <span>On Leave</span>
                    </button>
                    
                    <button
                      onClick={() => setAttendanceFilter('absent')}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        attendanceFilter === 'absent'
                          ? "bg-rose-500 text-white font-bold"
                          : "text-slate-450 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300 font-bold"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", attendanceFilter === 'absent' ? 'bg-white' : 'bg-rose-500')} />
                      <span>Absent</span>
                    </button>
                    
                    <button
                      onClick={() => setAttendanceFilter('unmarked')}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        attendanceFilter === 'unmarked'
                          ? "bg-slate-500 text-white font-bold"
                          : "text-slate-450 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300 font-bold"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", attendanceFilter === 'unmarked' ? 'bg-white' : 'bg-slate-450')} />
                      <span>Unmarked</span>
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {(drillDept ? (groupedByDept[drillDept] || []) : filtered)
                    ?.filter(r => {
                      if (drillPresence) {
                        if (drillPresence === 'present') return r.todayAttendanceStatus === 'present' || r.todayAttendanceStatus === 'late';
                        if (drillPresence === 'leave') return r.todayAttendanceStatus === 'leave';
                        return r.todayAttendanceStatus === 'absent';
                      }
                      if (attendanceFilter === 'all') return true;
                      if (attendanceFilter === 'present') return r.todayAttendanceStatus === 'present' || r.todayAttendanceStatus === 'late';
                      if (attendanceFilter === 'leave') return r.todayAttendanceStatus === 'leave';
                      if (attendanceFilter === 'absent') return r.todayAttendanceStatus === 'absent';
                      if (attendanceFilter === 'unmarked') return r.todayAttendanceStatus === 'unmarked' || !r.todayAttendanceStatus;
                      return true;
                    })
                    ?.map(r => (
                      <StaffInteractiveCard 
                        key={r.id} 
                        row={r} 
                        onStatusChange={handleStatusChange} 
                      />
                    ))}
                </div>
              </div>
            )}
            
            {activeChecklist && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-100 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">
                      Update {activeChecklist.type === 'uniform' ? 'Dress' : 'Duty'} Items
                    </h3>
                    <button 
                      onClick={() => setActiveChecklist(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-lg"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-4 font-bold uppercase tracking-wider">
                    Select the completed items for {activeChecklist.row.name}
                  </p>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                    {activeChecklist.items.map(item => {
                      const isChecked = activeChecklist.checkedKeys.includes(item.key);
                      return (
                        <label 
                          key={item.key} 
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                            isChecked 
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-400' 
                              : 'bg-gray-50/50 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                          )}
                        >
                          <span className="text-xs font-bold">{item.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = e.target.checked 
                                ? [...activeChecklist.checkedKeys, item.key]
                                : activeChecklist.checkedKeys.filter(k => k !== item.key);
                              setActiveChecklist({ ...activeChecklist, checkedKeys: next });
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setActiveChecklist(null)}
                      className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 dark:border-slate-800 dark:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveChecklist(activeChecklist.staffId, activeChecklist.dept, activeChecklist.type, activeChecklist.checkedKeys, activeChecklist.row)}
                      className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all border border-emerald-700 shadow-lg shadow-emerald-600/20"
                    >
                      Save Status
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const getAttendanceBadge = (status?: string) => {
  const s = status || 'unmarked';
  switch (s) {
    case 'present':
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 font-extrabold text-[8px] uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Present</span>
        </div>
      );
    case 'late':
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 font-extrabold text-[8px] uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Late</span>
        </div>
      );
    case 'leave':
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-250 dark:border-blue-800/40 text-blue-700 dark:text-blue-400 font-extrabold text-[8px] uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>Leave</span>
        </div>
      );
    case 'absent':
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 font-extrabold text-[8px] uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>Absent</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-250 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-extrabold text-[8px] uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          <span>Unmarked</span>
        </div>
      );
  }
};

function StaffInteractiveCard({ row: r, onStatusChange }: { row: StaffCardRow; onStatusChange: (row: StaffCardRow, type: 'uniform' | 'duty', status: any) => void }) {
  const info = DEPT_INFO[r.dept] || { color: 'bg-gray-600', border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-600', gradient: '' };
  
  return (
    <Link
      href={`/hq/dashboard/superadmin/staff/${r.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
    >
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg border shadow-sm", info.bg, info.text, info.border)}>
            {r.dept}
          </span>
          {getAttendanceBadge(r.todayAttendanceStatus)}
        </div>

        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-xl border bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-300 group-hover:scale-105", info.border)}>
            {r.photoUrl ? (
              <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
            ) : (
              <Users2 size={20} className="text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-900 truncate select-none leading-normal">
              {r.designation || r.role || 'Personnel'}
            </span>
            <h4 className="text-xs font-medium text-gray-500 truncate mt-0.5 group-hover:text-indigo-600 transition-colors select-none leading-tight">
              {r.name}
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
          <div onClick={(e) => e.preventDefault()}>
            <select
              onClick={(e) => { e.stopPropagation(); }}
              onChange={(e) => onStatusChange(r, 'uniform', e.target.value as any)}
              value={r.todayUniformStatus || 'na'}
              className={cn(
                "w-full text-[10px] font-bold uppercase tracking-wide py-2 px-2 rounded-lg border bg-white appearance-none text-center cursor-pointer outline-none transition-all",
                r.todayUniformStatus === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                r.todayUniformStatus === 'incomplete' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                r.todayUniformStatus === 'no' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-gray-50 text-gray-500 border-gray-200'
              )}
            >
              <option value="na">Dress N/A</option>
              <option value="yes">Dress OK</option>
              <option value="no">Dress No</option>
              <option value="incomplete">Dress Partial</option>
            </select>
          </div>
          <div onClick={(e) => e.preventDefault()}>
            <select
              onClick={(e) => { e.stopPropagation(); }}
              onChange={(e) => onStatusChange(r, 'duty', e.target.value as any)}
              value={r.todayDutyStatus || 'na'}
              className={cn(
                "w-full text-[10px] font-bold uppercase tracking-wide py-2 px-2 rounded-lg border bg-white appearance-none text-center cursor-pointer outline-none transition-all",
                r.todayDutyStatus === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                r.todayDutyStatus === 'incomplete' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                r.todayDutyStatus === 'no' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-gray-50 text-gray-500 border-gray-200'
              )}
            >
              <option value="na">Duty N/A</option>
              <option value="yes">Duty Done</option>
              <option value="no">Duty Missed</option>
              <option value="incomplete">Duty Partial</option>
            </select>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Score</span>
            <div className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-extrabold">
              {r.todayDailyScore || 0}/4
            </div>
          </div>
          {Number(r.totalFines || 0) > 0 && (
            <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
              ₨{Number(r.totalFines || 0).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function PresenceCard({ type, count, onClick }: { type: 'present' | 'absent' | 'leave', count: number, onClick: () => void }) {
  const isPresent = type === 'present';
  const isLeave = type === 'leave';
  
  let cardClass = "";
  let iconBgClass = "";
  let textClass = "";
  let numClass = "";
  let buttonClass = "";
  let icon = null;
  let title = "";
  let gradFrom = "";
  
  if (type === 'present') {
    cardClass = "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-800/30 shadow-emerald-500/5 hover:border-emerald-500/20 shadow-xl hover:shadow-2xl";
    iconBgClass = "bg-white text-emerald-600 shadow-emerald-500/10 dark:bg-slate-900";
    textClass = "text-emerald-900 dark:text-emerald-400";
    numClass = "text-emerald-600";
    buttonClass = "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/10";
    icon = <ShieldCheck className="w-5 h-5 sm:w-10 sm:h-10" />;
    title = "Present Now";
    gradFrom = "from-emerald-500";
  } else if (type === 'leave') {
    cardClass = "bg-blue-50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-800/30 shadow-blue-500/5 hover:border-blue-500/20 shadow-xl hover:shadow-2xl";
    iconBgClass = "bg-white text-blue-600 shadow-blue-500/10 dark:bg-slate-900";
    textClass = "text-blue-900 dark:text-blue-400";
    numClass = "text-blue-600";
    buttonClass = "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/10";
    icon = <Clock className="w-5 h-5 sm:w-10 sm:h-10" />;
    title = "On Leave";
    gradFrom = "from-blue-500";
  } else {
    cardClass = "bg-rose-50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-800/30 shadow-rose-500/5 hover:border-rose-500/20 shadow-xl hover:shadow-2xl";
    iconBgClass = "bg-white text-rose-600 shadow-rose-500/10 dark:bg-slate-900";
    textClass = "text-rose-900 dark:text-rose-400";
    numClass = "text-rose-600";
    buttonClass = "bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/10";
    icon = <Zap className="w-5 h-5 sm:w-10 sm:h-10" />;
    title = "Absent Units";
    gradFrom = "from-rose-500";
  }
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative p-4 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border transition-all cursor-pointer overflow-hidden",
        cardClass
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity", gradFrom)} />
      <div className="relative z-10 flex flex-col items-center text-center gap-3 sm:gap-6">
        <div className={cn("w-10 h-10 sm:w-20 sm:h-20 rounded-xl sm:rounded-3xl flex items-center justify-center shadow-lg", iconBgClass)}>
          {icon}
        </div>
        <div>
          <h2 className={cn("text-xs sm:text-4xl font-black uppercase tracking-tight sm:mb-2", textClass)}>
            {title}
          </h2>
          <p className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily attendance synchronization</p>
        </div>
        <div className={cn("text-2xl sm:text-7xl font-black leading-none", numClass)}>
          {count}
        </div>
        <button className={cn(
          "px-3 py-1.5 sm:px-8 sm:py-4 text-white rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-[0.2em] transition-all whitespace-nowrap",
          buttonClass
        )}>
          View Depts
        </button>
      </div>
    </div>
  );
}
