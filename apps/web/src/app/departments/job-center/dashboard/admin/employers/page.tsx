// d:\khanhub\apps\web\src\app\departments\job-center\dashboard\admin\employers\page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import { 
  Building, Plus, Search, ChevronRight, User, Calendar, Loader2, 
  MapPin, Globe, CheckCircle, AlertCircle, X, Mail
} from 'lucide-react';
import { Employer } from '@/types/job-center';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

export default function EmployersListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Employer[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allEmployers, setAllEmployers] = useState<Employer[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) {
      router.push('/departments/job-center/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/job-center/login');
      return;
    }
    fetchEmployers();
  }, [router]);

  const fetchEmployers = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'jobcenter_employers'), orderBy('createdAt', 'desc')));
      
      const all = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as Employer[];

      setEmployers(all);
      setAllEmployers(all);
    } catch (err: any) {
      console.error('Fetch companies error:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const matches = allEmployers.filter((e) =>
      (e.companyName || '').toLowerCase().includes(q) ||
      (e.loginId || '').toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 10));
    setSearchOpen(true);
  }, [searchQuery, allEmployers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest transition-all">Loading Companies...</p>
        </div>
      </div>
    );
  }

  const filteredEmployers = employers.filter(e => {
    if (statusFilter === 'active' && !e.isActive) return false;
    if (statusFilter === 'inactive' && e.isActive) return false;
    
    const s = searchQuery.toLowerCase();
    return (
      e.companyName.toLowerCase().includes(s) ||
      (e.loginId || '').toLowerCase().includes(s) ||
      (e.industry || '').toLowerCase().includes(s)
    );
  });

  return (
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Open Positions</p><p className="text-xl font-black text-gray-900">0</p></div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0"><Globe className="w-5 h-5" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verified</p><p className="text-xl font-black text-gray-900">{allEmployers.filter(e => e.isActive).length}</p></div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setSearchOpen(true)}
                placeholder="Search by company name, ID or industry..."
                className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-10 py-3.5 text-sm font-semibold outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-2"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden">
                {searchResults.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery(e.companyName);
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs flex-shrink-0">
                      {e.logoUrl ? <img src={e.logoUrl} className="w-full h-full object-cover rounded-xl" /> : String(e.companyName)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm font-black">{e.companyName}</p>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        {e.loginId || e.id}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {['all', 'active', 'inactive'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  statusFilter === f ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/10' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        {filteredEmployers.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No employers found</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">Try registered a new employer or adjust your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredEmployers.map(employer => (
              <Link 
                href={`/departments/job-center/dashboard/admin/employers/${employer.id}`} 
                key={employer.id}
                className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-indigo-900/5 hover:-translate-y-1 hover:border-indigo-200 transition-all active:scale-[0.98] group flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <ChevronRight size={18} />
                    </div>
                </div>
                
                <div className="flex items-center gap-4 mb-5">
                    <div className="relative flex-shrink-0">
                        {employer.logoUrl ? (
                            <img src={employer.logoUrl} alt={employer.companyName} className="w-16 h-16 rounded-[1.25rem] object-cover border-2 border-white shadow-lg" />
                        ) : (
                            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 flex items-center justify-center font-black text-2xl border border-indigo-200/50">
                                {employer.companyName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${employer.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-gray-900 truncate leading-tight mb-0.5">{employer.companyName}</h3>
                        <p className="text-[10px] font-mono text-indigo-600 font-black truncate">{employer.loginId || `#${employer.id.slice(0, 8)}`}</p>
                        <span className="inline-block mt-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 text-[9px] font-black uppercase tracking-wider border border-gray-100">
                          {employer.industry}
                        </span>
                    </div>
                </div>

                <div className="space-y-3.5 mt-auto pt-5 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="truncate">{employer.address || 'Address not set'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                        <User size={14} className="text-gray-400" />
                        <span className="truncate">{employer.contactPerson?.name || 'No contact person'}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                            <Calendar size={13} className="text-indigo-400" />
                            {formatDateDMY(employer.createdAt)}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                          employer.isActive 
                            ? 'bg-green-50 text-green-600' 
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {employer.isActive ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                          {employer.isActive ? 'Active' : 'Inactive'}
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
