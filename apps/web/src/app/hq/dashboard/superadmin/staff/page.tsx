'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { listStaffCards, type StaffDept, type StaffCardRow } from '@/lib/hq/superadmin/staff';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { Users2, Award, Briefcase, Zap, ShieldCheck, ChevronRight } from 'lucide-react';

const DEPT_INFO: Record<string, { label: string; color: string; bg: string; text: string }> = {
  hq: { label: 'HQ Governance', color: 'border-black', bg: 'bg-black/5', text: 'text-black' },
  rehab: { label: 'Rehab Center', color: 'border-teal-500', bg: 'bg-teal-50', text: 'text-teal-600' },
  spims: { label: 'SPIMS Academy', color: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-600' },
  hospital: { label: 'Khan Hospital', color: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-600' },
  sukoon: { label: 'Sukoon Center', color: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  welfare: { label: 'Welfare', color: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  'job-center': { label: 'Job Center', color: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
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
  const [viewMode, setViewMode] = useState<'grid' | 'department' | 'seniority'>('department');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    let alive = true;
    setLoading(true);
    // Explicitly filter for 'staff' role as requested
    listStaffCards({ dept, status, role: 'staff' })
      .then((r) => alive && setRows(r))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [session, dept, status]);

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
    <div className="min-h-screen py-8 bg-[#FCFBF4] transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-black dark:text-white uppercase">Institutional Personnel</h1>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-black/60 dark:text-white/60 italic">
              Centralized Staff Registry • High-Performance Matrix
            </p>
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
            {(['department', 'seniority', 'grid'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  viewMode === m 
                    ? 'bg-black text-white shadow-lg dark:bg-white dark:text-black' 
                    : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="lg:col-span-2 relative group">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, ID or seniority..."
              className="w-full h-14 pl-12 pr-6 rounded-2xl border-2 border-gray-100 dark:border-white/10 bg-white dark:bg-black text-xs font-black uppercase tracking-widest text-black outline-none focus:border-black dark:focus:border-white transition-all shadow-sm"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Users2 size={20} />
            </div>
          </div>

          <div className="flex gap-2">
            {(['all', 'hq', 'rehab', 'spims'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDept(t as any)}
                className={`flex-1 h-14 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                  dept === t 
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black' 
                    : 'bg-white dark:bg-black text-black border-gray-100 dark:border-white/10 hover:border-black'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStatus(status === 'active' ? 'all' : 'active')}
            className={`h-14 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
              status === 'active'
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white dark:bg-black text-black border-gray-100 dark:border-white/10'
            }`}
          >
            {status === 'active' ? 'Active Matrix Only' : 'All Personnel'}
          </button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20">
            <InlineLoading label="Synchronizing Global Registry..." />
          </div>
        ) : !filtered.length ? (
          <EmptyState title="Registry Empty" message="No staff records identified matching the current query." />
        ) : (
          <div className="space-y-12">
            {viewMode === 'department' && Object.entries(groupedByDept).map(([d, members]) => {
              const info = DEPT_INFO[d] || { label: d.toUpperCase(), color: 'border-gray-200', bg: 'bg-gray-50', text: 'text-black' };
              return (
                <section key={d} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl border-2 ${info.color} ${info.bg} flex items-center justify-center`}>
                      <Briefcase size={24} className={info.text} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-black dark:text-white uppercase">{info.label}</h2>
                      <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest">{members.length} Active Personnel</p>
                    </div>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.map(r => <StaffInteractiveCard key={r.id} row={r} />)}
                  </div>
                </section>
              );
            })}

            {viewMode === 'seniority' && Object.entries(groupedBySeniority)
              .sort((a, b) => (SENIORITY_RANKS[b[0]] || 0) - (SENIORITY_RANKS[a[0]] || 0))
              .map(([rank, members]) => (
              <section key={rank} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl border-2 border-black dark:border-white bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <Award size={24} className="text-black dark:text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-black dark:text-white uppercase">{rank}</h2>
                    <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest">Rank Tier • {members.length} Members</p>
                  </div>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {members.map(r => <StaffInteractiveCard key={r.id} row={r} />)}
                </div>
              </section>
            ))}

            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-700">
                {filtered.map(r => <StaffInteractiveCard key={r.id} row={r} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StaffInteractiveCard({ row: r }: { row: StaffCardRow }) {
  const info = DEPT_INFO[r.dept] || { color: 'border-gray-200', bg: 'bg-gray-50', text: 'text-black' };
  
  return (
    <Link
      href={`/hq/dashboard/superadmin/staff/${r.id}`}
      className="group relative flex flex-col bg-white rounded-[2.5rem] border-4 border-black overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-300"
    >
      {/* Top Banner with Seniority */}
      <div className={`h-14 border-b-4 border-black flex items-center justify-between px-6 ${info.bg}`}>
        <span className={`text-[10px] font-[1000] uppercase tracking-[0.2em] ${info.text}`}>
          {info.label}
        </span>
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
          <Award size={12} className="text-amber-400" />
          <span className="text-[9px] font-black uppercase tracking-widest">{r.seniority || 'Staff'}</span>
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-[1000] text-black leading-tight mb-2 group-hover:italic transition-all truncate">
              {r.name}
            </h3>
            <p className="text-[10px] font-black text-black/40 uppercase tracking-[0.2em]">
              ID: {r.id.split('_')[1].slice(0, 8)} • {r.designation}
            </p>
          </div>
          <div className="w-20 h-20 rounded-[2rem] border-4 border-black overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 ml-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-105">
            {r.photoUrl ? (
              <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
            ) : (
              <Users2 size={32} className="text-black/10" />
            )}
          </div>
        </div>

        {/* Performance Score Dashboard */}
        <div className="bg-black/5 rounded-[2rem] p-6 mb-8 border-2 border-black/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                <Zap size={18} className="fill-emerald-400 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-black uppercase tracking-widest leading-none mb-1">Performance Index</p>
                <p className="text-lg font-[1000] text-black uppercase">Level {r.todayDailyScore || 0}</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl border-4 border-black text-[10px] font-[1000] uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
              (r.todayDailyScore || 0) >= 3 ? 'bg-emerald-400 text-black' : 'bg-rose-400 text-black'
            }`}>
              {(r.todayDailyScore || 0) >= 3 ? 'Optimal' : 'Review'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricStatus label="Uniform" status={r.todayUniformStatus || 'na'} />
            <MetricStatus label="Duties" status={r.todayDutyStatus || 'na'} />
          </div>
        </div>

        {/* Core Stats Matrix */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-[2rem] border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">Growth Points</span>
              <span className="text-3xl font-[1000] text-black">{r.growthPointsTotal}</span>
            </div>
          </div>
          <div className="p-6 rounded-[2rem] border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">Deductions</span>
              <span className="text-3xl font-[1000] text-black">₨{Number(r.totalFines || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Attendance Progression */}
        <div className="space-y-4 mb-8">
           <MetricBar 
            label="Operational Attendance" 
            value={r.presentCount} 
            max={26} 
            color="bg-black" 
            unit="Days" 
          />
        </div>

        <div className="pt-8 border-t-4 border-black flex items-center justify-between group-hover:px-2 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
              <ChevronRight size={16} strokeWidth={4} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Personnel Dossier</span>
          </div>
          {r.isActive ? (
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Matrix
            </span>
          ) : (
             <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" /> Offline
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function MetricStatus({ label, status }: { label: string; status: string }) {
  const isOk = status === 'yes';
  const isNa = status === 'na';
  const isIncomplete = status === 'incomplete';
  
  const statusColors = isOk ? 'bg-emerald-400' : 
                      isNa ? 'bg-gray-100 opacity-50' : 
                      isIncomplete ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className={`p-4 rounded-2xl border-2 border-black bg-white flex flex-col items-center justify-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
      <span className="text-[8px] font-[1000] uppercase tracking-widest text-black/40">{label}</span>
      <div className={`px-3 py-1 rounded-full border-2 border-black ${statusColors} flex items-center justify-center`}>
        <span className="text-[9px] font-[1000] uppercase tracking-widest text-black">{status}</span>
      </div>
    </div>
  );
}

function MetricBar({ label, value, max, color, unit }: { label: string; value: number; max: number; color: string; unit: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-3 px-1">
        <span className="text-[10px] font-[1000] uppercase tracking-[0.2em] text-black/60">{label}</span>
        <span className="text-[10px] font-[1000] uppercase tracking-widest text-black bg-white border-2 border-black px-2 py-0.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{value}/{max} {unit}</span>
      </div>
      <div className="h-5 w-full bg-black/5 rounded-full overflow-hidden border-4 border-black p-0.5 shadow-inner">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000 shadow-[4px_0px_0px_rgba(0,0,0,0.2)]`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
