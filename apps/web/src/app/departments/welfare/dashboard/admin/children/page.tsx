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

export default function PatientsListPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  useEffect(() => {
    const sessionData = localStorage.getItem('welfare_session');
    if (!sessionData) {
      router.push('/departments/welfare/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/welfare/login');
      return;
    }
    setSession(parsed);
    fetchPatients();
  }, [router]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const [snap, feesSnap, canteenSnap] = await Promise.all([
        getDocs(collection(db, 'welfare_children')),
        getDocs(collection(db, 'welfare_fees')),
        getDocs(collection(db, 'welfare_canteen')),
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

      setPatients(all);
      setAllPatients(all);
    } catch (err: any) {
      console.error('Fetch patients error:', err?.message);
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
    const matches = allPatients.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.inpatientNumber || p.patientId || p.id || '').toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 10));
    setSearchOpen(true);
  }, [searchQuery, allPatients]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const filteredPatients = patients.filter(p => {
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

  const totalActive = patients.filter(p => p.isActive).length;
  const totalDischarged = patients.filter(p => !p.isActive).length;
  const totalOutstanding = patients.filter(p => p.isActive && p.remaining > 0).reduce((s, p) => s + p.remaining, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-teal-600" />
              Patients
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Manage all patients and their recovery journey</p>
          </div>
          <Link 
            href="/departments/welfare/dashboard/admin/patients/new"
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Patient
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 flex-shrink-0"><User className="w-4 h-4" /></div>
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
              <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total</p><p className="text-xl font-black text-gray-900">{patients.length}</p></div>
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
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/50 transition-all duration-200 placeholder-gray-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery(p.name || p.inpatientNumber || p.id);
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black text-xs flex-shrink-0">
                      {String(p.name || '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">{p.name}</p>
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
                  statusFilter === f ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-gray-900 mb-1">No patients found</h3>
            <p className="text-gray-500 text-sm">{searchQuery ? "Try adjusting your search." : "Add your first patient to get started."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPatients.map(patient => (
              <Link 
                href={`/departments/welfare/dashboard/admin/patients/${patient.id}`} 
                key={patient.id}
                className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-teal-900/5 hover:border-teal-200 transition-all active:scale-[0.98] group flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-500">
                        <ChevronRight size={16} />
                    </div>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-shrink-0">
                        {patient.photoUrl ? (
                            <img src={patient.photoUrl} alt={patient.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 flex items-center justify-center font-black text-xl border border-teal-200/50">
                                {patient.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${patient.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-gray-900 truncate leading-tight">{patient.name}</h3>
                        <p className="text-[10px] font-mono text-teal-600 font-bold">{patient.inpatientNumber || `#${patient.serialNumber}`}</p>
                        {patient.substanceOfAddiction && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-wider">
                            {patient.substanceOfAddiction}
                          </span>
                        )}
                    </div>
                </div>

                <div className="mt-auto space-y-3 pt-3 border-t border-gray-50">
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        <span>Progress</span>
                        <span>{patient.progressPct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${patient.progressPct >= 80 ? 'bg-green-500' : patient.progressPct >= 50 ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${patient.progressPct}%` }} />
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1">{patient.daysSinceAdmission}d / {patient.totalDays}d ({patient.durationMonths} month{patient.durationMonths > 1 ? 's' : ''})</p>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                            <Calendar size={11} className="text-teal-400" />
                            {patient.admissionDate instanceof Date 
                                ? formatDateDMY(patient.admissionDate)
                                : 'No date'
                            }
                        </div>
                        {patient.remaining > 0 ? (
                          <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <AlertCircle size={10} />₨{patient.remaining.toLocaleString()}
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