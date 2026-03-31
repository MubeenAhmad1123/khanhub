'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import { Loader2, Users, Search, Filter } from 'lucide-react';

export default function ManagerStaffPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'manager') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'manager') return;

    const fetchStaff = async () => {
      try {
        const snap = await getDocs(collection(db, 'hq_staff'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaff(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [session]);

  const filtered = staff.filter(s => {
    const matchesSearch = search === '' ||
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.employeeId || '').toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'all' || s.department === deptFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && s.isActive !== false) ||
      (statusFilter === 'inactive' && s.isActive === false);
    return matchesSearch && matchesDept && matchesStatus;
  });

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 flex items-center gap-2">
          <Users className="w-8 h-8 text-gray-800" />
          Staff Roster
        </h1>
        <p className="text-gray-400 text-sm mt-1">All employees directory</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            className="w-full bg-white border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-gray-200"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 outline-none"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            <option value="rehab">Rehab</option>
            <option value="spims">SPIMS</option>
            <option value="hq">HQ</option>
          </select>
          <select
            className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 outline-none"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        Showing {filtered.length} of {staff.length} staff
      </p>

      {filtered.length === 0 ? (
        <p className="text-center py-10 text-gray-300 font-bold uppercase tracking-widest text-[10px]">No staff found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all">
              <div className="p-6 flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-black text-lg flex-shrink-0">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    (s.name || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate">{s.name}</p>
                  <p className="text-[10px] font-mono text-gray-400">{s.employeeId}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.designation}</p>
                </div>
              </div>
              <div className="px-6 pb-4 flex flex-wrap gap-2">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                  s.department === 'rehab' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  s.department === 'spims' ? 'bg-green-50 text-green-600 border-green-100' :
                  'bg-gray-50 text-gray-600 border-gray-100'
                }`}>
                  {s.department}
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                  s.isActive !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {s.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="px-6 pb-4 text-xs text-gray-500">
                <p>📞 {s.phone || 'N/A'}</p>
                <p>🕐 {s.dutyStart || '—'} — {s.dutyEnd || '—'}</p>
                <p>💰 ₨{s.monthlySalary?.toLocaleString() || '0'}</p>
              </div>
              <div className="px-6 pb-6">
                <Link href={`/hq/dashboard/manager/staff/${s.id}`}
                  className="block w-full text-center bg-gray-50 text-gray-700 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}