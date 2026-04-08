'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, addDoc, updateDoc, doc, query, where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Plus, FileText, CheckCircle, DollarSign } from 'lucide-react';
import type { HqStaff, SalarySlip } from '@/types/hq';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function SalarySlipsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staff, setStaff] = useState<HqStaff[]>([]);
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [generating, setGenerating] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || !['manager', 'superadmin'].includes(session.role)) router.push('/hq/login');
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      getDocs(query(collection(db, 'hq_staff'), where('isActive', '==', true))),
      getDocs(collection(db, 'hq_salary_records')),
    ]).then(([staffSnap, slipsSnap]) => {
      setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as HqStaff)));
      setSlips(slipsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SalarySlip)));
      setLoading(false);
    });
  }, [session]);

  const monthSlips = slips.filter(s => s.month === selectedMonth);

  const generateSlip = async (member: HqStaff) => {
    const existing = monthSlips.find(s => s.staffId === member.id);
    if (existing) return;
    setGenerating(member.id);

    const attSnap = await getDocs(
      query(collection(db, 'hq_attendance'), where('staffId', '==', member.id))
    );
    const monthAttendance = attSnap.docs
      .map(d => d.data())
      .filter(a => (a.date || '').startsWith(selectedMonth));

    const presentDays = monthAttendance.filter(a => a.status === 'present').length;
    const absentDays = monthAttendance.filter(a => a.status === 'absent').length;
    const leaveDays = monthAttendance.filter(a => a.status === 'leave').length;
    const workingDays = presentDays + absentDays + leaveDays || 26;
    const absentDeduction = absentDays * 500;
    const netSalary = Math.max(0, (member.monthlySalary || 0) - absentDeduction);

    const slip: Omit<SalarySlip, 'id'> = {
      staffId: member.id,
      employeeId: member.employeeId,
      staffName: member.name,
      department: member.department,
      month: selectedMonth,
      basicSalary: member.monthlySalary || 0,
      workingDays,
      presentDays,
      absentDays,
      leaveDays,
      absentDeduction,
      bonus: 0,
      otherDeductions: 0,
      netSalary,
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdBy: session!.customId,
    };

    const newDoc = await addDoc(collection(db, 'hq_salary_records'), slip);
    setSlips(prev => [...prev, { id: newDoc.id, ...slip }]);
    setGenerating(null);
  };

  const handleApprove = async (slipId: string) => {
    if (session?.role !== 'superadmin') return;
    setActionLoading(slipId);
    await updateDoc(doc(db, 'hq_salary_records', slipId), {
      status: 'approved',
      approvedBy: session.customId,
      approvedAt: new Date().toISOString(),
    });
    setSlips(prev => prev.map(s => s.id === slipId ? { ...s, status: 'approved', approvedBy: session.customId } : s));
    setActionLoading(null);
  };

  const handleMarkPaid = async (slipId: string) => {
    setActionLoading(slipId);
    await updateDoc(doc(db, 'hq_salary_records', slipId), {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });
    setSlips(prev => prev.map(s => s.id === slipId ? { ...s, status: 'paid' } : s));
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
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Monthly payroll management</p>
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
            { label: 'Draft', value: monthSlips.filter(s => s.status === 'draft').length, color: 'text-gray-300' },
            { label: 'Approved', value: monthSlips.filter(s => s.status === 'approved').length, color: 'text-blue-400' },
            { label: 'Paid', value: monthSlips.filter(s => s.status === 'paid').length, color: 'text-emerald-400' },
          ].map(item => (
            <div key={item.label} className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
              <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-1">{item.label}</p>
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
                      {member.name[0]}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{member.name}</p>
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{member.designation} · {member.department}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {slip ? (
                      <>
                        <div className="text-right">
                          <p className="text-white font-black text-sm">Rs{slip.netSalary?.toLocaleString()}</p>
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
                            {slip.absentDays > 0 ? `-Rs${slip.absentDeduction} deducted` : 'No deductions'}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          slip.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          slip.status === 'approved' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>{slip.status}</span>
                        {session?.role === 'superadmin' && slip.status === 'draft' && (
                          <button disabled={!!actionLoading} onClick={() => { void handleApprove(slip.id); }} className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                            {actionLoading === slip.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />} Approve
                          </button>
                        )}
                        {slip.status === 'approved' && (
                          <button disabled={!!actionLoading} onClick={() => { void handleMarkPaid(slip.id); }} className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                            {actionLoading === slip.id ? <Loader2 size={10} className="animate-spin" /> : <DollarSign size={10} />} Mark Paid
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        disabled={generating === member.id}
                        onClick={() => { void generateSlip(member); }}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2"
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
    </div>
  );
}
