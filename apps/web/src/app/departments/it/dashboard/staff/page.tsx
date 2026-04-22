'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Mail, 
  Phone,
  ArrowUpDown,
  UserPlus
} from 'lucide-react';
import { listStaffCards, type StaffCardRow } from '@/lib/hq/superadmin/staff';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function ItStaffPage() {
  const [staff, setStaff] = useState<StaffCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<'all' | 'it' | 'social-media'>('all');

  useEffect(() => {
    async function load() {
      try {
        // Fetch both IT and Social Media staff
        const itStaff = await listStaffCards({ dept: 'it', status: 'all', role: 'all' });
        const mediaStaff = await listStaffCards({ dept: 'social-media', status: 'all', role: 'all' });
        setStaff([...itStaff, ...mediaStaff]);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load staff list');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.staffId.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'all' || s.dept === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tightest text-black uppercase">
            Personnel <span className="text-gray-300">Directory</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Managing {staff.length} team members across IT and Social Media.</p>
        </div>
        
        <button className="flex items-center gap-2 bg-black text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-black/10">
          <UserPlus size={16} />
          Add Team Member
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
          <input 
            type="text"
            placeholder="Search by name or staff ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:border-black font-bold text-sm transition-all"
          />
        </div>
        
        <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
          {(['all', 'it', 'social-media'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setDeptFilter(f)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                deptFilter === f ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'
              }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-gray-50 animate-pulse rounded-[2.5rem]" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <Users size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-black text-black">No team members found</h3>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-bold">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((s) => (
            <div key={s.id} className="group bg-white border border-gray-100 rounded-[2.5rem] p-6 hover:border-black transition-all hover:shadow-2xl hover:shadow-black/5">
              <div className="flex items-start justify-between mb-6">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 border-2 border-gray-100 group-hover:border-black transition-colors">
                  {s.photoUrl ? (
                    <Image src={s.photoUrl} alt={s.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black text-white font-black text-xl">
                      {s.name[0]}
                    </div>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  s.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-black tracking-tight">{s.name}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{s.designation}</p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">Department</span>
                  <span className="text-[10px] font-bold text-black uppercase">{s.dept.replace('-', ' ')}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">Staff ID</span>
                  <span className="text-[10px] font-bold text-black">{s.staffId}</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-black hover:text-white transition-all rounded-xl text-[10px] font-black uppercase tracking-widest group/btn">
                  <Mail size={14} className="text-gray-400 group-hover/btn:text-white" />
                  Email
                </button>
                <button className="flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-black hover:text-white transition-all rounded-xl text-[10px] font-black uppercase tracking-widest group/btn">
                  <Phone size={14} className="text-gray-400 group-hover/btn:text-white" />
                  Call
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
