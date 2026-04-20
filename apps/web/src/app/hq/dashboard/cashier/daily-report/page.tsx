'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { 
  AlertCircle,
  ArrowLeft, 
  Calculator,
  Calendar, 
  CheckCircle2,
  ChevronDown, 
  ChevronUp, 
  Coins,
  Download, 
  FileCheck,
  Filter, 
  LayoutDashboard, 
  List, 
  Loader2,
  Printer, 
  Save,
  Search, 
  TrendingDown, 
  TrendingUp,
  Wallet,
  X
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, formatDateDMY, parseDateDMY, toDate } from '@/lib/utils';

// Shared with main cashier page
const DEPARTMENTS = [
  { code: 'rehab', label: 'Rehab Center', txCollection: 'rehab_transactions' },
  { code: 'spims', label: 'Spims', txCollection: 'spims_transactions' },
  { code: 'hospital', label: 'Khan Hospital', txCollection: 'hospital_transactions' },
  { code: 'sukoon-center', label: 'Sukoon Center', txCollection: 'sukoon_transactions' },
  { code: 'welfare', label: 'Welfare', txCollection: 'welfare_transactions' },
  { code: 'job-center', label: 'Job Center', txCollection: 'job_center_transactions' },
];

type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryName?: string;
  description: string;
  paymentMethod: string;
  departmentCode: string;
  departmentName: string;
  receivedBy?: string;
  cashierId?: string;
  status: string;
  createdAt: any;
  date?: any;
  transactionDate?: any;
};

