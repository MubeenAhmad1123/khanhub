'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import { 
  Plus, Search, ChevronRight, User, Calendar, Loader2, 
  Phone, DollarSign, CheckCircle, AlertCircle, X, Activity,
  Stethoscope, Clock
} from 'lucide-react';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

export default function HospitalPatientsListPage() {
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
    const sessionData = localStorage.getItem('hospital_session');
    if (!sessionData) {
      router.push('/departments/hospital/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/hospital/login');
      return;
    }
    setSession(parsed);
    fetchPatients();
  }, [router]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const [snap, feesSnap, canteenSnap] = await Promise.all([
        getDocs(collection(db, 'hospital_patients')),
        getDocs(collection(db, 'hospital_fees')),
        getDocs(collection(db, 'hospital_canteen')),
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
          return acc + (f.payments || []).filter((p: any) => p.status === 'approved').reduce((s: number, p: any) => s + (p.amount || 0), 0);
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
          diagnosis: data.diagnosis || data.substanceOfAddiction || '',
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
      (p.inpatientNumber || p.id || '').toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 10));
    setSearchOpen(true);
  }, [searchQuery, allPatients]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
      p.diagnosis.toLowerCase().includes(s) ||
      p.fatherName.toLowerCase().includes(s)
    );
  });

  const totalActive = patients.filter(p => p.isActive).length;
  const totalDischarged = patients.filter(p => !p.isActive).length;
  const totalOutstanding = patients.filter(p => p.isActive && p.remaining > 0).reduce((s, p) => s + p.remaining, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              Hospital Patients
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Manage admissions, treatments and discharge clinical records</p>
          </div>
          <Link 
            href="/departments/hospital/dashboard/admin/patients/new"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/10 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            New Admission
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-inner"><User className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Cases</p><p className="text-2xl font-black text-gray-900">{totalActive}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 flex-shrink-0 shadow-inner"><Clock className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Discharged</p><p className="text-2xl font-black text-gray-900">{totalDischarged}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0 shadow-inner"><DollarSign className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outstanding</p><p className="text-lg font-black text-rose-600">₨{totalOutstanding.toLocaleString()}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-inner"><Phone className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Registered</p><p className="text-2xl font-black text-gray-900">{patients.length}</p></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setSearchOpen(true)}
                placeholder="Search patient records..."
                className="w-full bg-white border border-gray-100 rounded-[2rem] pl-12 pr-12 py-4 shadow-sm text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 transition-all placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[2rem] shadow-2xl z-50 overflow-hidden ring-1 ring-black/5">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery(p.name);
                      setSearchOpen(false);
                      router.push(`/departments/hospital/dashboard/patient/${p.id}`);
                    }}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-emerald-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm flex-shrink-0">
                      {String(p.name || '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm font-black">{p.name}</p>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        {p.inpatientNumber || p.id}
                      </p>
                    </div>
                    <ChevronRight className="ml-auto text-gray-300 w-4 h-4" />
                  </button>
                ))}
              </div>
            )}
            {searchOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {['all', 'active', 'discharged'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${
                  statusFilter === f 
                  ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' 
                  : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 shadow-sm'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} Cases
              </button>
            ))}
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-16 text-center shadow-sm border border-gray-100 border-dashed">
            <Stethoscope className="w-16 h-16 text-gray-200 mx-auto mb-6" />
            <h3 className="text-xl font-black text-gray-900 mb-2">No Clinical Records Found</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">{searchQuery ? "No patients match your search criteria." : "Admit a patient to start tracking their medical journey."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPatients.map(patient => (
              <Link 
                href={`/departments/hospital/dashboard/patient/${patient.id}`} 
                key={patient.id}
                className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-emerald-900/5 hover:border-emerald-200 hover:-translate-y-1 transition-all active:scale-[0.98] group flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm">
                        <ChevronRight size={18} />
                    </div>
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-shrink-0">
                        {patient.photoUrl ? (
                            <img src={patient.photoUrl} alt={patient.name} className="w-16 h-16 rounded-[1.5rem] object-cover border-2 border-white shadow-lg" />
                        ) : (
                            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 flex items-center justify-center font-black text-2xl border border-emerald-200/50 shadow-inner">
                                {patient.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full shadow-sm ${patient.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-gray-900 truncate tracking-tight">{patient.name}</h3>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">{patient.inpatientNumber || `MRN-${patient.serialNumber}`}</p>
                        {patient.diagnosis && (
                          <span className="inline-block mt-2 px-3 py-1 rounded-lg bg-gray-50 text-gray-500 text-[9px] font-black uppercase tracking-widest border border-gray-100">
                            {patient.diagnosis}
                          </span>
                        )}
                    </div>
                </div>

                <div className="mt-auto space-y-4 pt-5 border-t border-gray-50">
                    <div>
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-2">
                        <span>Recovery Path</span>
                        <span className="text-emerald-600">{patient.progressPct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 shadow-inner overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${patient.progressPct >= 80 ? 'bg-green-500' : patient.progressPct >= 50 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${patient.progressPct}%` }} />
                      </div>
                      <div className="flex justify-between items-center mt-2.5">
                        <p className="text-[10px] text-gray-400 font-bold">{patient.daysSinceAdmission} / {patient.totalDays} Days</p>
                        <span className="text-[9px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md font-black italic">{patient.durationMonths}M Course</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            <Calendar size={12} className="text-emerald-500" />
                            {formatDateDMY(patient.admissionDate)}
                        </div>
                        {patient.remaining > 0 ? (
                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl shadow-sm border border-rose-100">
                             ₨{patient.remaining.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-xl shadow-sm border border-green-100">
                             Cleared
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