'use client';

import React, { useMemo } from 'react';
import { Printer, Download, X, TrendingUp, TrendingDown, Building2, Receipt } from 'lucide-react';
import { toDate, downloadElementAsPng } from '@/lib/utils';

// Helper to determine if transaction is an expense
const getIsExpense = (tx: any): boolean => {
  return (
    tx.type === 'expense' ||
    String(tx.categoryName || tx.category || '').toLowerCase().includes('expense')
  );
};

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryName?: string;
  description: string;
  paymentMethod: string;
  departmentCode?: string;
  departmentName?: string;
  _dept?: string;
  receivedBy?: string;
  cashierId?: string;
  status: string;
  createdAt: any;
  date?: any;
  transactionDate?: any;
  hospitalPatientDetails?: any;
  patientName?: string;
}

const getTxDisplayName = (tx: any): string => {
  if (tx.departmentCode === 'hospital' && tx.hospitalPatientDetails) {
    return tx.hospitalPatientDetails.patientName || tx.hospitalPatientDetails.receiverName || tx.patientName || '—';
  }
  return tx.patientName || tx.studentName || tx.seekerName || tx.staffName || tx.name || '—';
};

const getTxDisplayDescription = (tx: any): string => {
  if (tx.departmentCode === 'hospital' && tx.hospitalPatientDetails) {
    const details = tx.hospitalPatientDetails;
    if (details.type === 'expense') {
      return `Expense: ${details.reason || tx.description || 'General Expense'}`;
    }
    if (details.type === 'fee') {
      let feeLabel = 'Checkup Fee';
      if (details.feeType === 'usg') feeLabel = 'USG Fee';
      else if (details.feeType === 'bsr') feeLabel = 'BSR Fee';
      else if (details.feeType === 'hb_test') feeLabel = 'HB Test Fee';
      else if (details.feeType === 'custom') feeLabel = details.customFeeName || 'Custom Fee';
      return `Fee: ${feeLabel}${tx.description ? ` (${tx.description})` : ''}`;
    }
    if (details.type === 'medicine') {
      const itemsList = details.items?.map((it: any) => `${it.name} (Rs ${it.amount || it.price})`).join(', ') || '';
      return `Medicine: ${itemsList || tx.description || 'Prescription items'}`;
    }
    // Standard hospital patient form fallback
    const category = details.category || '';
    const reason = details.reason || '';
    return `${category}${reason ? ` - ${reason}` : ''}` || tx.description || 'Hospital Patient';
  }
  return tx.description || (getIsExpense(tx) ? 'Operational Cost' : 'General Receipt');
};

const getTxExpenseRecipient = (tx: any): string => {
  if (tx.departmentCode === 'hospital' && tx.hospitalPatientDetails) {
    return tx.hospitalPatientDetails.receiverName || tx.receivedBy || tx.cashierId || 'Staff';
  }
  return tx.receivedBy || tx.cashierId || 'Staff';
};

interface Props {
  date: string; // YYYY-MM-DD or display format
  transactions: Transaction[];
  onClose: () => void;
  generatingUser?: string;
  leftPatients?: any[];
}

