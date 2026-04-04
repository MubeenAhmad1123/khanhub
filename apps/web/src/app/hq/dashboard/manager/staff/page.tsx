// src/app/hq/dashboard/manager/staff/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import { 
  Loader2, Users, Search, Filter, 
  MapPin, Shield, Star, Clock, 
  ArrowRight, CheckCircle2, AlertCircle,
  Building2, UserCheck, Moon, Sun
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ManagerStaffPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [darkMode, setDarkMode] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    multiRole: 0
  });

  const [unmarkedStaff, setUnmarkedStaff] = useState<any[]>([]);

  useEffect(() => {
    const isDark = localStorage.getItem('hq_dark_mode') === 'true';
    setDarkMode(isDark);
  }, []);

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
        // Fetch from both collections for global view
        const [rehabSnap, hqSnap] = await Promise.all([
          getDocs(collection(db, 'rehab_staff')),
          getDocs(collection(db, 'hq_staff'))
        ]);

        const rehabList = rehabSnap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(), 
          _origin: 'rehab',
          department: d.data().department || 'rehab' 
        }));
        
        const hqList = hqSnap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(), 
          _origin: 'hq',
          department: d.data().department || 'hq' 
        }));

        const unified: any[] = [...rehabList, ...hqList];
        
        // Final sort
        unified.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaff(unified);

        // Fetch Attendance for Stats (Today)
        const todayStr = new Date().toISOString().split('T')[0];
        const [rehabAtt, hqAtt] = await Promise.all([
          getDocs(query(collection(db, 'rehab_attendance'), where('date', '==', todayStr), where('status', '==', 'present'))),
          getDocs(query(collection(db, 'hq_attendance'), where('date', '==', todayStr), where('status', '==', 'present')))
        ]);

        setStats({
          total: unified.length,
          present: rehabAtt.size + hqAtt.size,
          multiRole: unified.filter(s => (s.roles?.length > 1) || s.loginUserId === 'multi').length // Placeholder logic
        });

        // 3. Find Unmarked Duties
        const [rehabDutyLogs, hqDutyLogs] = await Promise.all([
          getDocs(query(collection(db, 'rehab_duty_logs'), where('date', '>=', new Date(todayStr)))),
          getDocs(query(collection(db, 'hq_duty_logs'), where('date', '>=', new Date(todayStr))))
        ]);

        const markedIds = new Set([
          ...rehabDutyLogs.docs.map(d => d.data().staffId),
          ...hqDutyLogs.docs.map(d => d.data().staffId)
        ]);

        const unmarked = unified.filter(s => s.isActive !== false && !markedIds.has(s.id));
        setUnmarkedStaff(unmarked);

      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch staff directory");
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
      
      const matchesDept = deptFilter === 'all' || s.department === deptFilter;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && s.isActive !== false) ||
        (statusFilter === 'inactive' && s.isActive === false);
        
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [staff, search, deptFilter, statusFilter]);

  if (sessionLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${darkMode ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
        <Loader2 className={`w-10 h-10 animate-spin ${darkMode ? 'text-teal-400' : 'text-gray-800'}`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20 ${darkMode ? 'bg-[#0A0A0A]' : 'bg-[#F8FAFC]'}`}>
      {/* Premium Header */}
      <div className={`sticky top-0 z-20 border-b transition-all ${darkMode ? 'bg-[#0A0A0A]/80 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-xl transition-colors ${darkMode ? 'bg-teal-500/10 text-teal-400' : 'bg-gray-900 text-white'}`}>
                  <Users size={24} />
                </div>
                <h1 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Staff Management</h1>
              </div>
              <p className={`${darkMode ? 'text-slate-500' : 'text-gray-500'} text-[10px] font-black uppercase tracking-widest ml-11`}>Global Directory & Performance</p>
            </div>

            <div className="flex items-center gap-3">
              <div className={`rounded-2xl p-4 flex items-center gap-4 border transition-colors ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                 <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Active Staff</p>
                    <p className={`text-lg font-black transition-colors ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
                 </div>
                 <div className={`w-px h-8 ${darkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
                 <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Present Today</p>
                    <p className="text-lg font-black text-teal-600">{stats.present}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* Unmarked Duties Alert */}
        {unmarkedStaff.length > 0 && (
          <div className={`rounded-[2rem] p-6 mb-8 flex items-start gap-4 border transition-colors ${
            darkMode ? 'bg-orange-950/20 border-orange-500/20' : 'bg-orange-50 border-orange-100'
          }`}>
            <div className={`p-3 rounded-2xl ${darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <h4 className={`font-black text-sm ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>Unmarked Duties Today</h4>
              <p className={`text-xs font-bold uppercase tracking-tight mt-1 ${darkMode ? 'text-orange-400/80' : 'text-orange-600'}`}>
                {unmarkedStaff.length} staff members haven't had their duties recorded for today.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {unmarkedStaff.slice(0, 5).map(s => (
                  <Link 
                    key={s.id} 
                    href={`/hq/dashboard/manager/staff/${s.id}?collection=${s._origin}`} 
                    className={`text-[10px] px-2 py-1 rounded-lg font-black border transition-all ${
                      darkMode 
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
        <div className={`p-4 rounded-[2rem] shadow-sm border flex flex-col lg:flex-row gap-4 mb-8 transition-colors ${
          darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'
        }`}>
          <div className="flex-1 relative group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-600 group-focus-within:text-teal-500' : 'text-gray-400 group-focus-within:text-gray-900'}`} size={18} />
            <input 
              type="text" 
              placeholder="Search by Name, ID, or Designation..."
              className={`w-full pl-12 pr-4 py-4 border-none rounded-2xl text-sm font-bold outline-none transition-colors ${
                darkMode ? 'bg-white/5 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-teal-500/50' : 'bg-gray-50 text-gray-900 focus:ring-2 focus:ring-gray-900'
              }`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select 
              className={`border-none rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none cursor-pointer transition-colors ${
                darkMode ? 'bg-white/5 text-slate-300 focus:ring-1 focus:ring-teal-500/50' : 'bg-gray-50 text-gray-700 focus:ring-2 focus:ring-gray-900'
              }`}
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              <option value="rehab">Rehab Portal</option>
              <option value="spims">SPIMS Portal</option>
              <option value="hq">HQ / Admin</option>
            </select>
            <select 
              className={`border-none rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none cursor-pointer transition-colors ${
                darkMode ? 'bg-white/5 text-slate-300 focus:ring-1 focus:ring-teal-500/50' : 'bg-gray-50 text-gray-700 focus:ring-2 focus:ring-gray-900'
              }`}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(s => (
            <Link 
              key={s.id} 
              href={`/hq/dashboard/manager/staff/${s.id}?collection=${s._origin}`}
              className={`group rounded-[2.5rem] p-6 border transition-all duration-500 flex flex-col relative overflow-hidden ${
                darkMode 
                  ? 'bg-white/[0.03] border-white/5 hover:border-teal-500/50 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-teal-900/20' 
                  : 'bg-white border-gray-100 hover:shadow-xl hover:shadow-gray-200/50'
              }`}
            >
              {/* Status Badge */}
              <div className="absolute top-6 right-6">
                <div className={`w-3 h-3 rounded-full ${s.isActive !== false ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]' : 'bg-gray-300'} ring-4 ${darkMode ? 'ring-slate-900' : 'ring-white'}`} />
              </div>

              {/* Profile Section */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} className={`w-24 h-24 rounded-[2rem] object-cover ring-4 transition-all duration-500 group-hover:scale-105 shadow-lg ${darkMode ? 'ring-white/5' : 'ring-gray-50'}`} />
                  ) : (
                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-inner transition-colors ${darkMode ? 'bg-white/5 text-slate-700' : 'bg-gray-100 text-gray-400'}`}>
                      {s.name?.[0]}
                    </div>
                  )}
                  <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-xl shadow-md border transition-colors ${darkMode ? 'bg-slate-800 border-white/10 text-teal-400' : 'bg-white border-gray-100 text-gray-900'}`}>
                    <Shield size={14} />
                  </div>
                </div>
                
                <h3 className={`text-lg font-black transition-colors ${darkMode ? 'text-white group-hover:text-teal-400' : 'text-gray-900 group-hover:text-blue-600'}`}>{s.name}</h3>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 mb-3 transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>{s.designation || 'Staff Member'}</p>
                
                <div className="flex items-center gap-2">
                   <span className={`px-3 py-1 border rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${
                     darkMode ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-gray-50 text-gray-500 border-gray-100'
                   }`}>
                     ID: {s.employeeId || 'N/A'}
                   </span>
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${
                     s.department === 'rehab' ? (darkMode ? 'bg-blue-400/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100') :
                     s.department === 'spims' ? (darkMode ? 'bg-green-400/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100') :
                     (darkMode ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-gray-50 text-gray-600 border-gray-100')
                   }`}>
                     {s.department}
                   </span>
                </div>
              </div>

              {/* Stats Footer */}
              <div className={`grid grid-cols-2 gap-3 mt-auto pt-6 border-t transition-colors ${darkMode ? 'border-white/5' : 'border-gray-50'}`}>
                <div className={`rounded-2xl p-3 flex flex-col items-center transition-colors ${darkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                   <p className={`text-[8px] font-black uppercase tracking-tighter ${darkMode ? 'text-slate-600' : 'text-gray-400'}`}>Growth</p>
                   <p className={`text-sm font-black transition-colors ${darkMode ? 'text-slate-200' : 'text-gray-900'}`}>{(s.growthPoints?.totalPoints || 0)} pts</p>
                </div>
                <div className={`rounded-2xl p-3 flex flex-col items-center transition-colors ${darkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                   <p className={`text-[8px] font-black uppercase tracking-tighter ${darkMode ? 'text-slate-600' : 'text-gray-400'}`}>Attendance</p>
                   <p className="text-sm font-black text-teal-600">{(s.stats?.attendanceRate || 0)}%</p>
                </div>
              </div>

              {/* Hover Action */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                <div className={`p-2 rounded-xl transition-colors ${darkMode ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-gray-900 text-white'}`}>
                  <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className={`rounded-[3rem] py-24 border-2 border-dashed flex flex-col items-center justify-center text-center transition-colors ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'
          }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${darkMode ? 'bg-white/5 text-slate-700' : 'bg-gray-50 text-gray-300'}`}>
              <Users size={40} />
            </div>
            <h4 className={`text-xl font-black mb-2 transition-colors ${darkMode ? 'text-white' : 'text-gray-900'}`}>No Staff Members Found</h4>
            <p className={`${darkMode ? 'text-slate-500' : 'text-gray-400'} text-sm max-w-xs mx-auto`}>Try adjusting your search filters or department selection.</p>
          </div>
        )}
      </div>
    </div>
  );
}