'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, where, Timestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;

    const q = query(collection(db, 'rehab_transactions'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setTransactions(txList);
      
      // Calculate Summary
      let revenue = 0;
      let expenses = 0;
      let pending = 0;

      txList.forEach((tx: any) => {
        const amount = Number(tx.amount) || 0;
        if (tx.status === 'approved') {
          if (tx.type === 'income') revenue += amount;
          else if (tx.type === 'expense') expenses += amount;
        } else if (tx.status === 'pending') {
          pending += amount;
        }
      });

      setSummary({
        totalRevenue: revenue,
        totalExpenses: expenses,
        netBalance: revenue - expenses,
        pendingAmount: pending
      });
      
      setLoading(false);
    });

    return () => unsubscribe();
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

  if (sessionLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <BarChart3 className="text-teal-500" size={32} />
              Rehab Financial Ledger
            </h1>
            <p className="text-slate-400 mt-1 font-medium text-sm">Revenue monitoring and expense authorization oversight</p>
          </div>
          <button className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 border border-slate-700 transition-all">
            <Download size={18} />
            Export Ledger
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <FinanceCard 
            label="Total Revenue" 
            value={summary.totalRevenue} 
            icon={<TrendingUp className="text-emerald-500" />} 
            color="emerald"
            trend="Approved"
          />
          <FinanceCard 
            label="Total Expenses" 
            value={summary.totalExpenses} 
            icon={<TrendingDown className="text-rose-500" />} 
            color="rose"
            trend="Approved"
          />
          <FinanceCard 
            label="Net Balance" 
            value={summary.netBalance} 
            icon={<Wallet className="text-teal-500" />} 
            color="teal"
            trend="Actual"
          />
          <FinanceCard 
            label="Pending Amount" 
            value={summary.pendingAmount} 
            icon={<Clock className="text-amber-500" />} 
            color="amber"
            trend="Awaiting"
            highlight={summary.pendingAmount > 0}
          />
        </div>

        {/* Chart Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
          <div className="xl:col-span-2 bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-sm">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-10 flex items-center gap-2">
              <PieChart size={16} className="text-teal-500" />
              6-Month Financial Performance
            </h3>
            
            <div className="h-64 flex items-end justify-between gap-4 px-4">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative">
                  <div className="w-full flex justify-center gap-1.5 h-48 items-end">
                    {/* Income Bar */}
                    <div 
                      className="w-1/3 bg-emerald-500/80 rounded-t-lg transition-all duration-500 hover:bg-emerald-400 relative group/bar"
                      style={{ height: `${(d.income / maxVal) * 100}%` }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Inc: {d.income.toLocaleString()}
                      </div>
                    </div>
                    {/* Expense Bar */}
                    <div 
                      className="w-1/3 bg-rose-500/80 rounded-t-lg transition-all duration-500 hover:bg-rose-400 relative group/bar"
                      style={{ height: `${(d.expense / maxVal) * 100}%` }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Exp: {d.expense.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{d.month}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-6 pt-6 border-t border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expenses</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-sm">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Financial Controls</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Transaction Filtering</p>
                <div className="space-y-3">
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-teal-500"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-teal-500"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income Only</option>
                    <option value="expense">Expense Only</option>
                  </select>
                </div>
              </div>
              
              <div className="p-4 bg-teal-500/5 rounded-2xl border border-teal-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw size={14} className="text-teal-500" />
                  <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Live Synchronization</p>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Ledger is currently synchronized with Rehab Center real-time transaction stream.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700/50">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Description</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Amount</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Type</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Authorizer</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <Loader2 className="animate-spin text-teal-500 mx-auto mb-4" size={32} />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Recalculating Ledger...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center opacity-30 font-bold">No transactions found</td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {tx.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm leading-none mb-1">{tx.description}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tx.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className={`font-black text-sm ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {tx.type === 'income' ? '+' : '-'} Rs. {Number(tx.amount).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          tx.status === 'approved' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : tx.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {tx.approvedBy || tx.rejectedBy || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-slate-500">
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

function FinanceCard({ label, value, icon, color, trend, highlight }: {
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string;
  trend: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-slate-800/40 border ${highlight ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700/50'} p-6 rounded-3xl relative overflow-hidden group`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-900/50 rounded-xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${highlight ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-900/50 text-slate-500'}`}>
          {trend}
        </span>
      </div>
      <p className="text-2xl font-black text-white mb-1">Rs. {value.toLocaleString()}</p>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</p>
    </div>
  );
}
