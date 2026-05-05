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
    <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-gray-900 py-20 px-4 md:px-10 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-20">
          <div className="space-y-6">
            <h1 className="text-6xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-8">
              <div className="p-5 rounded-[2.5rem] bg-white shadow-2xl shadow-gray-200/50 border border-gray-100 text-indigo-600">
                <BarChart3 size={48} strokeWidth={2.5} />
              </div>
              Rehab Ledger
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 mt-2 italic ml-2">Chrono-Financial Audit • Authorization Matrix • Flow Control</p>
          </div>
          <button className="bg-white border border-gray-100 text-indigo-600 px-10 py-5 rounded-[2rem] shadow-2xl shadow-gray-200/50 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group">
            <Download size={22} strokeWidth={2.5} className="group-hover:translate-y-1 transition-transform" />
            AUTHORIZE DATA EXPORT
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <FinanceCard 
            label="Gross Liquidity" 
            value={summary.totalRevenue} 
            icon={<TrendingUp className="text-indigo-600" />} 
            trend="AUTHENTICATED"
            color="indigo"
          />
          <FinanceCard 
            label="System Debits" 
            value={summary.totalExpenses} 
            icon={<TrendingDown className="text-rose-600" />} 
            trend="COMMITTED"
            color="rose"
          />
          <FinanceCard 
            label="Net Delta" 
            value={summary.netBalance} 
            icon={<Wallet className="text-emerald-600" />} 
            trend="REALTIME"
            color="emerald"
          />
          <FinanceCard 
            label="Staged Values" 
            value={summary.pendingAmount} 
            icon={<Clock className="text-amber-600" />} 
            trend="AWAITING"
            color="amber"
            highlight={summary.pendingAmount > 0}
          />
        </div>

        {/* Chart Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 mb-20">
          <div className="xl:col-span-2 bg-white border border-gray-100 p-12 rounded-[3rem] shadow-2xl shadow-gray-200/50">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mb-16 flex items-center gap-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <PieChart size={18} />
              </div>
              QUARTERLY FLOW PROJECTION
            </h3>
            
            <div className="h-80 flex items-end justify-between gap-8 px-4">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-6 group relative">
                  <div className="w-full flex justify-center gap-3 h-64 items-end">
                    {/* Income Bar */}
                    <div 
                      className="w-1/4 bg-indigo-600 rounded-t-2xl transition-all duration-700 hover:scale-x-125 relative group/bar shadow-lg shadow-indigo-200"
                      style={{ height: `${(d.income / maxVal) * 100}%` }}
                    >
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-4 py-2 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all whitespace-nowrap z-10 shadow-2xl uppercase tracking-widest border border-gray-800">
                        +{d.income.toLocaleString()}
                      </div>
                    </div>
                    {/* Expense Bar */}
                    <div 
                      className="w-1/4 bg-gray-100 rounded-t-2xl transition-all duration-700 hover:scale-x-125 relative group/bar shadow-inner"
                      style={{ height: `${(d.expense / maxVal) * 100}%` }}
                    >
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white text-gray-900 text-[10px] font-black px-4 py-2 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all whitespace-nowrap z-10 shadow-2xl uppercase tracking-widest border border-gray-100">
                        -{d.expense.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{d.month}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-12 pt-10 border-t border-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200" />
                <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em]">Primary Revenue</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 rounded-full bg-gray-100 shadow-inner" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">System Expenses</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-12 rounded-[3rem] shadow-2xl shadow-gray-200/50 flex flex-col justify-between">
            <div className="space-y-10">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em]">Operational Filters</h3>
              <div className="space-y-8">
                <div className="relative group">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 px-2">Lifecycle State</p>
                  <select 
                    className="w-full bg-gray-50 border border-gray-100 rounded-[1.5rem] px-8 py-5 outline-none font-black text-[10px] uppercase tracking-widest text-gray-900 transition-all appearance-none cursor-pointer focus:border-indigo-600"
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
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 px-2">Flow Categorization</p>
                  <select 
                    className="w-full bg-gray-50 border border-gray-100 rounded-[1.5rem] px-8 py-5 outline-none font-black text-[10px] uppercase tracking-widest text-gray-900 transition-all appearance-none cursor-pointer focus:border-indigo-600"
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
            
            <div className="mt-12 p-8 bg-gray-900 text-white rounded-[2rem] shadow-2xl shadow-gray-400/20 hover:scale-[1.02] transition-all group">
              <div className="flex items-center gap-5 mb-4">
                <RefreshCw size={24} strokeWidth={2.5} className="animate-spin-slow text-indigo-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sub-Second Sync</p>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest leading-loose opacity-40 italic group-hover:opacity-60 transition-opacity">
                Authorized financial nodes are currently synchronized with HQ core ledger stream.
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Transaction Description</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Amount</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Type</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Status</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Authority</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Temporal Node</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={32} />
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Recalculating Ledger...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-20 text-center text-[11px] font-black uppercase tracking-widest text-gray-400 italic">No historical nodes found in filtered stream</td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-all group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${tx.type === 'income' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-gray-100 text-gray-400 shadow-gray-100'}`}>
                            {tx.type === 'income' ? <ArrowDownLeft size={20} strokeWidth={2.5} /> : <ArrowUpRight size={20} strokeWidth={2.5} />}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-base uppercase tracking-tight group-hover:translate-x-1 transition-transform">{tx.description}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">{tx.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <p className={`font-black text-xl tracking-tighter ${tx.type === 'income' ? 'text-indigo-600' : 'text-rose-600'}`}>
                          {tx.type === 'income' ? '+' : '-'} {Number(tx.amount).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${tx.type === 'income' ? 'text-indigo-600' : 'text-gray-400'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border ${
                          tx.status === 'approved' 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : tx.status === 'pending'
                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                            : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest italic flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-200" />
                          {tx.approvedBy || tx.rejectedBy || 'System Alpha'}
                        </p>
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
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

function FinanceCard({ label, value, icon, trend, highlight, color }: {
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  trend: string;
  highlight?: boolean;
  color: 'indigo' | 'rose' | 'emerald' | 'amber';
}) {
  const colorMap = {
    indigo: 'text-indigo-600 bg-indigo-50 shadow-indigo-100 border-indigo-100',
    rose: 'text-rose-600 bg-rose-50 shadow-rose-100 border-rose-100',
    emerald: 'text-emerald-600 bg-emerald-50 shadow-emerald-100 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 shadow-amber-100 border-amber-100'
  };

  return (
    <div className={`bg-white border ${highlight ? 'border-gray-900 shadow-2xl scale-[1.05]' : 'border-gray-100 shadow-2xl shadow-gray-200/50'} p-10 rounded-[3rem] relative overflow-hidden group transition-all hover:scale-[1.02]`}>
      <div className="flex justify-between items-start mb-8">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full shadow-sm ${highlight ? 'bg-gray-900 text-white shadow-gray-400' : 'bg-gray-50 text-gray-400'}`}>
          {trend}
        </span>
      </div>
      <p className="text-3xl font-black text-gray-900 mb-3 tracking-tighter">RS. {value.toLocaleString()}</p>
      <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em]">{label}</p>
      
      {/* Decorative pulse if highlighted */}
      {highlight && (
        <div className="absolute top-0 right-0 p-6">
          <div className="w-3 h-3 rounded-full bg-indigo-600 animate-ping" />
        </div>
      )}
    </div>
  );
}
