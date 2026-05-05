'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { formatDateDMY } from '@/lib/utils';
import { 
  Loader2, Search, Filter, User, Calendar, 
  Heart, ChevronDown, ChevronUp, Activity,
  Stethoscope, ShieldCheck, Wallet, History,
  FileText, ArrowRight, UserPlus, Info, X
} from 'lucide-react';

export default function HqRehabPatientsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [patients, setPatients] = useState<any[]>([]);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
    }
  }, [session, sessionLoading, router]);

  // Remove individual fee fetching, we now batch load
  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch Staff for mapping
        const staffSnap = await getDocs(collection(db, 'rehab_staff'));
        const staffData: Record<string, string> = {};
        staffSnap.docs.forEach(d => {
          staffData[d.id] = d.data().name;
        });
        setStaffMap(staffData);

        // Fetch patients with finance summary
        const { getAllPatientsWithFinanceSummary } = await import('@/lib/rehab/patients');
        const data = await getAllPatientsWithFinanceSummary();
        setPatients(data);
        setAllPatients(data);
      } catch (err) {
        console.error("Error fetching rehab data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [session]);

  const handleExpand = (patientId: string) => {
    if (expandedPatient === patientId) {
      setExpandedPatient(null);
    } else {
      setExpandedPatient(patientId);
    }
  };

  const filteredPatients = patients.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.name || '').toLowerCase().includes(q) ||
      (p.inpatientNumber || p.patientId || p.id || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && p.isActive !== false) ||
                         (statusFilter === 'discharged' && p.isActive === false);
    return matchesSearch && matchesStatus;
  });

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

  if (sessionLoading) return (
    <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-gray-900 py-20 px-4 md:px-10 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-20">
          <div className="space-y-6">
            <h1 className="text-6xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-8">
              <div className="p-5 rounded-[2.5rem] bg-white shadow-2xl shadow-gray-200/50 border border-gray-100 text-indigo-600">
                <Activity size={48} strokeWidth={2.5} />
              </div>
              Rehab Registry
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 mt-2 italic ml-2">Clinical Command Hub • Patient Metadata • Financial Integrity</p>
          </div>
          <div className="flex items-center gap-4 bg-white border border-gray-100 text-indigo-600 px-10 py-5 rounded-[2rem] shadow-2xl shadow-gray-200/50">
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Hq Sovereignty Access</span>
            <ShieldCheck size={24} strokeWidth={2.5} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-16">
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
            <div className="relative w-full sm:w-[32rem] group">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setSearchOpen(true)}
                  placeholder="AUTHORIZE SUBJECT SEARCH..."
                  className="w-full bg-white border border-gray-100 rounded-[2rem] pl-16 pr-14 py-6 text-gray-900 text-[11px] font-black uppercase tracking-[0.2em] outline-none focus:border-indigo-600 transition-all shadow-2xl shadow-gray-200/50 placeholder:text-gray-200"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-rose-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery(p.name || p.inpatientNumber || p.id);
                        setSearchOpen(false);
                      }}
                      className="w-full flex items-center gap-6 px-8 py-6 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 group/item"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm transition-transform group-hover/item:scale-110">
                        {String(p.name || '?')[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-900 text-sm font-black uppercase tracking-tight group-hover/item:text-indigo-600 transition-colors">{p.name}</p>
                        <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mt-1">
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
            <div className="relative group w-full sm:w-64">
              <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <select 
                className="w-full bg-white border border-gray-100 rounded-[2rem] pl-14 pr-10 py-6 outline-none font-black text-[10px] uppercase tracking-[0.3em] text-gray-900 transition-all appearance-none cursor-pointer shadow-2xl shadow-gray-200/50 focus:border-indigo-600"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Global Matrix</option>
                <option value="active">Active Nodes</option>
                <option value="discharged">Decommissioned</option>
              </select>
            </div>
          </div>
          <div className="bg-white px-10 py-5 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 flex flex-col items-end">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-2">Subject Population</p>
            <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{patients.length}</p>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Subject Profile</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Clinical Vector</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Admittance</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Operational Status</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Responsible Node</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <Loader2 className="animate-spin text-teal-500 mx-auto mb-4" size={32} />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Accessing Medical Database...</p>
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center opacity-30 font-bold">No patients found</td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <React.Fragment key={patient.id}>
                      <tr 
                        onClick={() => handleExpand(patient.id)}
                        className={`cursor-pointer transition-all duration-300 ${expandedPatient === patient.id ? 'bg-indigo-50/30' : 'hover:bg-gray-50/50'}`}
                      >
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 text-indigo-600 flex items-center justify-center font-black shadow-lg shadow-gray-200/30 group-hover:scale-110 transition-transform">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 uppercase tracking-tight text-base">{patient.name}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">{patient.age || 'Unknown'} CYCLES</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <span className="text-[11px] font-black text-gray-700 flex items-center gap-3 uppercase tracking-tight">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <Activity size={14} />
                            </div>
                            {patient.addictionType || patient.diagnosis || 'Undefined'}
                          </span>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 font-black uppercase tracking-widest">
                            <Calendar size={16} className="text-gray-300" />
                            {formatDateDMY(patient.admissionDate instanceof Timestamp ? patient.admissionDate.toDate() : patient.admissionDate)}
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <span className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${
                            patient.isActive !== false 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {patient.isActive !== false ? 'Active Node' : 'Decommissioned'}
                          </span>
                        </td>
                        <td className="px-10 py-8">
                          <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-3 italic">
                            <User size={16} className="text-gray-300" />
                            {staffMap[patient.assignedStaffId] || 'Unassigned'}
                          </p>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className={`p-2 rounded-xl transition-colors ${expandedPatient === patient.id ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                            {expandedPatient === patient.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </td>
                      </tr>
                      {expandedPatient === patient.id && (
                        <tr>
                          <td colSpan={6} className="px-14 py-16 bg-gray-50/50 border-b border-gray-100 animate-in fade-in slide-in-from-top-8 duration-700">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                              {/* Medical Info */}
                              <div className="space-y-8">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-white shadow-xl shadow-gray-200/50 flex items-center justify-center text-indigo-600">
                                    <Stethoscope size={18} />
                                  </div>
                                  Clinical Summary
                                </h4>
                                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 space-y-8 transition-all hover:scale-[1.02]">
                                  <div>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] mb-4">Diagnosis Vector</p>
                                    <p className="text-sm font-black text-gray-900 uppercase leading-relaxed italic tracking-tight">{patient.diagnosis || 'No clinical records documented'}</p>
                                  </div>
                                  <div className="pt-8 border-t border-gray-50">
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] mb-4">Monthly Commitment</p>
                                    <p className="text-2xl font-black text-indigo-600 tracking-tighter">RS. {Number(patient.packageAmount).toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Fee Summary */}
                              <div className="space-y-8">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-white shadow-xl shadow-gray-200/50 flex items-center justify-center text-indigo-600">
                                    <Wallet size={18} />
                                  </div>
                                  Financial Ledger
                                </h4>
                                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 transition-all hover:scale-[1.02]">
                                  <div className="pb-8 mb-8 border-b border-gray-50 flex flex-col gap-6">
                                    <div className="flex justify-between items-center">
                                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em]">Outstanding Dues</p>
                                      <p className={`text-2xl font-black tracking-tighter ${patient.remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        RS. {(patient.remaining || 0).toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em]">Canteen Balance</p>
                                      <p className={`text-2xl font-black tracking-tighter ${(patient.canteenBalance || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        RS. {(patient.canteenBalance || 0).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-8">
                                    <div>
                                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] mb-2">Total Billed</p>
                                      <p className="text-xs font-black text-gray-900 uppercase tracking-tight">RS. {(patient.totalDues || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] mb-2">Total Liquidated</p>
                                      <p className="text-xs font-black text-indigo-600 uppercase tracking-tight">RS. {(patient.totalReceived || 0).toLocaleString()}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="space-y-8">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-white shadow-xl shadow-gray-200/50 flex items-center justify-center text-indigo-600">
                                    <Info size={18} />
                                  </div>
                                  Administrative Flow
                                </h4>
                                <div className="space-y-4">
                                  <button 
                                    onClick={() => router.push(`/hq/dashboard/superadmin/rehab/patients/${patient.id}`)} 
                                    className="w-full flex items-center justify-between px-8 py-6 bg-white hover:bg-indigo-600 hover:text-white rounded-[1.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 transition-all group active:scale-95"
                                  >
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Inspect Archive</span>
                                    <History size={20} className="text-gray-300 group-hover:text-white transition-colors" />
                                  </button>
                                  <button className="w-full flex items-center justify-between px-8 py-6 bg-white hover:bg-gray-900 hover:text-white rounded-[1.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 transition-all group active:scale-95">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Export Clinical Node</span>
                                    <FileText size={20} className="text-gray-300 group-hover:text-white transition-colors" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
