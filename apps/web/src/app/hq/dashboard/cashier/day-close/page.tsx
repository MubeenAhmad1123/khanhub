// apps/web/src/app/hq/dashboard/cashier/day-close/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Loader2, 
  Calculator, 
  Coins, 
  Save, 
  History,
  TrendingDown,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, formatDateDMY, toDate } from '@/lib/utils';
import { formatPKR } from '@/lib/hq/superadmin/format';

export default function DayClosePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  
  const [dataLoading, setDataLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  // Form State
  const [actualCash, setActualCash] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    fetchData();
  }, [sessionLoading, session]);

  async function fetchData() {
    setDataLoading(true);
    try {
      const todayStr = formatDateDMY(new Date());
      
      // Fetch across all relevant collections for this cashier
      const [hqTxs, rehabTxs, spimsTxs] = await Promise.all([
        getDocs(query(collection(db, 'cashierTransactions'), where('cashierId', '==', session?.customId), where('status', '==', 'approved'))),
        getDocs(query(collection(db, 'rehab_transactions'), where('cashierId', '==', session?.customId), where('status', '==', 'approved'))),
        getDocs(query(collection(db, 'spims_transactions'), where('cashierId', '==', session?.customId), where('status', '==', 'approved')))
      ]);

      const normalizeDate = (v: any) => {
        const d = toDate(v);
        return d ? formatDateDMY(d) : '';
      };

      const all = [
        ...hqTxs.docs.map(d => ({ ...d.data(), _source: 'hq' })),
        ...rehabTxs.docs.map(d => ({ ...d.data(), _source: 'rehab' })),
        ...spimsTxs.docs.map(d => ({ ...d.data(), _source: 'spims' }))
      ].filter((t: any) => normalizeDate(t.transactionDate || t.date || t.dateStr || t.createdAt) === todayStr);

      setTransactions(all);

      // Fetch history
      const prev = await getDocs(query(
        collection(db, 'hq_reconciliation'),
        where('cashierId', '==', session?.customId),
        orderBy('createdAt', 'desc'),
        limit(5)
      ));
      setHistory(prev.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setDataLoading(false);
    }
  }

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byType: Record<string, number> = {};

    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      const t = tx.type || 'income';
      if (t === 'income') income += amt; else expense += amt;

      const cat = tx.category || tx.categoryName || 'other';
      byType[cat] = (byType[cat] || 0) + amt;
    });

    return { income, expense, net: income - expense, byType };
  }, [transactions]);

  const differenceValue = Number(actualCash || 0) - totals.net;

  async function handleCloseDay() {
    if (!actualCash) {
      setError('Actual cash amount is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const report = {
        date: formatDateDMY(new Date()),
        expectedBalance: totals.net,
        actualClosing: Number(actualCash),
        variance: differenceValue,
        note: note.trim(),
        cashierId: session?.customId,
        cashierName: session?.name || 'Cashier',
        status: 'pending',
        createdAt: Timestamp.now(),
        submittedAt: Timestamp.now(),
        incomeTotal: totals.income,
        expenseTotal: totals.expense,
        typeBreakdown: totals.byType,
        totalTransactions: transactions.length,
        portal: session?.portal || 'hq', // Primary portal
        reviewedAt: null,
        reviewedBy: null
      };

      await addDoc(collection(db, 'hq_reconciliation'), report);
      
      // Audit log
      await addDoc(collection(db, 'hq_audit'), {
        action: 'day_close',
        actorName: session?.name || 'Cashier',
        actorId: session?.customId,
        message: `Day closed for ${report.date}. Net: ${totals.net}, Actual: ${actualCash}, Var: ${differenceValue}`,
        source: 'hq',
        createdAt: Timestamp.now()
      });

      setSuccess(true);
      setTimeout(() => router.push('/hq/dashboard/cashier'), 2000);
    } catch (err: any) {
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Auditing Daily Ledger...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-amber-400 selection:text-black">
      <header className="border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">Full Cash Audit</h1>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{formatDateDMY(new Date())}</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Node Status</span>
             <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-400">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
               SECURED
             </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {success ? (
          <div className="bg-emerald-400/5 rounded-3xl border border-emerald-400/20 p-16 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-400/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black uppercase mb-2">Audit Completed</h2>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Reports archived. Node standby.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl border border-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3 h-3 text-emerald-500" /> Income
                  </p>
                  <p className="text-xl font-black text-white">{formatPKR(totals.income)}</p>
                </div>
                <div className="bg-white/5 rounded-2xl border border-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-2">
                    <TrendingDown className="w-3 h-3 text-rose-500" /> Expense
                  </p>
                  <p className="text-xl font-black text-white">{formatPKR(totals.expense)}</p>
                </div>
              </div>

              {/* Main Audit Box */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 rounded-full -mr-24 -mt-24 blur-3xl transition-all group-hover:bg-amber-400/10" />
                
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-8 flex items-center gap-2">
                  <Calculator size={16} className="text-amber-400" /> Reconciliation Schema
                </h3>

                <div className="space-y-8">
                   <div>
                     <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-4">Calculated Target Balance</span>
                     <div className="bg-black/40 rounded-2xl p-8 border-2 border-dashed border-white/10 text-center group-hover:border-amber-400/20 transition-all">
                       <p className="text-4xl font-black text-amber-400 tracking-tighter">{formatPKR(totals.net)}</p>
                       <p className="text-[10px] font-black text-gray-600 uppercase mt-2">Based on {transactions.length} verified operations</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-3">Actual Cash Count</label>
                       <div className="relative">
                          <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input 
                            type="number"
                            value={actualCash}
                            onChange={(e) => setActualCash(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 focus:border-amber-400/50 rounded-2xl pl-12 pr-4 py-4 font-black text-lg outline-none transition-all placeholder:text-white/10"
                          />
                       </div>
                     </div>

                     <div className={cn(
                       "rounded-2xl flex flex-col justify-center p-5 border transition-all",
                       differenceValue === 0 ? "bg-emerald-400/5 border-emerald-400/20" : "bg-rose-400/5 border-rose-400/20"
                     )}>
                        <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Audit Variance</p>
                        <p className={cn(
                          "text-xl font-black tracking-tighter",
                          differenceValue === 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {differenceValue > 0 ? '+' : ''}{formatPKR(differenceValue)}
                        </p>
                     </div>
                   </div>

                   <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-3">Discrepancy Log / Note</label>
                      <textarea 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Detail any shortages or surplus detected during count..."
                        className="w-full bg-white/5 border border-white/10 focus:border-amber-400/50 rounded-2xl p-4 text-sm font-bold min-h-[100px] outline-none transition-all"
                      />
                   </div>
                </div>

                {error && (
                  <div className="mt-6 p-4 rounded-xl bg-rose-400/10 border border-rose-400/20 flex items-center gap-3 text-rose-400 text-xs font-black uppercase">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button 
                  onClick={handleCloseDay}
                  disabled={submitting}
                  className="w-full mt-10 py-5 bg-amber-400 hover:bg-amber-300 text-black rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-amber-400/10 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                  Execute Audit Submission
                </button>
              </div>

              {/* Type breakdown display */}
              <div className="bg-white/5 rounded-3xl border border-white/5 p-6">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">Sector Breakdown</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(totals.byType).map(([cat, amt]) => (
                      <div key={cat} className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[9px] font-black uppercase text-gray-500 mb-1">{cat}</p>
                        <p className="text-xs font-black">{formatPKR(amt)}</p>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* History Column */}
            <div className="space-y-6">
               <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                   <History size={14} /> Audit History
                 </h4>
                 <div className="space-y-3">
                    {history.map(item => (
                      <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-amber-400/20 transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-white">{item.date}</span>
                          <span className={cn(
                             "text-[8px] font-black uppercase px-2 py-0.5 rounded border",
                             Math.abs(item.variance || 0) < 1 ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-rose-400/10 text-rose-400 border-rose-400/20"
                          )}>
                            {Math.abs(item.variance || 0) < 1 ? 'BALANCED' : 'VARIANCE'}
                          </span>
                        </div>
                        <p className="text-xs font-black text-gray-400">{formatPKR(item.actualClosing || item.actualCash)}</p>
                      </div>
                    ))}
                    {!history.length && (
                      <div className="text-center py-8">
                         <Receipt className="w-8 h-8 mx-auto text-white/10 mb-2" />
                         <p className="text-[10px] font-black uppercase text-gray-600">No archives found</p>
                      </div>
                    )}
                 </div>
               </div>

               <div className="bg-white/5 rounded-3xl border border-white/10 p-6 h-fit bg-gradient-to-br from-white/5 to-amber-400/[0.02]">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                    <AlertCircle size={14} /> Operational Directive
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400 leading-relaxed uppercase">
                    Submission locks the daily ledger. All values must be physically verified. Node variances are flagged for superadmin oversight automatically.
                  </p>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
