'use client';

import { useEffect, useState } from 'react';
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
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center transition-colors duration-300">
      <Loader2 className="animate-spin text-black dark:text-white" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white py-12 px-4 md:px-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-12">
          <div>
            <h1 className="text-4xl font-black text-black dark:text-white uppercase tracking-tighter flex items-center gap-4">
              <Activity className="text-black dark:text-white" size={40} />
              Rehab Registry
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mt-2 italic">Clinical Command Hub • Patient Metadata • Financial Integrity</p>
          </div>
          <div className="flex items-center gap-4 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-2xl shadow-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Hq Sovereignty Access</span>
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-96">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setSearchOpen(true)}
                  placeholder="AUTHORIZE SUBJECT SEARCH..."
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-12 pr-12 py-4 text-black dark:text-white text-[11px] font-black uppercase tracking-widest outline-none focus:border-black dark:focus:border-white transition-all shadow-sm placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery(p.name || p.inpatientNumber || p.id);
                        setSearchOpen(false);
                      }}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left border-b border-gray-100 dark:border-white/5 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black text-xs">
                        {String(p.name || '?')[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-black dark:text-white text-sm font-black uppercase tracking-tight">{p.name}</p>
                        <p className="text-gray-400 dark:text-gray-500 text-[9px] font-black uppercase tracking-widest">
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
            <div className="relative group w-full sm:w-56">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors" size={18} />
              <select 
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-12 pr-10 py-4 outline-none font-black text-[10px] uppercase tracking-widest text-black dark:text-white transition-all appearance-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Global Matrix</option>
                <option value="active">Active Nodes</option>
                <option value="discharged">Decommissioned</option>
              </select>
            </div>
          </div>
          <div className="bg-white dark:bg-black px-6 py-3 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col items-end">
            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Subject Population</p>
            <p className="text-2xl font-black text-black dark:text-white tracking-tighter">{patients.length}</p>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Subject Profile</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Clinical Vector</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Admittance</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Operational Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Responsible Node</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
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
                    <>
                      <tr 
                        key={patient.id} 
                        onClick={() => handleExpand(patient.id)}
                        className={`cursor-pointer transition-all ${expandedPatient === patient.id ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-gray-50 dark:hover:bg-white/5 shadow-sm hover:translate-x-1'}`}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[1rem] bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black shadow-lg">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-black dark:text-white uppercase tracking-tight">{patient.name}</p>
                              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{patient.age || 'Unknown'} CYCLES</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[11px] font-black text-black dark:text-white flex items-center gap-3 uppercase tracking-tighter">
                            <Activity size={16} className="text-black dark:text-white" />
                            {patient.addictionType || patient.diagnosis || 'Undefined'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">
                            <Calendar size={16} />
                            {formatDateDMY(patient.admissionDate instanceof Timestamp ? patient.admissionDate.toDate() : patient.admissionDate)}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${
                            patient.isActive !== false 
                              ? 'bg-black dark:bg-white text-white dark:text-black' 
                              : 'bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500'
                          }`}>
                            {patient.isActive !== false ? 'Active Node' : 'Decommissioned'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3 italic">
                            <User size={16} />
                            {staffMap[patient.assignedStaffId] || 'Unassigned'}
                          </p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {expandedPatient === patient.id ? <ChevronUp size={24} className="text-black dark:text-white" /> : <ChevronDown size={24} className="text-gray-300 dark:text-gray-700" />}
                        </td>
                      </tr>
                      {expandedPatient === patient.id && (
                        <tr>
                          <td colSpan={6} className="px-12 py-12 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 animate-in slide-in-from-top-4 duration-500 overflow-hidden">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                              {/* Medical Info */}
                              <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                  <Stethoscope size={18} />
                                  Clinical Summary
                                </h4>
                                <div className="bg-white dark:bg-black p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-6 transition-all hover:scale-[1.02]">
                                  <div>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-2">Diagnosis Vector</p>
                                    <p className="text-xs font-black text-black dark:text-white uppercase leading-relaxed italic">{patient.diagnosis || 'No clinical records documented'}</p>
                                  </div>
                                  <div className="pt-4 border-t border-gray-50 dark:border-white/5">
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-2">Monthly Commitment</p>
                                    <p className="text-lg font-black text-black dark:text-white tracking-widest">RS. {Number(patient.packageAmount).toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Fee Summary */}
                              <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                  <Wallet size={18} />
                                  Financial Ledger
                                </h4>
                                <div className="bg-white dark:bg-black p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:scale-[1.02]">
                                  <div className="pb-6 mb-6 border-b border-gray-50 dark:border-white/5 flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Outstanding Dues</p>
                                      <p className={`text-xl font-black tracking-tighter ${patient.remaining > 0 ? 'text-black dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
                                        RS. {(patient.remaining || 0).toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Canteen Balance</p>
                                      <p className={`text-xl font-black tracking-tighter ${(patient.canteenBalance || 0) < 0 ? 'text-black dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
                                        RS. {(patient.canteenBalance || 0).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-6">
                                    <div>
                                      <p className="text-[9px] text-gray-300 font-black uppercase tracking-widest mb-1">Total Billed</p>
                                      <p className="text-xs font-black text-black dark:text-white opacity-40 uppercase">RS. {(patient.totalDues || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[9px] text-gray-300 font-black uppercase tracking-widest mb-1">Total Liquidated</p>
                                      <p className="text-xs font-black text-black dark:text-white uppercase tracking-widest">RS. {(patient.totalReceived || 0).toLocaleString()}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                  <Info size={18} />
                                  Administrative Flow
                                </h4>
                                <div className="space-y-3">
                                  <button onClick={() => router.push(`/hq/dashboard/superadmin/rehab/patients/${patient.id}`)} className="w-full flex items-center justify-between p-4 bg-white dark:bg-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-2xl border border-gray-100 dark:border-white/10 transition-all group shadow-sm active:scale-95">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Inspect Archive</span>
                                    <History size={16} className="opacity-40 group-hover:opacity-100" />
                                  </button>
                                  <button className="w-full flex items-center justify-between p-4 bg-white dark:bg-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-2xl border border-gray-100 dark:border-white/10 transition-all group shadow-sm active:scale-95">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Export Clinical Node</span>
                                    <FileText size={16} className="opacity-40 group-hover:opacity-100" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
