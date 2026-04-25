'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import { 
  Building2, Plus, Search, ChevronRight, User, Calendar, 
  MapPin, Globe, CheckCircle, AlertCircle, X, Mail, Monitor
} from 'lucide-react';
import { Spinner } from '@/components/ui';

export default function ITClientsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/it/login'); return;
    }
    fetchClients();
  }, [router]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'it_clients')));
      
      const all = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }));

      setClients(all);
    } catch (err: any) {
      console.error('Fetch IT clients error:', err?.message);
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

  const filteredClients = clients.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    
    const s = searchQuery.toLowerCase();
    return (
      e.companyName.toLowerCase().includes(s) ||
      (e.contactPerson || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-black/5 pb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-black flex items-center gap-4 tracking-tighter">
              <Building2 className="w-10 h-10 text-indigo-600" />
              IT Client Directory
            </h1>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-2">Managing IT project owners and partners</p>
          </div>
          <Link
            href="/departments/it/dashboard/admin/clients/new"
            className="bg-indigo-600 hover:bg-black text-white px-8 py-4 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 active:scale-95 transition-all"
          >
            <Plus size={18} />
            <span>Onboard New Client</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0"><Monitor className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Clients</p><p className="text-2xl font-black text-black">{clients.length}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0"><CheckCircle className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Accounts</p><p className="text-2xl font-black text-black">{clients.filter(e => e.status === 'active').length}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0"><Globe className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project Depth</p><p className="text-2xl font-black text-black">{clients.reduce((acc, c) => acc + (c.activeProjects || 0), 0)}</p></div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by company name or contact..."
              className="w-full bg-white border border-black/5 rounded-[2rem] pl-14 pr-6 py-5 text-sm font-bold outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {['all', 'active', 'inactive'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  statusFilter === f ? 'bg-black text-white shadow-xl' : 'bg-white text-gray-400 border border-black/5 hover:bg-gray-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-20 text-center border border-black/5 shadow-sm">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-200">
              <Building2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-black mb-2">No clients found</h3>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Onboard a new client to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => (
              <Link 
                href={`/departments/it/dashboard/admin/clients/${client.id}`} 
                key={client.id}
                className="bg-white rounded-[2.5rem] p-8 border border-black/5 hover:border-indigo-500 shadow-sm hover:shadow-2xl transition-all group active:scale-[0.98] relative overflow-hidden"
              >
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-gray-100 text-gray-500 flex items-center justify-center font-black text-3xl">
                    {client.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-black truncate leading-tight">{client.companyName}</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{client.contactPerson}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">{client.activeProjects || 0}</div>
                      <span className="text-xs font-black text-black uppercase tracking-tight">Active Projects</span>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {client.status}
                    </span>
                  </div>

                  <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Mail size={14} className="text-indigo-400" />
                      {client.email || 'No email set'}
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                      <ChevronRight size={18} />
                    </div>
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
