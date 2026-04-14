// apps/web/src/app/hq/dashboard/cashier/reconciliation/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, getDocs, query, where, limit, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, CheckCircle, AlertTriangle, Calculator, ArrowLeft, History, Zap } from 'lucide-react';
import { cn, formatDateDMY, toDate } from '@/lib/utils';
import { formatPKR } from '@/lib/hq/superadmin/format';

export default function CashierReconciliationPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const [date] = useState(formatDateDMY(new Date()));
  const [actualClosing, setActualClosing] = useState('');
  const [varianceNote, setVarianceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pastRecords, setPastRecords] = useState<any[]>([]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'cashier') {
      router.push('/hq/login');
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'cashier') return;

    const fetchData = async () => {
      try {
        const [hqSnap, rehabSnap, spimsSnap, pastSnap] = await Promise.all([
          getDocs(query(collection(db, 'cashierTransactions'), where('cashierId', '==', session.customId), where('status', '==', 'approved'))),
          getDocs(query(collection(db, 'rehab_transactions'), where('cashierId', '==', session.customId), where('status', '==', 'approved'))),
          getDocs(query(collection(db, 'spims_transactions'), where('cashierId', '==', session.customId), where('status', '==', 'approved'))),
          getDocs(query(collection(db, 'hq_reconciliation'), where('cashierId', '==', session.customId), orderBy('createdAt', 'desc'), limit(5)))
        ]);

        const all = [
          ...hqSnap.docs.map(d => ({ ...d.data(), id: d.id, _source: 'hq' })),
          ...rehabSnap.docs.map(d => ({ ...d.data(), id: d.id, _source: 'rehab' })),
          ...spimsSnap.docs.map(d => ({ ...d.data(), id: d.id, _source: 'spims' }))
        ].filter((t: any) => formatDateDMY(toDate(t.transactionDate || t.date || t.dateStr || t.createdAt)) === date);

        setTransactions(all);
        setPastRecords(pastSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [session, date]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'expense') expense += amt; else income += amt;
    });
    return { income, expense, net: income - expense };
  }, [transactions]);

  const actual = parseFloat(actualClosing) || 0;
  const variance = actual - totals.net;

  const handleSubmit = async () => {
    if (!actualClosing) return;
    if (variance !== 0 && !varianceNote.trim()) return;
    
    setSubmitting(true);
    try {
      const payload = {
        date,
        cashierId: session!.customId,
        cashierName: session!.name,
        incomeTotal: totals.income,
        expenseTotal: totals.expense,
        expectedBalance: totals.net,
        actualClosing: actual,
        variance,
        varianceNote: varianceNote.trim() || null,
        status: 'pending',
        createdAt: Timestamp.now(),
        submittedAt: Timestamp.now(),
        totalTransactions: transactions.length,
        portal: session?.portal || 'hq'
      };

      await addDoc(collection(db, 'hq_reconciliation'), payload);

      // Audit Log
      await addDoc(collection(db, 'hq_audit'), {
        action: 'day_close',
        actorName: session!.name,
        actorId: session!.customId,
        message: `Quick reconciliation for ${date}. Var: ${variance}`,
        source: 'hq',
        createdAt: Timestamp.now()
      });

      setSubmitted(true);
      setTimeout(() => router.push('/hq/dashboard/cashier'), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">Synchronizing Ledger</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 gap-6 p-4 text-center">
        <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-bounce">
          <CheckCircle className="text-emerald-500" size={48} />
        </div>
        <div>
          <h2 className="text-white font-black text-3xl uppercase tracking-tighter">Transmission Successful</h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Daily Audit Node: {date}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 text-white selection:bg-amber-400 selection:text-black">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
           <div>
             <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
               <Zap className="text-amber-400 fill-amber-400/20" size={24} />
               Fast Close
             </h1>
             <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Audit Point: {date}</p>
           </div>
           <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
             <ArrowLeft size={18} />
           </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-1">Inflow</p>
            <p className="text-2xl font-black text-emerald-400">{formatPKR(totals.income)}</p>
          </div>
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/50 mb-1">Outflow</p>
            <p className="text-2xl font-black text-rose-400">{formatPKR(totals.expense)}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Ledger Validation</h2>
          </div>

          <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
               <span>Target Balance</span>
               <span>{transactions.length} Records</span>
            </div>
            <p className="text-3xl font-black text-amber-400 tracking-tighter">{formatPKR(totals.net)}</p>
          </div>

          <div>
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest block mb-3 pl-1">Actual Physical Count</label>
            <input
              type="number"
              value={actualClosing}
              onChange={e => setActualClosing(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-xl font-black outline-none focus:border-amber-400/50 transition-all placeholder:text-white/5"
            />
          </div>

          {actualClosing && (
            <div className={cn(
               "rounded-2xl p-5 flex items-center gap-4 border transition-all animate-in slide-in-from-top-2",
               variance === 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
            )}>
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                variance === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              )}>
                {variance === 0 ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Audit Result</p>
                <p className={cn("text-sm font-black uppercase", variance === 0 ? 'text-emerald-400' : 'text-rose-400')}>
                  {variance === 0 ? 'Perfect Match' : `Variance: ${formatPKR(Math.abs(variance))} detected`}
                </p>
              </div>
            </div>
          )}

          {variance !== 0 && actualClosing && (
            <div className="animate-in fade-in duration-300">
              <label className="text-rose-500/70 text-[10px] font-black uppercase tracking-widest block mb-3 pl-1">Reason for Variance *</label>
              <textarea
                value={varianceNote}
                onChange={e => setVarianceNote(e.target.value)}
                placeholder="Required documentation for discrepancies..."
                className="w-full bg-white/5 border border-rose-500/20 rounded-2xl px-5 py-4 text-white text-sm font-bold outline-none focus:border-rose-500/50 transition-all resize-none h-24"
              />
            </div>
          )}

          <button
            disabled={!actualClosing || (variance !== 0 && !varianceNote.trim()) || submitting}
            onClick={handleSubmit}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:grayscale disabled:scale-100 active:scale-95 text-black font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-amber-400/10"
          >
            {submitting ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm Audit Transmission'}
          </button>
        </div>

        {pastRecords.length > 0 && (
          <div className="bg-white/5 border border-white/5 rounded-[2rem] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <History size={14} className="text-gray-500" />
              <h3 className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Archived Submissions</h3>
            </div>
            <div className="divide-y divide-white/5">
              {pastRecords.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-white text-xs font-black">{r.date}</p>
                    <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest mt-1">
                      Balance: {formatPKR(r.actualClosing || 0)}
                    </p>
                  </div>
                  <div className={cn(
                    "rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-widest border",
                    r.status === 'verified' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    r.status === 'flagged' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                    "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {r.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
