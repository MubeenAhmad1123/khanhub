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

  if (sessionLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Heart className="text-rose-500" size={32} />
              Rehab Patient Directory
            </h1>
            <p className="text-slate-400 mt-1 font-medium text-sm">Medical records and fee tracking oversight</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3">Read-Only Access</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500">
              <ShieldCheck size={18} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
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
            <div className="relative group w-full sm:w-48">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-500 transition-colors" size={18} />
              <select 
                className="w-full bg-slate-800/50 border border-slate-700/50 focus:border-teal-500/50 rounded-2xl pl-12 pr-6 py-3 outline-none font-black text-[10px] uppercase tracking-widest text-white transition-all appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active Patients</option>
                <option value="discharged">Discharged</option>
              </select>
            </div>
          </div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Registered</p>
            <p className="text-xl font-black text-white">{patients.length}</p>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700/50">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Patient Details</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Addiction/Medical</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Admission</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Assigned Staff</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
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
                        className={`cursor-pointer transition-all ${expandedPatient === patient.id ? 'bg-teal-500/5' : 'hover:bg-slate-700/30'}`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-teal-500 font-black border border-slate-700/50">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white">{patient.name}</p>
                              <p className="text-xs text-slate-500">{patient.age || 'N/A'} years old</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                            <Activity size={14} className="text-rose-500/50" />
                            {patient.addictionType || patient.diagnosis || 'Not Specified'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <Calendar size={14} className="text-teal-500/50" />
                            {formatDateDMY(patient.admissionDate instanceof Timestamp ? patient.admissionDate.toDate() : patient.admissionDate)}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            patient.isActive !== false 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                          }`}>
                            <div className={`w-1 h-1 rounded-full ${patient.isActive !== false ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`} />
                            {patient.isActive !== false ? 'Active' : 'Discharged'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <User size={14} className="text-teal-500/50" />
                            {staffMap[patient.assignedStaffId] || 'Unassigned'}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-right">
                          {expandedPatient === patient.id ? <ChevronUp size={20} className="text-teal-500" /> : <ChevronDown size={20} className="text-slate-600" />}
                        </td>
                      </tr>
                      {expandedPatient === patient.id && (
                        <tr>
                          <td colSpan={6} className="px-8 py-8 bg-slate-900/40 border-b border-slate-700/50 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              {/* Medical Info */}
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                  <Stethoscope size={14} className="text-teal-500" />
                                  Clinical Overview
                                </h4>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 space-y-3">
                                  <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Diagnosis</p>
                                    <p className="text-sm font-medium text-slate-200">{patient.diagnosis || 'No clinical diagnosis recorded'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Package Amount</p>
                                    <p className="text-sm font-black text-white">Rs. {Number(patient.packageAmount).toLocaleString()} / month</p>
                                  </div>
                                </div>
                              </div>

                              {/* Fee Summary */}
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                  <Wallet size={14} className="text-emerald-500" />
                                  Financial Ledger
                                </h4>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 grid grid-cols-2 gap-4">
                                  <div className="col-span-2 pb-2 border-b border-slate-700/50 flex justify-between items-center">
                                    <div>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase">Pending Dues</p>
                                      <p className={`text-xl font-black ${patient.remaining > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        Rs. {(patient.remaining || 0).toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] text-slate-500 font-bold uppercase">Canteen Balance</p>
                                      <p className={`text-xl font-black ${(patient.canteenBalance || 0) < 0 ? 'text-rose-500' : 'text-teal-500'}`}>
                                        Rs. {(patient.canteenBalance || 0).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total Billed</p>
                                    <p className="text-sm font-bold text-slate-300">Rs. {(patient.totalDues || 0).toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total Paid</p>
                                    <p className="text-sm font-bold text-emerald-500">Rs. {(patient.totalReceived || 0).toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                  <Info size={14} className="text-blue-500" />
                                  Administrative
                                </h4>
                                <div className="space-y-2">
                                  <button className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all group">
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white">View Full History</span>
                                    <History size={16} className="text-slate-600 group-hover:text-teal-500" />
                                  </button>
                                  <button className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all group">
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white">Export Med-Report</span>
                                    <FileText size={16} className="text-slate-600 group-hover:text-rose-500" />
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
