'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { formatDateDMY } from '@/lib/utils';
import {
  FileBarChart, Download, Printer, Calendar,
  TrendingUp, TrendingDown, DollarSign, Loader2, BarChart3
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

export default function AdminReportsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [generated, setGenerated] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) { router.push('/departments/rehab/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/rehab/login'); return;
    }
    setSession(parsed);
  }, [router]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGenerated(false);

      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      const q = query(
        collection(db, 'rehab_transactions'),
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

      setReportData({
        txns,
        income,
        expense,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        incomeByCategory: byCategory(income),
        expenseByCategory: byCategory(expense),
        monthLabel: `${MONTHS[selectedMonth]} ${selectedYear}`,
        generatedAt: new Date().toLocaleString(),
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
          #rehab-report-print, #rehab-report-print * { visibility: visible; }
          #rehab-report-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileBarChart className="w-6 h-6 text-teal-600" /> Financial Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">Generate monthly approved transaction reports</p>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-teal-500" /> Select Period</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Month</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Year</label>
              <input
                type="number"
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                min={2020}
                max={2100}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Report Preview */}
        {generated && reportData && (
          <div id="rehab-report-print" ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 space-y-8">

            {/* Report Header */}
            <div className="text-center border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-black text-gray-900">Khan Hub Rehab Center</h2>
              <p className="text-lg font-bold text-teal-700 mt-1">Monthly Financial Report — {reportData.monthLabel}</p>
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
                <div className={`text-2xl font-black ${reportData.netBalance >= 0 ? 'text-green-800' : 'text-orange-700'}`}>{formatPKR(reportData.netBalance)}</div>
              </div>
            </div>

            {reportData.txns.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-500">
                No approved transactions found for {reportData.monthLabel}.
              </div>
            ) : (
              <>
                {/* Income Breakdown */}
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

                {/* Expense Breakdown */}
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
                            <td className="border border-gray-200 px-3 py-2 text-gray-600">{formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}</td>
                            <td className="border border-gray-200 px-3 py-2">
                              <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ${t.type === 'income' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>{t.type}</span>
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-700">{formatCat(t.category)}</td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-600 max-w-[180px] truncate">{t.description || '—'}</td>
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
