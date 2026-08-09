'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import {
  UserCog, Printer, Calendar, DollarSign, Loader2, Download,
  Plus, X, Receipt, Trash2, Eye, CheckCircle2, Info, CreditCard
} from 'lucide-react';
import { downloadElementAsPng } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPKR(n: number) {
  return `Rs. ${Math.round(n).toLocaleString('en-PK')}`;
}

export default function RehabPayrollPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [tab, setTab] = useState<'salary' | 'fines'>('salary');
  const [fineStaffFilter, setFineStaffFilter] = useState<string>('all');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Staff deduction modal state
  const [selectedStaffModal, setSelectedStaffModal] = useState<any | null>(null);

  // Fine form
  const [showFineForm, setShowFineForm] = useState(false);
  const [fineForm, setFineForm] = useState({ staffId: '', amount: '', reason: '', date: '' });
  const [savingFine, setSavingFine] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = localStorage.getItem('rehab_session');
    if (!s) { router.push('/departments/rehab/login'); return; }
    const parsed = JSON.parse(s);
    if (parsed.role !== 'superadmin') { router.push('/departments/rehab/login'); return; }
    setSession(parsed);
  }, [router]);

  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const handleLoad = async () => {
    try {
      setLoading(true);

      // Staff
      const staffSnap = await getDocs(query(collection(db, 'rehab_staff'), where('isActive', '==', true)));
      const allStaff = staffSnap.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        .filter((s: any) => !['executive', 'hide'].includes(String(s.status || '').toLowerCase()))
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

      // Fines by date range
      const finesSnap = await getDocs(query(
        collection(db, 'rehab_fines'),
        where('date', '>=', `${monthStr}-01`),
        where('date', '<=', `${monthStr}-31`)
      ));
      const finesByMonthSnap = await getDocs(query(
        collection(db, 'rehab_fines'),
        where('month', '==', monthStr)
      ));
      const allFinesDocs = new Map<string, any>();
      [...finesSnap.docs, ...finesByMonthSnap.docs].forEach(d => {
        allFinesDocs.set(d.id, { id: d.id, ...d.data() as any });
      });
      const allFines = Array.from(allFinesDocs.values());

      // Advances (Transactions + Advances collections)
      const txCol = `rehab_transactions`;
      const advCol = `rehab_advances`;

      const txSnap = await getDocs(query(
        collection(db, txCol),
        where('date', '>=', `${monthStr}-01`),
        where('date', '<=', `${monthStr}-31`)
      )).catch(() => ({ docs: [] } as any));
      const txByMonthSnap = await getDocs(query(
        collection(db, txCol),
        where('month', '==', monthStr)
      )).catch(() => ({ docs: [] } as any));
      const advSnap = await getDocs(query(
        collection(db, advCol),
        where('date', '>=', `${monthStr}-01`),
        where('date', '<=', `${monthStr}-31`)
      )).catch(() => ({ docs: [] } as any));
      const advByMonthSnap = await getDocs(query(
        collection(db, advCol),
        where('month', '==', monthStr)
      )).catch(() => ({ docs: [] } as any));

      const allTxDocs = new Map<string, any>();
      [...txSnap.docs, ...txByMonthSnap.docs, ...advSnap.docs, ...advByMonthSnap.docs].forEach((d: any) => {
        allTxDocs.set(d.id, { id: d.id, ...d.data() });
      });

      const allAdvanceTxns = Array.from(allTxDocs.values()).filter((tx: any) => {
        if (tx.status === 'rejected') return false;
        const cat = String(tx.category || '').toLowerCase();
        const catName = String(tx.categoryName || '').toLowerCase();
        const desc = String(tx.description || '').toLowerCase();
        return (
          cat === 'advance_salary' ||
          cat === 'advance' ||
          cat === 'staff_advance' ||
          catName.includes('advance') ||
          desc.includes('advance')
        );
      });

      // Attendance absences & unmarked records for this month
      const attendanceSnap = await getDocs(query(
        collection(db, 'rehab_attendance'),
        where('date', '>=', `${monthStr}-01`),
        where('date', '<=', `${monthStr}-31`)
      ));
      const allAbsences = attendanceSnap.docs
        .map(d => d.data() as any)
        .filter((a: any) => {
          const status = String(a.status || a.state || '').toLowerCase();
          return status === 'absent' || status === 'unmarked';
        });

      // Build salary rows
      const salaryRows = allStaff.map((staff: any) => {
        const gross = Number(staff.salary || 0);
        const dailyRate = gross / 30;
        const absences = allAbsences.filter((a: any) => a.staffId === staff.id);
        const absentDays = absences.length;
        const absentDates = absences.map((a: any) => a.date).sort();
        const totalAbsentDeduction = Math.round(absentDays * dailyRate);

        const staffFines = allFines.filter((f: any) => f.staffId === staff.id);
        const totalFines = staffFines.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);

        // Advance calculation
        const staffAdvanceTxns = allAdvanceTxns.filter((tx: any) => tx.staffId === staff.id || tx.staffId === staff.staffId);
        const totalTxAdvance = staffAdvanceTxns.reduce((s: number, tx: any) => s + Number(tx.amount || 0), 0);
        const staffDocAdvance = Number(staff.advance || staff.advanceSalary || staff.monthlyAdvance || 0);
        const totalAdvance = Math.max(staffDocAdvance, totalTxAdvance);

        const deductions = totalAbsentDeduction + totalFines + totalAdvance;
        const netPayable = Math.max(0, gross - deductions);

        // Itemized date-wise deduction breakdown
        const deductionItems: Array<{
          id: string;
          date: string;
          type: 'absent' | 'fine' | 'advance';
          amount: number;
          reason: string;
          recordedBy?: string;
        }> = [];

        absences.forEach((a: any, idx: number) => {
          const status = String(a.status || a.state || '').toLowerCase();
          const isUnmarked = status === 'unmarked';
          deductionItems.push({
            id: `absent-${a.date}-${idx}`,
            date: a.date,
            type: 'absent',
            amount: Math.round(dailyRate),
            reason: isUnmarked
              ? `Unmarked Attendance / Absent (Daily rate: ${formatPKR(dailyRate)})`
              : `Absent from duty (Daily rate: ${formatPKR(dailyRate)})`,
          });
        });

        staffFines.forEach((f: any) => {
          deductionItems.push({
            id: f.id || `fine-${f.date}`,
            date: f.date || f.month || '—',
            type: 'fine',
            amount: Number(f.amount || 0),
            reason: f.reason || 'Fine imposed',
            recordedBy: f.recordedBy || 'Superadmin',
          });
        });

        staffAdvanceTxns.forEach((tx: any) => {
          deductionItems.push({
            id: tx.id || `adv-${tx.date}`,
            date: tx.date || tx.transactionDate || tx.month || monthStr,
            type: 'advance',
            amount: Number(tx.amount || 0),
            reason: tx.description || tx.categoryName || 'Advance Salary taken',
            recordedBy: tx.recordedBy || tx.cashierName || 'Cashier / Superadmin',
          });
        });

        if (staffAdvanceTxns.length === 0 && staffDocAdvance > 0) {
          deductionItems.push({
            id: `doc-adv-${staff.id}`,
            date: monthStr,
            type: 'advance',
            amount: staffDocAdvance,
            reason: 'Monthly Advance Salary',
            recordedBy: 'System Record',
          });
        }

        // Sort chronologically by date
        deductionItems.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        return {
          id: staff.id,
          name: staff.name || '—',
          designation: staff.designation || staff.role || '—',
          dept: 'rehab',
          gross,
          dailyRate: Math.round(dailyRate),
          absentDays,
          absentDates,
          totalAbsentDeduction,
          finesCount: staffFines.length,
          staffFines,
          totalFines,
          totalAdvance,
          staffAdvanceTxns,
          deductions,
          netPayable,
          deductionItems,
        };
      });

      const totalGross = salaryRows.reduce((s, r) => s + r.gross, 0);
      const totalNet = salaryRows.reduce((s, r) => s + r.netPayable, 0);
      const totalDeductions = salaryRows.reduce((s, r) => s + r.deductions, 0);
      const totalAdvancesAmount = salaryRows.reduce((s, r) => s + r.totalAdvance, 0);

      // Enrich fines with staff name
      const staffMap = Object.fromEntries(allStaff.map((s: any) => [s.id, s.name || s.id]));
      const enrichedFines = allFines
        .map((f: any) => ({ ...f, staffName: staffMap[f.staffId] || f.staffId }))
        .sort((a: any, b: any) => {
          const da = a.createdAt?.toDate?.() || new Date(0);
          const db_ = b.createdAt?.toDate?.() || new Date(0);
          return db_.getTime() - da.getTime();
        });

      setData({
        allStaff,
        salaryRows,
        totalGross,
        totalNet,
        totalDeductions,
        totalAdvancesAmount,
        allFines: enrichedFines,
        monthLabel: `${MONTHS[selectedMonth]} ${selectedYear}`,
      });
    } catch (err: any) {
      console.error('Payroll load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFine = async () => {
    if (!fineForm.staffId || !fineForm.amount || !fineForm.reason) {
      alert('Staff, amount and reason are required.');
      return;
    }
    try {
      setSavingFine(true);
      await addDoc(collection(db, 'rehab_fines'), {
        staffId: fineForm.staffId,
        amount: Number(fineForm.amount),
        reason: fineForm.reason.trim(),
        date: fineForm.date || monthStr,
        month: fineForm.date ? fineForm.date.substring(0, 7) : monthStr,
        recordedBy: session?.name || session?.uid || 'Superadmin',
        createdAt: Timestamp.now(),
      });
      setFineForm({ staffId: '', amount: '', reason: '', date: '' });
      setShowFineForm(false);
      await handleLoad();
    } catch (err: any) {
      alert('Failed to save fine: ' + err.message);
    } finally {
      setSavingFine(false);
    }
  };

  const handleDeleteFine = async (fineId: string) => {
    if (!confirm('Delete this fine? This cannot be undone.')) return;
    try {
      setDeletingId(fineId);
      await deleteDoc(doc(db, 'rehab_fines', fineId));
      await handleLoad();
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => window.print();
  const handleDownload = async () => {
    if (!printRef.current) return;
    await downloadElementAsPng(printRef.current, `rehab-payroll-${monthStr}.png`, { scale: 2, backgroundColor: '#ffffff', style: { width: '1200px', maxWidth: 'none' } });
  };

  const filteredFines = data?.allFines?.filter((f: any) =>
    fineStaffFilter === 'all' || f.staffId === fineStaffFilter
  ) || [];

  const filteredFinesTotal = filteredFines.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-black">
      <style>{`
        @media print {
          aside, header, .no-print, .pointer-events-none { display: none !important; }
          html, body, div[class*="min-h-screen"], div[class*="lg:ml-"], main, div[class*="max-w-"] {
            margin: 0 !important; padding: 0 !important; min-height: 0 !important;
            height: auto !important; background: white !important; box-shadow: none !important;
            width: 100% !important; max-width: 100% !important;
          }
          .overflow-x-auto { overflow: visible !important; }
          #rehab-payroll-print { position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 24px !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="w-6 h-6 text-purple-600" /> Staff Payroll & Fines
            </h1>
            <p className="text-sm text-gray-500 mt-1">Monthly salary calculation, advance deductions, fines, and net payout (Unmarked attendance = Absent)</p>
          </div>
          {data && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleDownload} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                <Printer className="w-4 h-4" /> Print / PDF
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 no-print">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-500" /> Select Month</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Month</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Year</label>
              <input
                type="number" value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                min={2020} max={2100}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
              />
            </div>
            <button
              onClick={handleLoad} disabled={loading}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Load Payroll
            </button>
          </div>
        </div>

        {/* Report Area */}
        {data && (
          <div id="rehab-payroll-print" ref={printRef} className="space-y-6">

            {/* Print Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <h2 className="text-xl font-black text-gray-900">Khan Hub Rehab Center — Staff Payroll Report</h2>
              <p className="text-base font-bold text-purple-700 mt-1">{data.monthLabel}</p>
              <p className="text-xs text-gray-400 mt-1">Generated: {new Date().toLocaleString()}</p>
            </div>

            {/* Grand Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Total Gross Salary</div>
                <div className="text-xl font-black text-teal-800">{formatPKR(data.totalGross)}</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Total Advances</div>
                <div className="text-xl font-black text-amber-800">{formatPKR(data.totalAdvancesAmount)}</div>
              </div>
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Total Deductions</div>
                <div className="text-xl font-black text-red-700">{formatPKR(data.totalDeductions)}</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">Total Net To Pay</div>
                <div className="text-xl font-black text-purple-900">{formatPKR(data.totalNet)}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white rounded-2xl border border-gray-100 p-1 w-full no-print">
              <button onClick={() => setTab('salary')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'salary' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Salary Sheet ({data.salaryRows.length} staff)
              </button>
              <button onClick={() => setTab('fines')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'fines' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Fines Ledger ({data.allFines.length})
              </button>
            </div>

            {/* ── SALARY SHEET ── */}
            {tab === 'salary' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                
                <div className="flex justify-end no-print">
                  <div className="text-xs text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Click any staff member to view date-wise deduction breakdown
                  </div>
                </div>

                {/* Salary Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm border-collapse min-w-[950px]">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="px-3.5 py-3 text-left font-bold text-purple-800 border-b border-gray-200">#</th>
                        <th className="px-3.5 py-3 text-left font-bold text-purple-800 border-b border-gray-200">Staff Member</th>
                        <th className="px-3.5 py-3 text-left font-bold text-purple-800 border-b border-gray-200">Designation</th>
                        <th className="px-3.5 py-3 text-right font-bold text-purple-800 border-b border-gray-200">Gross Salary</th>
                        <th className="px-3.5 py-3 text-center font-bold text-purple-800 border-b border-gray-200">Absent / Unmarked</th>
                        <th className="px-3.5 py-3 text-right font-bold text-purple-800 border-b border-gray-200">Absent Ded.</th>
                        <th className="px-3.5 py-3 text-right font-bold text-purple-800 border-b border-gray-200">Fine Ded.</th>
                        <th className="px-3.5 py-3 text-right font-bold text-amber-800 border-b border-gray-200 bg-amber-50/70">Advance Ded.</th>
                        <th className="px-3.5 py-3 text-right font-bold text-purple-800 border-b border-gray-200">Total Ded.</th>
                        <th className="px-3.5 py-3 text-right font-bold text-purple-800 border-b border-gray-200 bg-purple-100/70">Net Salary To Pay</th>
                        <th className="px-2.5 py-3 text-center font-bold text-purple-800 border-b border-gray-200 no-print">Breakdown</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.salaryRows.map((r: any, i: number) => (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedStaffModal(r)}
                          className="hover:bg-purple-50/60 transition-colors border-b border-gray-100 cursor-pointer group"
                        >
                          <td className="px-3.5 py-3.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                          <td className="px-3.5 py-3.5 font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{r.name}</td>
                          <td className="px-3.5 py-3.5 text-gray-500 text-xs">{r.designation}</td>
                          <td className="px-3.5 py-3.5 text-right font-medium text-gray-700">{formatPKR(r.gross)}</td>
                          <td className="px-3.5 py-3.5 text-center">
                            <span className={`font-black text-xs px-2 py-0.5 rounded-md ${r.absentDays > 0 ? 'bg-orange-100 text-orange-700' : 'text-gray-300'}`}>
                              {r.absentDays} {r.absentDays === 1 ? 'day' : 'days'}
                            </span>
                          </td>
                          <td className="px-3.5 py-3.5 text-right text-orange-600 font-medium text-xs">
                            {r.totalAbsentDeduction > 0 ? formatPKR(r.totalAbsentDeduction) : '—'}
                          </td>
                          <td className="px-3.5 py-3.5 text-right text-red-600 font-medium text-xs">
                            {r.totalFines > 0 ? formatPKR(r.totalFines) : '—'}
                          </td>
                          <td className="px-3.5 py-3.5 text-right text-amber-700 font-bold text-xs bg-amber-50/40">
                            {r.totalAdvance > 0 ? formatPKR(r.totalAdvance) : '—'}
                          </td>
                          <td className="px-3.5 py-3.5 text-right text-red-700 font-bold text-xs">
                            {r.deductions > 0 ? formatPKR(r.deductions) : '—'}
                          </td>
                          <td className="px-3.5 py-3.5 text-right font-black text-purple-900 bg-purple-50 group-hover:bg-purple-100/80 transition-colors">
                            <span className="inline-block bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-200">
                              {formatPKR(r.netPayable)}
                            </span>
                          </td>
                          <td className="px-2.5 py-3.5 text-center no-print">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedStaffModal(r); }}
                              className="p-1.5 bg-gray-100 hover:bg-purple-600 hover:text-white rounded-lg text-gray-500 transition-colors"
                              title="Click to view date-wise deduction breakdown"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-purple-50 font-black text-xs">
                        <td colSpan={3} className="px-3.5 py-3.5 text-purple-800 uppercase tracking-wider">TOTAL</td>
                        <td className="px-3.5 py-3.5 text-right text-purple-800">{formatPKR(data.totalGross)}</td>
                        <td />
                        <td colSpan={2} />
                        <td className="px-3.5 py-3.5 text-right text-amber-800 bg-amber-100/60">{formatPKR(data.totalAdvancesAmount)}</td>
                        <td className="px-3.5 py-3.5 text-right text-red-700">{formatPKR(data.totalDeductions)}</td>
                        <td className="px-3.5 py-3.5 text-right text-purple-950 font-black text-sm bg-purple-100/90">{formatPKR(data.totalNet)}</td>
                        <td className="no-print" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── FINES LEDGER ── */}
            {tab === 'fines' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

                {/* Fine controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
                  <div className="flex items-center gap-3 flex-wrap">
                    <select
                      value={fineStaffFilter}
                      onChange={e => setFineStaffFilter(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
                    >
                      <option value="all">All Staff</option>
                      {data.allStaff.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm font-bold text-red-700">
                      Total: {formatPKR(filteredFinesTotal)} ({filteredFines.length} fines)
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFineForm(v => !v)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Fine
                  </button>
                </div>

                {/* Add Fine Form */}
                {showFineForm && (
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 space-y-4 no-print">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-purple-800 flex items-center gap-2"><Receipt className="w-4 h-4" /> Add New Fine</h3>
                      <button onClick={() => setShowFineForm(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Staff Member *</label>
                        <select
                          value={fineForm.staffId}
                          onChange={e => setFineForm(p => ({ ...p, staffId: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
                        >
                          <option value="">Select staff...</option>
                          {data.allStaff.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Amount (PKR) *</label>
                        <input
                          type="number" value={fineForm.amount}
                          onChange={e => setFineForm(p => ({ ...p, amount: e.target.value }))}
                          placeholder="e.g. 500"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Date</label>
                        <input
                          type="date" value={fineForm.date}
                          onChange={e => setFineForm(p => ({ ...p, date: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Reason *</label>
                        <input
                          type="text" value={fineForm.reason}
                          onChange={e => setFineForm(p => ({ ...p, reason: e.target.value }))}
                          placeholder="e.g. Late arrival, misconduct..."
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddFine} disabled={savingFine}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                      {savingFine ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Save Fine
                    </button>
                  </div>
                )}

                {/* Fines Table */}
                {filteredFines.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-medium">
                    No fines recorded for {data.monthLabel}{fineStaffFilter !== 'all' ? ' for this staff member' : ''}.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm border-collapse min-w-[600px]">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">#</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Staff Member</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Date</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Reason</th>
                          <th className="px-4 py-3 text-right font-bold text-red-800 border-b border-gray-200">Amount</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Recorded By</th>
                          <th className="px-4 py-3 border-b border-gray-200 no-print" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFines.map((f: any, i: number) => (
                          <tr key={f.id} className="hover:bg-gray-50 border-b border-gray-100">
                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{f.staffName}</td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{f.date || f.month || '—'}</td>
                            <td className="px-4 py-3 text-gray-700 max-w-[200px]">{f.reason || '—'}</td>
                            <td className="px-4 py-3 text-right font-black text-red-700">{formatPKR(Number(f.amount || 0))}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs font-mono">{f.recordedBy || '—'}</td>
                            <td className="px-4 py-3 no-print">
                              <button
                                onClick={() => handleDeleteFine(f.id)}
                                disabled={deletingId === f.id}
                                className="text-red-400 hover:text-red-700 transition-colors disabled:opacity-40"
                                title="Delete fine"
                              >
                                {deletingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-red-50 font-black">
                          <td colSpan={4} className="px-4 py-3 text-red-800">Total Fines</td>
                          <td className="px-4 py-3 text-right text-red-800">{formatPKR(filteredFinesTotal)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── STAFF DEDUCTION & PAYOUT BREAKDOWN MODAL ── */}
      {selectedStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden my-8 transform transition-all">
            
            {/* Modal Header */}
            <div className="bg-purple-900 text-white p-6 relative">
              <button
                onClick={() => setSelectedStaffModal(null)}
                className="absolute top-5 right-5 text-purple-200 hover:text-white bg-purple-950/50 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs text-purple-200">{data?.monthLabel}</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">{selectedStaffModal.name}</h2>
              <p className="text-xs text-purple-200 mt-0.5">{selectedStaffModal.designation}</p>
            </div>

            <div className="p-6 space-y-6">

              {/* Salary Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Base Salary</div>
                  <div className="text-xs font-black text-gray-900">{formatPKR(selectedStaffModal.gross)}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">Daily: {formatPKR(selectedStaffModal.dailyRate)}</div>
                </div>

                <div className="bg-orange-50 border border-orange-100 p-3 rounded-2xl text-center">
                  <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Absent Ded.</div>
                  <div className="text-xs font-black text-orange-700">{formatPKR(selectedStaffModal.totalAbsentDeduction)}</div>
                  <div className="text-[9px] text-orange-500 mt-0.5">{selectedStaffModal.absentDays} {selectedStaffModal.absentDays === 1 ? 'day' : 'days'}</div>
                </div>

                <div className="bg-red-50 border border-red-100 p-3 rounded-2xl text-center">
                  <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-0.5">Fine Ded.</div>
                  <div className="text-xs font-black text-red-700">{formatPKR(selectedStaffModal.totalFines)}</div>
                  <div className="text-[9px] text-red-500 mt-0.5">{selectedStaffModal.staffFines?.length || 0} fines</div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl text-center">
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Advance Ded.</div>
                  <div className="text-xs font-black text-amber-800">{formatPKR(selectedStaffModal.totalAdvance)}</div>
                  <div className="text-[9px] text-amber-600 mt-0.5">Salary Advance</div>
                </div>

                <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-0.5">Net To Pay</div>
                  <div className="text-xs font-black text-purple-900">{formatPKR(selectedStaffModal.netPayable)}</div>
                  <div className="text-[9px] text-purple-600 font-bold mt-0.5">Final Payout</div>
                </div>
              </div>

              {/* Date-wise Itemized Deduction Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Date-Wise Deduction & Advance History
                  </h3>
                  <span className="text-xs font-bold text-gray-400">
                    {selectedStaffModal.deductionItems.length} total items
                  </span>
                </div>

                {selectedStaffModal.deductionItems.length === 0 ? (
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center text-emerald-800 space-y-1">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                    <p className="font-bold text-sm">No Deductions or Advances Recorded!</p>
                    <p className="text-xs text-emerald-600">
                      This staff member has zero absences, zero fines, and zero advance salary taken for {data?.monthLabel}. Full base salary of {formatPKR(selectedStaffModal.gross)} will be paid.
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3.5 py-2.5 font-bold text-gray-600">Date</th>
                          <th className="px-3.5 py-2.5 font-bold text-gray-600">Deduction Type</th>
                          <th className="px-3.5 py-2.5 font-bold text-gray-600">Reason / Description</th>
                          <th className="px-3.5 py-2.5 font-bold text-gray-600 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedStaffModal.deductionItems.map((item: any) => (
                          <tr key={item.id} className="hover:bg-gray-50/80">
                            <td className="px-3.5 py-3 font-mono font-bold text-gray-800 whitespace-nowrap">
                              {item.date}
                            </td>
                            <td className="px-3.5 py-3">
                              {item.type === 'absent' ? (
                                <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  Absent Deduction
                                </span>
                              ) : item.type === 'fine' ? (
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  Fine Deduction
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  <CreditCard className="w-3 h-3" /> Advance Salary
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-gray-700">
                              <div>{item.reason}</div>
                              {item.recordedBy && (
                                <div className="text-[10px] text-gray-400 mt-0.5">By: {item.recordedBy}</div>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-right font-bold text-red-600 whitespace-nowrap">
                              -{formatPKR(item.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-red-50/60 font-black">
                          <td colSpan={3} className="px-3.5 py-2.5 text-red-800">TOTAL DEDUCTIONS (Absents + Fines + Advances)</td>
                          <td className="px-3.5 py-2.5 text-right text-red-700">-{formatPKR(selectedStaffModal.deductions)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Net Payout Summary Banner in Modal */}
              <div className="bg-purple-900 text-white rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-purple-200 font-medium">Final Money To Pay Staff</div>
                  <div className="text-xs text-purple-300">Base Salary - Total Deductions (Absents + Fines + Advances)</div>
                </div>
                <div className="text-2xl font-black text-purple-300">
                  {formatPKR(selectedStaffModal.netPayable)}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setSelectedStaffModal(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Print Statement
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
