// src/app/departments/sukoon/dashboard/admin/clients/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import { 
  Heart, Plus, Search, ChevronRight, User, Calendar, Loader2, 
  Phone, DollarSign, CheckCircle, AlertCircle, X
} from 'lucide-react';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

export default function ClientsListPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  useEffect(() => {
    const sessionData = localStorage.getItem('sukoon_session');
    if (!sessionData) {
      router.push('/departments/sukoon/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/sukoon/login');
      return;
    }
    setSession(parsed);
    fetchClients();
  }, [router]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const [snap, feesSnap, canteenSnap] = await Promise.all([
        getDocs(collection(db, 'sukoon_guests')),
        getDocs(collection(db, 'sukoon_fees')),
        getDocs(collection(db, 'sukoon_canteen')),
      ]);
      
      const feesMap: Record<string, any[]> = {};
      feesSnap.docs.forEach(d => {
        const data = d.data();
        if (!feesMap[data.patientId]) feesMap[data.patientId] = [];
        feesMap[data.patientId].push(data);
      });

      const canteenMap: Record<string, any[]> = {};
      canteenSnap.docs.forEach(d => {
        const data = d.data();
        if (!canteenMap[data.patientId]) canteenMap[data.patientId] = [];
        canteenMap[data.patientId].push(data);
      });

      const all = snap.docs.map(d => {
        const data = d.data();
        const admissionDate = toDate(data.admissionDate);
        const pFees = feesMap[d.id] || [];
        const pCanteen = canteenMap[d.id] || [];
        
        const totalDues = (data.packageAmount || 0) * (data.durationMonths || 1) + (data.otherExpenses || 0);
        const totalReceived = pFees.reduce((acc, f) => {
          return acc + (f.payments || []).filter((p: any) => p.status === 'approved').reduce((s: number, p: any) => s + p.amount, 0);
        }, 0);
        const remaining = totalDues - totalReceived;

        const totalCanteenDeposited = pCanteen.reduce((a, c) => a + (c.totalDeposited || 0), 0);
        const totalCanteenSpent = pCanteen.reduce((a, c) => a + (c.totalSpent || 0), 0);
        const canteenBalance = totalCanteenDeposited - totalCanteenSpent;

        const daysSinceAdmission = Math.floor((Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = (data.durationMonths || 1) * 30;
        const progressPct = Math.min(100, Math.round((daysSinceAdmission / totalDays) * 100));

        return {
          id: d.id,
          name: data.name || '',
          fatherName: data.fatherName || '',
          photoUrl: data.photoUrl || null,
          admissionDate,
          packageAmount: Number(data.packageAmount) || 0,
          durationMonths: data.durationMonths || 1,
          inpatientNumber: data.inpatientNumber || '',
          serialNumber: data.serialNumber || 0,
          substanceOfAddiction: data.substanceOfAddiction || '',
          isActive: data.isActive !== false,
          contactNumber: data.contactNumber || '',
          remaining,
          canteenBalance,
          totalDues,
          totalReceived,
          progressPct,
          daysSinceAdmission,
          totalDays,
          createdAt: toDate(data.createdAt),
        };
      })
      .sort((a, b) => b.serialNumber - a.serialNumber);

      setClients(all);
      setAllClients(all);
    } catch (err: any) {
      console.error('Fetch clients error:', err?.message);
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
    const matches = allClients.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.inpatientNumber || p.patientId || p.id || '').toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 10));
    setSearchOpen(true);
  }, [searchQuery, allClients]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFAF2]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const filteredClients = clients.filter(p => {
    if (statusFilter === 'active' && !p.isActive) return false;
    if (statusFilter === 'discharged' && p.isActive) return false;
    const s = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.inpatientNumber.toLowerCase().includes(s) ||
      p.substanceOfAddiction.toLowerCase().includes(s) ||
      p.fatherName.toLowerCase().includes(s)
    );
  });

  const totalActive = clients.filter(p => p.isActive).length;
  const totalDischarged = clients.filter(p => !p.isActive).length;
  const totalOutstanding = clients.filter(p => p.isActive && p.remaining > 0).reduce((s, p) => s + p.remaining, 0);

  return (
    <div className="min-h-screen bg-[#FCFAF2] p-4 md:p-8 w-full overflow-x-hidden text-black">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-black flex items-center gap-2">
              <Heart className="w-6 h-6 text-purple-600" />
              Clients
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Manage all clients and their recovery journey</p>
          </div>
          <Link 
            href="/departments/sukoon/dashboard/admin/clients/new"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-100 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0"><User className="w-4 h-4" /></div>
              <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active</p><p className="text-xl font-black text-gray-900">{totalActive}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 flex-shrink-0"><Calendar className="w-4 h-4" /></div>
              <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Discharged</p><p className="text-xl font-black text-gray-900">{totalDischarged}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0"><DollarSign className="w-4 h-4" /></div>
              <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Outstanding</p><p className="text-sm font-black text-red-600">₨{totalOutstanding.toLocaleString()}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><Phone className="w-4 h-4" /></div>
              <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total</p><p className="text-xl font-black text-gray-900">{clients.length}</p></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setSearchOpen(true)}
                placeholder="Search by name or ID..."
                className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-10 py-3 text-black text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery(p.name || p.inpatientNumber || p.id);
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-black text-xs flex-shrink-0">
                      {String(p.name || '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-black text-sm font-bold">{p.name}</p>
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        {p.inpatientNumber || p.patientId || p.id}
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
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {['all', 'active', 'discharged'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  statusFilter === f ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-gray-900 mb-1">No clients found</h3>
            <p className="text-gray-500 text-sm">{searchQuery ? "Try adjusting your search." : "Add your first client to get started."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredClients.map(client => (
              <Link 
                href={`/departments/sukoon/dashboard/admin/clients/${client.id}`} 
                key={client.id}
                className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-purple-900/5 hover:border-purple-200 transition-all active:scale-[0.98] group flex flex-col h-full relative overflow-hidden text-black"
              >
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                        <ChevronRight size={16} />
                    </div>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-shrink-0">
                        {client.photoUrl ? (
                            <img src={client.photoUrl} alt={client.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 flex items-center justify-center font-black text-xl border border-purple-200/50">
                                {client.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${client.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-gray-900 truncate leading-tight">{client.name}</h3>
                        <p className="text-[10px] font-mono text-purple-600 font-bold">{client.inpatientNumber || `#${client.serialNumber}`}</p>
                        {client.substanceOfAddiction && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-wider">
                            {client.substanceOfAddiction}
                          </span>
                        )}
                    </div>
                </div>

                <div className="mt-auto space-y-3 pt-3 border-t border-gray-50">
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        <span>Progress</span>
                        <span>{client.progressPct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${client.progressPct >= 80 ? 'bg-green-500' : client.progressPct >= 50 ? 'bg-amber-500' : 'bg-purple-500'}`} style={{ width: `${client.progressPct}%` }} />
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1">{client.daysSinceAdmission}d / {client.totalDays}d ({client.durationMonths} month{client.durationMonths > 1 ? 's' : ''})</p>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                            <Calendar size={11} className="text-purple-400" />
                            {client.admissionDate instanceof Date 
                                ? formatDateDMY(client.admissionDate)
                                : 'No date'
                            }
                        </div>
                        {client.remaining > 0 ? (
                          <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <AlertCircle size={10} />₨{client.remaining.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <CheckCircle size={10} /> Paid
                          </span>
                        )}
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
