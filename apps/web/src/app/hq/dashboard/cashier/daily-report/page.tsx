'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { 
  ArrowLeft, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Filter, 
  LayoutDashboard, 
  List, 
  Printer, 
  Search, 
  TrendingDown, 
  TrendingUp,
  Wallet
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, formatDateDMY, toDate } from '@/lib/utils';

type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryName?: string;
  description: string;
  paymentMethod: string;
  departmentId: string;
  departmentName: string;
  receivedBy: string;
  status: string;
  createdAt: any;
  dateStr: string;
};

export default function DailyReportPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    fetchData();
  }, [sessionLoading, session, reportDate]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch from cashierTransactions collection
      // Rule 51 compliance: query without mixed where/orderBy, sort client-side
      const q = query(
        collection(db, 'cashierTransactions'),
        where('dateStr', '==', formatDateDMY(new Date(reportDate)))
      );
      
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      
      // Client-side sort to follow business rules and avoid index complexites
      data.sort((a,b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
      
      setTransactions(data);
    } catch (err: any) {
      console.error('Error fetching daily report:', err);
      setError('Failed to load transaction data.');
    } finally {
      setLoading(false);
    }
  }

  // Calculations for Summary View
  const stats = useMemo(() => {
    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      netTotal: 0,
      deptTotals: {} as Record<string, { income: number, expense: number }>,
      categoryTotals: {} as Record<string, number>,
      methodTotals: {} as Record<string, number>,
    };

    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        summary.totalIncome += amt;
        if (!summary.deptTotals[tx.departmentName]) summary.deptTotals[tx.departmentName] = { income: 0, expense: 0 };
        summary.deptTotals[tx.departmentName].income += amt;
      } else {
        summary.totalExpense += amt;
        if (!summary.deptTotals[tx.departmentName]) summary.deptTotals[tx.departmentName] = { income: 0, expense: 0 };
        summary.deptTotals[tx.departmentName].expense += amt;
      }

      const catKey = tx.categoryName || tx.category || 'Uncategorized';
      summary.categoryTotals[catKey] = (summary.categoryTotals[catKey] || 0) + (tx.type === 'income' ? amt : -amt);
      
      const methodKey = tx.paymentMethod || 'Other';
      summary.methodTotals[methodKey] = (summary.methodTotals[methodKey] || 0) + amt;
    });

    summary.netTotal = summary.totalIncome - summary.totalExpense;
    return summary;
  }, [transactions]);

  function handlePrint() {
    window.print();
  }

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading Daily Report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Financial Report</h1>
              <p className="text-sm text-slate-500 font-medium">HQ Cashier Audit Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <input 
                type="date" 
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-xl text-sm font-semibold text-slate-700 outline-none transition-all cursor-pointer"
              />
            </div>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-100 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        {/* Toggle Controls */}
        <div className="flex justify-center mb-8 print:hidden">
          <div className="bg-slate-200 p-1 rounded-2xl flex items-center shadow-inner">
            <button 
              onClick={() => setViewMode('summary')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                viewMode === 'summary' 
                  ? "bg-white text-indigo-700 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Summary View
            </button>
            <button 
              onClick={() => setViewMode('detail')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                viewMode === 'detail' 
                  ? "bg-white text-indigo-700 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <List className="w-4 h-4" />
              Detailed Logs
            </button>
          </div>
        </div>

        {viewMode === 'summary' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-50/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-emerald-50 p-3 rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Today's Income</span>
                </div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">Total Received</h3>
                <p className="text-3xl font-black text-slate-900">PKR {stats.totalIncome.toLocaleString()}</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm shadow-rose-50/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-rose-50 p-3 rounded-2xl">
                    <TrendingDown className="w-6 h-6 text-rose-600" />
                  </div>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">Today's Expense</span>
                </div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">Total Paid</h3>
                <p className="text-3xl font-black text-slate-900">PKR {stats.totalExpense.toLocaleString()}</p>
              </div>

              <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg shadow-indigo-100 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-white/80 bg-white/10 px-2 py-1 rounded-lg">Net Standing</span>
                </div>
                <h3 className="text-sm font-medium text-white/70 mb-1">Closing Balance</h3>
                <p className="text-3xl font-black text-white">PKR {stats.netTotal.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Department Totals */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="font-bold text-slate-800">Department Wise Breakdown</h2>
                </div>
                <div className="p-6">
                  {Object.keys(stats.deptTotals).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(stats.deptTotals).map(([dept, totals]) => (
                        <div key={dept} className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 capitalize">{dept}</span>
                            <span className="text-sm font-black text-indigo-600">PKR {(totals.income - totals.expense).toLocaleString()}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="flex justify-between text-emerald-600 font-bold">
                              <span>In:</span>
                              <span>PKR {totals.income.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-rose-600 font-bold">
                              <span>Out:</span>
                              <span>PKR {totals.expense.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-10 text-slate-400 italic">No department data for this date.</p>
                  )}
                </div>
              </div>

              {/* Payment Method Totals */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm font-medium">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="font-bold text-slate-800">Payment Collection Modes</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {Object.entries(stats.methodTotals).map(([method, total]) => (
                      <div key={method} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
                        <span className="text-slate-600 capitalize">{method.replace('_', ' ')}</span>
                        <span className="font-bold text-slate-900">PKR {total.toLocaleString()}</span>
                      </div>
                    ))}
                    {Object.keys(stats.methodTotals).length === 0 && (
                      <p className="text-center py-10 text-slate-400 italic font-normal">No transaction methods recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Detailed Table View */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <List className="w-5 h-5 text-indigo-600" />
                Transaction Audit Logs
              </h2>
            </div>
            
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto print:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[10px] uppercase tracking-widest font-black text-slate-500">
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Dept</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {tx.createdAt ? new Date(tx.createdAt.toMillis?.() || tx.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded-md uppercase">
                            {tx.departmentId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-500">
                            {tx.categoryName || tx.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-sm text-slate-700 font-medium">
                          {tx.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 capitalize">
                          {tx.paymentMethod?.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <span className={cn(
                            "font-black text-sm",
                            tx.type === 'income' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2 py-1 rounded-full",
                            tx.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                            tx.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-20 text-center text-slate-400 font-medium">
                          No transactions found for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 px-4 pb-6 print:hidden">
                {transactions.map((tx) => (
                  <div key={tx.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            {tx.createdAt ? new Date(tx.createdAt.toMillis?.() || (tx.createdAt.seconds * 1000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </p>
                          <span className="text-[9px] font-black text-slate-600 px-1.5 py-0.5 bg-slate-100 rounded uppercase">
                            {tx.departmentId}
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900">{tx.categoryName || tx.category}</h3>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-black", tx.type === 'income' ? "text-emerald-600" : "text-rose-600")}>
                          {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString()}
                        </p>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full inline-block mt-1",
                          tx.status === 'approved' ? "bg-emerald-100 text-emerald-700" : 
                          tx.status === 'rejected' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                        )}>{tx.status}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-2 border-t border-slate-50 pt-2 italic">
                      {tx.description || 'No description'}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-1">
                      <span>{tx.paymentMethod?.replace('_', ' ')}</span>
                      <span>By {tx.receivedBy || 'N/A'}</span>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-center py-20 text-slate-400 font-medium">
                    No transactions found for this date.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CSS for print */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
          }
          .print\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .bg-white {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
