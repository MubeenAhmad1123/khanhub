// apps/web/src/components/hq/superadmin/FinanceReportModal.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Printer, Filter, TrendingUp, TrendingDown, Package, User, CalendarDays, Search, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FinanceReport, fetchFinanceReport, FinanceTab } from '@/lib/hq/superadmin/finance';
import { formatPKR } from '@/lib/hq/superadmin/format';
import { toDate, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FinanceReportModalProps {
  tab: FinanceTab;
  onClose: () => void;
}

/**
 * Helper to convert local date string (YYYY-MM-DD) to a Date object at start of day local time
 */
function localDate(val: string) {
  const [y, m, d] = val.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Helper to format a Date object for the <input type="date" /> value (YYYY-MM-DD) correctly
 */
function toInputDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function FinanceReportModal({ tab, onClose }: FinanceReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FinanceReport | null>(null);
  
  // Initialize with current month
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date()
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReport();
  }, [dateRange, tab]);

  async function loadReport() {
    if (dateRange.start > dateRange.end) {
      toast.error("Invalid range! Swapping dates...", { duration: 2000 });
      setDateRange({ start: dateRange.end, end: dateRange.start });
      return;
    }
    setLoading(true);
    try {
      const data = await fetchFinanceReport(tab, dateRange.start, dateRange.end);
      setReport(data);
    } catch (err) {
      console.error('Failed to load report:', err);
      toast.error("Failed to fetch records. Network error.");
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const filteredTransactions = useMemo(() => {
    if (!report) return [];
    if (!searchTerm.trim()) return report.transactions;
    const s = searchTerm.toLowerCase();
    return report.transactions.filter(tx => 
      (tx.categoryName || tx.category || '').toLowerCase().includes(s) ||
      (tx.name || tx.patientName || tx.studentName || '').toLowerCase().includes(s) ||
      (tx.id || '').toLowerCase().includes(s)
    );
  }, [report, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:p-0 print:bg-white print:relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-6xl h-[92vh] overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] dark:bg-black dark:border dark:border-white/10 flex flex-col print:h-auto print:rounded-none print:shadow-none print:border-none"
      >
        
        {/* Header - Hidden on Print */}
        <div className="flex items-center justify-between border-b border-gray-100 px-10 py-7 dark:border-white/5 print:hidden">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-black dark:text-white">Financial Intelligence</h2>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-1">Detailed audit report - {tab.toUpperCase()} Gateway</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={handlePrint}
              disabled={loading || !report}
              className="px-6 py-3 rounded-2xl bg-gray-900 text-[10px] font-black uppercase tracking-widest text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 dark:bg-orange-600 dark:hover:bg-orange-700 shadow-xl"
            >
              <Printer size={16} />
              Export & Print
            </button>
            <button onClick={onClose} className="rounded-2xl p-3 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Dynamic Controls - Hidden on Print */}
        <div className="bg-gray-50 dark:bg-white/5 px-10 py-5 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 print:hidden">
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-2.5 shadow-sm dark:bg-black dark:border-white/10 w-full sm:w-auto">
              <CalendarDays size={16} className="text-gray-400" />
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  className="bg-transparent border-none outline-none text-[11px] font-black uppercase tracking-wider dark:text-white"
                  value={toInputDate(dateRange.start)}
                  onChange={e => setDateRange(prev => ({ ...prev, start: localDate(e.target.value) }))}
                />
                <span className="text-[10px] font-black text-gray-300 uppercase">to</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none outline-none text-[11px] font-black uppercase tracking-wider dark:text-white"
                  value={toInputDate(dateRange.end)}
                  onChange={e => setDateRange(prev => ({ ...prev, end: localDate(e.target.value) }))}
                />
              </div>
            </div>

            {loading && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-orange-500/30 border-t-orange-600 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Processing Data...</p>
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text"
              placeholder="Filter by name or category..."
              className="w-full bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-gray-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-12 space-y-12 print:p-0 print:overflow-visible custom-scrollbar">
          {/* Report Header for Print */}
          <div className="hidden print:block text-center border-b-[3px] border-black pb-10">
            <h1 className="text-5xl font-black text-black tracking-tighter">KHANHUB FINANCIAL AUDIT</h1>
            <div className="mt-4 flex items-center justify-center gap-8 border-y border-black/10 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-600">DEPT: {tab.toUpperCase()}</p>
              <p className="text-xs font-black uppercase tracking-widest text-gray-600">PERIOD: {dateRange.start.toLocaleDateString('en-PK')} — {dateRange.end.toLocaleDateString('en-PK')}</p>
            </div>
          </div>

          {!report && !loading ? (
             <div className="flex flex-col items-center justify-center py-32 opacity-30 grayscale">
               <Package size={80} className="text-gray-400" />
               <h3 className="mt-6 text-xl font-black uppercase tracking-[0.2em]">Zero Records Found</h3>
               <p className="mt-2 text-sm font-bold">Try adjusting your date range or portal selection.</p>
             </div>
          ) : report && (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative overflow-hidden p-8 rounded-[2.5rem] bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-white dark:bg-black shadow-sm text-emerald-600 dark:text-emerald-400">
                      <TrendingUp size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800/40 dark:text-emerald-400/20">Revenue Influx</span>
                  </div>
                  <p className="text-3xl font-black text-black dark:text-white leading-none">{formatPKR(report.income)}</p>
                  <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-emerald-500/5 blur-3xl" />
                </div>

                <div className="relative overflow-hidden p-8 rounded-[2.5rem] bg-rose-50 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-white dark:bg-black shadow-sm text-rose-600 dark:text-rose-400">
                      <TrendingDown size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-800/40 dark:text-rose-400/20">Capital Outflow</span>
                  </div>
                  <p className="text-3xl font-black text-black dark:text-white leading-none">{formatPKR(report.expense)}</p>
                  <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-rose-500/5 blur-3xl" />
                </div>

                <div className={cn(
                  "relative overflow-hidden p-8 rounded-[2.5rem] text-white shadow-2xl transition-all",
                  report.net >= 0 ? "bg-gray-900 shadow-gray-900/10 dark:bg-orange-600" : "bg-rose-600 shadow-rose-600/10"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
                      <TrendingUp className="text-white" size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Net Movement</span>
                  </div>
                  <p className="text-3xl font-black leading-none">{formatPKR(report.net)}</p>
                  <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-3xl" />
                </div>
              </div>

              {/* Transactions Ecosystem */}
              <div className="mt-16 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-gray-100 pb-6 dark:border-white/5">
                  <div>
                    <h3 className="text-2xl font-black text-black dark:text-white tracking-tight">Ledger Operations</h3>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Granular transactional feed</p>
                  </div>
                  <span className="px-5 py-2 rounded-2xl bg-gray-900 text-[10px] font-black text-white dark:bg-orange-600 uppercase tracking-widest">
                    {filteredTransactions.length} of {report.transactions.length} Activity Units
                  </span>
                </div>

                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5">
                        <th className="px-6 py-4">Timeline</th>
                        <th className="px-6 py-4">Departmental Node</th>
                        <th className="px-6 py-4">Entity Identity</th>
                        <th className="px-6 py-4">Operational Type</th>
                        <th className="px-6 py-4 text-right">Fiscal Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {filteredTransactions.map((tx: any, idx: number) => {
                        const isExp = tx.type === 'expense' || String(tx.categoryName || tx.category || '').toLowerCase().includes('expense');
                        return (
                          <tr key={tx.id || idx} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
                            <td className="px-6 py-5">
                              <p className="text-[11px] font-black text-black dark:text-white leading-none">
                                {toDate(tx.transactionDate || tx.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                              <p className="mt-1 text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                {toDate(tx.transactionDate || tx.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <span className={cn(
                                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                                tx._dept === 'rehab' ? "bg-rose-500/10 text-rose-600 border-rose-200" :
                                tx._dept === 'spims' ? "bg-teal-500/10 text-teal-600 border-teal-200" :
                                tx._dept === 'job-center' ? "bg-amber-500/10 text-amber-600 border-amber-200" :
                                "bg-gray-500/10 text-gray-600 border-gray-200"
                              )}>
                                {tx._dept}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-[11px] font-black text-gray-400 dark:bg-white/5">
                                    <User size={14} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-black dark:text-white leading-none">
                                      {tx.patientName || tx.studentName || tx.vendorName || tx.name || tx.byName || 'Unknown Entity'}
                                    </p>
                                    <p className="mt-1 text-[10px] font-bold text-gray-400 font-mono tracking-tighter">
                                      {tx.customId || tx.userId || tx.studentId || tx.patientId || tx.id?.slice(0, 10) || 'ID:—'}
                                    </p>
                                  </div>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest block">
                                  {tx.categoryName || tx.category || 'Revenue Entry'}
                                </span>
                                <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase mt-0.5">
                                  via {tx.paymentMethod || 'Cash'}
                                </span>
                            </td>
                            <td className={`px-6 py-5 text-right font-black text-sm whitespace-nowrap ${isExp ? 'text-rose-600' : 'text-emerald-600'}`}>
                              <span className="opacity-50 mr-1">{isExp ? '▼' : '▲'}</span>
                              {formatPKR(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-20 text-center opacity-40 italic font-black text-xs uppercase tracking-[0.2em]">No matches found for your criteria</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Growth Analysis / Summary */}
                <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-gray-100 dark:border-white/5 pt-16">
                  <div>
                     <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 mb-8 border-l-4 border-gray-900 pl-4">Sector Distribution</h4>
                     <div className="grid grid-cols-1 gap-5">
                       {Object.entries(report.categories)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, val], i) => (
                         <div key={name} className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 transition-all outline outline-1 outline-transparent hover:outline-gray-200 dark:hover:outline-white/10">
                           <div className="flex-1">
                             <div className="flex items-center justify-between mb-2">
                               <span className="text-xs font-black uppercase tracking-tight text-gray-500 dark:text-gray-400">{name}</span>
                               <span className="text-xs font-black text-black dark:text-white">{formatPKR(val)}</span>
                             </div>
                             <div className="h-1.5 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${Math.min(100, (val / Math.max(report.income, 1)) * 100)}%` }}
                                 transition={{ delay: 0.2 + (i*0.05), duration: 0.8 }}
                                 className="h-full bg-orange-600 rounded-full"
                               />
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex-grow rounded-[2.5rem] bg-orange-600 p-10 text-white shadow-2xl shadow-orange-600/20 relative overflow-hidden group">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/60 mb-6">AI Strategic Analysis</h4>
                      <p className="text-lg font-black leading-tight tracking-tight">
                        {report.income > report.expense 
                          ? `The department has achieved a surplus of ${formatPKR(report.net)} within the selected parameters, indicating strong operational health.` 
                          : `A deficit of ${formatPKR(Math.abs(report.net))} has been observed. Strategic review of categorical spending nodes is advised.`}
                      </p>
                      <p className="mt-6 text-sm font-medium text-white/80 leading-relaxed max-w-[90%]">
                        Based on the current trajectory, the department is maintaining an efficient fiscal model. {report.transactions.length > 50 ? "High transaction volume suggests active operational engagement." : "Moderate volume allows for highly precise financial oversight."}
                      </p>
                      <div className="mt-10 pt-10 border-t border-white/20">
                         <p className="text-[10px] font-black uppercase tracking-widest opacity-40">System Generated Digest • SECURE DOCUMENT</p>
                      </div>
                      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl transition-transform group-hover:scale-125 duration-1000" />
                    </div>
                  </div>
                </div>

                {/* Print Footer */}
                <div className="hidden print:flex items-center justify-between border-t-2 border-black pt-12 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <p>© KhanHub Intelligent Management Systems — Financial Division</p>
                  <p>Authenticated Snapshot: {new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}