export default function DailyReportPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settlement States
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [actualCash, setActualCash] = useState('');
  const [closingNote, setClosingNote] = useState('');
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const allTxs: Transaction[] = [];
      const reportDateObj = new Date(reportDate);
      const startOfDay = new Date(reportDateObj.setHours(0, 0, 0, 0));
      const endOfDay = new Date(reportDateObj.setHours(23, 59, 59, 999));
      
      const startTimestamp = Timestamp.fromDate(startOfDay);
      const endTimestamp = Timestamp.fromDate(endOfDay);

      // Aggregated fetch from all departmental collections
      const fetchPromises = DEPARTMENTS.map(async (dept) => {
        try {
          // Optimized query using the new composite indexes (date ASC/DESC)
          const q = query(
            collection(db, dept.txCollection),
            where('date', '>=', startTimestamp),
            where('date', '<=', endTimestamp),
            orderBy('date', 'desc')
          );
          const snap = await getDocs(q);
          return snap.docs.map(doc => ({
            id: doc.id,
            departmentCode: dept.code,
            departmentName: dept.label,
            ...doc.data()
          })) as Transaction[];
        } catch (err) {
          console.warn(`[DailyReport] Failed optimized fetch for ${dept.code}, falling back...`, err);
          // Fallback if index not yet propagation
          const qFallback = query(
            collection(db, dept.txCollection),
            orderBy('createdAt', 'desc'),
            limit(200)
          );
          const snap = await getDocs(qFallback);
          return snap.docs
            .map(doc => ({ id: doc.id, departmentCode: dept.code, departmentName: dept.label, ...doc.data() }))
            .filter((t: any) => {
              const d = toDate(t.date || t.transactionDate || t.createdAt);
              return d && d >= startOfDay && d <= endOfDay;
            }) as Transaction[];
        }
      });

      // Also fetch from legacy/generic cashierTransactions if it exists
      const genericPromise = (async () => {
        try {
          const q = query(
            collection(db, 'cashierTransactions'),
            where('date', '>=', startTimestamp),
            where('date', '<=', endTimestamp)
          );
          const snap = await getDocs(q);
          return snap.docs.map(doc => ({ id: doc.id, departmentCode: 'other', departmentName: 'General', ...doc.data() })) as Transaction[];
        } catch { return []; }
      })();

      const results = await Promise.all([...fetchPromises, genericPromise]);
      const flattened = results.flat();
      
      flattened.sort((a, b) => {
        const dateA = toDate(a.transactionDate || a.date || a.createdAt);
        const dateB = toDate(b.transactionDate || b.date || b.createdAt);
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      });
      
      setTransactions(flattened);

      // Check if already closed for this specific date
      const closedQ = query(
        collection(db, 'hq_reconciliation'),
        where('date', '==', formatDateDMY(new Date(reportDate))),
        limit(1)
      );
      const closedSnap = await getDocs(closedQ);
      setIsDayClosed(!closedSnap.empty);

    } catch (err: any) {
      console.error('Error fetching daily report:', err);
      setError('Failed to load transaction data.');
    } finally {
      setLoading(false);
    }
  }, [session, reportDate]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    fetchData();
    fetchOpeningBalance();
  }, [sessionLoading, session, reportDate, fetchData]);

  async function fetchOpeningBalance() {
    try {
      const q = query(
        collection(db, 'hq_reconciliation'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setOpeningBalance(snap.docs[0].data().actualClosing || snap.docs[0].data().actualCash || 0);
      }
    } catch (err) {
      console.error('Error fetching opening balance:', err);
    }
  }

  const handleCloseDay = async () => {
    if (!actualCash) return alert('Please enter actual cash in hand');
    setSubmitting(true);
    try {
      const actual = Number(actualCash);
      const expected = openingBalance + stats.totalIncome - stats.totalExpense;
      const variance = actual - expected;

      await addDoc(collection(db, 'hq_reconciliation'), {
        date: formatDateDMY(new Date(reportDate)),
        openingBalance,
        totalInflow: stats.totalIncome,
        totalOutflow: stats.totalExpense,
        expectedClosing: expected,
        actualClosing: actual,
        actualCash: actual, // for compatibility
        variance,
        varianceNote: closingNote,
        cashierId: session?.customId || session?.uid,
        cashierName: session?.name || session?.displayName,
        status: 'submitted',
        createdAt: serverTimestamp(),
      });

      setIsDayClosed(true);
      setShowCloseModal(false);
      alert('Day closed and reconciliation submitted successfully!');
    } catch (err) {
      console.error('Error closing day:', err);
      alert('Failed to close day. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations for Summary View
  const stats = useMemo(() => {
    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      netTotal: 0,
      deptTotals: {} as Record<string, { income: number, expense: number }>,
      categoryBreakdown: {
        income: {} as Record<string, { total: number, txs: Transaction[] }>,
        expense: {} as Record<string, { total: number, txs: Transaction[] }>
      },
      methodTotals: {} as Record<string, number>,
      cashExpected: 0
    };

    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      const type = tx.type || 'income';
      const catKey = tx.categoryName || tx.category || 'Uncategorized';
      const deptName = tx.departmentName || 'Unknown';
      
      if (type === 'income') {
        summary.totalIncome += amt;
        if (!summary.categoryBreakdown.income[catKey]) {
          summary.categoryBreakdown.income[catKey] = { total: 0, txs: [] };
        }
        summary.categoryBreakdown.income[catKey].total += amt;
        summary.categoryBreakdown.income[catKey].txs.push(tx);
        
        if (!summary.deptTotals[deptName]) summary.deptTotals[deptName] = { income: 0, expense: 0 };
        summary.deptTotals[deptName].income += amt;
      } else {
        summary.totalExpense += amt;
        if (!summary.categoryBreakdown.expense[catKey]) {
          summary.categoryBreakdown.expense[catKey] = { total: 0, txs: [] };
        }
        summary.categoryBreakdown.expense[catKey].total += amt;
        summary.categoryBreakdown.expense[catKey].txs.push(tx);

        if (!summary.deptTotals[deptName]) summary.deptTotals[deptName] = { income: 0, expense: 0 };
        summary.deptTotals[deptName].expense += amt;
      }

      if (tx.paymentMethod === 'cash' && tx.status === 'approved') {
        summary.cashExpected += (type === 'income' ? amt : -amt);
      }
      
      const methodKey = tx.paymentMethod || 'Other';
      summary.methodTotals[methodKey] = (summary.methodTotals[methodKey] || 0) + (type === 'income' ? amt : -amt);
    });

    summary.netTotal = summary.totalIncome - summary.totalExpense;
    return summary;
  }, [transactions]);

  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const toggleCat = (cat: string) => {
    setExpandedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Gathering Financial Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 print:bg-white print:pb-0 font-sans">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 px-4 py-4 md:px-8 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => router.back()}
              className="p-2.5 hover:bg-slate-100/80 rounded-2xl transition-all active:scale-95 text-slate-400 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Daily Report</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">HQ Financial Intelligence</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors z-10" />
              <input 
                type="text" 
                placeholder="DD MM YYYY"
                value={formatDateDMY(reportDate)}
                onChange={(e) => setReportDate(e.target.value)}
                onBlur={(e) => {
                  const parsed = parseDateDMY(e.target.value);
                  if (parsed) setReportDate(parsed.toISOString().split('T')[0]);
                }}
                className="pl-9 pr-4 py-2.5 bg-transparent focus:bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all cursor-pointer relative z-0"
              />
            </div>
            <button 
              onClick={handlePrint}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl text-sm font-black transition-all active:scale-95 flex items-center gap-2 border border-slate-200 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            
            {!isDayClosed ? (
              <button 
                onClick={() => setShowCloseModal(true)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                Close Day
              </button>
            ) : (
                <div className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-black flex items-center gap-2 border border-emerald-100 italic">
                    <CheckCircle2 className="w-4 h-4" />
                    Day Finalized
                </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10 md:px-8">
        {isDayClosed && (
            <div className="mb-10 bg-gradient-to-r from-emerald-500 to-teal-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center gap-5">
                    <div className="bg-white/20 p-4 rounded-[2rem] backdrop-blur-md">
                        <FileCheck className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight leading-none">Financial Settlement Complete</h2>
                        <p className="text-white/80 text-xs font-bold mt-1.5 uppercase tracking-widest">Verified and Archived by Cashier Console</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="text-right hidden md:block">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</p>
                      <p className="text-sm font-black italic">Read Only</p>
                   </div>
                   <div className="w-px h-10 bg-white/20 hidden md:block mx-2" />
                   <button className="px-6 py-3 bg-white text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95">
                      Audit Trail
                   </button>
                </div>
            </div>
        )}

        <div className="flex justify-center mb-12 print:hidden">
          <div className="bg-slate-200/50 p-1.5 rounded-[22px] flex items-center border border-slate-200/50 gap-1">
            <button 
              onClick={() => setViewMode('summary')}
              className={cn(
                "flex items-center gap-2.5 px-8 py-3 rounded-2xl text-sm font-black transition-all whitespace-nowrap",
                viewMode === 'summary' 
                  ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50 scale-100" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Insight View
            </button>
            <button 
              onClick={() => setViewMode('detail')}
              className={cn(
                "flex items-center gap-2.5 px-8 py-3 rounded-2xl text-sm font-black transition-all whitespace-nowrap",
                viewMode === 'detail' 
                  ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50 scale-100" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <List className="w-4 h-4" />
              Raw Ledger
            </button>
          </div>
        </div>

        {viewMode === 'summary' ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 transition-transform group-hover:rotate-12">
                   <div className="bg-emerald-50 p-3 rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                   </div>
                </div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Income</h3>
                <p className="text-3xl font-black text-slate-900 tracking-tight">PKR {stats.totalIncome.toLocaleString()}</p>
                <div className="mt-4 flex items-center gap-1.5">
                   <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                   </div>
                </div>
              </div>

              <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 transition-transform group-hover:-rotate-12">
                   <div className="bg-rose-50 p-3 rounded-2xl">
                    <TrendingDown className="w-6 h-6 text-rose-600" />
                   </div>
                </div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Expenses</h3>
                <p className="text-3xl font-black text-slate-900 tracking-tight">PKR {stats.totalExpense.toLocaleString()}</p>
                <div className="mt-4 flex items-center gap-1.5">
                   <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(stats.totalExpense / (stats.totalIncome || 1)) * 100}%` }} />
                   </div>
                </div>
              </div>

              <div className="bg-slate-900 p-7 rounded-[32px] shadow-2xl shadow-slate-200 relative overflow-hidden group col-span-1 md:col-span-2">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Wallet className="w-20 h-20 text-white" />
                </div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Net Flow Balance</h3>
                <p className="text-4xl font-black text-white tracking-tighter">PKR {stats.netTotal.toLocaleString()}</p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expected Cash</span>
                    <span className="text-emerald-400 font-black">PKR {stats.cashExpected.toLocaleString()}</span>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-800" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Digital/Bank</span>
                    <span className="text-indigo-400 font-black">PKR {(stats.netTotal - stats.cashExpected).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                    Income Streams
                  </h2>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{Object.keys(stats.categoryBreakdown.income).length} Categories</span>
                </div>
                 <div className="space-y-3">
                  {Object.entries(stats.categoryBreakdown.income).map(([cat, data]) => (
                    <div key={cat} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:border-emerald-200">
                      <button 
                        onClick={() => toggleCat(`in-${cat}`)}
                        className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-emerald-50 p-2.5 rounded-xl">
                            <ArrowLeft className="w-5 h-5 text-emerald-600 rotate-135" />
                          </div>
                          <div className="text-left">
                            <p className="font-black text-slate-900 leading-none">{cat}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{data.txs.length} Transactions</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-black text-slate-900">PKR {data.total.toLocaleString()}</span>
                          {expandedCats.includes(`in-${cat}`) ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                      </button>
                      
                      {expandedCats.includes(`in-${cat}`) && (
                        <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/30">
                          <div className="space-y-2">
                            {data.txs.map(tx => (
                              <div key={tx.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100/50 shadow-sm">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-slate-800">{tx.description || 'General Receipt'}</p>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    {tx.departmentName} • {tx.paymentMethod}
                                  </p>
                                </div>
                                <span className="text-sm font-black text-emerald-600">+{tx.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {Object.keys(stats.categoryBreakdown.income).length === 0 && (
                    <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold italic">No Income Recorded Today</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                    <div className="w-2 h-8 bg-rose-500 rounded-full" />
                    Operating Expenses
                  </h2>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{Object.keys(stats.categoryBreakdown.expense).length} Categories</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.categoryBreakdown.expense).map(([cat, data]) => (
                    <div key={cat} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:border-rose-200">
                      <button 
                        onClick={() => toggleCat(`ex-${cat}`)}
                        className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-rose-50 p-2.5 rounded-xl">
                            <ArrowLeft className="w-5 h-5 text-rose-600 -rotate-45" />
                          </div>
                          <div className="text-left">
                            <p className="font-black text-slate-900 leading-none">{cat}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{data.txs.length} Transactions</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-black text-slate-900">PKR {data.total.toLocaleString()}</span>
                          {expandedCats.includes(`ex-${cat}`) ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                      </button>
                      
                      {expandedCats.includes(`ex-${cat}`) && (
                        <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/30">
                          <div className="space-y-2">
                            {data.txs.map(tx => (
                              <div key={tx.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100/50 shadow-sm">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-slate-800">{tx.description || 'Operational Cost'}</p>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    {tx.departmentName} • {tx.receivedBy || tx.cashierId || 'Staff'}
                                  </p>
                                </div>
                                <span className="text-sm font-black text-rose-600">-{tx.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                   {Object.keys(stats.categoryBreakdown.expense).length === 0 && (
                    <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold italic">No Expenses Recorded Today</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-8 px-2">Cash Flow by Department</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(stats.deptTotals).map(([dept, totals]) => (
                        <div key={dept} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 relative group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                            <div className="flex justify-between items-start mb-6">
                                <span className="p-2 bg-white rounded-xl text-[10px] font-black uppercase text-slate-500 shadow-sm border border-slate-100">{dept}</span>
                                <span className="text-sm font-black text-slate-900">PKR {(totals.income - totals.expense).toLocaleString()}</span>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-1.5">
                                        <span>Income</span>
                                        <span className="text-emerald-600">PKR {totals.income.toLocaleString()}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-1.5">
                                        <span>Expense</span>
                                        <span className="text-rose-600">PKR {totals.expense.toLocaleString()}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full">
                                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(totals.expense / (totals.income || 1)) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <List className="w-5 h-5 text-indigo-600" />
                Transaction Audit Logs
              </h2>
            </div>
            
            <div className="space-y-4">
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
                            {tx.departmentCode}
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
                            {tx.departmentCode}
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
                      <span>By {tx.receivedBy || tx.cashierId || 'N/A'}</span>
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

      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowCloseModal(false)} />
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-8 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Day Settlement</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Audit Ref: {reportDate}</p>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1.5 leading-none">Opening</p>
                  <p className="text-lg font-black text-slate-900">Rs {openingBalance.toLocaleString()}</p>
                </div>
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1.5 leading-none">Today's Flow</p>
                  <p className="text-lg font-black text-slate-900">Rs {stats.netTotal.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-indigo-600 p-8 rounded-[32px] text-center text-white shadow-xl shadow-indigo-200">
                <div className="flex flex-col items-center">
                   <div className="bg-white/20 p-3 rounded-2xl mb-4 backdrop-blur-sm">
                      <Calculator className="w-6 h-6 text-white" />
                   </div>
                   <h3 className="text-xs font-black text-white/70 uppercase tracking-widest mb-1">Expected Closing Cash</h3>
                   <p className="text-4xl font-black text-white tracking-tighter">
                    Rs {(openingBalance + stats.totalIncome - stats.totalExpense).toLocaleString()}
                   </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Actual Physical Cash</label>
                  <div className="relative group">
                    <Coins className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-within:text-indigo-600 transition-colors" />
                    <input 
                      type="number"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      placeholder="Enter amount..."
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-indigo-600 rounded-[28px] outline-none transition-all font-black text-2xl text-slate-900 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Closing Notes</label>
                   <textarea 
                    value={closingNote}
                    onChange={(e) => setClosingNote(e.target.value)}
                    placeholder="Additional context for this settlement..."
                    rows={3}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:bg-white focus:border-indigo-600 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                   />
                </div>
              </div>

              <button 
                onClick={handleCloseDay}
                disabled={submitting || !actualCash}
                className="w-full py-6 bg-indigo-600 hover:bg-slate-900 text-white rounded-[28px] font-black text-lg transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <Save className="w-6 h-6" />
                    Archive & Finalize
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
