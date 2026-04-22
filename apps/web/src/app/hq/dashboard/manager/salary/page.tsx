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
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  }

  const totalPayroll = monthSlips.reduce((s, slip) => s + (slip.netSalary || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Salary Slips</h1>
            <p className="text-black text-xs font-bold uppercase tracking-widest mt-1">Monthly payroll management — All Departments</p>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 [color-scheme:dark]"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Payroll', value: `Rs${totalPayroll.toLocaleString()}`, color: 'text-amber-500' },
            { label: 'Draft', value: monthSlips.filter(s => s.status === 'draft').length, color: 'text-black' },
            { label: 'Approved', value: monthSlips.filter(s => s.status === 'approved').length, color: 'text-blue-400' },
            { label: 'Paid', value: monthSlips.filter(s => s.status === 'paid').length, color: 'text-emerald-400' },
          ].map(item => (
            <div key={item.label} className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
              <p className="text-black text-[10px] font-black uppercase tracking-widest mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/8 rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-white font-black text-xs uppercase tracking-widest">Staff — {selectedMonth}</h3>
            {session?.role === 'manager' && (
              <button
                onClick={() => { staff.forEach(m => { void generateSlip(m); }); }}
                className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-2"
              >
                <Plus size={12} /> Generate All
              </button>
            )}
          </div>
          <div className="divide-y divide-white/5">
            {staff.map((member, index) => {
              const slip = monthSlips.find(s => s.staffId === member.id);
              return (
                <div key={member.id} style={{ animationDelay: `${index * 40}ms` }} className="animate-in fade-in duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black text-sm flex-shrink-0">
                      {member.name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{member.name}</p>
                      <p className="text-black text-[10px] font-black uppercase tracking-widest">{member.designation} · {member.department}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {slip ? (
                      <>
                        <div className="text-right">
                          <p className="text-white font-black text-sm">Rs{slip.netSalary?.toLocaleString()}</p>
                          <p className="text-black text-[10px] font-black uppercase tracking-widest min-w-[120px]">
                            {slip.presentDays} days · {slip.bonus > 0 ? `+Rs${slip.bonus} bonus` : slip.otherDeductions > 0 ? `-Rs${slip.otherDeductions} ded.` : 'No adj.'}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          slip.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          slip.status === 'approved' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
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
                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-black hover:text-white transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        )}

                        {session?.role === 'superadmin' && slip.status === 'draft' && (
                          <button disabled={!!actionLoading} onClick={() => { void handleApprove(slip); }} className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                            {actionLoading === slip.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />} Approve
                          </button>
                        )}
                        {slip.status === 'approved' && (
                          <button disabled={!!actionLoading} onClick={() => { void handleMarkPaid(slip); }} className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-blue-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                            {actionLoading === slip.id ? <Loader2 size={10} className="animate-spin" /> : <DollarSign size={10} />} Mark Paid
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        disabled={generating === member.id}
                        onClick={() => { void generateSlip(member); }}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-black hover:text-white font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                      >
                        {generating === member.id ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
                        Generate Slip
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-white/10 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Adjust Salary</h2>
                  <p className="text-black text-[10px] font-black uppercase tracking-widest mt-1">For {editingSlip.staffName} · {editingSlip.month}</p>
                </div>
                <button onClick={() => setEditingSlip(null)} className="p-2 hover:bg-white/5 rounded-full text-black transition-colors">
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Bonus (PKR)</label>
                    <input
                      type="number"
                      value={editValues.bonus}
                      onChange={(e) => setEditValues({ ...editValues, bonus: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Deduction (PKR)</label>
                    <input
                      type="number"
                      value={editValues.otherDeductions}
                      onChange={(e) => setEditValues({ ...editValues, otherDeductions: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Bonus Reason</label>
                  <textarea
                    value={editValues.bonusReason}
                    onChange={(e) => setEditValues({ ...editValues, bonusReason: e.target.value })}
                    placeholder="Why is this bonus being given?"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Deduction Reason</label>
                  <textarea
                    value={editValues.deductionReason}
                    onChange={(e) => setEditValues({ ...editValues, deductionReason: e.target.value })}
                    placeholder="Reason for deduction/fine?"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all min-h-[80px] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingSlip(null)}
                  className="flex-1 px-6 py-4 rounded-2xl border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAdjustments}
                  disabled={!!actionLoading}
                  className="flex-[2] bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Save Adjustments
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
