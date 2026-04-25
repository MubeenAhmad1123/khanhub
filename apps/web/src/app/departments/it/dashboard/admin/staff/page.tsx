'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Users, Search, ChevronRight, User, Plus, 
  Shield, ShieldCheck, Mail, Phone, ArrowRight
} from 'lucide-react';
import { Spinner } from '@/components/ui';

export default function ITStaffTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/it/login'); return;
    }
    fetchStaff();
  }, [router]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      // Fetching from it_staff collection
      const snap = await getDocs(query(collection(db, 'it_staff'), orderBy('name', 'asc')));
      
      const all = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setStaff(all);
    } catch (err: any) {
      console.error('Fetch IT staff error:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <Spinner size="lg" />
      </div>
    );
  }

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.designation || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-black/5 pb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-black flex items-center gap-4 tracking-tighter">
              <Users className="w-10 h-10 text-indigo-600" />
              IT Engineering Team
            </h1>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-2">Managing IT personnel and roles</p>
          </div>
          <Link
            href="/departments/it/dashboard/admin/staff/new"
            className="bg-indigo-600 hover:bg-black text-white px-8 py-4 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 active:scale-95 transition-all"
          >
            <Plus size={18} />
            <span>Add Team Member</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Shield size={20} /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Engineers</p><p className="text-2xl font-black text-black">{staff.length}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600"><ShieldCheck size={20} /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin Roles</p><p className="text-2xl font-black text-black">{staff.filter(s => s.role === 'admin').length}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><User size={20} /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Duties</p><p className="text-2xl font-black text-black">{staff.length}</p></div>
            </div>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search team by name or designation..."
            className="w-full bg-white border border-black/5 rounded-[2rem] pl-14 pr-6 py-5 text-sm font-bold outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
          />
        </div>

        {filteredStaff.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-20 text-center border border-black/5 shadow-sm">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-200">
              <Users size={40} />
            </div>
            <h3 className="text-2xl font-black text-black mb-2">No team members found</h3>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Add a new engineer to build the team</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredStaff.map(member => (
              <Link 
                href={`/departments/it/dashboard/admin/staff/${member.id}`} 
                key={member.id}
                className="bg-white rounded-[2.5rem] p-8 border border-black/5 hover:border-indigo-500 shadow-sm hover:shadow-2xl transition-all group active:scale-[0.98] flex flex-col items-center text-center relative overflow-hidden"
              >
                <div className="absolute top-4 right-4">
                  <div className={`w-3 h-3 rounded-full ${member.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}`} />
                </div>

                <div className="w-24 h-24 rounded-[2rem] bg-gray-100 flex items-center justify-center text-gray-400 font-black text-3xl mb-6 ring-4 ring-gray-50 transition-transform group-hover:scale-105 duration-500">
                  {member.name.charAt(0).toUpperCase()}
                </div>

                <h3 className="text-lg font-black text-black group-hover:text-indigo-600 transition-colors leading-tight mb-2">{member.name}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{member.designation || 'Engineer'}</p>

                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.role || 'Staff'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[9px] font-black uppercase tracking-widest">
                    {member.employeeId || 'ID-N/A'}
                  </span>
                </div>

                <div className="w-full pt-6 border-t border-black/5 flex items-center justify-center gap-4 text-gray-400">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter">
                    <Mail size={12} /> Email
                  </div>
                  <div className="w-1 h-1 rounded-full bg-gray-200" />
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter">
                    <Phone size={12} /> Contact
                  </div>
                </div>

                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-xl">
                    <ArrowRight size={18} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
