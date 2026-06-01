// src/app/hq/dashboard/manager/staff/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  Users, Search, Shield, ArrowRight,
  Filter, Plus, Download, LayoutGrid, List as ListIcon,
  Activity, Clock, Star, Loader2, AlertCircle
} from 'lucide-react';
import { listStaffCards, type StaffCardRow, getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';
import { toast } from 'react-hot-toast';
import { Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function ManagerStaffPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staff, setStaff] = useState<StaffCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'seniority'>('name');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    multiRole: 0
  });

  const [unmarkedStaff, setUnmarkedStaff] = useState<any[]>([]);
  const [enriched, setEnriched] = useState(false);
  const [enriching, setEnriching] = useState(false);

  // UI standard - forced light theme
  const darkMode = false;

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'manager' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session) return;

    const fetchAllStaff = async () => {
      try {
        setLoading(true);
        setEnriched(false);
        
        let queryStatus: any = 'all';
        if (statusFilter === 'active') queryStatus = 'active';
        else if (statusFilter === 'inactive') queryStatus = 'inactive';
        else if (statusFilter === 'active_vacancy') queryStatus = 'active_vacancy';

        // Unified personnel registry fetch (7 departments) - Basic data only
        const unified = await listStaffCards({
          dept: 'all',
          status: queryStatus,
          role: 'personnel',
          fullEnrichment: false
        });

        // Final sort
        unified.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaff(unified);

        const activeStaff = unified.filter(s => s.status === 'active' && s.isActive !== false);
        const presentToday = activeStaff.filter(s => s.isPresentToday).length;

        setStats({
          total: activeStaff.length,
          present: presentToday,
          multiRole: activeStaff.filter(s => s.role === 'admin' || s.role === 'manager').length
        });

        // Duty Mapping (Last Activity)
        const unmarked = activeStaff.filter(s => !s.isPresentToday);
        setUnmarkedStaff(unmarked);

      } catch (err) {
        console.error(err);
        toast.error("Failed to sync personnel matrix");
      } finally {
        setLoading(false);
      }
    };

    fetchAllStaff();
  }, [session, statusFilter]);

  // Lazy Enrichment for Manager
  useEffect(() => {
    if (!enriched && !enriching && (search.length > 0 || deptFilter !== 'all')) {
      setEnriching(true);

      let queryStatus: any = 'all';
      if (statusFilter === 'active') queryStatus = 'active';
      else if (statusFilter === 'inactive') queryStatus = 'inactive';
      else if (statusFilter === 'active_vacancy') queryStatus = 'active_vacancy';

      listStaffCards({ dept: 'all', status: queryStatus, role: 'personnel', fullEnrichment: true })
        .then(enrichedRows => {
          setStaff(enrichedRows);
          setEnriched(true);
        })
        .finally(() => setEnriching(false));
    }
  }, [search, deptFilter, enriched, enriching, statusFilter]);

  const filtered = useMemo(() => {
    let result = staff.filter(s => {
      const matchesSearch = search === '' ||
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.designation || '').toLowerCase().includes(search.toLowerCase());

      const matchesDept = deptFilter === 'all' || s.dept === deptFilter;
      const matchesStatus = (statusFilter === 'all' && (s.status !== 'resigned' && s.status !== 'terminated' && s.status !== 'active_vacancy' && s.isActive !== false)) ||
        (statusFilter === 'active' && (s.status === 'active' || s.isActive !== false) && s.status !== 'active_vacancy') ||
        (statusFilter === 'inactive' && s.status === 'inactive') ||
        (statusFilter === 'resigned' && s.status === 'resigned') ||
        (statusFilter === 'terminated' && s.status === 'terminated') ||
        (statusFilter === 'active_vacancy' && s.status === 'active_vacancy');

      return matchesSearch && matchesDept && matchesStatus;
    });

    // Apply advanced sorting based on selected sortBy criteria
    if (sortBy === 'id') {
      const extractNumericId = (idStr: string) => {
        const match = idStr.match(/\d+/);
        return match ? parseInt(match[0], 10) : Infinity;
      };
      result = [...result].sort((a, b) => {
        const idA = extractNumericId(a.employeeId || '');
        const idB = extractNumericId(b.employeeId || '');
        if (idA !== idB) return idA - idB;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (sortBy === 'seniority') {
      const getSeniorityRank = (seniority: string, desig: string) => {
        const s = String(seniority || '').toLowerCase();
        const d = String(desig || '').toLowerCase();
        if (s.includes('senior') || d.includes('executive') || d.includes('director') || d.includes('head')) return 10;
        if (d.includes('manager')) return 9;
        if (d.includes('supervisor') || s.includes('mid')) return 8;
        if (d.includes('doctor') || d.includes('clinical') || d.includes('physiotherapist')) return 7;
        if (d.includes('nurse') || d.includes('teacher') || d.includes('lecturer') || d.includes('counselor') || d.includes('personnel')) return 6;
        if (d.includes('worker') || d.includes('junior') || s.includes('junior')) return 5;
        if (d.includes('contract')) return 4;
        if (d.includes('trial')) return 3;
        if (d.includes('internee') || d.includes('intern') || s.includes('internee')) return 2;
        if (d.includes('volunteer')) return 1;
        return 0;
      };
      result = [...result].sort((a, b) => {
        const rankA = getSeniorityRank(a.seniority || '', a.designation || '');
        const rankB = getSeniorityRank(b.seniority || '', b.designation || '');
        if (rankA !== rankB) return rankB - rankA; // Highest seniority rank first
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      // Default: sort alphabetically by name
      result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  }, [staff, search, deptFilter, statusFilter, sortBy]);

  const getDeptColor = (dept: string) => {
    switch (dept) {
      case 'rehab': return { base: 'rose', from: 'from-rose-500/20', to: 'to-rose-500/5', text: 'text-rose-600', border: 'border-rose-200/50', icon: 'bg-rose-500' };
      case 'spims': return { base: 'emerald', from: 'from-emerald-500/20', to: 'to-emerald-500/5', text: 'text-emerald-600', border: 'border-emerald-200/50', icon: 'bg-emerald-500' };
      case 'hospital': return { base: 'blue', from: 'from-blue-500/20', to: 'to-blue-500/5', text: 'text-blue-600', border: 'border-blue-200/50', icon: 'bg-blue-500' };
      case 'sukoon': return { base: 'purple', from: 'from-purple-500/20', to: 'to-purple-500/5', text: 'text-purple-600', border: 'border-purple-200/50', icon: 'bg-purple-500' };
      case 'welfare': return { base: 'amber', from: 'from-amber-500/20', to: 'to-amber-500/5', text: 'text-amber-600', border: 'border-amber-200/50', icon: 'bg-amber-500' };
      case 'job-center': return { base: 'orange', from: 'from-orange-500/20', to: 'to-orange-500/5', text: 'text-orange-600', border: 'border-orange-200/50', icon: 'bg-orange-500' };
      case 'social-media': return { base: 'indigo', from: 'from-indigo-500/20', to: 'to-indigo-500/5', text: 'text-indigo-600', border: 'border-indigo-200/50', icon: 'bg-indigo-500' };
      case 'it': return { base: 'indigo', from: 'from-indigo-500/20', to: 'to-indigo-500/5', text: 'text-indigo-600', border: 'border-indigo-200/50', icon: 'bg-indigo-500' };
      default: return { base: 'zinc', from: 'from-zinc-500/20', to: 'to-zinc-500/5', text: 'text-zinc-600', border: 'border-zinc-200/50', icon: 'bg-zinc-500' };
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20 w-full overflow-x-hidden ${darkMode ? 'bg-[#0A0A0A]' : 'bg-[#FDFDFD]'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 border-b transition-all ${darkMode ? 'bg-[#0A0A0A]/80 border-white/5 backdrop-blur-xl' : 'bg-white/80 border-gray-100 backdrop-blur-xl'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5 min-w-0">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-900 shadow-gray-200/50'}`}>
                <Users size={28} />
              </div>
              <div className="min-w-0">
                <h1 className={`text-2xl md:text-3xl font-black tracking-tight truncate ${darkMode ? 'text-white' : 'text-gray-900'} uppercase`}>Staff Force</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <p className={`${darkMode ? 'text-slate-500' : 'text-gray-400'} text-[10px] font-black uppercase tracking-[0.2em]`}>Global Personnel Matrix</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white rounded-3xl p-2 border border-gray-100 flex items-center gap-6 shadow-2xl shadow-gray-200/50">
                <div className="px-6 py-2 border-r border-gray-100">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Active Nodes</p>
                  <p className="text-2xl font-black text-gray-900 leading-none">{stats.total}</p>
                </div>
                <div className="px-6 py-2 pr-8">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Mark State</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <p className="text-2xl font-black text-blue-600 leading-none">{stats.present}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-12">
        {/* Unmarked Duties Alert */}
        {unmarkedStaff.length > 0 && (
          <div className="relative rounded-[3rem] p-10 mb-12 flex flex-col md:flex-row items-center gap-10 border border-amber-100 bg-white shadow-2xl shadow-amber-200/20 overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="w-20 h-20 rounded-[2.5rem] bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner flex-shrink-0">
              <AlertCircle size={36} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              <h4 className="font-black text-2xl text-gray-900 uppercase tracking-tight">Pending Marking</h4>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-2 text-amber-600/80">
                {unmarkedStaff.length} personnel missing logs for current cycle
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-8">
                {unmarkedStaff.slice(0, 10).map(s => (
                  <Link
                    key={s.id}
                    href={`/hq/dashboard/manager/staff/${s.id}?collection=${s.dept}`}
                    className="text-[9px] px-5 py-2.5 rounded-xl font-black border border-gray-100 bg-white text-gray-500 hover:text-amber-600 hover:border-amber-200 hover:shadow-lg hover:-translate-y-1 transition-all uppercase tracking-widest"
                  >
                    {s.name}
                  </Link>
                ))}
                {unmarkedStaff.length > 10 && (
                  <span className="text-[9px] font-black flex items-center px-4 text-amber-500 bg-amber-50 rounded-xl">
                    +{unmarkedStaff.length - 10} MORE
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        {enriching && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 text-blue-600 text-xs font-bold animate-pulse">
            <Activity className="animate-spin" size={14} />
            Enriching dossiers with efficiency metrics & historical logs...
          </div>
        )}
        <div className={`p-6 rounded-[2rem] shadow-xl border flex flex-col gap-6 mb-10 transition-all ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-gray-200/30'}`}>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="flex-1 relative group">
              <Search className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-600 group-focus-within:text-blue-500' : 'text-gray-400 group-focus-within:text-gray-900'}`} size={18} />
              <input
                type="text"
                placeholder="Filter by name, identifier, or node designation..."
                className={`w-full pl-14 pr-6 py-4 border-none rounded-2xl text-sm font-bold outline-none transition-all ${darkMode ? 'bg-white/5 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-blue-500/50' : 'bg-gray-50 text-gray-900 focus:ring-2 focus:ring-gray-900 focus:bg-white shadow-inner'
                  }`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              <select
                className={`border-none rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-[0.15em] outline-none cursor-pointer transition-all flex-shrink-0 ${darkMode ? 'bg-white/5 text-slate-300 focus:ring-1 focus:ring-blue-500/50' : 'bg-gray-50 text-gray-900 focus:ring-2 focus:ring-gray-900 hover:bg-gray-100 shadow-sm'
                  }`}
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
              >
                <option value="all">Unified System</option>
                <option value="hq">HQ Command</option>
                <option value="rehab">Rehab Node</option>
                <option value="spims">SPIMS Node</option>
                <option value="hospital">Medical Node</option>
                <option value="sukoon">Sukoon Node</option>
                <option value="welfare">Welfare Node</option>
                <option value="job-center">Workforce Node</option>
                <option value="social-media">Broadcast Node</option>
                <option value="it">Digital Node</option>
              </select>
              <select
                className={`border-none rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-[0.15em] outline-none cursor-pointer transition-all flex-shrink-0 ${darkMode ? 'bg-white/5 text-slate-300 focus:ring-1 focus:ring-blue-500/50' : 'bg-gray-50 text-gray-900 focus:ring-2 focus:ring-gray-900 hover:bg-gray-100 shadow-sm'
                  }`}
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
              >
                <option value="name">Sort: Name (A-Z)</option>
                <option value="id">Sort: ID (Numeric)</option>
                <option value="seniority">Sort: Seniority</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-gray-100/70">
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`h-12 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 hover:scale-[1.02] ${
                statusFilter === 'active'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10 animate-fadeIn'
                  : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === 'active' ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
              <span>Active Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('active_vacancy')}
              className={`h-12 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 hover:scale-[1.02] ${
                statusFilter === 'active_vacancy'
                  ? 'bg-indigo-650 text-white border-indigo-600 shadow-md shadow-indigo-600/10 animate-fadeIn'
                  : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-indigo-300'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === 'active_vacancy' ? 'bg-white animate-pulse' : 'bg-indigo-500'}`} />
              <span>Active Vacancies</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`h-12 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 hover:scale-[1.02] ${
                statusFilter === 'inactive'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10 animate-fadeIn'
                  : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === 'inactive' ? 'bg-white animate-pulse' : 'bg-amber-500'}`} />
              <span>Inactive</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('resigned')}
              className={`h-12 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 hover:scale-[1.02] ${
                statusFilter === 'resigned'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/10 animate-fadeIn'
                  : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === 'resigned' ? 'bg-white animate-pulse' : 'bg-rose-500'}`} />
              <span>Resigned</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('terminated')}
              className={`h-12 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 hover:scale-[1.02] ${
                statusFilter === 'terminated'
                  ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/10 animate-fadeIn'
                  : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === 'terminated' ? 'bg-white animate-pulse' : 'bg-red-650'}`} />
              <span>Terminated</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`h-12 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 hover:scale-[1.02] ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-md animate-fadeIn'
                  : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === 'all' ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
              <span>All Personnel</span>
            </button>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {filtered.map(s => {
            const colors = getDeptColor(s.dept);
            return (
              <Link
                key={s.id}
                href={`/hq/dashboard/manager/staff/${s.id}`}
                className={`group rounded-[2.5rem] p-8 border transition-all duration-700 flex flex-col relative overflow-hidden bg-gradient-to-br ${colors.from} ${colors.to} bg-white ${colors.border} hover:shadow-2xl hover:shadow-${colors.base}-200/50 hover:scale-[1.02]`}
              >
                {/* Decorative Background Icon */}
                <div className={`absolute -right-6 -top-6 w-32 h-32 opacity-[0.05] transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 ${colors.text}`}>
                   <Users size={128} strokeWidth={1} />
                </div>

                {/* Status Indicator */}
                <div className="absolute top-8 right-8 z-20">
                  <div className={`w-3 h-3 rounded-full ${s.isActive !== false ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-gray-300'} ring-8 ring-white/50`} />
                </div>

                {/* Profile Section */}
                <div className="flex flex-col items-center text-center mb-8 relative">
                  <div className="relative mb-8">
                    <div className={`absolute inset-0 rounded-[2.5rem] blur-2xl transition-all duration-700 opacity-0 group-hover:opacity-40 ${colors.icon}`} />
                    {s.photoUrl ? (
                      <img src={s.photoUrl} className="w-28 h-28 rounded-[2.5rem] object-cover ring-4 ring-white transition-all duration-700 group-hover:scale-105 shadow-2xl relative z-10" />
                    ) : (
                      <div className="w-28 h-28 rounded-[2.5rem] bg-gray-50 flex items-center justify-center text-3xl font-black text-gray-300 shadow-inner transition-all duration-700 group-hover:scale-105 relative z-10 border border-gray-100">
                        {s.name?.[0]}
                      </div>
                    )}
                    <div className={cn("absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-500 z-20 text-white", colors.icon)}>
                      <Shield size={16} strokeWidth={2.5} />
                    </div>
                  </div>

                  <span className="text-[13px] font-black uppercase tracking-[0.2em] px-4 py-1.5 bg-gray-50 text-gray-900 border border-gray-100 rounded-xl transition-all group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 select-none leading-none">
                    {s.designation || 'Specialist'}
                  </span>
                  <h3 className="text-xs font-semibold text-gray-400 transition-colors leading-tight mt-2 group-hover:text-gray-600 select-none">{s.name}</h3>
                  <div className="mt-3 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-gray-100 bg-white text-gray-400">
                        {s.employeeId || 'ID-OFFLINE'}
                      </span>
                      <span className={cn("px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm", colors.text, colors.border, "bg-white")}>
                        {s.dept}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Footer */}
                <div className="grid grid-cols-2 gap-4 mt-auto pt-8 border-t border-gray-100 transition-colors">
                  <div className="rounded-2xl p-4 flex flex-col items-center transition-all bg-gray-50/50 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-gray-200/40 border border-transparent group-hover:border-gray-100">
                    <p className="text-[8px] font-black uppercase tracking-widest mb-2 text-gray-400">Efficiency</p>
                    <p className="text-sm font-black text-gray-900 flex items-baseline gap-1">
                      {s.growthPointsTotal || 0}
                      <span className="text-[8px] opacity-30">XP</span>
                    </p>
                  </div>
                  <div className="rounded-2xl p-4 flex flex-col items-center transition-all bg-gray-50/50 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-gray-200/40 border border-transparent group-hover:border-gray-100">
                    <p className="text-[8px] font-black uppercase tracking-widest mb-2 text-gray-400">Availability</p>
                    <p className={cn("text-sm font-black", (s.presentCount || 0) > 20 ? 'text-emerald-500' : 'text-rose-500')}>
                      {((s.presentCount || 0) / 30 * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Quick Action Overlay */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 duration-700">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xl bg-indigo-600 text-white shadow-indigo-500/30 group-hover:scale-110 active:scale-95">
                    <ArrowRight size={20} strokeWidth={2.5} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className={`rounded-[3rem] py-32 border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all ${darkMode ? 'bg-white/5 text-slate-700 shadow-2xl' : 'bg-white text-gray-300 shadow-xl'}`}>
              <Users size={40} strokeWidth={1.5} />
            </div>
            <h4 className={`text-xl font-black mb-2 transition-colors ${darkMode ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>No Nodes Found</h4>
            <p className={`${darkMode ? 'text-slate-500' : 'text-gray-400'} text-xs font-bold uppercase tracking-widest max-w-xs mx-auto`}>Zero records matching current marking parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
