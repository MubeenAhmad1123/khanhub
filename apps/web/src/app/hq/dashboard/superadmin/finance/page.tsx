'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Printer } from 'lucide-react';

interface TxSummary {
  dept: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  cashierName: string;
  status: string;
}

function normDate(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  if (v?.seconds) return new Date(v.seconds * 1000).toISOString().slice(0, 10);
  if (typeof v?.toDate === 'function') return v.toDate().toISOString().slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default function FinanceControlTowerPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [transactions, setTransactions] = useState<TxSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    Promise.all([
      getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'approved'))),
      getDocs(query(collection(db, 'spims_transactions'), where('status', '==', 'approved'))),
    ]).then(([rehabSnap, spimsSnap]) => {
      const all = [
        ...rehabSnap.docs.map(d => ({ dept: 'rehab', ...d.data() } as TxSummary)),
        ...spimsSnap.docs.map(d => ({ dept: 'spims', ...d.data() } as TxSummary)),
      ];
      setTransactions(all);
      setLoading(false);
    });
  }, [session]);

  const monthTx = transactions.filter(t => normDate((t as any).date).startsWith(selectedMonth));

  const rehabIncome = monthTx.filter(t => t.dept === 'rehab' && t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const rehabExpense = monthTx.filter(t => t.dept === 'rehab' && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const spimsIncome = monthTx.filter(t => t.dept === 'spims' && t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const spimsExpense = monthTx.filter(t => t.dept === 'spims' && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const totalIncome = rehabIncome + spimsIncome;
  const totalExpense = rehabExpense + spimsExpense;
  const netProfit = totalIncome - totalExpense;

  const anomalies = monthTx.filter(t => (t.amount || 0) > 50000);

  const categoryMap: Record<string, number> = {};
  monthTx.filter(t => t.type === 'income').forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + (t.amount || 0);
  });
  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (sessionLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8 pb-24" id="finance-print">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Finance Control Tower</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Cross-department financial overview</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 [color-scheme:dark]" />
            <button onClick={() => window.print()} className="bg-white/5 hover:bg-white/10 border border-white/8 text-gray-400 hover:text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl transition-all active:scale-95 flex items-center gap-2">
              <Printer size={14} />
            </button>
          </div>
        </div>

        {anomalies.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
            <AlertTriangle className="text-rose-500 flex-shrink-0" size={18} />
            <div>
              <p className="text-rose-400 font-black text-xs uppercase tracking-widest">{anomalies.length} High-Value Transaction{anomalies.length > 1 ? 's' : ''} This Month</p>
              <p className="text-rose-400/60 text-[10px] font-bold mt-0.5">Transactions above Rs50,000 flagged for review</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Total Income', value: totalIncome, color: 'text-emerald-400', border: 'border-l-emerald-500', bg: 'bg-emerald-500/5' },
            { label: 'Total Expense', value: totalExpense, color: 'text-rose-400', border: 'border-l-rose-500', bg: 'bg-rose-500/5' },
            { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? 'text-amber-400' : 'text-rose-400', border: netProfit >= 0 ? 'border-l-amber-500' : 'border-l-rose-500', bg: 'bg-amber-500/5' },
          ].map(item => (
            <div key={item.label} className={`${item.bg} border border-white/8 border-l-4 ${item.border} rounded-2xl p-5`}>
              <p className={`text-xl md:text-2xl font-black ${item.color}`}>Rs{Math.abs(item.value).toLocaleString()}</p>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { dept: 'REHAB', income: rehabIncome, expense: rehabExpense, color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
            { dept: 'SPIMS', income: spimsIncome, expense: spimsExpense, color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/20' },
          ].map(d => (
            <div key={d.dept} className={`${d.bg} border ${d.border} rounded-2xl p-5`}>
              <p className={`text-xs font-black uppercase tracking-widest ${d.color} mb-4`}>{d.dept}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-500">Income</span>
                  <span className="text-emerald-400">Rs{d.income.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-500">Expense</span>
                  <span className="text-rose-400">Rs{d.expense.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/5 pt-2 flex justify-between text-sm font-black">
                  <span className="text-gray-400">Net</span>
                  <span className={d.income - d.expense >= 0 ? 'text-amber-400' : 'text-rose-400'}>Rs{Math.abs(d.income - d.expense).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {categoryEntries.length > 0 && (
          <div className="bg-white/5 border border-white/8 rounded-3xl p-5 md:p-6">
            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-5">Income by Category</h3>
            <div className="space-y-3">
              {categoryEntries.map(([cat, amount]) => {
                const pct = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-300 capitalize">{cat.replace(/_/g, ' ')}</span>
                      <span className="text-amber-400">Rs{amount.toLocaleString()} <span className="text-gray-600">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {anomalies.length > 0 && (
          <div className="bg-white/5 border border-rose-500/20 rounded-3xl overflow-hidden">
            <div className="px-5 py-4 border-b border-rose-500/10 flex items-center gap-2">
              <AlertTriangle className="text-rose-500" size={14} />
              <h3 className="text-rose-400 font-black text-xs uppercase tracking-widest">High-Value Transactions</h3>
            </div>
            <div className="divide-y divide-white/5">
              {anomalies.map((t, idx) => (
                <div key={`${(t as any).dept}-${(t as any).category}-${idx}`} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-white text-sm font-bold capitalize">{(t.category || '').replace(/_/g, ' ')}</p>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{t.dept} · {t.cashierName} · {normDate((t as any).date)}</p>
                  </div>
                  <p className={`font-black text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>Rs{t.amount?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
