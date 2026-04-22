'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Plus, FileText, CheckCircle, DollarSign } from 'lucide-react';
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

    const [yearStr, monthStr] = selectedMonth.split('-');
    const workingDays = new Date(Number(yearStr), Number(monthStr), 0).getDate();

    const dailyWage = (member.monthlySalary || 0) / workingDays;
    const totalPaidDays = presentDays + paidLeaveDays;
    const basePay = Math.round(dailyWage * totalPaidDays);
    const netSalary = basePay;

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
      absentDeduction: 0,
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

    if (bonus > 0 && !bonusReason) {
      alert('Please provide a reason for the bonus.');
      return;
    }
    if (otherDeductions > 0 && !deductionReason) {
      alert('Please provide a reason for the deduction.');
      return;
    }

    setActionLoading(editingSlip.id);
    const basePay = Math.round((editingSlip.dailyWage || 0) * (editingSlip.presentDays + (editingSlip.paidLeaveDays || 0)));
    const netSalary = Math.round(basePay + Number(bonus) - Number(otherDeductions));

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
    <div className="min-h-screen bg-[#FCFBF8] p-4 md:p-8 pb-32 text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-2xl">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight">Payroll Engine</h1>
            <p className="text-black text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-50">Unified Fiscal Disbursement Control</p>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-black text-white border-2 border-black rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest outline-none transition-all hover:scale-105 active:scale-95 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Liability', value: `Rs ${totalPayroll.toLocaleString()}`, color: 'text-black', bg: 'bg-white border-4 border-black' },
            { label: 'Drafted', value: monthSlips.filter(s => s.status === 'draft').length, color: 'text-black', bg: 'bg-white border-2 border-black/10' },
            { label: 'Authorized', value: monthSlips.filter(s => s.status === 'approved').length, color: 'text-white', bg: 'bg-black border-2 border-black shadow-xl shadow-black/10' },
            { label: 'Disbursed', value: monthSlips.filter(s => s.status === 'paid').length, color: 'text-black', bg: 'bg-white border-4 border-black border-dashed' },
          ].map(item => (
            <div key={item.label} className={`${item.bg} rounded-[2rem] p-6 flex flex-col justify-center items-center text-center transition-all hover:-translate-y-1`}>
              <p className={`text-2xl font-black ${item.color} uppercase tracking-tighter`}>{item.value}</p>
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-2 ${item.color === 'text-white' ? 'opacity-60' : 'opacity-40'}`}>{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border-4 border-black rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="px-8 py-6 border-b-2 border-black/10 flex items-center justify-between bg-black/5">
            <h3 className="text-black font-black text-xs uppercase tracking-[0.3em]">Operational Register — {selectedMonth}</h3>
            {session?.role === 'manager' && (
              <button
                onClick={() => { staff.forEach(m => { void generateSlip(m); }); }}
                className="bg-black hover:bg-white border-2 border-black text-white hover:text-black font-black text-[10px] uppercase tracking-[0.2em] px-6 py-3 rounded-xl transition-all flex items-center gap-2 active:scale-95"
              >
                <Plus size={12} strokeWidth={4} /> Batch Process
              </button>
            )}
          </div>
          <div className="divide-y-2 divide-black/5">
            {staff.map((member, index) => {
              const slip = monthSlips.find(s => s.staffId === member.id);
              return (
                <div key={member.id} style={{ animationDelay: `${index * 40}ms` }} className="animate-in fade-in duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 px-8 py-6 hover:bg-black/5 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-black border-2 border-black flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-lg transition-transform group-hover:scale-110">
                      {member.name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-black font-black text-base uppercase tracking-tight">{member.name}</p>
                      <p className="text-black text-[10px] font-black uppercase tracking-[0.15em] opacity-40">{member.designation} · {member.department}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {slip ? (
                      <>
                        <div className="text-right">
                          <p className="text-black font-black text-lg tracking-tighter">Rs {slip.netSalary?.toLocaleString()}</p>
                          <p className="text-black text-[9px] font-black uppercase tracking-[0.1em] opacity-40 min-w-[140px]">
                            {slip.presentDays} Days Active · {slip.bonus > 0 ? `+ Rs ${slip.bonus}` : slip.otherDeductions > 0 ? `- Rs ${slip.otherDeductions}` : 'Standard'}
                          </p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border-2 ${
                          slip.status === 'paid' ? 'bg-white text-black border-black border-dashed' :
                          slip.status === 'approved' ? 'bg-black text-white border-black' :
                          'bg-white text-black border-black/20 opacity-60'
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
                            className="p-3 rounded-xl bg-white border-2 border-black text-black hover:bg-black hover:text-white transition-all active:scale-90"
                          >
                            <Plus size={16} strokeWidth={4} />
                          </button>
                        )}

                        {session?.role === 'superadmin' && slip.status === 'draft' && (
                          <button disabled={!!actionLoading} onClick={() => { void handleApprove(slip); }} className="bg-black hover:bg-white border-2 border-black text-white hover:text-black font-black text-[10px] uppercase tracking-[0.2em] px-5 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2">
                            {actionLoading === slip.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} strokeWidth={4} />} Authorize
                          </button>
                        )}
                        {slip.status === 'approved' && (
                          <button disabled={!!actionLoading} onClick={() => { void handleMarkPaid(slip); }} className="bg-white hover:bg-black border-2 border-black text-black hover:text-white font-black text-[10px] uppercase tracking-[0.2em] px-5 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2">
                            {actionLoading === slip.id ? <Loader2 size={12} className="animate-spin" /> : <DollarSign size={12} strokeWidth={4} />} Disburse
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        disabled={generating === member.id}
                        onClick={() => { void generateSlip(member); }}
                        className="bg-white hover:bg-black border-2 border-black text-black hover:text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-black/5"
                      >
                        {generating === member.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} strokeWidth={3} />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white border-4 border-black rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.3)]">
            <div className="p-10 space-y-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-black uppercase tracking-tight">Fiscal Adjustment</h2>
                  <p className="text-black text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-50">Personnel ID: {editingSlip.employeeId} · Cycle: {editingSlip.month}</p>
                </div>
                <button onClick={() => setEditingSlip(null)} className="p-4 bg-black text-white hover:bg-white hover:text-black border-2 border-black rounded-2xl transition-all active:scale-90">
                  <Plus className="rotate-45" size={24} strokeWidth={4} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-black ml-1">Incentive Credit (PKR)</label>
                    <input
                      type="number"
                      value={editValues.bonus}
                      onChange={(e) => setEditValues({ ...editValues, bonus: Number(e.target.value) })}
                      className="w-full bg-black/5 border-2 border-black/10 rounded-2xl px-6 py-4 text-black text-sm font-black outline-none focus:border-black transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-black ml-1">Account Debit (PKR)</label>
                    <input
                      type="number"
                      value={editValues.otherDeductions}
                      onChange={(e) => setEditValues({ ...editValues, otherDeductions: Number(e.target.value) })}
                      className="w-full bg-black/5 border-2 border-black/10 rounded-2xl px-6 py-4 text-black text-sm font-black outline-none focus:border-black transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-black ml-1">Adjustment Rationale (Bonus)</label>
                  <textarea
                    value={editValues.bonusReason}
                    onChange={(e) => setEditValues({ ...editValues, bonusReason: e.target.value })}
                    placeholder="Enter official justification..."
                    className="w-full bg-black/5 border-2 border-black/10 rounded-2xl px-6 py-4 text-black text-sm font-black outline-none focus:border-black transition-all min-h-[120px] resize-none placeholder:text-black/20"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-black ml-1">Correction Rationale (Deduction)</label>
                  <textarea
                    value={editValues.deductionReason}
                    onChange={(e) => setEditValues({ ...editValues, deductionReason: e.target.value })}
                    placeholder="Enter official justification..."
                    className="w-full bg-black/5 border-2 border-black/10 rounded-2xl px-6 py-4 text-black text-sm font-black outline-none focus:border-black transition-all min-h-[120px] resize-none placeholder:text-black/20"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setEditingSlip(null)}
                  className="flex-1 px-8 py-5 rounded-2xl border-2 border-black text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={handleUpdateAdjustments}
                  disabled={!!actionLoading}
                  className="flex-[2] bg-black hover:bg-black/90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-[0.3em] px-8 py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-black/20"
                >
                  {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} strokeWidth={4} />}
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
