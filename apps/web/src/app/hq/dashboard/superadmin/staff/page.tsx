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
    <div className="min-h-screen py-8 bg-[#FCFBF4] dark:bg-black transition-colors duration-300">
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
      className="group relative flex flex-col bg-white dark:bg-black rounded-[2.5rem] border-2 border-black dark:border-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-300"
    >
      {/* Top Banner with Seniority */}
      <div className={`h-12 border-b-2 border-black dark:border-white flex items-center justify-between px-6 ${info.bg}`}>
        <span className={`text-[9px] font-black uppercase tracking-widest ${info.text}`}>
          {r.dept.toUpperCase()}
        </span>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-black text-white dark:bg-white dark:text-black rounded-full">
          <ShieldCheck size={10} />
          <span className="text-[8px] font-black uppercase tracking-wider">{r.seniority || 'Staff'}</span>
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black text-black dark:text-white leading-none mb-2 group-hover:italic transition-all">
              {r.name}
            </h3>
            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
              ID: {r.id.split('_')[1].slice(0, 8)}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl border-2 border-black dark:border-white overflow-hidden bg-gray-100 flex items-center justify-center">
            {r.photoUrl ? (
              <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
            ) : (
              <Users2 size={24} className="text-black/20" />
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-2xl border-2 border-black dark:border-white bg-emerald-50 dark:bg-emerald-500/10 flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 mb-1">Growth Points</span>
            <div className="flex items-center gap-1">
              <Zap size={14} className="text-emerald-500 fill-emerald-500" />
              <span className="text-xl font-black text-black dark:text-white">{r.growthPointsTotal}</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl border-2 border-black dark:border-white bg-rose-50 dark:bg-rose-500/10 flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 mb-1">Total Fines</span>
            <span className="text-xl font-black text-black dark:text-white">₨{Number(r.totalFines || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-3">
          <MetricBar label="Attendance" value={r.presentCount} max={30} color="bg-emerald-500" unit="Days" />
          <MetricBar label="Compliance" value={r.lateCount > 0 ? 100 - (r.lateCount * 10) : 100} max={100} color="bg-blue-500" unit="%" />
        </div>

        <div className="mt-8 flex items-center justify-between text-black group-hover:translate-x-2 transition-transform">
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">View Dossier</span>
          <ChevronRight size={16} strokeWidth={3} />
        </div>
      </div>
    </Link>
  );
}

function MetricBar({ label, value, max, color, unit }: { label: string; value: number; max: number; color: string; unit: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{label}</span>
        <span className="text-[9px] font-black uppercase tracking-widest">{value} {unit}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden border border-black/5">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
