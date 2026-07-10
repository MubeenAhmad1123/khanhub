'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';
import {
  UserCog, Printer, Calendar, DollarSign, Loader2, Download,
  Plus, X, Receipt, Trash2, Building2
} from 'lucide-react';
import { downloadElementAsPng } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ALL_DEPTS: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];

const DEPT_LABELS: Record<string, string> = {
  hq: 'HQ', rehab: 'Rehab', spims: 'SPIMS', hospital: 'Hospital',
  sukoon: 'Sukoon', welfare: 'Welfare', 'job-center': 'Job Center',
  'social-media': 'Social Media', it: 'IT',
};

const DEPT_COLORS: Record<string, string> = {
  hq: 'bg-indigo-100 text-indigo-700',
  rehab: 'bg-rose-100 text-rose-700',
  spims: 'bg-teal-100 text-teal-700',
  hospital: 'bg-blue-100 text-blue-700',
  sukoon: 'bg-purple-100 text-purple-700',
  welfare: 'bg-amber-100 text-amber-700',
  'job-center': 'bg-orange-100 text-orange-700',
  'social-media': 'bg-pink-100 text-pink-700',
  it: 'bg-slate-100 text-slate-700',
};

function formatPKR(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

export default function ManagerPayrollPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [tab, setTab] = useState<'salary' | 'fines'>('salary');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [fineStaffFilter, setFineStaffFilter] = useState<string>('all');
  const [fineDeptFilter, setFineDeptFilter] = useState<string>('all');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Fine form
  const [showFineForm, setShowFineForm] = useState(false);
  const [fineForm, setFineForm] = useState({ dept: '', staffId: '', amount: '', reason: '', date: '' });
  const [savingFine, setSavingFine] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || !['manager', 'superadmin'].includes(session.role)) router.push('/hq/login');
  }, [session, sessionLoading, router]);

  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const handleLoad = async () => {
    try {
      setLoading(true);

      const results = await Promise.all(ALL_DEPTS.map(async (dept) => {
        const prefix = getDeptPrefix(dept);
        try {
          // Staff
          const staffCol = dept === 'hq' ? 'hq_users'
            : dept === 'job-center' ? 'jobcenter_users'
            : dept === 'social-media' ? 'media_users'
            : `${prefix}_users`;

          const staffSnap = await getDocs(collection(db, staffCol));
          const allStaff = staffSnap.docs
            .map(d => ({ id: d.id, ...d.data() as any, dept }))
            .filter((s: any) => {
              const name = String(s.name || s.displayName || '').toLowerCase();
              const email = String(s.email || '').toLowerCase();
              if (name.includes('super') || name.includes('network') || email.includes('super') || email.includes('network')) return false;
              const statusStr = String(s.status || '').toLowerCase();
              return s.isActive !== false && !['inactive', 'resigned', 'terminated', 'executive', 'hide'].includes(statusStr);
            })
            .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

          if (allStaff.length === 0) return { dept, salaryRows: [], allFines: [], allStaff: [] };

          // Fines — try both 'month' and 'date' field
          const finesCol = `${prefix}_fines`;
          const [finesM, finesD] = await Promise.all([
            getDocs(query(collection(db, finesCol), where('month', '==', monthStr))).catch(() => ({ docs: [] } as any)),
            getDocs(query(collection(db, finesCol), where('date', '==', monthStr))).catch(() => ({ docs: [] } as any)),
          ]);
          const finesMap = new Map<string, any>();
          [...finesM.docs, ...finesD.docs].forEach((d: any) => {
            finesMap.set(d.id, { id: d.id, dept, ...d.data() });
          });
          const allFines = Array.from(finesMap.values());

          // Attendance absences
          const attCol = `${prefix}_attendance`;
          const attSnap = await getDocs(query(
            collection(db, attCol),
            where('date', '>=', `${monthStr}-01`),
            where('date', '<=', `${monthStr}-31`)
          )).catch(() => ({ docs: [] } as any));

          const allAbsences = attSnap.docs
            .map((d: any) => d.data())
            .filter((a: any) => a.status === 'absent');

          // Salary rows
          const staffMap = Object.fromEntries(allStaff.map((s: any) => [s.id, s.name || s.id]));
          const salaryRows = allStaff.map((staff: any) => {
            const gross = Number(staff.monthlySalary || staff.salary || 0);
            const dailyRate = gross / 26;
            const absences = allAbsences.filter((a: any) => a.staffId === staff.id);
            const absentDays = absences.length;
            const absentDates = absences.map((a: any) => a.date).sort();
            const staffFines = allFines.filter((f: any) => f.staffId === staff.id);
            const totalFines = staffFines.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
            const deductions = Math.round(absentDays * dailyRate) + totalFines;
            const netPayable = Math.max(0, gross - deductions);
            return {
              id: staff.id,
              name: staff.name || staff.displayName || '—',
              designation: staff.designation || staff.role || '—',
              dept,
              gross,
              dailyRate: Math.round(dailyRate),
              absentDays,
              absentDates,
              totalFines,
              deductions,
              netPayable,
            };
          });

          const enrichedFines = allFines
            .map((f: any) => ({ ...f, staffName: staffMap[f.staffId] || f.staffId }))
            .sort((a: any, b: any) => {
              const da = a.createdAt?.toDate?.() || new Date(0);
              const db_ = b.createdAt?.toDate?.() || new Date(0);
              return db_.getTime() - da.getTime();
            });

          return { dept, salaryRows, allFines: enrichedFines, allStaff };
        } catch (e) {
          return { dept, salaryRows: [], allFines: [], allStaff: [] };
        }
      }));

      const allSalaryRows = results.flatMap(r => r.salaryRows);
      const allFines = results.flatMap(r => r.allFines);
      const allStaff = results.flatMap(r => r.allStaff);

      setData({
        byDept: Object.fromEntries(results.map(r => [r.dept, r])),
        allSalaryRows,
        allFines,
        allStaff,
        totalGross: allSalaryRows.reduce((s, r) => s + r.gross, 0),
        totalNet: allSalaryRows.reduce((s, r) => s + r.netPayable, 0),
        totalDeductions: allSalaryRows.reduce((s, r) => s + r.deductions, 0),
        totalFinesAmount: allFines.reduce((s: number, f: any) => s + Number(f.amount || 0), 0),
        monthLabel: `${MONTHS[selectedMonth]} ${selectedYear}`,
      });
    } catch (err: any) {
      console.error('Payroll load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFine = async () => {
    if (!fineForm.dept || !fineForm.staffId || !fineForm.amount || !fineForm.reason) {
      alert('Department, staff, amount and reason are all required.');
      return;
    }
    try {
      setSavingFine(true);
      const prefix = getDeptPrefix(fineForm.dept as StaffDept);
      await addDoc(collection(db, `${prefix}_fines`), {
        staffId: fineForm.staffId,
        amount: Number(fineForm.amount),
        reason: fineForm.reason.trim(),
        date: fineForm.date || monthStr,
        month: fineForm.date ? fineForm.date.substring(0, 7) : monthStr,
        recordedBy: session?.name || session?.customId || 'Manager',
        createdAt: Timestamp.now(),
      });
      setFineForm({ dept: '', staffId: '', amount: '', reason: '', date: '' });
      setShowFineForm(false);
      await handleLoad();
    } catch (err: any) {
      alert('Failed to save fine: ' + err.message);
    } finally {
      setSavingFine(false);
    }
  };

  const handleDeleteFine = async (fine: any) => {
    if (!confirm('Delete this fine? This cannot be undone.')) return;
    try {
      setDeletingId(fine.id);
      const prefix = getDeptPrefix(fine.dept as StaffDept);
      await deleteDoc(doc(db, `${prefix}_fines`, fine.id));
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
    await downloadElementAsPng(printRef.current, `hq-payroll-all-depts-${monthStr}.png`, {
      scale: 2, backgroundColor: '#ffffff', style: { width: '1400px', maxWidth: 'none' }
    });
  };

  // Filtered salary rows
  const salaryRows = data?.allSalaryRows?.filter((r: any) =>
    deptFilter === 'all' || r.dept === deptFilter
  ) || [];

  const filteredTotalGross = salaryRows.reduce((s: number, r: any) => s + r.gross, 0);
  const filteredTotalNet = salaryRows.reduce((s: number, r: any) => s + r.netPayable, 0);
  const filteredTotalDeductions = salaryRows.reduce((s: number, r: any) => s + r.deductions, 0);

  // Filtered fines
  const filteredFines = data?.allFines?.filter((f: any) => {
    if (fineDeptFilter !== 'all' && f.dept !== fineDeptFilter) return false;
    if (fineStaffFilter !== 'all' && f.staffId !== fineStaffFilter) return false;
    return true;
  }) || [];
  const filteredFinesTotal = filteredFines.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);

  // Staff for fine dept filter
  const staffForFineDept = fineForm.dept
    ? (data?.allStaff?.filter((s: any) => s.dept === fineForm.dept) || [])
    : [];

  const availableFineDepts = data ? ALL_DEPTS.filter(d => (data.byDept[d]?.allStaff?.length || 0) > 0) : [];

  if (sessionLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

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
          #hq-payroll-print { position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 24px !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="w-6 h-6 text-emerald-600" /> All-Department Payroll & Fines
            </h1>
            <p className="text-sm text-gray-500 mt-1">Monthly salary calculation and fine management across all departments</p>
          </div>
          {data && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleDownload} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
                <Download className="w-4 h-4" /> Download Image
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                <Printer className="w-4 h-4" /> Print / PDF
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 no-print">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-500" /> Select Month</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Month</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
              />
            </div>
            <button
              onClick={handleLoad} disabled={loading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Load All Departments
            </button>
          </div>
        </div>

        {/* Report Area */}
        {data && (
          <div id="hq-payroll-print" ref={printRef} className="space-y-6">

            {/* Print Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <h2 className="text-xl font-black text-gray-900">Khan Hub — All Departments Payroll Report</h2>
              <p className="text-base font-bold text-emerald-700 mt-1">{data.monthLabel}</p>
              <p className="text-xs text-gray-400 mt-1">Generated: {new Date().toLocaleString()}</p>
            </div>

            {/* Grand Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Staff</div>
                <div className="text-3xl font-black text-gray-900">{data.allSalaryRows.length}</div>
              </div>
              <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl text-center">
                <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Total Gross</div>
                <div className="text-xl font-black text-teal-800">{formatPKR(data.totalGross)}</div>
              </div>
              <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-center">
                <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Total Deductions</div>
                <div className="text-xl font-black text-red-700">{formatPKR(data.totalDeductions)}</div>
              </div>
              <div className="bg-green-50 border border-green-100 p-5 rounded-2xl text-center">
                <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Total Net Payable</div>
                <div className="text-xl font-black text-green-800">{formatPKR(data.totalNet)}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white rounded-2xl border border-gray-100 p-1 w-full no-print">
              <button onClick={() => setTab('salary')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'salary' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Salary Sheet ({data.allSalaryRows.length} staff)
              </button>
              <button onClick={() => setTab('fines')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'fines' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Fines Ledger ({data.allFines.length} fines)
              </button>
            </div>

            {/* ── SALARY SHEET ── */}
            {tab === 'salary' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">

                {/* Dept filter */}
                <div className="flex flex-wrap items-center gap-2 no-print">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase">Filter by Dept:</span>
                  {['all', ...availableFineDepts].map(d => (
                    <button
                      key={d}
                      onClick={() => setDeptFilter(d)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${deptFilter === d ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {d === 'all' ? 'All Departments' : DEPT_LABELS[d] || d}
                    </button>
                  ))}
                </div>

                {/* Filtered summary */}
                {deptFilter !== 'all' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl text-center">
                      <div className="text-xs font-bold text-teal-600 mb-1">Gross</div>
                      <div className="text-lg font-black text-teal-800">{formatPKR(filteredTotalGross)}</div>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
                      <div className="text-xs font-bold text-red-500 mb-1">Deductions</div>
                      <div className="text-lg font-black text-red-700">{formatPKR(filteredTotalDeductions)}</div>
                    </div>
                    <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
                      <div className="text-xs font-bold text-green-600 mb-1">Net Payable</div>
                      <div className="text-lg font-black text-green-800">{formatPKR(filteredTotalNet)}</div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm border-collapse min-w-[750px]">
                    <thead className="bg-emerald-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-emerald-800 border-b border-gray-200">#</th>
                        <th className="px-4 py-3 text-left font-bold text-emerald-800 border-b border-gray-200">Staff Member</th>
                        <th className="px-4 py-3 text-left font-bold text-emerald-800 border-b border-gray-200">Dept</th>
                        <th className="px-4 py-3 text-left font-bold text-emerald-800 border-b border-gray-200">Designation</th>
                        <th className="px-4 py-3 text-right font-bold text-emerald-800 border-b border-gray-200">Gross</th>
                        <th className="px-4 py-3 text-center font-bold text-emerald-800 border-b border-gray-200">Absent</th>
                        <th className="px-4 py-3 text-right font-bold text-emerald-800 border-b border-gray-200">Absent Ded.</th>
                        <th className="px-4 py-3 text-right font-bold text-emerald-800 border-b border-gray-200">Fines</th>
                        <th className="px-4 py-3 text-right font-bold text-emerald-800 border-b border-gray-200">Net Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryRows.length === 0 ? (
                        <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No staff found for selected department.</td></tr>
                      ) : salaryRows.map((r: any, i: number) => (
                        <tr key={`${r.dept}-${r.id}`} className="hover:bg-gray-50 border-b border-gray-100">
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{r.name}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DEPT_COLORS[r.dept] || 'bg-gray-100 text-gray-600'}`}>
                              {DEPT_LABELS[r.dept] || r.dept}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{r.designation}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatPKR(r.gross)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-black text-sm ${r.absentDays > 0 ? 'text-orange-600' : 'text-gray-300'}`}>{r.absentDays}</span>
                            {r.absentDays > 0 && (
                              <div className="text-[10px] text-gray-400 mt-0.5 max-w-[120px] truncate">{r.absentDates.join(', ')}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600 font-medium text-sm">
                            {r.absentDays > 0 ? formatPKR(Math.round(r.absentDays * r.dailyRate)) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 font-medium text-sm">
                            {r.totalFines > 0 ? formatPKR(r.totalFines) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-green-800 bg-green-50">{formatPKR(r.netPayable)}</td>
                        </tr>
                      ))}
                      {salaryRows.length > 0 && (
                        <tr className="bg-emerald-50 font-black">
                          <td colSpan={4} className="px-4 py-3 text-emerald-800">TOTAL ({salaryRows.length} staff)</td>
                          <td className="px-4 py-3 text-right text-emerald-800">{formatPKR(filteredTotalGross)}</td>
                          <td />
                          <td colSpan={2} className="px-4 py-3 text-right text-red-700">{formatPKR(filteredTotalDeductions)}</td>
                          <td className="px-4 py-3 text-right text-green-800">{formatPKR(filteredTotalNet)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── FINES LEDGER ── */}
            {tab === 'fines' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Dept filter */}
                    <select
                      value={fineDeptFilter}
                      onChange={e => { setFineDeptFilter(e.target.value); setFineStaffFilter('all'); }}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                    >
                      <option value="all">All Departments</option>
                      {availableFineDepts.map(d => <option key={d} value={d}>{DEPT_LABELS[d] || d}</option>)}
                    </select>
                    {/* Staff filter */}
                    <select
                      value={fineStaffFilter}
                      onChange={e => setFineStaffFilter(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                    >
                      <option value="all">All Staff</option>
                      {(fineDeptFilter === 'all' ? data.allStaff : data.byDept[fineDeptFilter]?.allStaff || []).map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name || s.displayName}</option>
                      ))}
                    </select>
                    <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm font-bold text-red-700">
                      Total: {formatPKR(filteredFinesTotal)} ({filteredFines.length} fines)
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFineForm(v => !v)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Fine
                  </button>
                </div>

                {/* Add Fine Form */}
                {showFineForm && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4 no-print">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-emerald-800 flex items-center gap-2"><Receipt className="w-4 h-4" /> Add New Fine</h3>
                      <button onClick={() => setShowFineForm(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Department *</label>
                        <select
                          value={fineForm.dept}
                          onChange={e => setFineForm(p => ({ ...p, dept: e.target.value, staffId: '' }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        >
                          <option value="">Select dept...</option>
                          {availableFineDepts.map(d => <option key={d} value={d}>{DEPT_LABELS[d] || d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Staff Member *</label>
                        <select
                          value={fineForm.staffId}
                          onChange={e => setFineForm(p => ({ ...p, staffId: e.target.value }))}
                          disabled={!fineForm.dept}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold disabled:opacity-50"
                        >
                          <option value="">Select staff...</option>
                          {staffForFineDept.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name || s.displayName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Amount (PKR) *</label>
                        <input
                          type="number" value={fineForm.amount}
                          onChange={e => setFineForm(p => ({ ...p, amount: e.target.value }))}
                          placeholder="e.g. 500"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Date</label>
                        <input
                          type="date" value={fineForm.date}
                          onChange={e => setFineForm(p => ({ ...p, date: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Reason *</label>
                        <input
                          type="text" value={fineForm.reason}
                          onChange={e => setFineForm(p => ({ ...p, reason: e.target.value }))}
                          placeholder="e.g. Late arrival, misconduct, uniform violation..."
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddFine} disabled={savingFine}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                      {savingFine ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Save Fine
                    </button>
                  </div>
                )}

                {/* Fines Table */}
                {filteredFines.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-medium">
                    No fines recorded for {data.monthLabel}.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm border-collapse min-w-[700px]">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">#</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Staff Member</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Dept</th>
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
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DEPT_COLORS[f.dept] || 'bg-gray-100 text-gray-600'}`}>
                                {DEPT_LABELS[f.dept] || f.dept}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{f.date || f.month || '—'}</td>
                            <td className="px-4 py-3 text-gray-700 max-w-[180px]">{f.reason || '—'}</td>
                            <td className="px-4 py-3 text-right font-black text-red-700">{formatPKR(Number(f.amount || 0))}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs font-mono">{f.recordedBy || '—'}</td>
                            <td className="px-4 py-3 no-print">
                              <button
                                onClick={() => handleDeleteFine(f)}
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
                          <td colSpan={5} className="px-4 py-3 text-red-800">Total Fines ({filteredFines.length})</td>
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
