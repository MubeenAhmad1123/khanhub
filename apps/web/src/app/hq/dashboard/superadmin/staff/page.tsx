'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { listStaffCards, type StaffDept, type StaffCardRow } from '@/lib/hq/superadmin/staff';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { Users2, Award, Briefcase, Zap, ShieldCheck, ChevronRight, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEPT_INFO: Record<string, { label: string; color: string; bg: string; text: string; gradient: string }> = {
  hq: { label: 'HQ Governance', color: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-600', gradient: 'from-purple-500/10 to-transparent' },
  rehab: { label: 'Rehab Center', color: 'border-teal-200', bg: 'bg-teal-50', text: 'text-teal-600', gradient: 'from-teal-500/10 to-transparent' },
  spims: { label: 'SPIMS Academy', color: 'border-sky-200', bg: 'bg-sky-50', text: 'text-sky-600', gradient: 'from-sky-500/10 to-transparent' },
  hospital: { label: 'Khan Hospital', color: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-600', gradient: 'from-rose-500/10 to-transparent' },
  sukoon: { label: 'Sukoon Center', color: 'border-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-600', gradient: 'from-indigo-500/10 to-transparent' },
  welfare: { label: 'Welfare', color: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-600', gradient: 'from-emerald-500/10 to-transparent' },
  'job-center': { label: 'Job Center', color: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-500/10 to-transparent' },
  'social-media': { label: 'Social Media', color: 'border-fuchsia-200', bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', gradient: 'from-fuchsia-500/10 to-transparent' },
  'it': { label: 'IT Department', color: 'border-violet-200', bg: 'bg-violet-50', text: 'text-violet-600', gradient: 'from-violet-500/10 to-transparent' },
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
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<StaffCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichedDepts, setEnrichedDepts] = useState<Set<StaffDept>>(new Set());
  const [enriching, setEnriching] = useState(false);
  
  // Drill-down States
  const [drillLevel, setDrillLevel] = useState<'overview' | 'presence' | 'department' | 'list'>('overview');
  const [drillPresence, setDrillPresence] = useState<'present' | 'absent' | null>(null);
  const [drillDept, setDrillDept] = useState<StaffDept | null>(null);
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
    // Initially fetch basic data only (No expensive historical enrichment)
    listStaffCards({ dept, status, role: 'personnel', fullEnrichment: false })
      .then((r) => alive && setRows(r))
      .finally(() => alive && setLoading(false));
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
    return rows.filter((r) => `${r.name} ${r.role} ${r.dept} ${r.seniority}`.toLowerCase().includes(s));
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

  const groupedBySeniority = useMemo(() => {
    const groups: Record<string, StaffCardRow[]> = {};
    filtered.forEach((r) => {
      const s = r.seniority || 'Staff';
      if (!groups[s]) groups[s] = [];
      groups[s].push(r);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="min-h-screen py-12 bg-[#FCFBF8] font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-gray-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-gray-200/50 group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Users2 className="text-white relative z-10" size={36} />
              </div>
              <div>
                <h1 className="text-6xl font-black tracking-tighter text-gray-900 uppercase leading-none">Registry</h1>
                <p className="mt-3 text-[10px] font-black text-indigo-600 uppercase tracking-[0.5em] italic pl-1">
                  Global Personnel Management Matrix
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
            <button
              onClick={() => {
                setDrillLevel('overview');
                setDrillPresence(null);
                setDrillDept(null);
              }}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                drillLevel === 'overview' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-indigo-600"
              )}
            >
              System Overview
            </button>
            <button
              onClick={() => {
                setDrillLevel('list');
                setDrillPresence(null);
                setDrillDept(null);
              }}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                drillLevel === 'list' && !drillDept ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-indigo-600"
              )}
            >
              Full Roster
            </button>
            {drillLevel !== 'overview' && drillLevel !== 'list' && (
              <>
                <ChevronRight size={14} className="text-gray-300" />
                <button
                  onClick={() => {
                    setDrillLevel('presence');
                    setDrillDept(null);
                  }}
                  className={cn(
                    "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                    drillLevel === 'presence' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-indigo-600"
                  )}
                >
                  {drillPresence === 'present' ? 'Present Personnel' : 'Absent Personnel'}
                </button>
              </>
            )}
            {drillDept && (
              <>
                <ChevronRight size={14} className="text-gray-300" />
                <button
                  className="px-6 py-2 rounded-xl text-[10px] font-bold bg-indigo-600 text-white shadow-lg uppercase tracking-widest"
                >
                  {DEPT_INFO[drillDept]?.label || drillDept.toUpperCase()}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
          <div className="lg:col-span-2 relative group">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, ID or seniority..."
              className="w-full h-20 pl-16 pr-8 rounded-[2.5rem] border border-gray-100 bg-white text-sm font-bold text-gray-900 outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-2xl shadow-gray-200/50"
            />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={28} />
            </div>
          </div>

          <div className="flex gap-2">
            {(['all', 'hq', 'rehab', 'spims', 'it'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDept(t as any)}
                className={cn(
                  "flex-1 h-20 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all border",
                  dept === t 
                    ? 'bg-gray-900 text-white border-gray-900 shadow-2xl shadow-gray-200/50' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-900 shadow-xl shadow-gray-200/40'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStatus(status === 'active' ? 'all' : 'active')}
            className={cn(
              "h-20 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-3",
              status === 'active'
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xl shadow-emerald-500/20'
                : 'bg-white text-gray-400 border-gray-100 shadow-xl shadow-gray-200/40'
            )}
          >
            <div className={cn("w-3 h-3 rounded-full", status === 'active' ? 'bg-white animate-pulse' : 'bg-gray-200')} />
            {status === 'active' ? 'Active Matrix' : 'All Personnel'}
          </button>
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
                  className="group relative p-12 rounded-[3rem] bg-white border border-gray-100 shadow-xl hover:shadow-2xl hover:border-indigo-500/20 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <ShieldCheck size={40} />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tight mb-2">Total staff</h2>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global personnel status matrix</p>
                    </div>
                    <div className="text-6xl font-black text-indigo-600 leading-none">
                      {filtered.length}
                    </div>
                    <button className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] group-hover:bg-indigo-600 transition-colors">
                      Enter Drill-down Matrix
                    </button>
                  </div>
                </div>

                <div className="p-12 rounded-[3rem] bg-gray-50/50 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                    <TrendingUp size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-400 uppercase tracking-tight">Analytics Sync</h3>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-1">Personnel growth matrix active</p>
                  </div>
                </div>
              </div>
            )}

            {drillLevel === 'presence' && (
              <div className="grid grid-cols-2 gap-3 sm:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PresenceCard 
                  type="present"
                  count={filtered.filter(r => r.isPresentToday).length}
                  onClick={() => { setDrillLevel('department'); setDrillPresence('present'); }}
                />
                <PresenceCard 
                  type="absent"
                  count={filtered.filter(r => !r.isPresentToday).length}
                  onClick={() => { setDrillLevel('department'); setDrillPresence('absent'); }}
                />
              </div>
            )}

            {drillLevel === 'department' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {Object.entries(groupedByDept).map(([d, members]) => {
                  const filteredMembers = members.filter(r => drillPresence === 'present' ? r.isPresentToday : !r.isPresentToday);
                  if (filteredMembers.length === 0) return null;
                  
                  const info = DEPT_INFO[d] || { label: d.toUpperCase(), bg: 'bg-gray-50', text: 'text-gray-600' };
                  
                  return (
                    <div 
                      key={d}
                      onClick={() => { setDrillDept(d as StaffDept); setDrillLevel('list'); }}
                      className="group relative p-8 rounded-[2.5rem] bg-white border border-gray-100 shadow-lg hover:shadow-xl hover:border-indigo-500/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", info.bg, info.text)}>
                          <Briefcase size={28} />
                        </div>
                        <div className="text-3xl font-black text-gray-900 leading-none">
                          {filteredMembers.length}
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{info.label}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                        {drillPresence === 'present' ? 'Present' : 'Absent'} Personnel
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {drillLevel === 'list' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {enriching && (
                  <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 text-indigo-600 text-xs font-bold animate-pulse">
                    <Zap className="animate-spin" size={14} />
                    Syncing historical dossiers for {drillDept ? DEPT_INFO[drillDept]?.label : 'All Departments'}...
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {(drillDept ? (groupedByDept[drillDept] || []) : filtered)
                    ?.filter(r => {
                      if (!drillPresence) return true;
                      const isPresent = r.isPresentToday || (r.todayDailyScore || 0) > 0;
                      return drillPresence === 'present' ? isPresent : !isPresent;
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
                <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-tight text-gray-900">
                      Update {activeChecklist.type === 'uniform' ? 'Dress' : 'Duty'} Items
                    </h3>
                    <button 
                      onClick={() => setActiveChecklist(null)}
                      className="text-gray-400 hover:text-gray-600 font-bold text-lg"
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
                              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
                              : 'bg-gray-50/50 border-gray-100 text-gray-700 hover:bg-gray-50'
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
                      className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all border border-gray-200"
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

function StaffInteractiveCard({ row: r, onStatusChange }: { row: StaffCardRow; onStatusChange: (row: StaffCardRow, type: 'uniform' | 'duty', status: any) => void }) {
  const info = DEPT_INFO[r.dept] || { color: 'border-gray-200', bg: 'bg-gray-50', text: 'text-black', gradient: '' };
  
  const isPresent = r.isPresentToday || (r.todayDailyScore || 0) > 0;
  
  return (
    <Link
      href={`/hq/dashboard/superadmin/staff/${r.id}`}
      className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 hover:shadow-md hover:border-indigo-200/50 transition-all h-full"
    >
      <div className="flex flex-col gap-2">
        {/* Department & Status Header */}
        <div className="flex items-center justify-between">
          <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md", info.bg, info.text)}>
            {r.dept}
          </span>
          <span className={cn(
            "flex flex-col items-center justify-center text-[9px] font-black uppercase px-2 py-0.5 rounded-md border text-center leading-none select-none min-w-[30px]",
            isPresent 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
              : 'bg-rose-50 text-rose-600 border-rose-100'
          )}>
            <span className="text-[7px] font-bold opacity-75">Att</span>
            <span className="text-[10px] font-black">{isPresent ? 'P' : 'A'}</span>
          </span>
        </div>

        {/* Name & Avatar */}
        <div className="flex items-center gap-2 mt-1">
          <div className="w-10 h-10 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
            {r.photoUrl ? (
              <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
            ) : (
              <Users2 size={16} className={info.text} />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight truncate group-hover:text-indigo-600 transition-colors">
              {r.name}
            </h4>
            <p className="text-[10px] font-medium text-slate-400 truncate tracking-tight">
              {r.designation || r.role}
            </p>
          </div>
        </div>

        {/* Small Tags Matrix */}
        <div className="grid grid-cols-2 gap-1.5 mt-1 border-t border-slate-50 pt-2">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase">Dress</span>
            <select
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onChange={(e) => onStatusChange(r, 'uniform', e.target.value as any)}
              value={r.todayUniformStatus || 'na'}
              className={cn(
                "text-[9px] font-black uppercase tracking-tight py-0.5 px-1.5 rounded-md mt-0.5 text-center cursor-pointer border bg-white outline-none h-[22px]",
                r.todayUniformStatus === 'yes' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                r.todayUniformStatus === 'incomplete' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                r.todayUniformStatus === 'no' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                'bg-slate-50 text-slate-400 border-slate-100'
              )}
            >
              <option value="na">N/A</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="incomplete">Inc</option>
            </select>
          </div>

          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase">Duty</span>
            <select
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onChange={(e) => onStatusChange(r, 'duty', e.target.value as any)}
              value={r.todayDutyStatus || 'na'}
              className={cn(
                "text-[9px] font-black uppercase tracking-tight py-0.5 px-1.5 rounded-md mt-0.5 text-center cursor-pointer border bg-white outline-none h-[22px]",
                r.todayDutyStatus === 'yes' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                r.todayDutyStatus === 'incomplete' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                r.todayDutyStatus === 'no' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                'bg-slate-50 text-slate-400 border-slate-100'
              )}
            >
              <option value="na">N/A</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="incomplete">Inc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dynamic Performance Matrix & Score */}
      <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-2 mt-2">
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-bold text-slate-400 uppercase">Score:</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 leading-none">
              {r.todayDailyScore || 0}
            </span>
            <span className="text-[8px] font-bold text-slate-400">/5</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-bold text-slate-400 uppercase">Fines:</span>
          <span className="text-[9px] font-black text-slate-700 dark:text-slate-200">
            ₨{Number(r.totalFines || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}

function MetricStatus({ label, status, color }: { label: string; status: string; color?: string }) {
  const isOk = status === 'yes';
  const isNa = status === 'na';
  const isIncomplete = status === 'incomplete';
  
  const statusColors = isOk ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                      isNa ? 'bg-gray-100 text-gray-400' : 
                      isIncomplete ? 'bg-amber-500 text-white shadow-amber-500/20' : 
                      'bg-rose-500 text-white shadow-rose-500/20';

  return (
    <div className="p-8 rounded-[2.5rem] bg-white border border-gray-100 flex flex-col items-center justify-center gap-4 shadow-xl shadow-gray-200/40 hover:scale-105 transition-transform">
      <span className={cn("text-[9px] font-black uppercase tracking-widest opacity-60", color)}>{label}</span>
      <div className={cn("px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg", statusColors)}>
        {status}
      </div>
    </div>
  );
}

function Search({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  );
}
function PresenceCard({ type, count, onClick }: { type: 'present' | 'absent', count: number, onClick: () => void }) {
  const isPresent = type === 'present';
  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative p-4 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border transition-all cursor-pointer overflow-hidden",
        isPresent ? "bg-emerald-50 border-emerald-100 shadow-emerald-500/5 hover:border-emerald-500/20 shadow-xl hover:shadow-2xl" : "bg-rose-50 border-rose-100 shadow-rose-500/5 hover:border-rose-500/20 shadow-xl hover:shadow-2xl"
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity", isPresent ? "from-emerald-500" : "from-rose-500")} />
      <div className="relative z-10 flex flex-col items-center text-center gap-3 sm:gap-6">
        <div className={cn("w-10 h-10 sm:w-20 sm:h-20 rounded-xl sm:rounded-3xl flex items-center justify-center", isPresent ? "bg-white text-emerald-600 shadow-lg shadow-emerald-500/10" : "bg-white text-rose-600 shadow-lg shadow-rose-500/10")}>
          {isPresent ? <ShieldCheck className="w-5 h-5 sm:w-10 sm:h-10" /> : <Zap className="w-5 h-5 sm:w-10 sm:h-10" />}
        </div>
        <div>
          <h2 className={cn("text-xs sm:text-4xl font-black uppercase tracking-tight sm:mb-2", isPresent ? "text-emerald-900" : "text-rose-900")}>
            {isPresent ? 'Present Now' : 'Absent Units'}
          </h2>
          <p className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily attendance synchronization</p>
        </div>
        <div className={cn("text-2xl sm:text-7xl font-black leading-none", isPresent ? "text-emerald-600" : "text-rose-600")}>
          {count}
        </div>
        <button className={cn(
          "px-3 py-1.5 sm:px-8 sm:py-4 text-white rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-[0.2em] transition-all whitespace-nowrap",
          isPresent ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
        )}>
          View Depts
        </button>
      </div>
    </div>
  );
}
