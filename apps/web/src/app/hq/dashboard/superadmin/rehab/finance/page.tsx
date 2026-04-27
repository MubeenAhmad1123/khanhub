'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, where, Timestamp, orderBy, limit, getAggregateFromServer, sum } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCached, setCached } from '@/lib/queryCache';

import { useHqSession } from '@/hooks/hq/useHqSession';
import { formatDateDMY } from '@/lib/utils';
import { 
  Loader2, TrendingUp, TrendingDown, Wallet, Clock, 
  Search, Filter, Calendar, ArrowUpRight, ArrowDownLeft,
  PieChart, BarChart3, Download, RefreshCw, ChevronRight
} from 'lucide-react';

export default function HqRehabFinancePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netBalance: 0,
    pendingAmount: 0
  });

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
    }
  }, [session, sessionLoading, router]);

  const loadData = async () => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);

    try {
      const colRef = collection(db, 'rehab_transactions');
      
      // 1. Get Summary Stats (Cached for 15 mins to avoid 429s)
      const summaryCacheKey = 'rehab_finance_summary_agg';
      let summaryData = getCached<any>(summaryCacheKey);

      if (!summaryData) {
        const [revSum, expSum, pendSum] = await Promise.all([
          getAggregateFromServer(query(colRef, where('status', '==', 'approved'), where('type', '==', 'income')), { total: sum('amount') }).catch(() => ({ data: () => ({ total: 0 }) })),
          getAggregateFromServer(query(colRef, where('status', '==', 'approved'), where('type', '==', 'expense')), { total: sum('amount') }).catch(() => ({ data: () => ({ total: 0 }) })),
          getAggregateFromServer(query(colRef, where('status', '==', 'pending')), { total: sum('amount') }).catch(() => ({ data: () => ({ total: 0 }) }))
        ]);

        const revenue = (revSum as any).data().total || 0;
        const expenses = (expSum as any).data().total || 0;
        const pending = (pendSum as any).data().total || 0;

        summaryData = {
          totalRevenue: revenue,
          totalExpenses: expenses,
          netBalance: revenue - expenses,
          pendingAmount: pending
        };
        setCached(summaryCacheKey, summaryData, 900); // 15 mins
      }

      setSummary(summaryData);

      // 2. Get Recent Transactions (Limited & Cached)
      const cacheKey = 'rehab_finance_txs_recent';
      let txList = getCached<any[]>(cacheKey);

      if (!txList) {
        const q = query(colRef, orderBy('createdAt', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        txList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setCached(cacheKey, txList, 60);
      }

      setTransactions(txList);
    } catch (err) {
      console.error("Error loading rehab finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);


  const filteredTransactions = transactions.filter(tx => {
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    return matchesStatus && matchesType;
  });

  // Monthly Chart Data (Last 6 Months)
  const getMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6Months: { month: string; year: number; income: number; expense: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: months[d.getMonth()],
        year: d.getFullYear(),
        income: 0,
        expense: 0
      });
    }

    transactions.filter(tx => tx.status === 'approved').forEach(tx => {
      const date = tx.createdAt instanceof Timestamp ? tx.createdAt.toDate() : new Date(tx.createdAt);
      const monthIdx = last6Months.findIndex(m => m.month === months[date.getMonth()] && m.year === date.getFullYear());
      if (monthIdx !== -1) {
        if (tx.type === 'income') last6Months[monthIdx].income += Number(tx.amount) || 0;
        else if (tx.type === 'expense') last6Months[monthIdx].expense += Number(tx.amount) || 0;
      }
    });

    return last6Months;
  };

  const chartData = getMonthlyData();
  const maxVal = Math.max(...chartData.flatMap(d => [d.income, d.expense]), 1000);

  if (sessionLoading) return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center transition-colors duration-300">
      <Loader2 className="animate-spin text-black dark:text-white" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white py-12 px-4 md:px-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-12">
          <div>
            <h1 className="text-4xl font-black text-black dark:text-white uppercase tracking-tighter flex items-center gap-4">
              <BarChart3 className="text-black dark:text-white" size={40} />
              Rehab Ledger
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black dark:text-black mt-2 italic">Chrono-Financial Audit • Authorization Matrix • Flow Control</p>
          </div>
          <button className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl transition-all hover:scale-105 active:scale-95">
            <Download size={18} />
            AUTHORIZE DATA EXPORT
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <FinanceCard 
            label="Gross Liquidity" 
            value={summary.totalRevenue} 
            icon={<TrendingUp className="text-black dark:text-white" />} 
            trend="AUTHENTICATED"
          />
          <FinanceCard 
            label="System Debits" 
            value={summary.totalExpenses} 
            icon={<TrendingDown className="text-black dark:text-white" />} 
            trend="COMMITTED"
          />
          <FinanceCard 
            label="Net Delta" 
            value={summary.netBalance} 
            icon={<Wallet className="text-black dark:text-white" />} 
            trend="REALTIME"
          />
          <FinanceCard 
            label="Staged Values" 
            value={summary.pendingAmount} 
            icon={<Clock className="text-black dark:text-white" />} 
            trend="AWAITING"
            highlight={summary.pendingAmount > 0}
          />
        </div>

        {/* Chart Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 mb-12">
          <div className="xl:col-span-2 bg-white dark:bg-black border border-gray-100 dark:border-white/10 p-10 rounded-[3rem] shadow-2xl">
            <h3 className="text-[10px] font-black text-black dark:text-black uppercase tracking-[0.3em] mb-12 flex items-center gap-3">
              <PieChart size={18} />
              QUARTERLY FLOW PROJECTION
            </h3>
            
            <div className="h-72 flex items-end justify-between gap-6 px-4">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group relative">
                  <div className="w-full flex justify-center gap-2 h-56 items-end">
                    {/* Income Bar */}
                    <div 
                      className="w-1/4 bg-black dark:bg-white rounded-t-xl transition-all duration-500 hover:scale-x-110 relative group/bar shadow-sm"
                      style={{ height: `${(d.income / maxVal) * 100}%` }}
                    >
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black text-[9px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all whitespace-nowrap z-10 shadow-xl uppercase tracking-widest">
                        +{d.income.toLocaleString()}
                      </div>
                    </div>
                    {/* Expense Bar */}
                    <div 
                      className="w-1/4 bg-gray-200 dark:bg-white/20 rounded-t-xl transition-all duration-500 hover:scale-x-110 relative group/bar shadow-sm"
                      style={{ height: `${(d.expense / maxVal) * 100}%` }}
                    >
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-100 dark:bg-white text-black dark:text-black text-[9px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all whitespace-nowrap z-10 shadow-xl uppercase tracking-widest">
                        -{d.expense.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-black dark:text-black uppercase tracking-widest">{d.month}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-10 flex items-center justify-center gap-8 pt-8 border-t border-gray-50 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-black dark:bg-white shadow-sm" />
                <span className="text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em]">Primary Revenue</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-white/20 shadow-sm" />
                <span className="text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em]">System Expenses</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 p-10 rounded-[3rem] shadow-2xl flex flex-col justify-between">
            <div className="space-y-8">
              <h3 className="text-[10px] font-black text-black dark:text-black uppercase tracking-[0.3em]">Operational Filters</h3>
              <div className="space-y-6">
                <div className="relative group">
                  <p className="text-[9px] font-black text-black dark:text-black uppercase tracking-widest mb-2 px-2">Lifecycle State</p>
                  <select 
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 py-4 outline-none font-black text-[10px] uppercase tracking-widest text-black dark:text-white transition-all appearance-none cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Global Matrix</option>
                    <option value="pending">Awaiting Sync</option>
                    <option value="approved">Validated Nodes</option>
                    <option value="rejected">Decommissioned</option>
                  </select>
                </div>

                <div className="relative group">
                  <p className="text-[9px] font-black text-black dark:text-black uppercase tracking-widest mb-2 px-2">Flow Categorization</p>
                  <select 
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 py-4 outline-none font-black text-[10px] uppercase tracking-widest text-black dark:text-white transition-all appearance-none cursor-pointer"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">Unified Stream</option>
                    <option value="income">Credits Only</option>
                    <option value="expense">Debits Only</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-10 p-6 bg-black dark:bg-white text-white dark:text-black rounded-3xl shadow-xl hover:scale-[1.02] transition-transform">
              <div className="flex items-center gap-4 mb-3">
                <RefreshCw size={20} className="animate-spin-slow opacity-60" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sub-Second Sync</p>
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest leading-loose opacity-60 italic">
                Authorized financial nodes are currently synchronized with HQ core ledger stream.
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                  <th className="px-8 py-6 text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em]">Transaction Description</th>
                  <th className="px-8 py-6 text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em]">Amount</th>
                  <th className="px-8 py-6 text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em]">Type</th>
                  <th className="px-8 py-6 text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em]">Authority</th>
                  <th className="px-8 py-6 text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em]">Temporal Node</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <Loader2 className="animate-spin text-teal-500 mx-auto mb-4" size={32} />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Recalculating Ledger...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-[10px] font-black uppercase tracking-widest text-black dark:text-black italic">No historical nodes found in filtered stream</td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white dark:hover:bg-white/5 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${tx.type === 'income' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-white/10 text-black dark:text-black'}`}>
                            {tx.type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                          </div>
                          <div>
                            <p className="font-black text-black dark:text-white text-sm uppercase tracking-tight group-hover:translate-x-1 transition-transform">{tx.description}</p>
                            <p className="text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em] mt-1">{tx.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className={`font-black text-lg tracking-tighter ${tx.type === 'income' ? 'text-black dark:text-white' : 'text-black dark:text-black'}`}>
                          {tx.type === 'income' ? '+' : '-'} {Number(tx.amount).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${tx.type === 'income' ? 'text-black dark:text-white' : 'text-black dark:text-black'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border ${
                          tx.status === 'approved' 
                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' 
                            : tx.status === 'pending'
                            ? 'bg-gray-100 dark:bg-white/10 text-black dark:text-black border-transparent'
                            : 'bg-rose-500 text-white border-transparent'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] font-black text-black dark:text-black uppercase tracking-widest italic">
                          {tx.approvedBy || tx.rejectedBy || 'System Alpha'}
                        </p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] font-black text-black dark:text-black uppercase tracking-widest">
                          {formatDateDMY(tx.createdAt instanceof Timestamp ? tx.createdAt.toDate() : tx.createdAt)}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceCard({ label, value, icon, trend, highlight }: {
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  trend: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-black border ${highlight ? 'border-black dark:border-white shadow-xl scale-[1.02]' : 'border-gray-100 dark:border-white/10 shadow-sm'} p-8 rounded-[2.5rem] relative overflow-hidden group transition-all hover:border-black dark:hover:border-white`}>
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm">
          {icon}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${highlight ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg' : 'bg-gray-50 dark:bg-white/5 text-black dark:text-black'}`}>
          {trend}
        </span>
      </div>
      <p className="text-3xl font-black text-black dark:text-white mb-2 tracking-tighter">RS. {value.toLocaleString()}</p>
      <p className="text-black dark:text-black text-[10px] font-black uppercase tracking-[0.3em]">{label}</p>
      
      {/* Decorative pulse if highlighted */}
      {highlight && (
        <div className="absolute top-0 right-0 p-4">
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-ping" />
        </div>
      )}
    </div>
  );
}
