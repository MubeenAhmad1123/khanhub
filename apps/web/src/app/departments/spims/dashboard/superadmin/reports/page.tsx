'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { formatDateDMY } from '@/lib/utils';
import {
  FileBarChart, Printer, Calendar,
  TrendingUp, TrendingDown, DollarSign, Loader2, BarChart3,
  Users, UserCog, AlertTriangle,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPKR(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

const CATEGORIES: Record<string, string> = {
  student_fee: 'Student Tuition Fees',
  admission_fee: 'Admission / Enrollment Fees',
  staff_salary: 'Staff Salary Disbursements',
  utilities: 'Utility Bills',
  rent: 'Rent & Lease Payments',
  marketing: 'Marketing & CRM Ads',
  office_supplies: 'Office & Study Materials',
  repairs_maintenance: 'Repairs & Maintenance',
  miscellaneous: 'Miscellaneous Expenses',
  canteen_deposit: 'Canteen Deposits'
};

function formatCat(cat: string) {
  if (CATEGORIES[cat]) return CATEGORIES[cat];
  return cat?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || cat;
}

export default function SuperAdminReportsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  const now = new Date();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]); // YYYY-MM-DD
  const [selectedWeek, setSelectedWeek] = useState(1); // 1-5
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [reportFocus, setReportFocus] = useState<'income' | 'remaining'>('income');

  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [generated, setGenerated] = useState(false);

  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('spims_session');
    if (!sessionData) { router.push('/departments/spims/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'superadmin') {
      router.push('/departments/spims/login'); return;
    }
    setSession(parsed);
  }, [router]);

  const handleSort = (field: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortField === field && sortDirection === 'asc') {
      direction = 'desc';
    }
    setSortField(field);
    setSortDirection(direction);
  };

  const getSortedStudentFees = () => {
    if (!reportData?.studentFeesBreakdown) return [];
    
    // 1. Filter by reportFocus
    let list = [...reportData.studentFeesBreakdown];
    if (reportData.reportFocus === 'income') {
      list = list.filter((s: any) => s.paidInPeriod > 0);
    } else if (reportData.reportFocus === 'remaining') {
      list = list.filter((s: any) => s.overallRemaining > 0);
    }

    // 2. Sort list
    if (sortField) {
      list.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Handle numeric fields
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        // Handle rollNo numeric sorting if possible
        if (sortField === 'rollNo') {
          const numA = parseInt(String(valA).replace(/\D/g, '')) || 0;
          const numB = parseInt(String(valB).replace(/\D/g, '')) || 0;
          if (numA !== numB) {
            return sortDirection === 'asc' ? numA - numB : numB - numA;
          }
        }

        // Handle string fields
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default Sort Order for Remaining Report
      if (reportData.reportFocus === 'remaining') {
        list.sort((a: any, b: any) => {
          const paidA = a.paidInPeriod > 0 ? 1 : 0;
          const paidB = b.paidInPeriod > 0 ? 1 : 0;
          if (paidA !== paidB) {
            return paidA - paidB; // 0 (unpaid) comes before 1 (paid)
          }
          // Secondary sort: sort by remaining dues descending
          return b.overallRemaining - a.overallRemaining;
        });
      }
    }
    return list;
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGenerated(false);
      setSortField(''); // Reset sort field on fresh generation

      let firstDay: Date;
      let lastDay: Date;
      let label: string;
      let monthStr: string;

      if (reportType === 'daily') {
        const parts = selectedDate.split('-');
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);
        firstDay = new Date(y, m, d, 0, 0, 0);
        lastDay = new Date(y, m, d, 23, 59, 59);
        label = `Daily Report — ${d} ${MONTHS[m]} ${y}`;
        monthStr = `${parts[0]}-${parts[1]}`;
      } else if (reportType === 'weekly') {
        const startDay = (selectedWeek - 1) * 7 + 1;
        const endOfPeriod = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const endDay = selectedWeek === 5 ? endOfPeriod : Math.min(selectedWeek * 7, endOfPeriod);
        firstDay = new Date(selectedYear, selectedMonth, startDay, 0, 0, 0);
        lastDay = new Date(selectedYear, selectedMonth, endDay, 23, 59, 59);
        label = `Weekly Report — Week ${selectedWeek} (${startDay} ${MONTHS[selectedMonth]} - ${endDay} ${MONTHS[selectedMonth]} ${selectedYear})`;
        monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      } else {
        firstDay = new Date(selectedYear, selectedMonth, 1, 0, 0, 0);
        lastDay = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
        label = `Monthly Report — ${MONTHS[selectedMonth]} ${selectedYear}`;
        monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      }

      // === FINANCIAL TRANSACTIONS ===
      const txnQ = query(
        collection(db, 'spims_transactions'),
        where('date', '>=', Timestamp.fromDate(firstDay)),
        where('date', '<=', Timestamp.fromDate(lastDay)),
        where('status', '==', 'approved'),
        orderBy('date', 'asc')
      );
      const txnSnap = await getDocs(txnQ);
      const txns = txnSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Pending count
      const pendingQ = query(
        collection(db, 'spims_transactions'),
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
          const isFee = 
            t.category === 'student_fee' || 
            t.category === 'fee' || 
            String(t.category || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('admission');
          const catKey = isFee ? 'student_fee' : t.category;
          map[catKey] = (map[catKey] || 0) + (t.amount || 0);
        });
        return map;
      };

      // === STAFF SALARY ===
      const allStaff = staffSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter((s: any) => String(s.status || '').toLowerCase() !== 'executive');

      const finesSnap = await getDocs(query(collection(db, 'spims_fines'), where('month', '==', monthStr)));
      const allFines = finesSnap.docs.map(d => d.data());

      const attendanceSnap = await getDocs(query(collection(db, 'spims_attendance'),
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

      // === STUDENTS ===
      const activeStudentsSnap = await getDocs(collection(db, 'spims_students'));
      const allStudents = activeStudentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const students = allStudents.filter(student => (student.status || 'Active') === 'Active');
      const totalActiveStudents = students.length;

      const newAdmissions = allStudents.filter((student: any) => {
        if (!student.admissionDate) return false;
        const d = student.admissionDate.toDate?.() ? student.admissionDate.toDate() : new Date(student.admissionDate);
        return d >= firstDay && d <= lastDay;
      }).length;

      // === STUDENT FEES BREAKDOWN ===
      const feesSnap = await getDocs(collection(db, 'spims_fees'));
      const allFees = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      const monthFees = allFees.filter(fee => {
        if (fee.status !== 'approved') return false;
        const feeDate = fee.date?.toDate?.() ? fee.date.toDate() : new Date(fee.date || 0);
        const feeMonthStr = `${feeDate.getFullYear()}-${String(feeDate.getMonth() + 1).padStart(2, '0')}`;
        return feeMonthStr === monthStr;
      });

      const studentFeesBreakdown = students.map(student => {
        const studentPayments = monthFees.filter(f => f.studentId === student.id);
        const amountPaidThisMonth = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Calculate paid specifically in selected range (e.g. daily, weekly, monthly)
        const studentPeriodTxns = txns.filter((t: any) => {
          if (t.studentId !== student.id && t.patientId !== student.id) return false;
          return (
            t.category === 'student_fee' ||
            t.category === 'fee' ||
            String(t.category || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('admission')
          );
        });
        const paidInPeriod = studentPeriodTxns.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

        return {
          id: student.id,
          name: student.name,
          rollNo: student.rollNo || student.serialNumber || '—',
          course: student.course || '—',
          monthlyFee: Number(student.monthlyFee || 0),
          totalPackage: Number(student.totalPackage || student.totalPackageAmount || 0),
          paidInPeriod,
          amountPaidThisMonth,
          overallRemaining: Number(student.remaining ?? student.remainingBalance ?? 0)
        };
      });

      const totalStudentFeesCollectedInPeriod = studentFeesBreakdown.reduce((sum, s) => sum + s.paidInPeriod, 0);
      const totalStudentOutstandingDues = studentFeesBreakdown.reduce((sum, s) => sum + s.overallRemaining, 0);

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
        totalActiveStudents,
        newAdmissions,
        studentFeesBreakdown,
        totalStudentFeesCollectedInPeriod,
        totalStudentOutstandingDues,
        reportLabel: label,
        generatedAt: new Date().toLocaleString(),
        reportFocus,
      });
      setGenerated(true);
    } catch (error) {
      console.error('Report error:', error);
      alert('Failed to generate report. Ensure Firestore indexes are set up for date + status queries.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #spims-report-print, #spims-report-print * { visibility: visible; }
          #spims-report-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        }
      `}</style>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileBarChart className="w-6 h-6 text-purple-600" /> Super Admin Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive reports including student summaries and staff payroll</p>
          </div>
          {generated && (
            <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-500" /> Select Period</h2>
            {/* View Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              {(['daily', 'weekly', 'monthly'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setReportType(t)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    reportType === t ? 'bg-white shadow-sm text-purple-600 font-bold' : 'text-gray-400 hover:text-gray-755'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Report Focus Selector */}
          <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Report Category</h3>
              <p className="text-xs text-gray-400">Choose the type of report you want to generate</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setReportFocus('income')}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  reportFocus === 'income' ? 'bg-white shadow-sm text-purple-600 font-bold' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Income Report
              </button>
              <button
                onClick={() => setReportFocus('remaining')}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  reportFocus === 'remaining' ? 'bg-white shadow-sm text-purple-600 font-bold' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Remaining Dues Report
              </button>
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
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
                />
              </div>
            )}

            {reportType === 'weekly' && (
              <div className="w-full sm:w-1/4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Week</label>
                <select
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-black font-bold"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Report Preview */}
        {generated && reportData && (
          <div id="spims-report-print" ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 space-y-10">

            {/* Report Header */}
            <div className="text-center border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-black text-gray-900">SPIMS Medical Institute — Super Admin Report</h2>
              <p className="text-lg font-bold text-purple-700 mt-1">
                {reportData.reportLabel} — {reportData.reportFocus === 'income' ? 'Income Report' : 'Remaining Dues Report'}
              </p>
              <p className="text-sm text-gray-400 mt-1">Generated: {reportData.generatedAt}</p>
            </div>

            {/* Pending Warning Banner */}
            {reportData.pendingCount > 0 && reportData.reportFocus === 'income' && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> {reportData.pendingCount} transaction{reportData.pendingCount > 1 ? 's are' : ' is'} still pending approval and are <strong>NOT included</strong> in this report.
                </p>
              </div>
            )}

            {/* Students Summary */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-teal-500" /> Student Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl text-center">
                  <div className="text-3xl font-black text-teal-800">{reportData.totalActiveStudents}</div>
                  <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mt-1">Active Students</div>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-center">
                  <div className="text-3xl font-black text-blue-800">{reportData.newAdmissions}</div>
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1">New Admissions (Selected Period)</div>
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
                  <DollarSign className={`w-6 h-6 mx-auto mb-2 ${reportData.netBalance >= 0 ? 'text-green-600' : 'text-orange-552'}`} />
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${reportData.netBalance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>Net Balance</div>
                  <div className={`text-2xl font-black ${reportData.netBalance >= 0 ? 'text-green-800' : 'text-orange-700'}`}>{formatPKR(reportData.netBalance)}</div>
                </div>
              </div>
            </div>

            {reportData.txns.length === 0 && reportData.reportFocus === 'income' ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-500">No approved transactions found for the selected period.</div>
            ) : (
              <>
                {/* Income Breakdown */}
                {reportData.reportFocus === 'income' && Object.keys(reportData.incomeByCategory).length > 0 && (
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
                {reportData.reportFocus === 'income' && Object.keys(reportData.expenseByCategory).length > 0 && (
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

                {/* Student Fee Collection Breakdown */}
                {reportData.studentFeesBreakdown && reportData.studentFeesBreakdown.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-605" /> {reportData.reportFocus === 'income' ? 'Student Fee Collections' : 'Outstanding Student Dues'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl text-center">
                        <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Period Collections</div>
                        <div className="text-xl font-black text-teal-800">{formatPKR(reportData.totalStudentFeesCollectedInPeriod)}</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                        <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Total Outstanding Balances</div>
                        <div className="text-xl font-black text-orange-850">{formatPKR(reportData.totalStudentOutstandingDues)}</div>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50 text-gray-650 border-b border-gray-200 select-none">
                          <tr>
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                              <div className="flex items-center gap-1">
                                Student Name
                                {sortField === 'name' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('rollNo')}>
                              <div className="flex items-center gap-1">
                                Roll No / Course
                                {sortField === 'rollNo' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('totalPackage')}>
                              <div className="flex items-center justify-end gap-1">
                                Total Package
                                {sortField === 'totalPackage' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold text-teal-800 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('paidInPeriod')}>
                              <div className="flex items-center justify-end gap-1">
                                Paid in Period
                                {sortField === 'paidInPeriod' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-teal-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold text-indigo-800 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('amountPaidThisMonth')}>
                              <div className="flex items-center justify-end gap-1">
                                Paid in Month
                                {sortField === 'amountPaidThisMonth' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold text-rose-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('overallRemaining')}>
                              <div className="flex items-center justify-end gap-1">
                                Overall Remaining
                                {sortField === 'overallRemaining' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-rose-450" />
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {getSortedStudentFees().map((s: any) => (
                            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2.5 text-gray-850 font-bold">{s.name}</td>
                              <td className="px-3 py-2.5 text-gray-555 font-mono">{s.rollNo} / {s.course}</td>
                              <td className="px-3 py-2.5 text-right text-gray-900">{formatPKR(s.totalPackage)}</td>
                              <td className="px-3 py-2.5 text-right text-teal-700 font-black bg-teal-50/20">{formatPKR(s.paidInPeriod)}</td>
                              <td className="px-3 py-2.5 text-right text-indigo-700 font-black bg-indigo-50/30">{formatPKR(s.amountPaidThisMonth)}</td>
                              <td className={`px-3 py-2.5 text-right font-black ${s.overallRemaining > 0 ? 'text-rose-600 bg-rose-50/20' : 'text-blue-700 bg-blue-50/20'}`}>{formatPKR(s.overallRemaining)}</td>
                            </tr>
                          ))}
                          {getSortedStudentFees().length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-8 text-center text-gray-400 italic">
                                No records found for this category.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Transaction Detail (Only for Income Report) */}
                {reportData.reportFocus === 'income' && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">Transaction Details</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Date</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Student Name</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Type</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Category</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Description</th>
                            <th className="px-3 py-3 text-right font-bold text-gray-600">Amount</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Cashier ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.txns.map((t: any) => (
                            <tr key={t.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}</td>
                              <td className="px-3 py-2 text-gray-850 font-bold whitespace-nowrap">{t.studentName || t.patientName || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ${t.type === 'income' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>{t.type}</span>
                              </td>
                              <td className="px-3 py-2 text-gray-700">{formatCat(t.category)}</td>
                              <td className="px-3 py-2 text-gray-650 max-w-[180px] truncate" title={t.description}>{t.description || '—'}</td>
                              <td className="px-3 py-2 text-right font-bold text-gray-900">{formatPKR(t.amount)}</td>
                              <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{t.cashierId || t.submittedBy || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Staff Salary Summary */}
            {reportData.staffSalaries.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><UserCog className="w-5 h-5 text-purple-500" /> Staff Payroll Summary ({reportData.reportLabel.split('—')[1]?.trim() || reportData.reportLabel})</h3>
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
