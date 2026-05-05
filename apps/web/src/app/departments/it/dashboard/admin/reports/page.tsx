'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { formatDateDMY } from '@/lib/utils';
import {
  FileBarChart, Download, Printer, Calendar,
  TrendingUp, TrendingDown, DollarSign, Loader2, BarChart3, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

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

export default function ITAdminReportsPage() {
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
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/it/login'); return;
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
        collection(db, 'it_transactions'),
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
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 space-y-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #IT-report-print, #IT-report-print * { visibility: visible; }
          #IT-report-print { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; }
        }
      `}</style>

      <Link href="/departments/it/dashboard/admin" className="inline-flex items-center gap-3 text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors group">
        <div className="w-8 h-8 rounded-full bg-white border border-black/5 flex items-center justify-center group-hover:bg-indigo-50 transition-colors shadow-sm">
          <ArrowLeft size={14} />
        </div>
        Back to admin
      </Link>

      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-black/5 pb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-black flex items-center gap-4 tracking-tighter">
              <FileBarChart className="w-10 h-10 text-indigo-600" />
              IT Financial Reports
            </h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">Generate monthly approved transaction reports</p>
          </div>
          {generated && (
            <div className="flex gap-4">
              <button onClick={handlePrint} className="bg-black hover:bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95">
                <Printer className="w-5 h-5" />
                Print / Save PDF
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-black/5 p-8">
          <h2 className="text-sm font-black text-black uppercase tracking-widest mb-6 flex items-center gap-3"><Calendar className="w-5 h-5 text-indigo-500" /> Select Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Month</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all appearance-none"
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Year</label>
              <input
                type="number"
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                min={2020}
                max={2100}
                className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-indigo-600 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-indigo-100 h-[58px]"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Report Preview */}
        {generated && reportData && (
          <div id="IT-report-print" ref={printRef} className="bg-white rounded-[3rem] shadow-sm border border-black/5 p-10 md:p-16 space-y-12">

            {/* Report Header */}
            <div className="text-center border-b border-black/5 pb-10">
              <h2 className="text-4xl font-black text-black tracking-tighter">IT DEPARTMENT</h2>
              <p className="text-xl font-black text-indigo-600 uppercase tracking-widest mt-4">Monthly Financial Report — {reportData.monthLabel}</p>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">Generated: {reportData.generatedAt}</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-indigo-50/50 border border-indigo-100 p-8 rounded-[2.5rem] text-center shadow-sm">
                <TrendingUp className="w-8 h-8 text-indigo-600 mx-auto mb-4" />
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Total Income</div>
                <div className="text-3xl font-black text-indigo-900">{formatPKR(reportData.totalIncome)}</div>
              </div>
              <div className="bg-red-50/50 border border-red-100 p-8 rounded-[2.5rem] text-center shadow-sm">
                <TrendingDown className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Total Expenses</div>
                <div className="text-3xl font-black text-red-900">{formatPKR(reportData.totalExpenses)}</div>
              </div>
              <div className={`border p-8 rounded-[2.5rem] text-center shadow-sm ${reportData.netBalance >= 0 ? 'bg-green-50/50 border-green-100' : 'bg-orange-50/50 border-orange-100'}`}>
                <DollarSign className={`w-8 h-8 mx-auto mb-4 ${reportData.netBalance >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
                <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${reportData.netBalance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>Net Balance</div>
                <div className={`text-3xl font-black ${reportData.netBalance >= 0 ? 'text-green-800' : 'text-orange-700'}`}>{formatPKR(reportData.netBalance)}</div>
              </div>
            </div>

            {reportData.txns.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-black/5 rounded-[2.5rem] text-gray-300 font-black uppercase tracking-widest text-xs">
                No approved transactions found for {reportData.monthLabel}.
              </div>
            ) : (
              <>
                {/* Income Breakdown */}
                {Object.keys(reportData.incomeByCategory).length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-3"><TrendingUp className="w-5 h-5 text-indigo-500" /> Income Breakdown</h3>
                    <div className="rounded-[2rem] border border-black/5 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-indigo-50/50">
                          <tr>
                            <th className="px-8 py-4 text-left font-black text-indigo-900 uppercase text-[10px] tracking-widest">Category</th>
                            <th className="px-8 py-4 text-right font-black text-indigo-900 uppercase text-[10px] tracking-widest">Amount (PKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {Object.entries(reportData.incomeByCategory).map(([cat, amt]: any) => (
                            <tr key={cat}>
                              <td className="px-8 py-5 text-gray-600 font-bold">{formatCat(cat)}</td>
                              <td className="px-8 py-5 text-right text-black font-black">{formatPKR(amt)}</td>
                            </tr>
                          ))}
                          <tr className="bg-indigo-50/30">
                            <td className="px-8 py-5 text-indigo-900 font-black uppercase text-[10px] tracking-widest">Total Income</td>
                            <td className="px-8 py-5 text-right text-indigo-900 font-black text-lg">{formatPKR(reportData.totalIncome)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Expense Breakdown */}
                {Object.keys(reportData.expenseByCategory).length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-3"><TrendingDown className="w-5 h-5 text-red-500" /> Expense Breakdown</h3>
                    <div className="rounded-[2rem] border border-black/5 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-red-50/50">
                          <tr>
                            <th className="px-8 py-4 text-left font-black text-red-900 uppercase text-[10px] tracking-widest">Category</th>
                            <th className="px-8 py-4 text-right font-black text-red-900 uppercase text-[10px] tracking-widest">Amount (PKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {Object.entries(reportData.expenseByCategory).map(([cat, amt]: any) => (
                            <tr key={cat}>
                              <td className="px-8 py-5 text-gray-600 font-bold">{formatCat(cat)}</td>
                              <td className="px-8 py-5 text-right text-black font-black">{formatPKR(amt)}</td>
                            </tr>
                          ))}
                          <tr className="bg-red-50/30">
                            <td className="px-8 py-5 text-red-900 font-black uppercase text-[10px] tracking-widest">Total Expenses</td>
                            <td className="px-8 py-5 text-right text-red-900 font-black text-lg">{formatPKR(reportData.totalExpenses)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Transaction Detail */}
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-black uppercase tracking-widest">Transaction Details</h3>
                  <div className="overflow-x-auto rounded-[2rem] border border-black/5">
                    <table className="w-full text-[10px]">
                      <thead className="bg-gray-50/50 border-b border-black/5">
                        <tr>
                          <th className="px-6 py-5 text-left font-black text-gray-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-5 text-left font-black text-gray-400 uppercase tracking-widest">Type</th>
                          <th className="px-6 py-5 text-left font-black text-gray-400 uppercase tracking-widest">Category</th>
                          <th className="px-6 py-5 text-left font-black text-gray-400 uppercase tracking-widest">Description</th>
                          <th className="px-6 py-5 text-right font-black text-gray-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-5 text-left font-black text-gray-400 uppercase tracking-widest">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {reportData.txns.map((t: any) => (
                          <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4 font-black text-black">{formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}</td>
                            <td className="px-6 py-4">
                              <span className={`font-black uppercase text-[8px] px-2 py-1 rounded-lg ${t.type === 'income' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{t.type}</span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 font-bold uppercase tracking-tight">{formatCat(t.category)}</td>
                            <td className="px-6 py-4 text-gray-400 font-medium max-w-[200px] truncate">{t.description || '—'}</td>
                            <td className="px-6 py-4 text-right font-black text-black">{formatPKR(t.amount)}</td>
                            <td className="px-6 py-4 text-indigo-600 font-mono text-[9px] uppercase font-black">{t.cashierId || t.submittedBy || '—'}</td>
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
