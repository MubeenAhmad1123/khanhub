'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { formatDateDMY } from '@/lib/utils';
import {
  FileBarChart, Printer, Calendar,
  TrendingUp, TrendingDown, DollarSign, Loader2, BarChart3
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPKR(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

const CATEGORIES: Record<string, string> = {
  seeker_fee: 'Job Seeker Registration Fees',
  commission_30_percent: '30% Placement Commissions',
  employer_commission: 'Employer Placement Fees',
  staff_salary: 'Staff Salary Disbursements',
  utilities: 'Utility Bills',
  rent: 'Rent & Lease Payments',
  marketing: 'Marketing & CRM Ads',
  office_supplies: 'Office & Study Materials',
  repairs_maintenance: 'Repairs & Maintenance',
  miscellaneous: 'Miscellaneous Expenses'
};

function formatCat(cat: string) {
  if (CATEGORIES[cat]) return CATEGORIES[cat];
  return cat?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || cat;
}

export default function AdminReportsPage() {
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
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) { router.push('/departments/job-center/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/job-center/login'); return;
    }
    setSession(parsed);

    // Wait for auth + force token refresh on mount so they are ready when generate is clicked
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.uid === parsed.uid) {
        await user.getIdToken(true);
      } else if (auth.currentUser && auth.currentUser.uid === parsed.uid) {
        await auth.currentUser.getIdToken(true);
      }
    });

    return () => unsubscribe();
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

      const q = query(
        collection(db, 'jobcenter_transactions'),
        where('date', '>=', Timestamp.fromDate(firstDay)),
        where('date', '<=', Timestamp.fromDate(lastDay)),
        where('status', '==', 'approved'),
        orderBy('date', 'asc')
      );

      const snap = await getDocs(q);
      const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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

      // Seekers fees & commissions breakdown
      const seekerFeesList = txns.filter((t: any) => t.category === 'seeker_fee' || t.category === 'registration');
      const commissionsList = txns.filter((t: any) => t.category === 'commission_30_percent' || t.category?.includes('commission'));
      const totalSeekerFeesCollected = seekerFeesList.reduce((sum, t: any) => sum + (t.amount || 0), 0);
      const totalCommissionsCollected = commissionsList.reduce((sum, t: any) => sum + (t.amount || 0), 0);

      setReportData({
        txns,
        income,
        expense,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        incomeByCategory: byCategory(income),
        expenseByCategory: byCategory(expense),
        reportLabel: label,
        generatedAt: new Date().toLocaleString(),
        seekerFeesList,
        commissionsList,
        totalSeekerFeesCollected,
        totalCommissionsCollected
      });

      setGenerated(true);
    } catch (error) {
      console.error('Report error:', error);
      alert('Failed to generate report. Check Firestore index for date + status query.');
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
          #JOBCENTER-report-print, #JOBCENTER-report-print * { visibility: visible; }
          #JOBCENTER-report-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileBarChart className="w-6 h-6 text-teal-600" /> Financial Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">Generate approved transaction reports for any day, week, or month</p>
          </div>
          {generated && (
            <div className="flex gap-3">
              <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-gray-900">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-teal-500" /> Select Period</h2>
            {/* View Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              {(['daily', 'weekly', 'monthly'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setReportType(t)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    reportType === t ? 'bg-white shadow-sm text-teal-600 font-bold' : 'text-gray-400 hover:text-gray-700'
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
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-black font-bold"
                />
              </div>
            )}

            {reportType === 'weekly' && (
              <div className="w-full sm:w-1/4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Week</label>
                <select
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-black font-bold"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-black font-bold"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-black font-bold"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Report Preview */}
        {generated && reportData && (
          <div id="JOBCENTER-report-print" ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 space-y-8">

            {/* Report Header */}
            <div className="text-center border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-black text-gray-900">Khan Hub Job Center</h2>
              <p className="text-lg font-bold text-teal-700 mt-1">{reportData.reportLabel}</p>
              <p className="text-sm text-gray-400 mt-1">Generated: {reportData.generatedAt}</p>
            </div>

            {/* Summary Stats */}
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
                <DollarSign className={`w-6 h-6 mx-auto mb-2 ${reportData.netBalance >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${reportData.netBalance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>Net Balance</div>
                <div className={`text-2xl font-black ${reportData.netBalance >= 0 ? 'text-green-800' : 'text-orange-600'}`}>{formatPKR(reportData.netBalance)}</div>
              </div>
            </div>

            {reportData.txns.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-500">
                No approved transactions found for the selected period.
              </div>
            ) : (
              <>
                {/* Income/Expense Breakdown */}
                {Object.keys(reportData.incomeByCategory).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-teal-500" /> Income Breakdown</h3>
                    <table className="w-full text-sm border-collapse border border-gray-200 rounded-xl overflow-hidden">
                      <thead className="bg-teal-50">
                        <tr>
                          <th className="border border-gray-200 px-4 py-3 text-left font-bold text-teal-800">Category</th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-bold text-teal-800">Amount (PKR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(reportData.incomeByCategory).map(([cat, amt]: any) => (
                          <tr key={cat} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-3 text-gray-700">{formatCat(cat)}</td>
                            <td className="border border-gray-200 px-4 py-3 text-right text-gray-900 font-medium">{formatPKR(amt)}</td>
                          </tr>
                        ))}
                        <tr className="bg-teal-50 font-bold">
                          <td className="border border-gray-200 px-4 py-3 text-teal-800">Total Income</td>
                          <td className="border border-gray-200 px-4 py-3 text-right text-teal-800">{formatPKR(reportData.totalIncome)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {Object.keys(reportData.expenseByCategory).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500" /> Expense Breakdown</h3>
                    <table className="w-full text-sm border-collapse border border-gray-200 rounded-xl overflow-hidden">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="border border-gray-200 px-4 py-3 text-left font-bold text-red-700">Category</th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-bold text-red-700">Amount (PKR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(reportData.expenseByCategory).map(([cat, amt]: any) => (
                          <tr key={cat} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-3 text-gray-700">{formatCat(cat)}</td>
                            <td className="border border-gray-200 px-4 py-3 text-right text-gray-900 font-medium">{formatPKR(amt)}</td>
                          </tr>
                        ))}
                        <tr className="bg-red-50 font-bold">
                          <td className="border border-gray-200 px-4 py-3 text-red-700">Total Expenses</td>
                          <td className="border border-gray-200 px-4 py-3 text-right text-red-700">{formatPKR(reportData.totalExpenses)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Job Seeker & Employer Placement Breakdown */}
                {((reportData.seekerFeesList && reportData.seekerFeesList.length > 0) || (reportData.commissionsList && reportData.commissionsList.length > 0)) && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-500" /> Seeker Registrations & Placement Commissions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                        <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Seeker Fees Collected</div>
                        <div className="text-xl font-black text-orange-850">{formatPKR(reportData.totalSeekerFeesCollected)}</div>
                      </div>
                      <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
                        <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Placement Commissions</div>
                        <div className="text-xl font-black text-green-800">{formatPKR(reportData.totalCommissionsCollected)}</div>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="border border-gray-200 px-3 py-3 text-left font-bold">Client / Candidate Name</th>
                            <th className="border border-gray-200 px-3 py-3 text-left font-bold">Category / Description</th>
                            <th className="border border-gray-200 px-3 py-3 text-left font-bold">Date</th>
                            <th className="border border-gray-200 px-3 py-3 text-right font-bold">Amount Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {reportData.seekerFeesList.map((t: any) => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-200 px-3 py-2 text-gray-800 font-medium">{t.seekerName || '—'}</td>
                              <td className="border border-gray-200 px-3 py-2 text-orange-700 font-bold">Job Seeker Registration Fee</td>
                              <td className="border border-gray-200 px-3 py-2 text-gray-500">{formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}</td>
                              <td className="border border-gray-200 px-3 py-2 text-right text-gray-900 font-black">{formatPKR(t.amount)}</td>
                            </tr>
                          ))}
                          {reportData.commissionsList.map((t: any) => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-200 px-3 py-2 text-gray-800 font-medium">{t.seekerName || '—'}</td>
                              <td className="border border-gray-200 px-3 py-2 text-green-700 font-bold">Placement Commission ({t.description || 'Employer Payment'})</td>
                              <td className="border border-gray-200 px-3 py-2 text-gray-500">{formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}</td>
                              <td className="border border-gray-200 px-3 py-2 text-right text-gray-900 font-black">{formatPKR(t.amount)}</td>
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
                            <td className="border border-gray-200 px-3 py-2 text-gray-600 whitespace-nowrap">{formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}</td>
                            <td className="border border-gray-200 px-3 py-2">
                              <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ${t.type === 'income' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>{t.type}</span>
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-700">{formatCat(t.category)}</td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-650 max-w-[180px] truncate" title={t.description}>{t.description || '—'}</td>
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
          </div>
        )}

      </div>
    </div>
  );
}
