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
  Lock, 
  Calculator, 
  Coins, 
  Save, 
  History,
  FileText
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, formatDateDMY, toDate } from '@/lib/utils';

type DayReport = {
  id?: string;
  dateStr: string;
  expectedBalance: number;
  actualCash: number;
  difference: number;
  note: string;
  closedBy: string;
  closedByName: string;
  createdAt: any;
  incomeTotal?: number;
  expenseTotal?: number;
};

export default function DayClosePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  
  const [reportDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [history, setHistory] = useState<DayReport[]>([]);
  const [loading, setLoading] = useState(true);
  
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
    setLoading(true);
    try {
      const todayStr = formatDateDMY(new Date());
      
      // Fetch today's transactions to calculate expected balance
      const qTx = query(
        collection(db, 'cashierTransactions'),
        where('dateStr', '==', todayStr),
        where('paymentMethod', '==', 'cash') // Only cash affects physical box
      );
      const snapTx = await getDocs(qTx);
      const txs = snapTx.docs.map(d => d.data());
      setTransactions(txs);

      // Fetch recent close history
      const qHist = query(
        collection(db, 'dayCloseReports'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snapHist = await getDocs(qHist);
      setHistory(snapHist.docs.map(d => ({ id: d.id, ...d.data() }) as DayReport));

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') income += amt;
      else expense += amt;
    });
    return { income, expense, net: income - expense };
  }, [transactions]);

  const differenceValue = Number(actualCash || 0) - totals.net;

  async function handleCloseDay() {
    if (!actualCash) {
      setError('Please enter the actual cash amount in hand.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const report = {
        dateStr: formatDateDMY(new Date()),
        expectedBalance: totals.net,
        actualCash: Number(actualCash),
        difference: differenceValue,
        note: note.trim(),
        closedBy: session?.customId || session?.uid || 'Unknown',
        closedByName: session?.displayName || 'Cashier',
        createdAt: Timestamp.now(),
        // Breakdown for easier aggregation later
        incomeTotal: totals.income,
        expenseTotal: totals.expense,
      };

      await addDoc(collection(db, 'dayCloseReports'), report);
      setSuccess(true);
      setTimeout(() => router.push('/hq/dashboard/cashier'), 2000);
    } catch (err: any) {
      console.error('Error closing day:', err);
      setError(err.message || 'Failed to save day close report.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Lock className="w-6 h-6 text-indigo-600" />
              Day Close & Cash Audit
            </h1>
            <p className="text-sm text-slate-500 font-medium">Finalize today's accounts for {formatDateDMY(new Date())}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 md:px-8">
        {success ? (
          <div className="bg-white p-12 rounded-[2.5rem] border border-emerald-100 shadow-2xl shadow-emerald-50 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Day Closed Successfully!</h2>
            <p className="text-slate-500 font-medium">The daily financial report has been archived and secured.</p>
            <p className="text-sm text-slate-400 mt-4">Redirecting back to dashboard...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Side */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl" />
                
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-500" />
                  Audit Summary (Cash Only)
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] uppercase tracking-wider font-black text-emerald-600/70 mb-1">Total Income</p>
                    <p className="text-xl font-black text-emerald-700">PKR {totals.income.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                    <p className="text-[10px] uppercase tracking-wider font-black text-rose-600/70 mb-1">Total Expense</p>
                    <p className="text-xl font-black text-rose-700">PKR {totals.expense.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-6 border-t border-slate-100 pt-6">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                      Expected Cash in Hand
                    </label>
                    <div className="text-3xl font-black text-slate-900 bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                      PKR {totals.net.toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                        Actual Cash in Hand
                      </label>
                      <div className="relative group">
                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-within:text-indigo-500 transition-colors" />
                        <input 
                          type="number"
                          value={actualCash}
                          onChange={(e) => setActualCash(e.target.value)}
                          placeholder="Enter physical cash..."
                          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-lg"
                        />
                      </div>
                    </div>

                    <div className={cn(
                      "p-5 rounded-2xl flex flex-col justify-center",
                      differenceValue === 0 ? "bg-emerald-50 border border-emerald-100" :
                      differenceValue > 0 ? "bg-blue-50 border border-blue-100" :
                      "bg-rose-50 border border-rose-100"
                    )}>
                      <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Difference / Discrepancy</p>
                      <p className={cn(
                        "text-xl font-black",
                        differenceValue === 0 ? "text-emerald-600" :
                        differenceValue > 0 ? "text-blue-600" : 
                        "text-rose-600"
                      )}>
                        {differenceValue > 0 ? '+' : ''}{differenceValue.toLocaleString()} PKR
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Closing Note / Remark
                    </label>
                    <textarea 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add any details about shortages or excess..."
                      className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-2xl outline-none transition-all text-sm font-medium min-h-[100px]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-6 flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-sm font-bold animate-shake">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  onClick={handleCloseDay}
                  disabled={submitting}
                  className="w-full mt-8 py-4 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      SUBMIT & CLOSE DAY
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* History Side */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  Recent Closings
                </h3>
                
                <div className="space-y-4">
                  {history.map((item, idx) => (
                    <div key={item.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-black text-slate-900">{item.dateStr}</p>
                        <span className={cn(
                          "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                          item.difference === 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {item.difference === 0 ? 'Balanced' : 'Discrepancy'}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="text-sm font-bold text-slate-600">PKR {item.actualCash.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-medium">By {item.closedByName}</p>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-bold text-slate-400">No closing history found.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-indigo-600 p-6 rounded-[2rem] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
                <h3 className="text-xs font-black uppercase tracking-widest mb-2 opacity-80">Security Note</h3>
                <p className="text-xs font-bold leading-relaxed">
                  Daily closing is an irreversible action. Ensure physical cash exactly matches your reported amount. Discrepancies will be flagged for superadmin audit.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
}
