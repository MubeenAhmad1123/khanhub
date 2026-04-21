// d:\Khan Hub\apps\web\src\app\departments\job-center\dashboard\admin\seekers\page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import { 
  Briefcase, Plus, Search, ChevronRight, User, Calendar, Loader2, 
  MapPin, GraduationCap, CheckCircle, AlertCircle, X, Award
} from 'lucide-react';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

export default function SeekersListPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seekers, setSeekers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allSeekers, setAllSeekers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');

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
    setSession(parsed);
    fetchSeekers();
  }, [router]);

  const fetchSeekers = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'jobcenter_seekers'), orderBy('createdAt', 'desc')));
      
      const all = snap.docs.map(d => {
        const data = d.data();
        const joinedDate = toDate(data.registrationDate || data.admissionDate || data.createdAt);
        
        return {
          id: d.id,
          name: data.name || '',
          fatherName: data.fatherName || '',
          photoUrl: data.photoUrl || null,
          joinedDate,
          seekerNumber: data.seekerNumber || '',
          serialNumber: data.serialNumber || 0,
          education: data.education || '',
          profession: data.profession || '',
          skills: data.careerProfile?.skills || [],
          jobPreference: data.careerProfile?.jobPreference || '',
          status: data.status || 'Active',
          isActive: data.isActive !== false,
          contactNumber: data.contactNumber || '',
          location: data.address || '',
          employmentStatus: data.employmentStatus || 'Unemployed',
          createdAt: toDate(data.createdAt),
        };
      });

      setSeekers(all);
      setAllSeekers(all);
    } catch (err: any) {
      console.error('Fetch seekers error:', err?.message);
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
    const matches = allSeekers.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.seekerNumber || p.id || '').toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 10));
    setSearchOpen(true);
  }, [searchQuery, allSeekers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest transition-all">Loading Job Seeker Registry...</p>
        </div>
      </div>
    );
  }

  const filteredSeekers = seekers.filter(p => {
    if (statusFilter === 'active' && !p.isActive) return false;
    if (statusFilter === 'placed' && p.employmentStatus !== 'Placed') return false;
    if (statusFilter === 'inactive' && p.isActive) return false;
    
    const s = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.seekerNumber.toLowerCase().includes(s) ||
      p.fatherName.toLowerCase().includes(s) ||
      p.profession.toLowerCase().includes(s)
    );
  });

  const totalActive = seekers.filter(p => p.isActive).length;
  const totalPlaced = seekers.filter(p => p.employmentStatus === 'Placed').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-orange-600" />
              Job Seeker Registry
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Manage and track Job Seekers for employment</p>
          </div>
          <Link 
            href="/departments/job-center/dashboard/admin/seekers/new"
            className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-900/10 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Register Job Seeker
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0"><User className="w-5 h-5" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Candidates</p><p className="text-xl font-black text-gray-900">{totalActive}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0"><CheckCircle className="w-5 h-5" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Placed Seekers</p><p className="text-xl font-black text-gray-900">{totalPlaced}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><GraduationCap className="w-5 h-5" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Training</p><p className="text-xl font-black text-gray-900">0</p></div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0"><Award className="w-5 h-5" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Registry</p><p className="text-xl font-black text-gray-900">{seekers.length}</p></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setSearchOpen(true)}
                placeholder="Search by name, ID or profession..."
                className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-10 py-3.5 text-sm font-semibold outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all duration-200"
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
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery(p.name || p.seekerNumber || p.id);
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-black text-xs flex-shrink-0">
                      {String(p.name || '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm font-black">{p.name}</p>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        {p.seekerNumber || p.id}
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
            {['all', 'active', 'placed', 'inactive'].map(f => (
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

        {filteredSeekers.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">Try adjusting your filters or search terms to find what you're looking for.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredSeekers.map(seeker => (
              <Link 
                href={`/departments/job-center/dashboard/admin/seekers/${seeker.id}`} 
                key={seeker.id}
                className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-orange-900/5 hover:-translate-y-1 hover:border-orange-200 transition-all active:scale-[0.98] group flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-9 h-9 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                        <ChevronRight size={18} />
                    </div>
                </div>
                
                <div className="flex items-center gap-4 mb-5">
                    <div className="relative flex-shrink-0">
                        {seeker.photoUrl ? (
                            <img src={seeker.photoUrl} alt={seeker.name} className="w-16 h-16 rounded-[1.25rem] object-cover border-2 border-white shadow-lg" />
                        ) : (
                            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 flex items-center justify-center font-black text-2xl border border-orange-200/50">
                                {seeker.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${seeker.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-gray-900 truncate leading-tight mb-0.5">{seeker.name}</h3>
                        <p className="text-[10px] font-mono text-orange-600 font-black">{seeker.seekerNumber || `#${seeker.serialNumber}`}</p>
                        {seeker.profession && (
                          <span className="inline-block mt-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 text-[9px] font-black uppercase tracking-wider border border-gray-100">
                            {seeker.profession}
                          </span>
                        )}
                    </div>
                </div>

                <div className="space-y-3.5 mt-auto pt-5 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="truncate">{seeker.location || 'Location not set'}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[46px]">
                      {seeker.skills?.length > 0 ? (
                        seeker.skills.slice(0, 3).map((s: string, idx: number) => (
                          <span key={idx} className="bg-orange-50 text-orange-600 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wide">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium italic">No skills listed</span>
                      )}
                      {seeker.skills?.length > 3 && (
                        <span className="bg-gray-50 text-gray-400 text-[9px] font-black px-2 py-1 rounded-md">+{seeker.skills.length - 3}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                            <Calendar size={13} className="text-orange-400" />
                            {formatDateDMY(seeker.joinedDate)}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                          seeker.employmentStatus === 'Placed' 
                            ? 'bg-green-50 text-green-600' 
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {seeker.employmentStatus === 'Placed' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                          {seeker.employmentStatus}
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
