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

export default function ManagerStaffPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staff, setStaff] = useState<StaffCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    multiRole: 0
  });

  const [unmarkedStaff, setUnmarkedStaff] = useState<any[]>([]);

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
        // Unified personnel registry fetch (7 departments)
        const unified = await listStaffCards({
          dept: 'all',
          status: 'all',
          role: 'personnel'
        });

        // Final sort
        unified.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaff(unified);

        // Stats Aggregation
        const today = new Date().toISOString().split('T')[0];
        const depts: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];

        // Fetch Today's Attendance for all departments
        const attSnaps = await Promise.all(
          depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_attendance`), where('date', '==', today))).catch(err => {
            console.warn(`Permission denied for ${d} attendance in staff list:`, err);
            return { docs: [] } as any;
          }))
        );

        const attendanceMap = new Map<string, string>();
        attSnaps.forEach(snap => {
          snap.docs.forEach((d: any) => {
            const data = d.data();
            const key = data.staffId || d.id;
            attendanceMap.set(key, data.status);
          });
        });

        const activeStaff = unified.filter(s => s.status === 'active' && s.isActive !== false);
        const presentToday = activeStaff.filter(s => attendanceMap.get(s.staffId) === 'present').length;

        setStats({
          total: activeStaff.length,
          present: presentToday,
          multiRole: activeStaff.filter(s => s.role === 'admin' || s.role === 'manager').length
        });

        // Duty Mapping (Last Activity)
        const unmarked = activeStaff.filter(s => !s.lastDutyLabel);
        setUnmarkedStaff(unmarked);

      } catch (err) {
        console.error(err);
        toast.error("Failed to sync personnel matrix");
      } finally {
        setLoading(false);
      }
    };

    fetchAllStaff();
  }, [session]);

  const filtered = useMemo(() => {
    return staff.filter(s => {
      const matchesSearch = search === '' ||
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.designation || '').toLowerCase().includes(search.toLowerCase());

      const matchesDept = deptFilter === 'all' || s.dept === deptFilter;
      const matchesStatus = (statusFilter === 'all' && (s.status !== 'resigned' && s.status !== 'terminated' && s.isActive !== false)) ||
        (statusFilter === 'active' && (s.status === 'active' || s.isActive !== false)) ||
        (statusFilter === 'inactive' && s.status === 'inactive') ||
        (statusFilter === 'resigned' && s.status === 'resigned') ||
        (statusFilter === 'terminated' && s.status === 'terminated');

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [staff, search, deptFilter, statusFilter]);

  if (sessionLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${darkMode ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
        <Loader2 className={`w-10 h-10 animate-spin ${darkMode ? 'text-blue-400' : 'text-black'}`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20 w-full overflow-x-hidden ${darkMode ? 'bg-[#0A0A0A]' : 'bg-[#F8FAFC]'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 border-b transition-all ${darkMode ? 'bg-[#0A0A0A]/80 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-xl flex-shrink-0 transition-colors ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-900 text-white'}`}>
                <Users size={20} />
              </div>
              <div className="min-w-0">
                <h1 className={`text-lg md:text-2xl font-black tracking-tight truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>Staff Management</h1>
                <p className={`${darkMode ? 'text-slate-500' : 'text-black'} text-[9px] font-black uppercase tracking-widest`}>Global Directory</p>
              </div>
            </div>

            <div className={`rounded-xl px-3 py-2 flex items-center gap-3 border flex-shrink-0 transition-colors ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
              <div className="text-right">
                <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-black'}`}>Staff</p>
                <p className={`text-base font-black transition-colors ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
              </div>
              <div className={`w-px h-6 ${darkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
              <div className="text-right">
                <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-black'}`}>Present</p>
                <p className="text-base font-black text-blue-600">{stats.present}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6">
        {/* Unmarked Duties Alert */}
        {unmarkedStaff.length > 0 && (
          <div className={`rounded-2xl p-4 md:p-6 mb-6 flex items-start gap-4 border transition-colors ${darkMode ? 'bg-orange-950/20 border-orange-500/20' : 'bg-orange-50 border-orange-100'
            }`}>
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
              <AlertCircle size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-black text-sm ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>Unmarked Duties Today</h4>
              <p className={`text-xs font-bold uppercase tracking-tight mt-1 ${darkMode ? 'text-orange-400/80' : 'text-orange-600'}`}>
                {unmarkedStaff.length} staff haven't had duties recorded today.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {unmarkedStaff.slice(0, 5).map(s => (
                  <Link
                    key={s.id}
                    href={`/hq/dashboard/manager/staff/${s.id}?collection=${s.dept}`}
                    className={`text-[10px] px-2 py-1 rounded-lg font-black border transition-all ${darkMode
                        ? 'bg-white/5 text-orange-400 border-orange-500/30 hover:bg-orange-500/10'
                        : 'bg-white text-orange-700 border-orange-200 hover:bg-orange-100'
                      }`}
                  >
                    {s.name}
                  </Link>
                ))}
                {unmarkedStaff.length > 5 && <span className={`text-[10px] font-bold ${darkMode ? 'text-orange-500/50' : 'text-orange-400'}`}>+{unmarkedStaff.length - 5} more</span>}
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className={`p-3 md:p-4 rounded-2xl shadow-sm border flex flex-col sm:flex-row gap-3 mb-6 transition-colors ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'
          }`}>
          <div className="flex-1 relative group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-600 group-focus-within:text-teal-500' : 'text-black group-focus-within:text-gray-900'}`} size={16} />
            <input
              type="text"
              placeholder="Search by Name, ID, or Designation..."
              className={`w-full pl-11 pr-4 py-3 border-none rounded-xl text-sm font-bold outline-none transition-colors ${darkMode ? 'bg-white/5 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-teal-500/50' : 'bg-gray-50 text-gray-900 focus:ring-2 focus:ring-gray-900'
                }`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <select
              className={`border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer transition-colors flex-shrink-0 ${darkMode ? 'bg-white/5 text-slate-300 focus:ring-1 focus:ring-teal-500/50' : 'bg-gray-50 text-black focus:ring-2 focus:ring-gray-900'
                }`}
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="all">Global Matrix</option>
              <option value="hq">Khan Hub HQ</option>
              <option value="rehab">Rehab Center</option>
              <option value="spims">SPIMS Academy</option>
              <option value="hospital">Hospital</option>
              <option value="sukoon">Sukoon Center</option>
              <option value="welfare">Welfare</option>
              <option value="job-center">Job Center</option>
              <option value="social-media">Social Media</option>
              <option value="it">IT Department</option>
            </select>
            <select
              className={`border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer transition-colors flex-shrink-0 ${darkMode ? 'bg-white/5 text-slate-300 focus:ring-1 focus:ring-teal-500/50' : 'bg-gray-50 text-black focus:ring-2 focus:ring-gray-900'
                }`}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Active & Inactive</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="resigned">Resigned / Left</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filtered.map(s => (
            <Link
              key={s.id}
              href={`/hq/dashboard/manager/staff/${s.id}`}
              className={`group rounded-2xl md:rounded-[2.5rem] p-5 md:p-6 border transition-all duration-500 flex flex-col relative overflow-hidden ${darkMode
                  ? 'bg-white/[0.03] border-white/5 hover:border-teal-500/50 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-teal-900/20'
                  : 'bg-white border-gray-100 hover:shadow-xl hover:shadow-gray-200/50'
                }`}
            >
              {/* Status Badge */}
              <div className="absolute top-5 right-5">
                <div className={`w-2.5 h-2.5 rounded-full ${s.isActive !== false ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]' : 'bg-gray-300'} ring-4 ${darkMode ? 'ring-slate-900' : 'ring-white'}`} />
              </div>

              {/* Profile Section */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="relative mb-3">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} className={`w-20 h-20 rounded-[1.5rem] object-cover ring-4 transition-all duration-500 group-hover:scale-105 shadow-lg ${darkMode ? 'ring-white/5' : 'ring-gray-50'}`} />
                  ) : (
                    <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-inner transition-colors ${darkMode ? 'bg-white/5 text-slate-700' : 'bg-gray-100 text-black'}`}>
                      {s.name?.[0]}
                    </div>
                  )}
                  <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-xl shadow-md border transition-colors ${darkMode ? 'bg-slate-800 border-white/10 text-teal-400' : 'bg-white border-gray-100 text-gray-900'}`}>
                    <Shield size={12} />
                  </div>
                </div>

                <h3 className={`text-base font-black transition-colors ${darkMode ? 'text-white group-hover:text-teal-400' : 'text-gray-900 group-hover:text-blue-600'}`}>{s.name}</h3>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 mb-3 transition-colors ${darkMode ? 'text-slate-500' : 'text-black'}`}>{s.designation || 'Staff Member'}</p>

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <span className={`px-2.5 py-1 border rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${darkMode ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-gray-50 text-black border-gray-100'
                    }`}>
                    {s.employeeId || 'N/A'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${s.dept === 'rehab' ? (darkMode ? 'bg-blue-400/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100') :
                      s.dept === 'spims' ? (darkMode ? 'bg-green-400/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100') :
                        (darkMode ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-gray-50 text-black border-gray-100')
                    }`}>
                    {s.dept}
                  </span>
                </div>
              </div>

              {/* Stats Footer */}
              <div className={`grid grid-cols-2 gap-2 mt-auto pt-4 border-t transition-colors ${darkMode ? 'border-white/5' : 'border-gray-50'}`}>
                <div className={`rounded-xl p-2.5 flex flex-col items-center transition-colors ${darkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className={`text-[8px] font-black uppercase tracking-tighter ${darkMode ? 'text-slate-600' : 'text-black'}`}>Growth</p>
                  <p className={`text-sm font-black transition-colors ${darkMode ? 'text-slate-200' : 'text-gray-900'}`}>{s.growthPointsTotal} pts</p>
                </div>
                <div className={`rounded-xl p-2.5 flex flex-col items-center transition-colors ${darkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className={`text-[8px] font-black uppercase tracking-tighter ${darkMode ? 'text-slate-600' : 'text-black'}`}>Attendance</p>
                  <p className="text-sm font-black text-teal-600">{(s.presentCount / 30 * 100).toFixed(0)}%</p>
                </div>
              </div>

              {/* Hover Action */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                <div className={`p-2 rounded-xl transition-colors ${darkMode ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-gray-900 text-white'}`}>
                  <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className={`rounded-3xl py-20 border-2 border-dashed flex flex-col items-center justify-center text-center transition-colors ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'
            }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${darkMode ? 'bg-white/5 text-slate-700' : 'bg-gray-50 text-black'}`}>
              <Users size={32} />
            </div>
            <h4 className={`text-lg font-black mb-2 transition-colors ${darkMode ? 'text-white' : 'text-gray-900'}`}>No Staff Members Found</h4>
            <p className={`${darkMode ? 'text-slate-500' : 'text-black'} text-sm max-w-xs mx-auto`}>Try adjusting your search filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
