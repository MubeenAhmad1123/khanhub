'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import {
  UserCog, Printer, Calendar, DollarSign, Loader2, Download,
  AlertTriangle, ChevronDown, ChevronUp, Trash2, Plus, X, Receipt
} from 'lucide-react';
import { downloadElementAsPng } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPKR(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

export default function SpimsPayrollPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [tab, setTab] = useState<'salary' | 'fines'>('salary');
  const [fineStaffFilter, setFineStaffFilter] = useState<string>('all');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Fine form
  const [showFineForm, setShowFineForm] = useState(false);
  const [fineForm, setFineForm] = useState({ staffId: '', amount: '', reason: '', date: '' });
  const [savingFine, setSavingFine] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = localStorage.getItem('spims_session');
    if (!s) { router.push('/departments/spims/login'); return; }
    const parsed = JSON.parse(s);
    if (parsed.role !== 'superadmin') { router.push('/departments/spims/login'); return; }
    setSession(parsed);
  }, [router]);

  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const handleLoad = async () => {
    try {
      setLoading(true);

      // Staff
      const staffSnap = await getDocs(query(collection(db, 'spims_staff'), where('isActive', '==', true)));
      const allStaff = staffSnap.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        .filter((s: any) => !['executive', 'hide'].includes(String(s.status || '').toLowerCase()))
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

      // Fines by date range (catches full-date fines like 2026-07-05 AND month-string fines)
      const finesSnap = await getDocs(query(
        collection(db, 'spims_fines'),
        where('date', '>=', `${monthStr}-01`),
        where('date', '<=', `${monthStr}-31`)
      ));
      const finesByMonthSnap = await getDocs(query(
        collection(db, 'spims_fines'),
        where('month', '==', monthStr)
      ));
      const allFinesDocs = new Map<string, any>();
      [...finesSnap.docs, ...finesByMonthSnap.docs].forEach(d => {
        allFinesDocs.set(d.id, { id: d.id, ...d.data() as any });
      });
      const allFines = Array.from(allFinesDocs.values());

      // Attendance absences for this month
      const attendanceSnap = await getDocs(query(
        collection(db, 'spims_attendance'),
        where('date', '>=', `${monthStr}-01`),
        where('date', '<=', `${monthStr}-31`)
      ));
      const allAbsences = attendanceSnap.docs
        .map(d => d.data() as any)
        .filter((a: any) => a.status === 'absent');

      // Build salary rows
      const salaryRows = allStaff.map((staff: any) => {
        const gross = Number(staff.salary || 0);
        const dailyRate = gross / 30;
        const absences = allAbsences.filter((a: any) => a.staffId === staff.id);
        const absentDays = absences.length;
        const absentDates = absences.map((a: any) => a.date).sort();
        const staffFines = allFines.filter((f: any) => f.staffId === staff.id);
        const totalFines = staffFines.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
        const deductions = Math.round(absentDays * dailyRate) + totalFines;
        const netPayable = Math.max(0, gross - deductions);
        return {
          id: staff.id,
          name: staff.name || '—',
          designation: staff.designation || staff.role || '—',
          gross,
          dailyRate: Math.round(dailyRate),
          absentDays,
          absentDates,
          finesCount: staffFines.length,
          totalFines,
          deductions,
          netPayable,
        };
      });

      const totalGross = salaryRows.reduce((s, r) => s + r.gross, 0);
      const totalNet = salaryRows.reduce((s, r) => s + r.netPayable, 0);
      const totalDeductions = salaryRows.reduce((s, r) => s + r.deductions, 0);

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
      await addDoc(collection(db, 'spims_fines'), {
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
      await deleteDoc(doc(db, 'spims_fines', fineId));
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
    await downloadElementAsPng(printRef.current, `spims-payroll-${monthStr}.png`, { scale: 2, backgroundColor: '#ffffff', style: { width: '1200px', maxWidth: 'none' } });
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
          #spims-payroll-print { position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 24px !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="w-6 h-6 text-purple-600" /> Staff Payroll & Fines
            </h1>
            <p className="text-sm text-gray-500 mt-1">Monthly salary calculation and fine management for all staff</p>
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
          <div id="spims-payroll-print" ref={printRef} className="space-y-6">

            {/* Print Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <h2 className="text-xl font-black text-gray-900">SPIMS — Staff Payroll Report</h2>
              <p className="text-base font-bold text-purple-700 mt-1">{data.monthLabel}</p>
              <p className="text-xs text-gray-400 mt-1">Generated: {new Date().toLocaleString()}</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-white rounded-2xl border border-gray-100 p-1 w-full no-print">
              <button onClick={() => setTab('salary')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'salary' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Salary Sheet
              </button>
              <button onClick={() => setTab('fines')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'fines' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Fines Ledger ({data.allFines.length})
              </button>
            </div>

            {/* ── SALARY SHEET ── */}
            {tab === 'salary' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl text-center">
                    <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Total Gross</div>
                    <div className="text-2xl font-black text-teal-800">{formatPKR(data.totalGross)}</div>
                  </div>
                  <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-center">
                    <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Total Deductions</div>
                    <div className="text-2xl font-black text-red-700">{formatPKR(data.totalDeductions)}</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-5 rounded-2xl text-center">
                    <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Total Net Payable</div>
                    <div className="text-2xl font-black text-green-800">{formatPKR(data.totalNet)}</div>
                  </div>
                </div>

                {/* Salary Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm border-collapse min-w-[700px]">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-purple-800 border-b border-gray-200">#</th>
                        <th className="px-4 py-3 text-left font-bold text-purple-800 border-b border-gray-200">Staff Member</th>
                        <th className="px-4 py-3 text-left font-bold text-purple-800 border-b border-gray-200">Designation</th>
                        <th className="px-4 py-3 text-right font-bold text-purple-800 border-b border-gray-200">Gross</th>
                        <th className="px-4 py-3 text-center font-bold text-purple-800 border-b border-gray-200">Absent Days</th>
                        <th className="px-4 py-3 text-right font-bold text-purple-800 border-b border-gray-200">Absent Deduction</th>
                        <th className="px-4 py-3 text-right font-bold text-purple-800 border-b border-gray-200">Fines</th>
                        <th className="px-4 py-3 text-right font-bold text-purple-800 border-b border-gray-200">Net Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.salaryRows.map((r: any, i: number) => (
                        <tr key={r.id} className="hover:bg-gray-50 border-b border-gray-100">
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{r.name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{r.designation}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatPKR(r.gross)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-black text-sm ${r.absentDays > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{r.absentDays}</span>
                            {r.absentDays > 0 && (
                              <div className="text-[10px] text-gray-400 mt-0.5">{r.absentDates.join(', ')}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600 font-medium">
                            {r.absentDays > 0 ? formatPKR(Math.round(r.absentDays * r.dailyRate)) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 font-medium">
                            {r.totalFines > 0 ? formatPKR(r.totalFines) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-green-800 bg-green-50">{formatPKR(r.netPayable)}</td>
                        </tr>
                      ))}
                      <tr className="bg-purple-50 font-black">
                        <td colSpan={3} className="px-4 py-3 text-purple-800">TOTAL</td>
                        <td className="px-4 py-3 text-right text-purple-800">{formatPKR(data.totalGross)}</td>
                        <td />
                        <td colSpan={2} className="px-4 py-3 text-right text-red-700">{formatPKR(data.totalDeductions)}</td>
                        <td className="px-4 py-3 text-right text-green-800">{formatPKR(data.totalNet)}</td>
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
    </div>
  );
}