export function DailyFinanceReportPrintable({ date, transactions, onClose, generatingUser, leftPatients = [] }: Props) {
  // Compute date string
  const dateStr = useMemo(() => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return date;
    }
  }, [date]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    let usgCount = 0;
    let checkupCount = 0;
    const uniquePatients = new Set<string>();
    const deptTotals: Record<string, { income: number; expense: number; count: number }> = {};
    const incomeCategories: Record<string, { total: number; txs: Transaction[] }> = {};
    const expenseCategories: Record<string, { total: number; txs: Transaction[] }> = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      const isExp = getIsExpense(tx);
      const deptKey = tx.departmentName || tx._dept || tx.departmentCode || 'General';
      const catKey = tx.categoryName || tx.category || 'General';

      // Initialize Department
      if (!deptTotals[deptKey]) {
        deptTotals[deptKey] = { income: 0, expense: 0, count: 0 };
      }
      deptTotals[deptKey].count++;

      if (isExp) {
        expenseCount++;
        totalExpense += amt;
        deptTotals[deptKey].expense += amt;

        if (!expenseCategories[catKey]) {
          expenseCategories[catKey] = { total: 0, txs: [] };
        }
        expenseCategories[catKey].total += amt;
        expenseCategories[catKey].txs.push(tx);
      } else {
        incomeCount++;
        totalIncome += amt;
        deptTotals[deptKey].income += amt;

        if (!incomeCategories[catKey]) {
          incomeCategories[catKey] = { total: 0, txs: [] };
        }
        incomeCategories[catKey].total += amt;
        incomeCategories[catKey].txs.push(tx);
      }

      // Hospital specific stats
      if (tx.departmentCode === 'hospital') {
        const details = tx.hospitalPatientDetails;
        if (details) {
          if (details.type === 'fee') {
            if (details.feeType === 'usg') {
              usgCount++;
            } else if (details.feeType === 'checkup' || details.feeType === 'none' || !details.feeType) {
              checkupCount++;
            }
          }
          if (details.type === 'fee' || details.type === 'medicine') {
            const pName = details.patientName || tx.patientName;
            if (pName && pName !== '—' && pName !== 'Inline Patient' && pName !== 'Day Close Transaction') {
              uniquePatients.add(pName.trim().toLowerCase());
            }
          }
        } else if (!isExp) {
          const pName = tx.patientName;
          if (pName && pName !== '—' && pName !== 'Inline Patient' && pName !== 'Day Close Transaction') {
            uniquePatients.add(pName.trim().toLowerCase());
          }
        }
      }
    });

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      deptTotals,
      incomeCategories,
      expenseCategories,
      incomeCount,
      expenseCount,
      usgCount,
      checkupCount,
      uniquePatients
    };
  }, [transactions]);

  // Download action
  const handleDownload = async () => {
    const el = document.getElementById('daily-finance-report-root');
    if (!el) return;
    await downloadElementAsPng(el, `daily-financial-report-${date}.png`, { scale: 2 });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto print:bg-transparent print:p-0 print:fixed print:inset-0">
      {/* Container holding controls and the printable page */}
      <div className="relative bg-zinc-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col print:max-h-none print:h-auto print:w-full print:shadow-none print:rounded-none print:bg-white overflow-hidden">
        
        {/* Sticky Action controls - Hidden during printing */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-white border-b border-gray-100 print:hidden shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Governance Archive</span>
            <h3 className="text-sm font-black uppercase text-zinc-900 tracking-tight">Daily Financial Report</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
            >
              <Download size={14} /> Download PNG
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all cursor-pointer"
            >
              <Printer size={14} /> Print Report
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* The Printable Page Sheet */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible bg-zinc-100/50 print:bg-white">
          
          {/* Printable Layout Page */}
          <div
            id="daily-finance-report-root"
            className="bg-white text-gray-900 p-10 md:p-12 w-full max-w-[800px] mx-auto print:block print:p-0 print:max-w-full print:bg-white select-none border border-zinc-200/60 print:border-none shadow-sm print:shadow-none rounded-2xl print:rounded-none"
          >
            {/* 1. LETTERHEAD HEADER */}
            <div className="flex justify-between items-center pb-5 border-b border-zinc-300">
              <div className="flex items-center gap-4">
                <img
                  src="/logo.webp"
                  alt="KHAN HUB Logo"
                  className="w-14 h-14 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <h1 className="text-base font-black text-zinc-900 tracking-tight leading-tight uppercase">
                    KHAN HUB (PVT.) LTD.
                  </h1>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-1">
                    Group of Companies
                  </p>
                  <p className="text-[8px] font-black text-zinc-300 uppercase tracking-wider leading-none mt-1">
                    SECP REGD. No. 0209901
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  Audit Summary Sheet
                </span>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2">
                  System Date: {dateStr}
                </p>
              </div>
            </div>

            {/* Title Banner */}
            <div className="bg-zinc-900 text-white font-black text-xs uppercase tracking-[0.2em] text-center py-2.5 rounded-lg my-6 leading-none">
              DAILY TRANSACTION & RECONCILIATION REPORT
            </div>

            {/* 2. STATS SCORECARD */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Gross Income</span>
                  <span className="text-lg font-black text-emerald-600">Rs {stats.totalIncome.toLocaleString()}</span>
                </div>
                <TrendingUp size={20} className="text-emerald-500 opacity-60" />
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Gross Expenses</span>
                  <span className="text-lg font-black text-rose-600">Rs {stats.totalExpense.toLocaleString()}</span>
                </div>
                <TrendingDown size={20} className="text-rose-500 opacity-60" />
              </div>
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 text-white flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Net Balance</span>
                  <span className="text-lg font-black text-white">Rs {stats.netBalance.toLocaleString()}</span>
                </div>
                <div className="bg-white/10 p-1.5 rounded-lg text-white">
                  <Building2 size={16} />
                </div>
              </div>
            </div>

            {/* DAILY ACTIVITY & PATIENT STATS SUMMARY */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/20">
                <span className="text-[9px] font-black text-zinc-450 uppercase tracking-widest block mb-3">Daily Activity Summary</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50/30 p-2.5 rounded-lg border border-emerald-100/50">
                    <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider block">Income Entries</span>
                    <span className="text-sm font-black text-emerald-600">{stats.incomeCount} entries</span>
                  </div>
                  <div className="bg-rose-50/30 p-2.5 rounded-lg border border-rose-100/50">
                    <span className="text-[8px] font-bold text-rose-700 uppercase tracking-wider block">Expense Entries</span>
                    <span className="text-sm font-black text-rose-600">{stats.expenseCount} entries</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/20">
                <span className="text-[9px] font-black text-zinc-450 uppercase tracking-widest block mb-3">Hospital Metrics Summary</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-50/50 p-2 rounded-lg border border-zinc-150">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block">Patients</span>
                    <span className="text-xs font-black text-zinc-800">{stats.uniquePatients.size} unique</span>
                  </div>
                  <div className="bg-zinc-50/50 p-2 rounded-lg border border-zinc-150">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block">Checkups</span>
                    <span className="text-xs font-black text-zinc-800">{stats.checkupCount} entries</span>
                  </div>
                  <div className="bg-zinc-50/50 p-2 rounded-lg border border-zinc-150">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block">USG</span>
                    <span className="text-xs font-black text-zinc-800">{stats.usgCount} entries</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. DEPARTMENTAL BREAKDOWN */}
            <div className="space-y-3 mb-8">
              <div className="border-l-4 border-zinc-900 pl-3.5 py-0.5">
                <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest leading-none">
                  Departmental Summary
                </h3>
              </div>
              <table className="w-full text-left border-collapse border border-zinc-200 rounded-lg overflow-hidden text-xs">
                <thead>
                  <tr className="bg-zinc-50 font-black text-[9px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                    <th className="px-4 py-3">Department Name</th>
                    <th className="px-4 py-3 text-right">Income</th>
                    <th className="px-4 py-3 text-right">Expense</th>
                    <th className="px-4 py-3 text-right">Net Balance</th>
                    <th className="px-4 py-3 text-center">Trans. Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-semibold">
                  {Object.entries(stats.deptTotals).map(([dept, data]) => (
                    <tr key={dept} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-2.5 font-bold uppercase text-zinc-700">{dept}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600">₨{data.income.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-rose-600">₨{data.expense.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-black text-zinc-800">
                        ₨{(data.income - data.expense).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-center text-zinc-500">{data.count}</td>
                    </tr>
                  ))}
                  {Object.keys(stats.deptTotals).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-zinc-400 italic">No departmental transfers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* 4. LEFT PATIENTS TODAY (HOSPITAL) */}
            <div className="space-y-3 mb-8">
              <div className="border-l-4 border-zinc-900 pl-3.5 py-0.5">
                <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest leading-none">
                  Left Patients Today (Hospital)
                </h3>
              </div>
              <table className="w-full text-left border-collapse border border-zinc-200 rounded-lg overflow-hidden text-xs">
                <thead>
                  <tr className="bg-zinc-50 font-black text-[9px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                    <th className="px-4 py-3">Patient Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Disease</th>
                    <th className="px-4 py-3 text-right">Left Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-semibold">
                  {leftPatients.length > 0 ? (
                    leftPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-2.5 font-bold uppercase text-zinc-700">{p.fullName || p.name || '—'}</td>
                        <td className="px-4 py-2.5 text-zinc-550">{p.phone || '—'}</td>
                        <td className="px-4 py-2.5 text-zinc-550 uppercase">{p.disease || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-black text-zinc-850">
                          ₨{Number(p.remaining || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-zinc-400 italic">No left patients added today.</td>
                    </tr>
                  )}
                  <tr className="bg-zinc-50/50 font-black border-t border-zinc-300">
                    <td colSpan={3} className="px-4 py-3 text-zinc-750 uppercase">Total Left Amount Today</td>
                    <td className="px-4 py-3 text-right text-zinc-900">
                      ₨{leftPatients.reduce((sum, p) => sum + (Number(p.remaining) || 0), 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. ITEMIZED INFLOW / OUTFLOW SECTION */}
            <div className="space-y-6 print:space-y-6">
              
              {/* Inflow Section */}
              <div className="space-y-3">
                <div className="border-l-4 border-emerald-600 pl-3.5 py-0.5">
                  <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                    Itemized Income Ledgers
                  </h3>
                </div>
                {Object.entries(stats.incomeCategories).map(([cat, data]) => (
                  <div key={cat} className="space-y-2 border border-zinc-200 p-4 rounded-xl bg-zinc-50/10">
                    <div className="flex justify-between items-center border-b border-dashed border-zinc-200 pb-1.5">
                      <span className="text-[10px] font-black text-zinc-800 uppercase tracking-wider">{cat}</span>
                      <span className="text-xs font-black text-emerald-600">Total Income: ₨{data.total.toLocaleString()}</span>
                    </div>
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="text-[8px] uppercase tracking-widest text-zinc-400 font-black border-b border-zinc-100">
                          <th className="py-1">Time</th>
                          <th className="py-1">Dept</th>
                          <th className="py-1">Ref/Name</th>
                          <th className="py-1">Description</th>
                          <th className="py-1">Method</th>
                          <th className="py-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                        {data.txs.map((tx) => (
                          <tr key={tx.id}>
                            <td className="py-1.5 text-zinc-400 whitespace-nowrap">
                              {tx.createdAt ? new Date(tx.createdAt.toMillis?.() || tx.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </td>
                            <td className="py-1.5 uppercase font-bold text-zinc-600">{tx.departmentName || tx._dept || tx.departmentCode}</td>
                            <td className="py-1.5 font-bold truncate max-w-[120px]">{getTxDisplayName(tx)}</td>
                            <td className="py-1.5 truncate max-w-[160px]">{getTxDisplayDescription(tx)}</td>
                            <td className="py-1.5 uppercase text-zinc-500 text-[8px] tracking-wider">{tx.paymentMethod}</td>
                            <td className="py-1.5 text-right font-bold text-emerald-600">₨{tx.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {Object.keys(stats.incomeCategories).length === 0 && (
                  <div className="py-8 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-xl">
                    <p className="text-zinc-400 font-semibold text-xs italic">No Inflows Recorded</p>
                  </div>
                )}
              </div>

              {/* Outflow Section */}
              <div className="space-y-3">
                <div className="border-l-4 border-rose-600 pl-3.5 py-0.5">
                  <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none">
                    Itemized Expenses Ledgers
                  </h3>
                </div>
                {Object.entries(stats.expenseCategories).map(([cat, data]) => (
                  <div key={cat} className="space-y-2 border border-zinc-200 p-4 rounded-xl bg-zinc-50/10">
                    <div className="flex justify-between items-center border-b border-dashed border-zinc-200 pb-1.5">
                      <span className="text-[10px] font-black text-zinc-800 uppercase tracking-wider">{cat}</span>
                      <span className="text-xs font-black text-rose-600">Total Expense: ₨{data.total.toLocaleString()}</span>
                    </div>
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="text-[8px] uppercase tracking-widest text-zinc-400 font-black border-b border-zinc-100">
                          <th className="py-1">Time</th>
                          <th className="py-1">Dept</th>
                          <th className="py-1">Staff/Cashier</th>
                          <th className="py-1">Description</th>
                          <th className="py-1">Method</th>
                          <th className="py-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                        {data.txs.map((tx) => (
                          <tr key={tx.id}>
                            <td className="py-1.5 text-zinc-400 whitespace-nowrap">
                              {tx.createdAt ? new Date(tx.createdAt.toMillis?.() || tx.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </td>
                            <td className="py-1.5 uppercase font-bold text-zinc-600">{tx.departmentName || tx._dept || tx.departmentCode}</td>
                            <td className="py-1.5 font-bold truncate max-w-[120px]">{getTxExpenseRecipient(tx)}</td>
                            <td className="py-1.5 truncate max-w-[160px]">{getTxDisplayDescription(tx)}</td>
                            <td className="py-1.5 uppercase text-zinc-500 text-[8px] tracking-wider">{tx.paymentMethod}</td>
                            <td className="py-1.5 text-right font-bold text-rose-600">₨{tx.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {Object.keys(stats.expenseCategories).length === 0 && (
                  <div className="py-8 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-xl">
                    <p className="text-zinc-400 font-semibold text-xs italic">No Outflows Recorded</p>
                  </div>
                )}
              </div>

            </div>

            {/* 5. AUDIT FOOTER & CONFIDENTIALITY */}
            <hr className="my-8 border-t border-zinc-200" />
            <div className="space-y-6">
              <div className="flex justify-between items-center text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">
                <span>Governance Control Log</span>
                <span>Report Generated By: {generatingUser || 'Audit Session'}</span>
              </div>

              {/* Signature Lines */}
              <div className="flex justify-between items-end pt-10">
                <div className="w-48 text-center">
                  <div className="border-b border-zinc-300 w-full mb-1.5" />
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    Cashier Signature
                  </span>
                </div>

                <div className="w-48 text-center">
                  <div className="border-b border-zinc-300 w-full mb-1.5" />
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    Authorized Officer
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
