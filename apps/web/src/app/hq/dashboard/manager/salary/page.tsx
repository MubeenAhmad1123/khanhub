'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Plus, FileText, CheckCircle, DollarSign, Printer, RefreshCw } from 'lucide-react';
import type { HqStaff, SalarySlip } from '@/types/hq';
import { getDeptCollection, getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';

const ALL_DEPTS: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getDaysInMonth(monthStr: string) {
  if (!monthStr || !monthStr.includes('-')) return [];
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  if (isNaN(date.getTime())) return [];

  const days = [];
  while (date.getMonth() === month - 1) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    date.setDate(date.getDate() + 1);
  }
  return days;
}

// Extended slip type that carries the source collection so we can update it later
type SlipWithCol = SalarySlip & { _col: string };

export default function SalarySlipsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staff, setStaff] = useState<HqStaff[]>([]);
  const [slips, setSlips] = useState<SlipWithCol[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [generating, setGenerating] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingSlip, setEditingSlip] = useState<SlipWithCol | null>(null);
  const [editValues, setEditValues] = useState({ bonus: 0, bonusReason: '', otherDeductions: 0, deductionReason: '' });

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || !['manager', 'superadmin', 'cashier'].includes(session.role)) router.push('/hq/login');
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      try {
        // Fetch all staff across all departments (Raw fetch to cover all state edge cases)
        const staffSnaps = await Promise.all(
          ALL_DEPTS.map(d =>
            getDocs(collection(db, getDeptCollection(d)))
              .catch(() => ({ docs: [] } as any))
          )
        );

        let allStaff: HqStaff[] = [];
        staffSnaps.forEach((snap, idx) => {
          const dept = ALL_DEPTS[idx];
          const rawDocs = snap.docs.map((d: any) => ({ id: d.id, ...d.data(), department: dept } as HqStaff));
          
          // Standard robust active filter exactly as defined in canonical listStaffCards logic
          const filtered = rawDocs.filter((s: any) => {
            const n = String(s.name || s.displayName || '').toLowerCase();
            const e = String(s.email || '').toLowerCase();
            // Exclude core backend accounts
            if (n.includes('super') || n.includes('network') || e.includes('super') || e.includes('network')) return false;
            
            // Active Logic: Must explicitly NOT be false and status must NOT suggest inactivity
            const statusStr = String(s.status || '').toLowerCase();
            return s.isActive !== false && statusStr !== 'inactive' && statusStr !== 'resigned' && statusStr !== 'terminated';
          });

          allStaff = [...allStaff, ...filtered];
        });
        setStaff(allStaff);

        // Fetch salary slips from ALL department-specific collections
        const slipSnaps = await Promise.all(
          ALL_DEPTS.map(dept => {
            const col = `${getDeptPrefix(dept)}_salary_records`;
            return getDocs(query(collection(db, col), orderBy('createdAt', 'desc')))
              .then(snap => snap.docs.map((d: any) => ({ id: d.id, _col: col, ...d.data() } as SlipWithCol)))
              .catch(() => [] as SlipWithCol[]);
          })
        );

        setSlips(slipSnaps.flat());
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const monthSlips = slips.filter(s => s.month === selectedMonth);

  const generateSlip = async (member: HqStaff, existingSlip?: SalarySlip) => {
    if (!existingSlip) {
      const redundant = monthSlips.find(s => s.staffId === member.id);
      if (redundant) return;
    }
    setGenerating(member.id);

    const dept = (member.department as StaffDept) || 'hq';
    const prefix = getDeptPrefix(dept);
    const salaryCol = `${prefix}_salary_records`;

    // Fetch BOTH formats of staff ID to capture all attendance records accurately (fixes missed lookups)
    const [attSnap1, attSnap2] = await Promise.all([
      getDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', member.id))).catch(() => ({ docs: [] } as any)),
      getDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', `${prefix}_${member.id}`))).catch(() => ({ docs: [] } as any))
    ]);

    const allDocs = [...attSnap1.docs, ...attSnap2.docs];

    const monthAttendance = allDocs
      .map((d: any) => d.data())
      .filter((a: any) => {
        const dateVal = a.date;
        if (!dateVal) return false;
        const dateStr = typeof dateVal === 'string' 
          ? dateVal 
          : (dateVal && typeof dateVal.toDate === 'function')
            ? dateVal.toDate().toISOString()
            : String(dateVal);
        return dateStr.startsWith(selectedMonth);
      });

    const daysInMonthList = getDaysInMonth(selectedMonth);
    const todayStr = new Date().toISOString().slice(0, 10);
    
    let absentCount = 0;
    daysInMonthList.forEach(dayStr => {
      const att = monthAttendance.find((a: any) => a.date === dayStr);
      const status = att ? att.status : 'unmarked';
      const isPast = dayStr < todayStr;
      if (status === 'absent' || (status === 'unmarked' && isPast)) {
        absentCount++;
      }
    });

    const presentDays = monthAttendance.filter((a: any) => a.status === 'present').length;
    const paidLeaveDays = monthAttendance.filter((a: any) => a.status === 'paid_leave').length;
    const unpaidLeaveDays = monthAttendance.filter((a: any) => a.status === 'unpaid_leave').length;
    const legacyLeaveDays = monthAttendance.filter((a: any) => a.status === 'leave').length;

    const workingDays = 30;

    const dailyWage = Math.floor((member.monthlySalary || 0) / 30);
    const absentDeduction = Math.round(absentCount * dailyWage);
    
    const currentBonus = existingSlip ? (existingSlip.bonus || 0) : 0;
    const currentDeductions = existingSlip ? (existingSlip.otherDeductions || 0) : 0;
    
    const netSalary = Math.round((member.monthlySalary || 0) - absentDeduction + Number(currentBonus) - Number(currentDeductions));

    const slipData: any = {
      staffId: member.id,
      employeeId: member.employeeId || '',
      staffName: member.name,
      department: member.department,
      month: selectedMonth,
      basicSalary: member.monthlySalary || 0,
      dailyWage,
      workingDays,
      presentDays,
      absentDays: absentCount,
      leaveDays: paidLeaveDays + unpaidLeaveDays + legacyLeaveDays,
      paidLeaveDays,
      unpaidLeaveDays,
      absentDeduction,
      bonus: currentBonus,
      bonusReason: existingSlip?.bonusReason || '',
      otherDeductions: currentDeductions,
      deductionReason: existingSlip?.deductionReason || '',
      netSalary,
      status: existingSlip?.status || 'draft',
      createdAt: existingSlip?.createdAt || new Date().toISOString(),
      createdBy: existingSlip?.createdBy || session!.customId,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (existingSlip) {
        const col = (existingSlip as any)._col || salaryCol;
        await updateDoc(doc(db, col, existingSlip.id), slipData);
        setSlips(prev => prev.map(s => s.id === existingSlip.id ? { ...s, ...slipData } : s));
      } else {
        const newDoc = await addDoc(collection(db, salaryCol), slipData);
        setSlips(prev => [...prev, { id: newDoc.id, _col: salaryCol, ...slipData }]);
      }
    } catch (err) {
      console.error('Error committing slip:', err);
      alert('Failed to finalize slip operation. See console for details.');
    }
    
    setGenerating(null);
  };

  const handleUpdateAdjustments = async () => {
    if (!editingSlip) return;
    const { bonus, bonusReason, otherDeductions, deductionReason } = editValues;

    const absentDeduction = Math.round((editingSlip.absentDays || 0) * (editingSlip.dailyWage || 0));
    const netSalary = Math.round(editingSlip.basicSalary - absentDeduction - Number(otherDeductions) + Number(bonus));

    if ((Number(bonus) > 0 || netSalary > editingSlip.basicSalary) && !bonusReason) {
      alert('The salary exceeds standard base pay. Please provide an official justification / reason for the bonus.');
      return;
    }
    if (Number(otherDeductions) > 0 && !deductionReason) {
      alert('Please provide a reason for the deduction.');
      return;
    }

    setActionLoading(editingSlip.id);

    const updates = {
      bonus: Number(bonus),
      bonusReason,
      otherDeductions: Number(otherDeductions),
      deductionReason,
      netSalary
    };

    await updateDoc(doc(db, editingSlip._col, editingSlip.id), updates);
    setSlips(prev => prev.map(s => s.id === editingSlip.id ? { ...s, ...updates } : s));
    setEditingSlip(null);
    setActionLoading(null);
  };

  const handleApprove = async (slip: SlipWithCol) => {
    if (session?.role !== 'superadmin') return;
    setActionLoading(slip.id);
    await updateDoc(doc(db, slip._col, slip.id), {
      status: 'approved',
      approvedBy: session.customId,
      approvedAt: new Date().toISOString(),
    });
    setSlips(prev => prev.map(s => s.id === slip.id ? { ...s, status: 'approved', approvedBy: session.customId } : s));
    setActionLoading(null);
  };

  const handleMarkPaid = async (slip: SlipWithCol) => {
    setActionLoading(slip.id);
    await updateDoc(doc(db, slip._col, slip.id), {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });
    setSlips(prev => prev.map(s => s.id === slip.id ? { ...s, status: 'paid' } : s));
    setActionLoading(null);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8]">
        <Loader2 className="animate-spin text-black" size={32} />
      </div>
    );
  }

  const totalPayroll = monthSlips.reduce((s, slip) => s + (slip.netSalary || 0), 0);

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 md:p-8 pb-32 text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white border border-gray-100 p-6 md:p-8 rounded-[2rem] shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">Payroll Engine</h1>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Unified Fiscal Disbursement Control</p>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-gray-50 text-gray-800 border border-gray-100 rounded-2xl px-5 py-3.5 text-xs font-black uppercase tracking-widest outline-none transition-all hover:border-gray-200 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Total Liability', value: `Rs ${totalPayroll.toLocaleString()}`, color: 'text-gray-900', bg: 'bg-white border border-gray-100 shadow-sm' },
            { label: 'Drafted', value: monthSlips.filter(s => s.status === 'draft').length, color: 'text-indigo-600', bg: 'bg-white border border-gray-100 shadow-sm' },
            { label: 'Authorized', value: monthSlips.filter(s => s.status === 'approved').length, color: 'text-emerald-600', bg: 'bg-white border border-gray-100 shadow-sm' },
            { label: 'Disbursed', value: monthSlips.filter(s => s.status === 'paid').length, color: 'text-gray-500', bg: 'bg-gray-50/50 border border-gray-100 border-dashed' },
          ].map(item => (
            <div key={item.label} className={`${item.bg} rounded-3xl p-5 md:p-6 flex flex-col justify-center items-center text-center transition-all hover:shadow-md`}>
              <p className={`text-xl md:text-2xl font-black ${item.color} tracking-tight leading-none mb-1`}>{item.value}</p>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 md:px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-gray-500 font-black text-[10px] uppercase tracking-[0.2em]">Operational Register — {selectedMonth}</h3>
            {session?.role === 'manager' && (
              <button
                onClick={() => { staff.forEach(m => { void generateSlip(m); }); }}
                className="bg-gray-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm active:scale-95"
              >
                <Plus size={12} strokeWidth={2.5} /> Batch Process
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {staff.map((member, index) => {
              const slip = monthSlips.find(s => s.staffId === member.id);
              return (
                <div key={member.id} style={{ animationDelay: `${index * 40}ms` }} className="animate-in fade-in duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 md:px-8 py-5 hover:bg-gray-50/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-900 font-black text-base flex-shrink-0 group-hover:scale-105 transition-transform">
                      {member.name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-gray-900 font-black text-sm md:text-base uppercase tracking-tight">{member.name}</p>
                      <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.15em] mt-0.5">{member.designation} · {member.department}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {slip ? (
                      <>
                        <div className="text-right">
                          <p className="text-gray-900 font-black text-base md:text-lg tracking-tight">Rs {slip.netSalary?.toLocaleString()}</p>
                          <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.1em] mt-0.5 min-w-[140px]">
                            {slip.presentDays} Days Active · {slip.bonus > 0 ? `+ Rs ${slip.bonus}` : slip.otherDeductions > 0 ? `- Rs ${slip.otherDeductions}` : 'Standard'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border ${
                          slip.status === 'paid' ? 'bg-gray-50 text-gray-600 border-gray-200 border-dashed' :
                          slip.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>{slip.status}</span>

                        {['manager', 'cashier'].includes(session?.role || '') && slip.status === 'draft' && (
                          <button
                            onClick={() => {
                              setEditingSlip(slip);
                              setEditValues({
                                bonus: slip.bonus || 0,
                                bonusReason: slip.bonusReason || '',
                                otherDeductions: slip.otherDeductions || 0,
                                deductionReason: slip.deductionReason || ''
                              });
                            }}
                            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-90"
                            title="Edit Adjustments"
                          >
                            <Plus size={16} strokeWidth={2.5} />
                          </button>
                        )}

                        {['manager', 'cashier'].includes(session?.role || '') && slip.status === 'draft' && (
                          <button
                            disabled={generating === member.id}
                            onClick={() => { void generateSlip(member, slip); }}
                            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 transition-all shadow-sm active:scale-90 disabled:opacity-50"
                            title="Recalculate / Refresh Attendance Data"
                          >
                            {generating === member.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <RefreshCw size={16} strokeWidth={2.5} />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const urlPrefix = slip._col.replace('_salary_records', '');
                            window.open(`/hq/print-salary/${urlPrefix}/${slip.id}`, '_blank');
                          }}
                          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm active:scale-90"
                          title="Print / View Slip"
                        >
                          <Printer size={16} strokeWidth={2.5} />
                        </button>

                        {session?.role === 'superadmin' && slip.status === 'draft' && (
                          <button disabled={!!actionLoading} onClick={() => { void handleApprove(slip); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-sm">
                            {actionLoading === slip.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} strokeWidth={2.5} />} Authorize
                          </button>
                        )}
                        {slip.status === 'approved' && (
                          <button disabled={!!actionLoading} onClick={() => { void handleMarkPaid(slip); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-sm">
                            {actionLoading === slip.id ? <Loader2 size={12} className="animate-spin" /> : <DollarSign size={12} strokeWidth={2.5} />} Disburse
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        disabled={generating === member.id}
                        onClick={() => { void generateSlip(member); }}
                        className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-black text-[9px] uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                      >
                        {generating === member.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} strokeWidth={2} />}
                        Draft Record
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editingSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 md:p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Fiscal Adjustment</h2>
                  <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Personnel ID: {editingSlip.employeeId} · Cycle: {editingSlip.month}</p>
                </div>
                <button onClick={() => setEditingSlip(null)} className="p-3 bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100 rounded-xl transition-all active:scale-90">
                  <Plus className="rotate-45" size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Incentive Credit (PKR)</label>
                    <input
                      type="number"
                      value={editValues.bonus}
                      onChange={(e) => setEditValues({ ...editValues, bonus: Number(e.target.value) })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 text-sm font-bold outline-none focus:border-indigo-500/30 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Account Debit (PKR)</label>
                    <input
                      type="number"
                      value={editValues.otherDeductions}
                      onChange={(e) => setEditValues({ ...editValues, otherDeductions: Number(e.target.value) })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 text-sm font-bold outline-none focus:border-indigo-500/30 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Adjustment Rationale (Bonus)</label>
                  <textarea
                    value={editValues.bonusReason}
                    onChange={(e) => setEditValues({ ...editValues, bonusReason: e.target.value })}
                    placeholder="Enter official justification..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 text-sm font-bold outline-none focus:border-indigo-500/30 transition-all min-h-[90px] resize-none placeholder:text-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Correction Rationale (Deduction)</label>
                  <textarea
                    value={editValues.deductionReason}
                    onChange={(e) => setEditValues({ ...editValues, deductionReason: e.target.value })}
                    placeholder="Enter official justification..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 text-sm font-bold outline-none focus:border-indigo-500/30 transition-all min-h-[90px] resize-none placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingSlip(null)}
                  className="flex-1 px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={handleUpdateAdjustments}
                  disabled={!!actionLoading}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-[0.3em] px-6 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} strokeWidth={2.5} />}
                  Commit Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
