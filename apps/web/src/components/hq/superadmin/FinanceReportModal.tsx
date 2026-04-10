// apps/web/src/components/hq/superadmin/FinanceReportModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Filter, TrendingUp, TrendingDown, Package, User } from 'lucide-react';
import { FinanceReport, fetchFinanceReport, FinanceTab } from '@/lib/hq/superadmin/finance';
import { formatPKR } from '@/lib/hq/superadmin/format';
import { toDate } from '@/lib/utils';

interface FinanceReportModalProps {
  tab: FinanceTab;
  onClose: () => void;
}

export function FinanceReportModal({ tab, onClose }: FinanceReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date()
  });

  useEffect(() => {
    loadReport();
  }, [dateRange, tab]);

  async function loadReport() {
    setLoading(true);
    try {
      const data = await fetchFinanceReport(tab, dateRange.start, dateRange.end);
      setReport(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:relative">
      <div className="w-full max-w-5xl h-[90vh] overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-[#0A0A0A] dark:border dark:border-white/10 flex flex-col print:h-auto print:rounded-none print:shadow-none print:border-none">
        
        {/* Header - Hidden on Print */}
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6 dark:border-white/5 print:hidden">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Detailed Finance Report</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{tab} Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="px-6 py-3 rounded-2xl bg-gray-900 text-xs font-black uppercase tracking-widest text-white hover:bg-black transition-all flex items-center gap-2 dark:bg-orange-600 dark:hover:bg-orange-700"
            >
              <Printer size={16} />
              Print Report
            </button>
            <button onClick={onClose} className="rounded-2xl p-3 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters - Hidden on Print */}
        <div className="bg-gray-50/50 px-8 py-4 border-b border-gray-100 dark:bg-white/5 dark:border-white/5 flex flex-wrap items-center gap-4 print:hidden">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 dark:bg-black dark:border-white/10">
            <Filter size={14} className="text-gray-400" />
            <input 
              type="date" 
              className="bg-transparent border-none outline-none text-xs font-bold dark:text-white"
              value={dateRange.start.toISOString().split('T')[0]}
              onChange={e => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
            />
            <span className="text-gray-300">to</span>
            <input 
              type="date" 
              className="bg-transparent border-none outline-none text-xs font-bold dark:text-white"
              value={dateRange.end.toISOString().split('T')[0]}
              onChange={e => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
            />
          </div>
          {loading && <p className="text-xs font-bold text-orange-600 animate-pulse">Updating report data...</p>}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-12 space-y-12 print:p-0 print:overflow-visible">
          {/* Report Header for Print */}
          <div className="hidden print:block text-center border-b-2 border-gray-900 pb-8">
            <h1 className="text-4xl font-black text-black">KHANHUB FINANCE REPORT</h1>
            <p className="mt-2 text-lg font-bold text-gray-600">Department: {tab.toUpperCase()}</p>
            <p className="text-sm font-medium text-gray-500">Period: {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}</p>
          </div>

          {!report ? (
             <div className="flex flex-col items-center justify-center py-20 grayscale opacity-20">
               <Package size={64} />
               <p className="mt-4 font-black">No Data Loaded</p>
             </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 rounded-[2rem] bg-green-50 border border-green-100 dark:bg-green-500/5 dark:border-green-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-white dark:bg-black shadow-sm">
                      <TrendingUp className="text-green-600" size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-700/60">Total Income</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">{formatPKR(report.income)}</p>
                </div>

                <div className="p-8 rounded-[2rem] bg-rose-50 border border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-white dark:bg-black shadow-sm">
                      <TrendingDown className="text-rose-600" size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-700/60">Total Expenses</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">{formatPKR(report.expense)}</p>
                </div>

                <div className="p-8 rounded-[2rem] bg-gray-900 text-white dark:bg-orange-600 shadow-xl shadow-gray-900/10 active:scale-[0.98] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-white/10">
                      <TrendingUp className="text-white" size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Net Profit/Loss</span>
                  </div>
                  <p className="text-3xl font-black">{formatPKR(report.net)}</p>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-gray-100 pb-4 dark:border-white/5">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Transaction Breakdown</h3>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-[10px] font-black dark:bg-white/5 dark:text-gray-400">
                    {report.transactions.length} ITEMS
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Payer/Vendor</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {report.transactions.map((tx, idx) => {
                        const isExp = tx.type === 'expense' || String(tx.categoryName || tx.category || '').toLowerCase().includes('expense');
                        return (
                          <tr key={tx.id || idx} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-4 py-4 text-xs font-bold text-gray-500 whitespace-nowrap">
                              {toDate(tx.transactionDate || tx.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-xs font-black uppercase text-gray-700 dark:text-gray-300 tracking-tighter">
                                {tx.categoryName || tx.category || 'Other'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 dark:bg-white/5">
                                    <User size={12} />
                                  </div>
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {tx.patientName || tx.studentName || tx.vendorName || tx.name || 'Anonymous'}
                                  </span>
                                </div>
                            </td>
                            <td className="px-4 py-4">
                               <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">
                                 {tx.paymentMethod || 'Cash'}
                               </span>
                            </td>
                            <td className={`px-4 py-4 text-right font-black text-sm ${isExp ? 'text-rose-600' : 'text-green-600'}`}>
                              {isExp ? '-' : '+'}{formatPKR(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categorical Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 border-b border-gray-100 pb-2 dark:border-white/5">Spending by Category</h4>
                  <div className="space-y-4">
                    {Object.entries(report.categories)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, val]) => (
                        <div key={name} className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{name}</span>
                          <div className="flex items-center gap-4 flex-1 mx-8 h-1 bg-gray-100 rounded-full dark:bg-white/5">
                            <div 
                              className="h-full bg-orange-500 rounded-full" 
                              style={{ width: `${Math.min(100, (val / Math.max(report.income, report.expense)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-gray-900 dark:text-white">{formatPKR(val)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-orange-50/50 p-8 rounded-[2.5rem] dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/20">
                  <h4 className="text-sm font-black uppercase tracking-widest text-orange-600 mb-4">Financial Insight</h4>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-200 leading-relaxed">
                    This report shows a net movement of <span className="font-black">{formatPKR(report.net)}</span> over the selected period. 
                    {report.income > report.expense 
                      ? " The department is currently operating with a positive cash flow." 
                      : " Expenses currently exceed income for this period. Review category-wise spending for optimizations."}
                  </p>
                  <p className="mt-6 text-[10px] font-bold text-orange-400 uppercase tracking-widest">Auto-generated by KhanHub AI</p>
                </div>
              </div>

              {/* Print Footer */}
              <div className="hidden print:flex justify-between items-center pt-20 border-t border-gray-100 text-[10px] font-bold text-gray-400">
                <p>KhanHub Management System - Official Finance Document</p>
                <p>Generated on: {new Date().toLocaleString()}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
