'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import { syncRehabPatientFinance } from '@/app/hq/actions/approvals';
import { 
  Search, 
  Calculator, 
  Loader2, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  Heart, 
  User, 
  ChevronRight, 
  TrendingUp, 
  FileText 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// PKR Currency Formatter
function formatPKR(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

export default function SuperAdminDuesPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useRehabSession();

  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'discharged'>('active');

  // Modal State
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [newDues, setNewDues] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [patientLogs, setPatientLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch all patients
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rehab_patients'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPatients(list);
    } catch (err) {
      console.error('Error fetching patients:', err);
      toast.error('Failed to load patient records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionLoading && session?.role === 'superadmin') {
      fetchPatients();
    }
  }, [session, sessionLoading, fetchPatients]);

  // Fetch logs for a specific patient when modal opens
  const fetchPatientLogs = useCallback(async (patientId: string) => {
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, 'rehab_remaining_logs'),
        where('patientId', '==', patientId)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Sort client-side (no orderBy to avoid index errors per rules)
      logs.sort((a: any, b: any) => {
        const tA = a.changedAt?.toDate?.() ? a.changedAt.toDate().getTime() : new Date(a.changedAt || 0).getTime();
        const tB = b.changedAt?.toDate?.() ? b.changedAt.toDate().getTime() : new Date(b.changedAt || 0).getTime();
        return tB - tA;
      });

      setPatientLogs(logs);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const handleOpenModal = (patient: any) => {
    setSelectedPatient(patient);
    setNewDues(String(patient.remaining ?? patient.remainingBalance ?? patient.overallRemaining ?? 0));
    setReason('');
    setPatientLogs([]);
    setShowModal(true);
    fetchPatientLogs(patient.id);
  };

  const handleSaveDues = async () => {
    const duesNum = Number(newDues);
    if (isNaN(duesNum) || newDues.trim() === '') {
      toast.error('Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const patientId = selectedPatient.id;

      // 1. Fetch current patient doc again for fresh data
      const pRef = doc(db, 'rehab_patients', patientId);
      const pSnap = await getDoc(pRef);
      if (!pSnap.exists()) {
        toast.error('Patient record not found');
        setSaving(false);
        return;
      }
      const patientData = pSnap.data() as any;

      // 2. Fetch approved transactions (excluding canteen) to get calculated values
      const txQ = query(
        collection(db, 'rehab_transactions'),
        where('patientId', '==', patientId),
        where('status', '==', 'approved')
      );
      const txSnap = await getDocs(txQ);

      let totalReceived = 0;
      let totalMedicineCharges = 0;
      let totalDiscount = 0;

      txSnap.docs.forEach((doc) => {
        const tx = doc.data();
        const amount = Number(tx.amount) || 0;
        const discount = Number(tx.discount || 0);
        const returnAmount = Number(tx.returnAmount || tx.return || 0);
        const netAmount = amount - returnAmount;

        if (tx.category === 'medicine_charge') {
          totalMedicineCharges += netAmount;
        } else if (tx.category === 'canteen_deposit' || tx.category === 'canteen' || tx.category === 'canteen_expense') {
          // Exclude canteen
        } else {
          totalReceived += netAmount;
          totalDiscount += discount;
        }
      });

      // Calculate stay package fee for current stay
      const monthlyPkg = Number(patientData.monthlyPackage || patientData.packageAmount || 0);
      
      const safeToDate = (d: any) => {
        if (!d) return new Date();
        if (d.toDate) return d.toDate();
        return new Date(d);
      };

      let admissionDate = safeToDate(patientData.admissionDate);
      let endDate = new Date();
      if (patientData.isActive === false && patientData.dischargeDate) {
        endDate = safeToDate(patientData.dischargeDate);
      }

      const rawMonths = (endDate.getFullYear() - admissionDate.getFullYear()) * 12 + (endDate.getMonth() - admissionDate.getMonth());
      let completedMonths = rawMonths;
      let hasExtraDays = false;

      if (endDate.getDate() < admissionDate.getDate()) {
        completedMonths = rawMonths - 1;
        hasExtraDays = true;
      } else if (endDate.getDate() > admissionDate.getDate()) {
        completedMonths = rawMonths;
        hasExtraDays = true;
      } else {
        completedMonths = rawMonths;
        hasExtraDays = false;
      }

      const billableMonths = Math.max(1, completedMonths + (hasExtraDays ? 1 : 0));
      const currentStayPackage = billableMonths * monthlyPkg;

      // Calculate historical stays
      let historicalStayPackage = 0;
      const history = patientData.rejoinHistory || [];
      history.forEach((stay: any) => {
        const sAdmission = safeToDate(stay.admissionDate);
        const sDischarge = stay.dischargeDate ? safeToDate(stay.dischargeDate) : new Date();
        const sMonthlyPkg = Number(stay.monthlyPackage || stay.packageAmount || 0);

        const sRawMonths = (sDischarge.getFullYear() - sAdmission.getFullYear()) * 12 + (sDischarge.getMonth() - sAdmission.getMonth());
        let sCompletedMonths = sRawMonths;
        let sHasExtraDays = false;

        if (sDischarge.getDate() < sAdmission.getDate()) {
          sCompletedMonths = sRawMonths - 1;
          sHasExtraDays = true;
        } else if (sDischarge.getDate() > sAdmission.getDate()) {
          sCompletedMonths = sRawMonths;
          sHasExtraDays = true;
        } else {
          sCompletedMonths = sRawMonths;
          sHasExtraDays = false;
        }

        const sBillableMonths = Math.max(1, sCompletedMonths + (sHasExtraDays ? 1 : 0));
        historicalStayPackage += sBillableMonths * sMonthlyPkg;
      });

      const totalStayPackage = currentStayPackage + historicalStayPackage;
      const finalMedicineCharges = typeof patientData.medicineCharges === 'number' ? patientData.medicineCharges : totalMedicineCharges;
      const totalObligation = totalStayPackage + finalMedicineCharges;

      // Calculate calculatedRemaining without manualAdjustment
      const calculatedRemaining = totalObligation - totalReceived - totalDiscount;

      // manualRemainingAdjustment = X - calculatedRemaining
      const adjustment = duesNum - calculatedRemaining;
      const oldDues = Number(patientData.remaining ?? patientData.remainingBalance ?? patientData.overallRemaining ?? calculatedRemaining);

      // 3. Update patient document
      await updateDoc(pRef, {
        manualRemainingAdjustment: adjustment,
        remaining: duesNum,
        remainingBalance: duesNum,
        overallRemaining: duesNum
      });

      // 4. Log the manual remaining adjustment
      const logData = {
        patientId,
        patientName: patientData.name || '',
        oldAmount: oldDues,
        newAmount: duesNum,
        changedBy: session?.uid || 'unknown',
        changedByName: session?.displayName || 'Super Admin',
        changedAt: Timestamp.now(),
        reason: reason.trim() || 'Manual adjustment'
      };

      await addDoc(collection(db, 'rehab_remaining_logs'), logData);
      await addDoc(collection(db, 'rehab_patients', patientId, 'remaining_logs'), logData);

      // 5. Trigger sync action to force recalculate totals in the backend
      await syncRehabPatientFinance(patientId);

      toast.success('Dues updated and synced ✓');
      setShowModal(false);
      fetchPatients();
    } catch (err) {
      console.error('Error saving manual adjustment:', err);
      toast.error('Failed to update remaining dues');
    } finally {
      setSaving(false);
    }
  };

  // Client-side filtering & sorting
  const filteredPatients = useMemo(() => {
    return patients
      .filter(p => {
        // Status filter
        if (statusFilter === 'active' && p.isActive !== true) return false;
        if (statusFilter === 'discharged' && p.isActive === true) return false;

        // Search term
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        return (
          p.name?.toLowerCase().includes(term) ||
          p.patientId?.toLowerCase().includes(term) ||
          p.guardianPhone?.includes(term) ||
          p.inpatientNumber?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [patients, statusFilter, searchTerm]);

  // Auth Guard
  if (sessionLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!session || session.role !== 'superadmin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-100 text-center shadow-lg">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm mb-6">
            You do not have the required permissions to view this dashboard page.
          </p>
          <button 
            onClick={() => router.push('/departments/rehab/login')}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-gray-950">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-xl shadow-zinc-100 border border-zinc-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <Calculator size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 uppercase">Manual Dues Adjustment</h1>
            <p className="text-xs text-zinc-500 font-bold mt-0.5 uppercase tracking-wider">
              Super Admin Control Panel • Rehab Department
            </p>
          </div>
        </div>
        <div className="text-xs font-bold bg-purple-50 text-purple-700 px-4 py-2 rounded-xl">
          Central Billing Sync Enabled
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xl shadow-zinc-100 border border-zinc-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Status Filters */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {(['active', 'discharged', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-zinc-50 text-zinc-400 border border-zinc-100 hover:border-zinc-300'
              }`}
            >
              {status === 'active' ? 'Active Patients' : status === 'discharged' ? 'Discharged' : 'All Patients'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 bg-zinc-50 border border-zinc-100 rounded-xl pl-11 pr-4 text-xs font-bold outline-none focus:bg-white focus:border-purple-400 transition-all text-zinc-900"
          />
        </div>

      </div>

      {/* Patient Listing */}
      <div className="bg-white rounded-3xl shadow-xl shadow-zinc-100 border border-zinc-100 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Profiles...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
            <User size={48} className="text-zinc-200" />
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No Patients Found</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400">Patient</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-zinc-400">Monthly Package</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Paid</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-zinc-400">Remaining Dues</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredPatients.map((p) => {
                  const currentRemaining = p.remainingBalance ?? p.overallRemaining ?? p.remaining ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center font-black text-purple-700 text-xs">
                            {p.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-black text-zinc-900 group-hover:text-purple-600 transition-colors">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                              ID: {p.patientId || 'N/A'} {p.inpatientNumber && `• Inpatient: ${p.inpatientNumber}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          p.isActive !== false 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200/50'
                        }`}>
                          {p.isActive !== false ? 'Active' : 'Discharged'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-bold text-xs text-zinc-600">
                        {formatPKR(p.monthlyPackage || p.packageAmount || 0)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-bold text-xs text-zinc-600">
                        {formatPKR(p.totalReceived || 0)}
                      </td>
                      <td className={`px-6 py-4 text-right whitespace-nowrap font-black text-xs ${
                        currentRemaining > 0 ? 'text-rose-600' : 'text-zinc-600'
                      }`}>
                        {formatPKR(currentRemaining)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenModal(p)}
                          className="px-3.5 py-2 bg-purple-50 text-purple-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-purple-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <Calculator size={12} />
                          Adjust Dues
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Dues Modal */}
      {showModal && selectedPatient && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-zinc-900 px-6 py-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">
                  Adjust Remaining Balance
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                  {selectedPatient.name} • ID: {selectedPatient.patientId || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-9 h-9 bg-white/10 hover:bg-rose-500 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Patient Stats */}
              <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400">Total Paid</p>
                  <p className="text-xs font-black text-zinc-700 mt-0.5">{formatPKR(selectedPatient.totalReceived || 0)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400">Current Dues</p>
                  <p className="text-xs font-black text-rose-600 mt-0.5">
                    {formatPKR(selectedPatient.remainingBalance ?? selectedPatient.overallRemaining ?? selectedPatient.remaining ?? 0)}
                  </p>
                </div>
              </div>

              {/* Adjustment Form */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    New Dues Remaining Amount (Rs)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newDues}
                    onChange={(e) => setNewDues(e.target.value)}
                    className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 text-sm font-black outline-none focus:bg-white focus:border-purple-400 transition-all text-zinc-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    Reason for Adjustment (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Package discount, manual waiver, corrected ledger, etc..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs font-bold outline-none focus:bg-white focus:border-purple-400 transition-all text-zinc-900 resize-none"
                  />
                </div>
              </div>

              {/* Historical Logs */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-2 text-purple-600">
                  <History size={14} />
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                    Adjustment Audit Logs
                  </h4>
                </div>
                
                {loadingLogs ? (
                  <div className="py-4 flex justify-center">
                    <Loader2 size={18} className="animate-spin text-purple-600" />
                  </div>
                ) : patientLogs.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 font-bold italic py-2">
                    No manual adjustments have been recorded for this patient.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {patientLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1 font-bold text-zinc-800">
                            <span>{formatPKR(log.oldAmount || 0)}</span>
                            <span className="text-zinc-400">→</span>
                            <span className="font-black text-purple-700">{formatPKR(log.newAmount || 0)}</span>
                          </div>
                          {log.reason && (
                            <p className="text-[9px] text-zinc-500 font-medium mt-0.5">
                              {log.reason}
                            </p>
                          )}
                        </div>
                        <div className="text-[9px] text-zinc-400 font-bold self-end sm:self-auto text-right">
                          <p>by {log.changedByName}</p>
                          <p className="mt-0.5">
                            {log.changedAt?.toDate?.() 
                              ? log.changedAt.toDate().toLocaleDateString('en-PK', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : new Date(log.changedAt || 0).toLocaleDateString('en-PK')
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors bg-white text-zinc-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDues}
                disabled={saving}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                Save & Sync
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
