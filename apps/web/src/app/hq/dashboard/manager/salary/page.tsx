'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Plus, FileText, CheckCircle, DollarSign, Printer } from 'lucide-react';
import type { HqStaff, SalarySlip } from '@/types/hq';
import { getDeptCollection, getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';

const ALL_DEPTS: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
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
  const [viewingSlip, setViewingSlip] = useState<SlipWithCol | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || !['manager', 'superadmin', 'cashier'].includes(session.role)) router.push('/hq/login');
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      try {
        // Fetch all staff across all departments
        const staffSnaps = await Promise.all(
          ALL_DEPTS.map(d =>
            getDocs(query(collection(db, getDeptCollection(d)), where('isActive', '==', true)))
              .catch(() => ({ docs: [] } as any))
          )
        );

        let allStaff: HqStaff[] = [];
        staffSnaps.forEach((snap, idx) => {
          const dept = ALL_DEPTS[idx];
          allStaff = [...allStaff, ...snap.docs.map((d: any) => ({ id: d.id, ...d.data(), department: dept } as HqStaff))];
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

  const generateSlip = async (member: HqStaff) => {
    const existing = monthSlips.find(s => s.staffId === member.id);
    if (existing) return;
    setGenerating(member.id);

    const dept = (member.department as StaffDept) || 'hq';
    const prefix = getDeptPrefix(dept);
    const salaryCol = `${prefix}_salary_records`;

    const attSnap = await getDocs(
      query(collection(db, `${prefix}_attendance`), where('staffId', '==', member.id))
    ).catch(() => ({ docs: [] } as any));

    const monthAttendance = attSnap.docs
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

    const presentDays = monthAttendance.filter((a: any) => a.status === 'present').length;
    const paidLeaveDays = monthAttendance.filter((a: any) => a.status === 'paid_leave').length;
    const unpaidLeaveDays = monthAttendance.filter((a: any) => a.status === 'unpaid_leave').length;
    const legacyLeaveDays = monthAttendance.filter((a: any) => a.status === 'leave').length;
    const absentDays = monthAttendance.filter((a: any) => a.status === 'absent').length;

    const workingDays = 30;

    const dailyWage = Math.floor((member.monthlySalary || 0) / 30);
    const absentDeduction = Math.round(absentDays * dailyWage);
    const netSalary = Math.round((member.monthlySalary || 0) - absentDeduction);

    const slip: Omit<SalarySlip, 'id'> = {
      staffId: member.id,
      employeeId: member.employeeId,
      staffName: member.name,
      department: member.department,
      month: selectedMonth,
      basicSalary: member.monthlySalary || 0,
      dailyWage,
      workingDays,
      presentDays,
      absentDays,
      leaveDays: paidLeaveDays + unpaidLeaveDays + legacyLeaveDays,
      paidLeaveDays,
      unpaidLeaveDays,
      absentDeduction,
      bonus: 0,
      bonusReason: '',
      otherDeductions: 0,
      deductionReason: '',
      netSalary,
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdBy: session!.customId,
    };

    const newDoc = await addDoc(collection(db, salaryCol), slip);
    setSlips(prev => [...prev, { id: newDoc.id, _col: salaryCol, ...slip }]);
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

                        <button
                          onClick={() => setViewingSlip(slip)}
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

      {viewingSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            <div className="p-8 md:p-12 space-y-8">
              {/* Header section (Non-printable controls) */}
              <div className="flex items-center justify-between no-print">
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Print Salary Slip</h2>
                  <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Official Financial Slip Report</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-sm active:scale-95"
                  >
                    <Printer size={14} strokeWidth={2.5} /> Print Slip
                  </button>
                  <button
                    onClick={() => setViewingSlip(null)}
                    className="p-3 bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100 rounded-xl transition-all active:scale-90"
                  >
                    <Plus className="rotate-45" size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Printable Area */}
              <div id="salary-slip-print" className="bg-white text-black p-4 md:p-8 border border-gray-100 rounded-[2rem] space-y-8">
                {/* School Header */}
                <div className="text-center space-y-1">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 uppercase">KHAN EDUCATION SYSTEM</h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Unified ERP & Fiscal Disbursement Control</p>
                  <div className="h-[2px] bg-gray-900 w-24 mx-auto my-3" />
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">STAFF SALARY SLIP</h3>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <div>
                    <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Employee ID</span>
                    <span className="font-bold text-sm text-gray-900">{viewingSlip.employeeId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Employee Name</span>
                    <span className="font-bold text-sm text-gray-900 uppercase">{viewingSlip.staffName}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Department</span>
                    <span className="font-bold text-sm text-gray-900 uppercase">{viewingSlip.department}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Salary Month</span>
                    <span className="font-bold text-sm text-gray-900">{viewingSlip.month}</span>
                  </div>
                </div>

                {/* Metrics Breakdown Table */}
                <div className="overflow-x-auto w-full border border-gray-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[8px] font-black uppercase tracking-[0.25em]">
                        <th className="py-4 px-6">Description / Attendance Breakdown</th>
                        <th className="py-4 px-6 text-center">Value / Count</th>
                        <th className="py-4 px-6 text-right">Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                      <tr>
                        <td className="py-4 px-6 text-gray-900">Basic Monthly Salary</td>
                        <td className="py-4 px-6 text-center">-</td>
                        <td className="py-4 px-6 text-right">Rs {viewingSlip.basicSalary?.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-6">Calendar Working Days</td>
                        <td className="py-4 px-6 text-center font-black">{viewingSlip.workingDays} Days</td>
                        <td className="py-4 px-6 text-right">-</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-6">Active Days Present</td>
                        <td className="py-4 px-6 text-center font-black text-emerald-600">{viewingSlip.presentDays} Days</td>
                        <td className="py-4 px-6 text-right">-</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-6">Paid Leaves Granted</td>
                        <td className="py-4 px-6 text-center font-black text-indigo-600">{viewingSlip.paidLeaveDays || 0} Days</td>
                        <td className="py-4 px-6 text-right">-</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-6">Unpaid Leaves / Absents</td>
                        <td className="py-4 px-6 text-center font-black text-red-500">{(viewingSlip.unpaidLeaveDays || 0) + (viewingSlip.absentDays || 0)} Days</td>
                        <td className="py-4 px-6 text-right">-</td>
                      </tr>
                      {viewingSlip.absentDeduction > 0 && (
                        <tr>
                          <td className="py-4 px-6 text-red-700">Absent Days Deduction</td>
                          <td className="py-4 px-6 text-center text-red-700">{viewingSlip.absentDays || 0} Days</td>
                          <td className="py-4 px-6 text-right text-red-700">- Rs {viewingSlip.absentDeduction?.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-4 px-6 text-emerald-700">Performance Incentive / Bonus</td>
                        <td className="py-4 px-6 text-center">-</td>
                        <td className="py-4 px-6 text-right text-emerald-700">+ Rs {viewingSlip.bonus?.toLocaleString() || '0'}</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-6 text-red-700">Authorized Adjustments / Deductions</td>
                        <td className="py-4 px-6 text-center">-</td>
                        <td className="py-4 px-6 text-right text-red-700">- Rs {viewingSlip.otherDeductions?.toLocaleString() || '0'}</td>
                      </tr>
                      <tr className="bg-gray-50 font-black text-[11px] uppercase tracking-tight text-gray-900">
                        <td className="py-5 px-6 uppercase font-black text-[12px]">Net Disbursed Amount</td>
                        <td className="py-5 px-6 text-center">-</td>
                        <td className="py-5 px-6 text-right text-lg font-black tracking-tight text-gray-900">Rs {viewingSlip.netSalary?.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Rationales / Justifications */}
                {(viewingSlip.bonus > 0 && viewingSlip.bonusReason) || (viewingSlip.otherDeductions > 0 && viewingSlip.deductionReason) ? (
                  <div className="space-y-4 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">Adjustment Rationales</h4>
                    {viewingSlip.bonus > 0 && viewingSlip.bonusReason && (
                      <div className="text-xs">
                        <span className="font-black uppercase text-[8px] tracking-[0.1em] text-emerald-700 block mb-1">Bonus Credit Justification:</span>
                        <p className="text-gray-700 italic font-medium">"{viewingSlip.bonusReason}"</p>
                      </div>
                    )}
                    {viewingSlip.otherDeductions > 0 && viewingSlip.deductionReason && (
                      <div className="text-xs">
                        <span className="font-black uppercase text-[8px] tracking-[0.1em] text-red-700 block mb-1">Deduction Justification:</span>
                        <p className="text-gray-700 italic font-medium">"{viewingSlip.deductionReason}"</p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Print Signatures */}
                <div className="grid grid-cols-3 gap-8 pt-16 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <div className="space-y-3">
                    <div className="border-b border-gray-200 mx-auto w-3/4 h-8" />
                    <span>PREPARED BY (CASHIER)</span>
                  </div>
                  <div className="space-y-3">
                    <div className="border-b border-gray-200 mx-auto w-3/4 h-8" />
                    <span>AUTHORIZED (SUPERADMIN)</span>
                  </div>
                  <div className="space-y-3">
                    <div className="border-b border-gray-200 mx-auto w-3/4 h-8" />
                    <span>RECEIVED BY (EMPLOYEE)</span>
                  </div>
                </div>

                {/* Generation watermark */}
                <div className="text-center pt-8 text-[8px] font-black uppercase tracking-[0.3em] text-gray-300">
                  System Generated on {new Date(viewingSlip.createdAt).toLocaleString()} · KHANHUB ERP Payroll
                </div>
              </div>

              {/* Action Controls Footer (Non-printable) */}
              <div className="flex gap-3 justify-end no-print pt-4 border-t border-gray-50">
                <button
                  onClick={() => setViewingSlip(null)}
                  className="px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.3em] px-6 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Printer size={14} strokeWidth={2.5} /> Print/Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS style block for printing optimization */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #salary-slip-print, #salary-slip-print * {
            visibility: visible !important;
          }
          #salary-slip-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            padding: 2rem !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
