'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import {
  FileBarChart, Printer, Calendar,
  TrendingUp, TrendingDown, DollarSign, Loader2, BarChart3,
  Users, UserCog, AlertTriangle
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPKR(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

function formatCat(cat: string) {
  return cat?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || cat;
}

export default function SuperAdminReportsPage() {
  const router = useRouter();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) { router.push('/departments/rehab/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'superadmin') { router.push('/departments/rehab/login'); return; }
  }, [router]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGenerated(false);

      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
      const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

      // === FINANCIAL TRANSACTIONS ===
      const txnQ = query(
        collection(db, 'rehab_transactions'),
        where('date', '>=', Timestamp.fromDate(firstDay)),
        where('date', '<=', Timestamp.fromDate(lastDay)),
        where('status', '==', 'approved'),
        orderBy('date', 'asc')
      );
      const txnSnap = await getDocs(txnQ);
      const txns = txnSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Pending count
      const pendingQ = query(
        collection(db, 'rehab_transactions'),
        where('date', '>=', Timestamp.fromDate(firstDay)),
        where('date', '<=', Timestamp.fromDate(lastDay)),
        where('status', '==', 'pending')
      );
      const pendingSnap = await getDocs(pendingQ);
      const pendingCount = pendingSnap.size;

      const income = txns.filter((t: any) => t.type === 'income');
      const expense = txns.filter((t: any) => t.type === 'expense');
      const totalIncome = income.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const totalExpenses = expense.reduce((s: number, t: any) => s + (t.amount || 0), 0);

      const byCategory = (list: any[]) => {
        const map: Record<string, number> = {};
        list.forEach((t: any) => { map[t.category] = (map[t.category] || 0) + (t.amount || 0); });
        return map;
      };

      // === STAFF SALARY ===
      const staffSnap = await getDocs(query(collection(db, 'rehab_staff'), where('isActive', '==', true)));
      const allStaff = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const finesSnap = await getDocs(query(collection(db, 'rehab_fines'), where('month', '==', monthStr)));
      const allFines = finesSnap.docs.map(d => d.data());

      const attendanceSnap = await getDocs(query(collection(db, 'rehab_attendance'),
        where('date', '>=', `${monthStr}-01`),
        where('date', '<=', `${monthStr}-31`),
        where('status', '==', 'absent')
      ));
      const allAbsences = attendanceSnap.docs.map(d => d.data());

      const staffSalaries = allStaff.map((staff: any) => {
        const gross = staff.salary || 0;
        const dailyRate = gross / 26;
        const absentDays = allAbsences.filter((a: any) => a.staffId === staff.id).length;
        const fines = allFines.filter((f: any) => f.staffId === staff.id).reduce((s: number, f: any) => s + (f.amount || 0), 0);
        const deductions = (absentDays * dailyRate) + fines;
        return {
          name: staff.name,
          gross,
          absentDays,
          fines,
          deductions: Math.round(deductions),
          netPayable: Math.round(Math.max(0, gross - deductions)),
        };
      });

      const totalPayroll = staffSalaries.reduce((s: number, st: any) => s + st.netPayable, 0);

      // === PATIENTS ===
      const activePatientsSnap = await getDocs(query(collection(db, 'rehab_patients'), where('isActive', '==', true)));
      const totalActivePatients = activePatientsSnap.size;

      const newAdmissionsSnap = await getDocs(query(
        collection(db, 'rehab_patients'),
        where('admissionDate', '>=', Timestamp.fromDate(firstDay)),
        where('admissionDate', '<=', Timestamp.fromDate(lastDay))
      ));
      const newAdmissions = newAdmissionsSnap.size;

      setReportData({
        txns, income, expense,
        totalIncome, totalExpenses,
        netBalance: totalIncome - totalExpenses,
        incomeByCategory: byCategory(income),
        expenseByCategory: byCategory(expense),
        pendingCount,
        staffSalaries,
        totalPayroll,
        totalActivePatients,
        newAdmissions,
        monthLabel: `${MONTHS[selectedMonth]} ${selectedYear}`,
        generatedAt: new Date().toLocaleString(),
      });
      setGenerated(true);
    } catch (error) {
      console.error('Report error:', error);
      alert('Failed to generate report. Ensure Firestore indexes are set up for date + status queries.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #rehab-report-print, #rehab-report-print * { visibility: visible; }
          #rehab-report-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        }
      `}</style>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileBarChart className="w-6 h-6 text-purple-600" /> Super Admin Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive monthly report including staff payroll</p>
          </div>
          {generated && (
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-500" /> Select Period</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Month</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Year</label>
              <input type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} min={2020} max={2100} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <button onClick={handleGenerate} disabled={generating} className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Report Preview */}
        {generated && reportData && (
          <div id="rehab-report-print" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 space-y-10">

            {/* Report Header */}
            <div className="text-center border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-black text-gray-900">KhanHub Rehab Center — Super Admin Report</h2>
              <p className="text-lg font-bold text-purple-700 mt-1">Monthly Financial Summary — {reportData.monthLabel}</p>
              <p className="text-sm text-gray-400 mt-1">Generated: {reportData.generatedAt}</p>
            </div>

            {/* Pending Warning Banner */}
            {reportData.pendingCount > 0 && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> {reportData.pendingCount} transaction{reportData.pendingCount > 1 ? 's are' : ' is'} still pending approval and are <strong>NOT included</strong> in this report.
                </p>
              </div>
            )}

            {/* Patients Summary */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-teal-500" /> Patient Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl text-center">
                  <div className="text-3xl font-black text-teal-800">{reportData.totalActivePatients}</div>
                  <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mt-1">Active Patients</div>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-center">
                  <div className="text-3xl font-black text-blue-800">{reportData.newAdmissions}</div>
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1">New Admissions</div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><DollarSign className="w-5 h-5 text-teal-500" /> Financial Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl text-center">
                  <TrendingUp className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Total Income</div>
                  <div className="text-2xl font-black text-teal-800">{formatPKR(reportData.totalIncome)}</div>
                </div>
                <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-center">
                  <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Total Expenses</div>
                  <div className="text-2xl font-black text-red-700">{formatPKR(reportData.totalExpenses)}</div>
                </div>
                <div className={`border p-5 rounded-2xl text-center ${reportData.netBalance >= 0 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                  <DollarSign className={`w-6 h-6 mx-auto mb-2 ${reportData.netBalance >= 0 ? 'text-green-600' : 'text-orange-500'}`} />
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${reportData.netBalance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>Net Balance</div>
                  <div className={`text-2xl font-black ${reportData.netBalance >= 0 ? 'text-green-800' : 'text-orange-700'}`}>{formatPKR(reportData.netBalance)}</div>
                </div>
              </div>
            </div>

            {reportData.txns.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-500">No approved transactions found for {reportData.monthLabel}.</div>
            ) : (
              <>
                {/* Income Breakdown */}
                {Object.keys(reportData.incomeByCategory).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-teal-500" /> Income Breakdown</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm border-collapse min-w-[300px]">
                        <thead className="bg-teal-50">
                          <tr>
                            <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-teal-800">Category</th>
                            <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-teal-800">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.incomeByCategory).map(([cat, amt]: any) => (
                            <tr key={cat} className="hover:bg-gray-50 transition-colors">
                              <td className="border-b border-gray-200 px-4 py-3 text-gray-700">{formatCat(cat)}</td>
                              <td className="border-b border-gray-200 px-4 py-3 text-right font-medium">{formatPKR(amt)}</td>
                            </tr>
                          ))}
                          <tr className="bg-teal-50/50 font-black">
                            <td className="px-4 py-3 text-teal-800">Total Income</td>
                            <td className="px-4 py-3 text-right text-teal-800">{formatPKR(reportData.totalIncome)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Expense Breakdown */}
                {Object.keys(reportData.expenseByCategory).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500" /> Expense Breakdown</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm border-collapse min-w-[300px]">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-red-700">Category</th>
                            <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-red-700">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.expenseByCategory).map(([cat, amt]: any) => (
                            <tr key={cat} className="hover:bg-gray-50 transition-colors">
                              <td className="border-b border-gray-200 px-4 py-3 text-gray-700">{formatCat(cat)}</td>
                              <td className="border-b border-gray-200 px-4 py-3 text-right font-medium">{formatPKR(amt)}</td>
                            </tr>
                          ))}
                          <tr className="bg-red-50/50 font-black">
                            <td className="px-4 py-3 text-red-700">Total Expenses</td>
                            <td className="px-4 py-3 text-right text-red-700">{formatPKR(reportData.totalExpenses)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Transaction Detail */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Transaction Details</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-200 px-3 py-3 text-left font-bold text-gray-600">Date</th>
                          <th className="border border-gray-200 px-3 py-3 text-left font-bold text-gray-600">Type</th>
                          <th className="border border-gray-200 px-3 py-3 text-left font-bold text-gray-600">Category</th>
                          <th className="border border-gray-200 px-3 py-3 text-left font-bold text-gray-600">Description</th>
                          <th className="border border-gray-200 px-3 py-3 text-right font-bold text-gray-600">Amount</th>
                          <th className="border border-gray-200 px-3 py-3 text-left font-bold text-gray-600">Cashier ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.txns.map((t: any) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-3 py-2 text-gray-600">{t.date?.toDate?.()?.toLocaleDateString()}</td>
                            <td className="border border-gray-200 px-3 py-2">
                              <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ${t.type === 'income' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>{t.type}</span>
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-700">{formatCat(t.category)}</td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-600 max-w-[160px] truncate">{t.description || '—'}</td>
                            <td className="border border-gray-200 px-3 py-2 text-right font-medium text-gray-900">{formatPKR(t.amount)}</td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-500 font-mono text-[10px]">{t.cashierId || t.submittedBy || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Staff Salary Summary */}
            {reportData.staffSalaries.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><UserCog className="w-5 h-5 text-purple-500" /> Staff Payroll Summary</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm border-collapse min-w-[600px]">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-purple-800">Staff Member</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-purple-800">Gross</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-bold text-purple-800">Absent</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-purple-800">Fines</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-purple-800">Net Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.staffSalaries.map((s: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="border-b border-gray-200 px-4 py-3 font-medium text-gray-900">{s.name}</td>
                          <td className="border-b border-gray-200 px-4 py-3 text-right text-gray-700">{formatPKR(s.gross)}</td>
                          <td className="border-b border-gray-200 px-4 py-3 text-center text-orange-700 font-black">{s.absentDays}</td>
                          <td className="border-b border-gray-200 px-4 py-3 text-right text-red-700">{formatPKR(s.fines)}</td>
                          <td className="border-b border-gray-200 px-4 py-3 text-right font-black text-green-800">{formatPKR(s.netPayable)}</td>
                        </tr>
                      ))}
                      <tr className="bg-purple-50/50 font-black">
                        <td colSpan={4} className="px-4 py-3 text-purple-800">Total Payroll</td>
                        <td className="px-4 py-3 text-right text-purple-800">{formatPKR(reportData.totalPayroll)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
