'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { formatDateDMY } from '@/lib/utils';
import {
  FileBarChart, Printer, Calendar,
  TrendingUp, TrendingDown, DollarSign, Loader2, BarChart3,
  Users, UserCog, AlertTriangle, Layers, Heart, ClipboardList
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPKR(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

const CATEGORIES: Record<string, string> = {
  opd_reception: 'OPD Reception Fees',
  lab_test: 'Lab Test Fees',
  operation: 'Operation Fees',
  operation_theater: 'Operation Theater Fees',
  staff_salary: 'Staff Salary Disbursements',
  utilities: 'Utility Bills',
  maintenance: 'Repairs & Maintenance',
  other_income: 'Other Income',
  other_expense: 'Other Expenses'
};

function formatCat(cat: string) {
  if (CATEGORIES[cat]) return CATEGORIES[cat];
  return cat?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || cat;
}

export default function HospitalSuperAdminReportsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  const now = new Date();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]); // YYYY-MM-DD
  const [selectedWeek, setSelectedWeek] = useState(1); // 1-5
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [generated, setGenerated] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('hospital_session');
    if (!sessionData) { router.push('/departments/hospital/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'superadmin') {
      router.push('/departments/hospital/login'); return;
    }
    setSession(parsed);
  }, [router]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGenerated(false);

      let firstDay: Date;
      let lastDay: Date;
      let label: string;

      if (reportType === 'daily') {
        const parts = selectedDate.split('-');
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);
        firstDay = new Date(y, m, d, 0, 0, 0);
        lastDay = new Date(y, m, d, 23, 59, 59);
        label = `Daily Report — ${d} ${MONTHS[m]} ${y}`;
      } else if (reportType === 'weekly') {
        const startDay = (selectedWeek - 1) * 7 + 1;
        const endOfPeriod = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const endDay = selectedWeek === 5 ? endOfPeriod : Math.min(selectedWeek * 7, endOfPeriod);
        firstDay = new Date(selectedYear, selectedMonth, startDay, 0, 0, 0);
        lastDay = new Date(selectedYear, selectedMonth, endDay, 23, 59, 59);
        label = `Weekly Report — Week ${selectedWeek} (${startDay} ${MONTHS[selectedMonth]} - ${endDay} ${MONTHS[selectedMonth]} ${selectedYear})`;
      } else {
        firstDay = new Date(selectedYear, selectedMonth, 1, 0, 0, 0);
        lastDay = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
        label = `Monthly Report — ${MONTHS[selectedMonth]} ${selectedYear}`;
      }

      // Fetch approved transactions
      const q = query(
        collection(db, 'hospital_transactions'),
        where('date', '>=', Timestamp.fromDate(firstDay)),
        where('date', '<=', Timestamp.fromDate(lastDay)),
        where('status', '==', 'approved')
      );

      const snap = await getDocs(q);
      const txns = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const tA = a.date?.seconds || 0;
          const tB = b.date?.seconds || 0;
          return tA - tB;
        });

      // Pending count
      const pendingQ = query(
        collection(db, 'hospital_transactions'),
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
        list.forEach((t: any) => {
          map[t.category] = (map[t.category] || 0) + (t.amount || 0);
        });
        return map;
      };

      // Categories splits
      const opdTxns = txns.filter((t: any) => t.category === 'opd_reception');
      const labTxns = txns.filter((t: any) => t.category === 'lab_test');
      const opTxns = txns.filter((t: any) => t.category === 'operation' || t.category === 'operation_theater');

      const opdSummary = opdTxns.map((t: any) => {
        const meta = t.hospitalMeta || {};
        return {
          id: t.id,
          date: t.date,
          patientName: meta.patientName || t.patientName || '—',
          shift: meta.shift || '—',
          amount: t.amount || 0,
          cashierId: t.cashierId || t.submittedBy || '—'
        };
      });

      const labSummary = labTxns.map((t: any) => {
        const meta = t.hospitalMeta || {};
        const charges = meta.testCharges !== undefined ? Number(meta.testCharges) : (t.amount || 0);
        const testExpense = meta.testExpense !== undefined ? Number(meta.testExpense) : 0;
        return {
          id: t.id,
          date: t.date,
          patientName: meta.patientName || t.patientName || '—',
          testName: meta.testName || '—',
          referredBy: meta.referredBy || '—',
          charges,
          expense: testExpense,
          netAmount: charges - testExpense,
          cashierId: t.cashierId || t.submittedBy || '—'
        };
      });

      const opSummary = opTxns.map((t: any) => {
        const meta = t.hospitalMeta || {};
        return {
          id: t.id,
          date: t.date,
          patientName: meta.patientName || t.patientName || '—',
          operationType: meta.operationType || '—',
          referredBy: meta.referredBy || '—',
          admitDate: meta.admitDate || '—',
          dischargeDate: meta.dischargeDate || '—',
          amount: t.amount || 0,
          cashierId: t.cashierId || t.submittedBy || '—'
        };
      });

      // === STAFF SALARY ===
      let activeMonth = selectedMonth;
      let activeYear = selectedYear;

      if (reportType === 'daily') {
        const parts = selectedDate.split('-');
        activeYear = parseInt(parts[0]);
        activeMonth = parseInt(parts[1]) - 1;
      } else if (reportType === 'weekly') {
        activeMonth = selectedMonth;
        activeYear = selectedYear;
      }
      const monthStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}`;

      const staffSnap = await getDocs(query(collection(db, 'hospital_staff'), where('isActive', '==', true)));
      const allStaff = staffSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

      const finesSnap = await getDocs(query(collection(db, 'hospital_fines'), where('month', '==', monthStr)));
      const allFines = finesSnap.docs.map(d => d.data());

      const attendanceSnap = await getDocs(query(collection(db, 'hospital_attendance'),
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
      const activePatientsSnap = await getDocs(query(collection(db, 'hospital_patients'), where('isActive', '==', true)));
      const totalActivePatients = activePatientsSnap.size;

      const newAdmissionsSnap = await getDocs(query(
        collection(db, 'hospital_patients'),
        where('admissionDate', '>=', Timestamp.fromDate(firstDay)),
        where('admissionDate', '<=', Timestamp.fromDate(lastDay))
      ));
      const newAdmissions = newAdmissionsSnap.size;

      setReportData({
        txns,
        income,
        expense,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        incomeByCategory: byCategory(income),
        expenseByCategory: byCategory(expense),
        pendingCount,
        staffSalaries,
        totalPayroll,
        totalActivePatients,
        newAdmissions,
        reportLabel: label,
        monthLabel: `${MONTHS[activeMonth]} ${activeYear}`,
        generatedAt: new Date().toLocaleString(),
        opdSummary,
        labSummary,
        opSummary
      });

      setGenerated(true);
    } catch (error) {
      console.error('Report error:', error);
      alert('Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-black">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #hospital-report-print, #hospital-report-print * { visibility: visible; }
          #hospital-report-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileBarChart className="w-6 h-6 text-emerald-600" /> Super Admin Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">Generate approved hospital reports with staff payroll details</p>
          </div>
          {generated && (
            <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-gray-900">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-500" /> Select Period</h2>
            {/* View Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              {(['daily', 'weekly', 'monthly'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setReportType(t)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    reportType === t ? 'bg-white shadow-sm text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {reportType === 'daily' && (
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                />
              </div>
            )}

            {reportType === 'weekly' && (
              <div className="w-full sm:w-1/4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Week</label>
                <select
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                >
                  <option value={1}>Week 1 (1st - 7th)</option>
                  <option value={2}>Week 2 (8th - 14th)</option>
                  <option value={3}>Week 3 (15th - 21st)</option>
                  <option value={4}>Week 4 (22nd - 28th)</option>
                  <option value={5}>Week 5 (29th - End)</option>
                </select>
              </div>
            )}

            {reportType !== 'daily' && (
              <>
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
                    type="number"
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    min={2020}
                    max={2100}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Report Preview */}
        {generated && reportData && (
          <div id="hospital-report-print" ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 space-y-10">

            {/* Report Header */}
            <div className="text-center border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-black text-gray-900">Khan Hub Hospital — Super Admin Report</h2>
              <p className="text-lg font-bold text-emerald-700 mt-1">{reportData.reportLabel}</p>
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
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1">New Admissions in Period</div>
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
                  <DollarSign className={`w-6 h-6 mx-auto mb-2 ${reportData.netBalance >= 0 ? 'text-green-600' : 'text-orange-550'}`} />
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${reportData.netBalance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>Net Balance</div>
                  <div className={`text-2xl font-black ${reportData.netBalance >= 0 ? 'text-green-800' : 'text-orange-700'}`}>{formatPKR(reportData.netBalance)}</div>
                </div>
              </div>
            </div>

            {reportData.txns.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-500">No approved transactions found for the selected period.</div>
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
                            <tr key={cat} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                              <td className="px-4 py-3 text-gray-700 font-medium">{formatCat(cat)}</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">{formatPKR(amt)}</td>
                            </tr>
                          ))}
                          <tr className="bg-teal-50 font-black">
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
                            <tr key={cat} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                              <td className="px-4 py-3 text-gray-700 font-medium">{formatCat(cat)}</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">{formatPKR(amt)}</td>
                            </tr>
                          ))}
                          <tr className="bg-red-50 font-black">
                            <td className="px-4 py-3 text-red-700">Total Expenses</td>
                            <td className="px-4 py-3 text-right text-red-700">{formatPKR(reportData.totalExpenses)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* OPD Reception Summary */}
                {reportData.opdSummary.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-emerald-600" /> OPD Reception Summary
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50 text-gray-650 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-3 text-left font-bold">Date</th>
                            <th className="px-3 py-3 text-left font-bold">Patient Name</th>
                            <th className="px-3 py-3 text-center font-bold">Shift</th>
                            <th className="px-3 py-3 text-right font-bold">Fee</th>
                            <th className="px-3 py-3 text-left font-bold">Cashier ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {reportData.opdSummary.map((r: any) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDateDMY(r.date?.toDate?.() ? r.date.toDate() : r.date)}</td>
                              <td className="px-3 py-2.5 text-gray-850 font-bold">{r.patientName}</td>
                              <td className="px-3 py-2.5 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 uppercase">{r.shift}</span></td>
                              <td className="px-3 py-2.5 text-right font-bold text-gray-900">{formatPKR(r.amount)}</td>
                              <td className="px-3 py-2.5 text-gray-500 font-mono">{r.cashierId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Lab Diagnostic Tests Summary */}
                {reportData.labSummary.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-650" /> Lab Diagnostic Tests Summary
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50 text-gray-650 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-3 text-left font-bold">Date</th>
                            <th className="px-3 py-3 text-left font-bold">Patient Name</th>
                            <th className="px-3 py-3 text-left font-bold">Test Name</th>
                            <th className="px-3 py-3 text-left font-bold">Referred By</th>
                            <th className="px-3 py-3 text-right font-bold text-teal-850">Charges</th>
                            <th className="px-3 py-3 text-right font-bold text-rose-800">Expense</th>
                            <th className="px-3 py-3 text-right font-bold">Net Amount</th>
                            <th className="px-3 py-3 text-left font-bold">Cashier ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {reportData.labSummary.map((r: any) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDateDMY(r.date?.toDate?.() ? r.date.toDate() : r.date)}</td>
                              <td className="px-3 py-2.5 text-gray-850 font-bold">{r.patientName}</td>
                              <td className="px-3 py-2.5 text-gray-750 font-medium">{r.testName}</td>
                              <td className="px-3 py-2.5 text-gray-500">{r.referredBy}</td>
                              <td className="px-3 py-2.5 text-right text-teal-800 font-bold">{formatPKR(r.charges)}</td>
                              <td className="px-3 py-2.5 text-right text-rose-700 font-medium">{formatPKR(r.expense)}</td>
                              <td className="px-3 py-2.5 text-right font-black text-slate-900 bg-emerald-50/10">{formatPKR(r.netAmount)}</td>
                              <td className="px-3 py-2.5 text-gray-500 font-mono">{r.cashierId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Operations & O.T. Records Summary */}
                {reportData.opSummary.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-rose-600" /> Operations & O.T. Records
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50 text-gray-650 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-3 text-left font-bold">Date</th>
                            <th className="px-3 py-3 text-left font-bold">Patient Name</th>
                            <th className="px-3 py-3 text-left font-bold">Operation Type</th>
                            <th className="px-3 py-3 text-left font-bold">Referred By</th>
                            <th className="px-3 py-3 text-center font-bold">Admit / Discharge</th>
                            <th className="px-3 py-3 text-right font-bold text-emerald-800">Amount Paid</th>
                            <th className="px-3 py-3 text-left font-bold">Cashier ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {reportData.opSummary.map((r: any) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDateDMY(r.date?.toDate?.() ? r.date.toDate() : r.date)}</td>
                              <td className="px-3 py-2.5 text-gray-850 font-bold">{r.patientName}</td>
                              <td className="px-3 py-2.5 text-gray-750 font-medium">{r.operationType}</td>
                              <td className="px-3 py-2.5 text-gray-500">{r.referredBy}</td>
                              <td className="px-3 py-2.5 text-center text-gray-500">{r.admitDate} to {r.dischargeDate}</td>
                              <td className="px-3 py-2.5 text-right font-black text-emerald-800 bg-emerald-50/20">{formatPKR(r.amount)}</td>
                              <td className="px-3 py-2.5 text-gray-500 font-mono">{r.cashierId}</td>
                            </tr>
                          ))}
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
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-3 text-left font-bold text-gray-600">Date</th>
                          <th className="px-3 py-3 text-left font-bold text-gray-600">Type</th>
                          <th className="px-3 py-3 text-left font-bold text-gray-600">Category</th>
                          <th className="px-3 py-3 text-left font-bold text-gray-600">Description</th>
                          <th className="px-3 py-3 text-right font-bold text-gray-600">Amount</th>
                          <th className="px-3 py-3 text-left font-bold text-gray-600">Cashier Signature</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.txns.map((t: any) => (
                          <tr key={t.id} className="hover:bg-gray-50 border-b border-gray-100">
                            <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}</td>
                            <td className="px-3 py-2.5">
                              <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>{t.type}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-700 font-medium">{formatCat(t.category)}</td>
                            <td className="px-3 py-2.5 text-gray-500 max-w-[200px] truncate" title={t.description}>{t.description || '—'}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-gray-900">{formatPKR(t.amount)}</td>
                            <td className="px-3 py-2.5 text-gray-500 font-mono text-[10px]">{t.cashierId || t.submittedBy || '—'}</td>
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
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><UserCog className="w-5 h-5 text-emerald-500" /> Staff Monthly Payroll Summary ({reportData.monthLabel})</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm border-collapse min-w-[600px]">
                    <thead className="bg-emerald-50">
                      <tr>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-emerald-800">Staff Member</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-emerald-800">Gross</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-bold text-emerald-800">Absent</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-emerald-800">Fines</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-emerald-800">Net Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.staffSalaries.map((s: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                          <td className="border-b border-gray-200 px-4 py-3 font-medium text-gray-900">{s.name}</td>
                          <td className="border-b border-gray-200 px-4 py-3 text-right text-gray-700">{formatPKR(s.gross)}</td>
                          <td className="border-b border-gray-200 px-4 py-3 text-center text-orange-700 font-black">{s.absentDays}</td>
                          <td className="border-b border-gray-200 px-4 py-3 text-right text-red-700">{formatPKR(s.fines)}</td>
                          <td className="border-b border-gray-200 px-4 py-3 text-right font-black text-green-800">{formatPKR(s.netPayable)}</td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50/50 font-black">
                        <td colSpan={4} className="px-4 py-3 text-emerald-800">Total Payroll</td>
                        <td className="px-4 py-3 text-right text-emerald-800">{formatPKR(reportData.totalPayroll)}</td>
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
