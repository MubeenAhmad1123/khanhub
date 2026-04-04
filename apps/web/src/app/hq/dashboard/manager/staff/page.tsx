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
  Building2, UserCheck
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
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    multiRole: 0
  });

  const [unmarkedStaff, setUnmarkedStaff] = useState<any[]>([]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Premium Header */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-gray-900 rounded-xl text-white">
                  <Users size={24} />
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Staff Management</h1>
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest ml-11">Global Directory & Performance</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Staff</p>
                    <p className="text-lg font-black text-gray-900">{stats.total}</p>
                 </div>
                 <div className="w-px h-8 bg-gray-200" />
                 <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Present Today</p>
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
          <div className="bg-orange-50 border border-orange-100 rounded-[2rem] p-6 mb-8 flex items-start gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-orange-900 text-sm">Unmarked Duties Today</h4>
              <p className="text-xs text-orange-600 font-bold uppercase tracking-tight mt-1">
                {unmarkedStaff.length} staff members haven't had their duties recorded for today.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {unmarkedStaff.slice(0, 5).map(s => (
                  <Link key={s.id} href={`/hq/dashboard/manager/staff/${s.id}?collection=${s._origin}`} className="text-[10px] bg-white px-2 py-1 rounded-lg text-orange-700 font-black border border-orange-200 hover:bg-orange-100 transition-colors">
                    {s.name}
                  </Link>
                ))}
                {unmarkedStaff.length > 5 && <span className="text-[10px] text-orange-400 font-bold">+{unmarkedStaff.length - 5} more</span>}
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Name, ID, or Designation..."
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-gray-900 outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select 
              className="bg-gray-50 border-none rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-700 outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              <option value="rehab">Rehab Portal</option>
              <option value="spims">SPIMS Portal</option>
              <option value="hq">HQ / Admin</option>
            </select>
            <select 
              className="bg-gray-50 border-none rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-700 outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
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
              className="group bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500 flex flex-col relative overflow-hidden"
            >
              {/* Status Badge */}
              <div className="absolute top-6 right-6">
                <div className={`w-3 h-3 rounded-full ${s.isActive !== false ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]' : 'bg-gray-300'} ring-4 ring-white`} />
              </div>

              {/* Profile Section */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} className="w-24 h-24 rounded-[2rem] object-cover ring-4 ring-gray-50 shadow-lg group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-24 h-24 rounded-[2rem] bg-gray-100 text-gray-400 flex items-center justify-center text-3xl font-black shadow-inner">
                      {s.name?.[0]}
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-xl shadow-md border border-gray-100">
                    <Shield className="text-gray-900" size={14} />
                  </div>
                </div>
                
                <h3 className="text-lg font-black text-gray-900 group-hover:text-blue-600 transition-colors">{s.name}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-3">{s.designation || 'Staff Member'}</p>
                
                <div className="flex items-center gap-2">
                   <span className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-full text-[9px] font-black text-gray-500 uppercase tracking-widest">
                     ID: {s.employeeId || 'N/A'}
                   </span>
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                     s.department === 'rehab' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                     s.department === 'spims' ? 'bg-green-50 text-green-600 border-green-100' :
                     'bg-gray-50 text-gray-600 border-gray-100'
                   }`}>
                     {s.department}
                   </span>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-2 gap-3 mt-auto pt-6 border-t border-gray-50">
                <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center">
                   <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Growth</p>
                   <p className="text-sm font-black text-gray-900">{(s.growthPoints?.totalPoints || 0)} pts</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center">
                   <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Attendance</p>
                   <p className="text-sm font-black text-teal-600">{(s.stats?.attendanceRate || 0)}%</p>
                </div>
              </div>

              {/* Hover Action */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                <div className="bg-gray-900 text-white p-2 rounded-xl">
                  <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="bg-white rounded-[3rem] py-24 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <Users className="text-gray-300" size={40} />
            </div>
            <h4 className="text-xl font-black text-gray-900 mb-2">No Staff Members Found</h4>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">Try adjusting your search filters or department selection.</p>
          </div>
        )}
      </div>
    </div>
  );
}