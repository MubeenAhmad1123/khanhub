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
  const [viewMode, setViewMode] = useState<'grid' | 'department' | 'seniority'>('department');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    let alive = true;
    setLoading(true);
    // Explicitly fetch all personnel (admins, managers, staff, etc.)
    listStaffCards({ dept, status, role: 'personnel' })
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
    <div className="min-h-screen py-12 bg-[#FDFDFD] dark:bg-[#0A0A0A] transition-colors duration-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-black/20 dark:shadow-white/10 group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Users2 className="text-white dark:text-black relative z-10" size={32} />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tight text-black dark:text-white uppercase leading-none">Personnel Registry</h1>
                <p className="mt-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.5em] italic pl-1">
                  Global Staff Management • Operational Intelligence
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-white/5 rounded-[2rem] border border-gray-200 dark:border-white/10 backdrop-blur-xl">
            {(['department', 'seniority', 'grid'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={cn(
                  "px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === m 
                    ? 'bg-black text-white shadow-2xl dark:bg-white dark:text-black' 
                    : 'text-gray-400 hover:text-black dark:hover:text-white'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
          <div className="lg:col-span-2 relative group">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, ID or seniority..."
              className="w-full h-16 pl-14 pr-6 rounded-[2rem] border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold text-black dark:text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-xl shadow-black/5"
            />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={24} />
            </div>
          </div>

          <div className="flex gap-2">
            {(['all', 'hq', 'rehab', 'spims', 'it'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDept(t as any)}
                className={cn(
                  "flex-1 h-16 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all border",
                  dept === t 
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black shadow-xl shadow-black/20' 
                    : 'bg-white dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10 hover:border-black dark:hover:border-white'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStatus(status === 'active' ? 'all' : 'active')}
            className={cn(
              "h-16 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-3",
              status === 'active'
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xl shadow-emerald-500/20'
                : 'bg-white dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10'
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", status === 'active' ? 'bg-white animate-pulse' : 'bg-gray-300')} />
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
          <div className="space-y-20">
            {viewMode === 'department' && Object.entries(groupedByDept).map(([d, members]) => {
              const info = DEPT_INFO[d] || { label: d.toUpperCase(), color: 'border-gray-200', bg: 'bg-gray-50', text: 'text-black', gradient: '' };
              return (
                <section key={d} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="flex items-center gap-6 mb-10">
                    <div className={cn("w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-xl", info.bg, info.text)}>
                      <Briefcase size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-black dark:text-white uppercase tracking-tight">{info.label}</h2>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">{members.length} Active Personnel In Matrix</p>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-100 dark:from-white/10 to-transparent" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {members.map(r => <StaffInteractiveCard key={r.id} row={r} />)}
                  </div>
                </section>
              );
            })}

            {viewMode === 'seniority' && Object.entries(groupedBySeniority)
              .sort((a, b) => (SENIORITY_RANKS[b[0]] || 0) - (SENIORITY_RANKS[a[0]] || 0))
              .map(([rank, members]) => (
              <section key={rank} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-16 h-16 rounded-[2rem] bg-gray-100 dark:bg-white/5 flex items-center justify-center shadow-xl">
                    <Award size={32} className="text-black dark:text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-black dark:text-white uppercase tracking-tight">{rank}</h2>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Tier Level • {members.length} Qualified Members</p>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-100 dark:from-white/10 to-transparent" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {members.map(r => <StaffInteractiveCard key={r.id} row={r} />)}
                </div>
              </section>
            ))}

            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in duration-1000">
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
  const info = DEPT_INFO[r.dept] || { color: 'border-gray-200', bg: 'bg-gray-50', text: 'text-black', gradient: '' };
  
  return (
    <Link
      href={`/hq/dashboard/superadmin/staff/${r.id}`}
      className="group relative flex flex-col bg-white dark:bg-[#0F0F0F] rounded-[3.5rem] border border-gray-100 dark:border-white/5 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] hover:shadow-primary/20 hover:-translate-y-4 transition-all duration-700"
    >
      {/* Background Gradient Layer */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 dark:opacity-10 group-hover:opacity-20 transition-opacity duration-700", info.gradient)} />
      
      {/* Top Banner Accent */}
      <div className={cn("absolute top-0 left-0 w-full h-2 bg-gradient-to-r", 
        r.dept === 'hq' ? 'from-purple-500 to-indigo-500' :
        r.dept === 'rehab' ? 'from-teal-500 to-emerald-500' :
        r.dept === 'spims' ? 'from-sky-500 to-blue-500' :
        r.dept === 'hospital' ? 'from-rose-500 to-pink-500' :
        'from-violet-500 to-fuchsia-500'
      )} />

      <div className="relative z-10 p-12">
        <div className="flex items-start justify-between mb-12">
          <div className="flex-1 min-w-0">
            <div className={cn("inline-flex px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] mb-6 shadow-xl", info.bg, info.text)}>
              {info.label}
            </div>
            <h3 className="text-4xl font-[1000] text-black dark:text-white leading-none mb-4 tracking-tight group-hover:text-primary transition-colors">
              {r.name.split(' ')[0]}
              <span className="block text-xl font-bold text-gray-400 dark:text-gray-500 mt-2 tracking-normal">{r.name.split(' ').slice(1).join(' ')}</span>
            </h3>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.4em] flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary" />
              {r.designation}
            </p>
          </div>
          <div className="relative group/avatar">
            <div className={cn("absolute -inset-1 rounded-[3rem] bg-gradient-to-br blur-lg opacity-0 group-hover/avatar:opacity-40 transition-opacity duration-500", info.gradient)} />
            <div className="w-28 h-28 rounded-[2.8rem] border-4 border-white dark:border-white/10 overflow-hidden bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0 ml-6 shadow-2xl transition-all duration-700 group-hover:rotate-6 group-hover:scale-110 relative z-10">
              {r.photoUrl ? (
                <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
              ) : (
                <div className={cn("w-full h-full flex items-center justify-center", info.bg, info.text)}>
                   <Users2 size={48} strokeWidth={2.5} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Performance Matrix */}
        <div className="bg-gray-50 dark:bg-white/[0.03] rounded-[3rem] p-10 mb-12 border border-black/5 dark:border-white/5 backdrop-blur-3xl relative overflow-hidden group/matrix">
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover/matrix:opacity-10 transition-opacity duration-1000", info.gradient)} />
          
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-5">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl", 
                (r.todayDailyScore || 0) >= 3 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              )}>
                <Zap size={28} className="fill-white/20" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-2">Efficiency Rating</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-[1000] text-black dark:text-white uppercase leading-none">{r.todayDailyScore || 0}</p>
                  <p className="text-[10px] font-black text-gray-400">/ 5.0</p>
                </div>
              </div>
            </div>
            <div className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl animate-in zoom-in duration-500",
              (r.todayDailyScore || 0) >= 3 ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-rose-500 text-white shadow-rose-500/30'
            )}>
              {(r.todayDailyScore || 0) >= 3 ? 'Optimal Matrix' : 'Audit Required'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 relative z-10">
            <MetricStatus label="Dress Protocol" status={r.todayUniformStatus || 'na'} color={info.text} />
            <MetricStatus label="Duty Lifecycle" status={r.todayDutyStatus || 'na'} color={info.text} />
          </div>
        </div>

        {/* Vital Stats Dashboard */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div className="relative group/stat">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl opacity-0 group-hover/stat:opacity-100 transition-opacity duration-700" />
            <div className="relative p-10 rounded-[3rem] bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-xl transition-all group-hover:scale-105 group-hover:border-emerald-500/30">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/20">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 block mb-2">Growth Matrix</span>
                  <span className="text-4xl font-[1000] text-black dark:text-white tracking-tighter">{r.growthPointsTotal}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative group/stat">
            <div className="absolute inset-0 bg-rose-500/20 blur-2xl opacity-0 group-hover/stat:opacity-100 transition-opacity duration-700" />
            <div className="relative p-10 rounded-[3rem] bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-xl transition-all group-hover:scale-105 group-hover:border-rose-500/30">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-2xl bg-rose-500 text-white shadow-xl shadow-rose-500/20">
                  <Star size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 block mb-2">Liability</span>
                  <span className="text-3xl font-[1000] text-black dark:text-white tracking-tighter">₨{Number(r.totalFines || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-5 group/btn">
            <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center transition-all group-hover/btn:scale-110 group-hover/btn:rotate-12 shadow-2xl">
              <ChevronRight size={24} strokeWidth={3} />
            </div>
            <span className="text-[11px] font-[1000] uppercase tracking-[0.4em] text-black dark:text-white">View Full Dossier</span>
          </div>
          
          <div className={cn(
            "flex items-center gap-3 px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-[0.3em] backdrop-blur-xl border",
            r.isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
          )}>
            <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.2)]", 
              r.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            )} />
            {r.isActive ? 'Network Active' : 'Protocol Halted'}
          </div>
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
                      isNa ? 'bg-gray-100 dark:bg-white/5 text-gray-400' : 
                      isIncomplete ? 'bg-amber-500 text-white shadow-amber-500/20' : 
                      'bg-rose-500 text-white shadow-rose-500/20';

  return (
    <div className="p-6 rounded-[2rem] bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 flex flex-col items-center justify-center gap-4 shadow-xl shadow-black/5 hover:scale-105 transition-transform">
      <span className={cn("text-[8px] font-black uppercase tracking-widest opacity-60", color)}>{label}</span>
      <div className={cn("px-5 py-2 rounded-full text-[9px] font-[1000] uppercase tracking-widest shadow-lg", statusColors)}>
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
