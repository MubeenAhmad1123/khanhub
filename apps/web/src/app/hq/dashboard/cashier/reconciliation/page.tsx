'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, CheckCircle, AlertTriangle, Calculator } from 'lucide-react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function normDate(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  if (v?.seconds) return new Date(v.seconds * 1000).toISOString().slice(0, 10);
  if (typeof v?.toDate === 'function') return v.toDate().toISOString().slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default function CashierReconciliationPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const [date] = useState(todayISO());
  const [openingBalance, setOpeningBalance] = useState('');
  const [actualClosing, setActualClosing] = useState('');
  const [varianceNote, setVarianceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [todayTotals, setTodayTotals] = useState({ inflow: 0, outflow: 0 });
  const [pastRecords, setPastRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        const [rehabSnap, spimsSnap] = await Promise.all([
          getDocs(query(collection(db, 'rehab_transactions'), where('cashierId', '==', session.customId), where('status', '==', 'approved'))),
          getDocs(query(collection(db, 'spims_transactions'), where('cashierId', '==', session.customId), where('status', '==', 'approved'))),
        ]);

        const allTx = [
          ...rehabSnap.docs.map((d) => d.data()),
          ...spimsSnap.docs.map((d) => d.data()),
        ].filter((t: any) => normDate(t.date) === date);

        const inflow = allTx.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + (t.amount || 0), 0);
        const outflow = allTx.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + (t.amount || 0), 0);
        setTodayTotals({ inflow, outflow });

        const pastSnap = await getDocs(
          query(collection(db, 'hq_reconciliation'), where('cashierId', '==', session.customId), limit(10))
        );
        const past = pastSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        past.sort((a: any, b: any) => (b.date > a.date ? 1 : -1));
        setPastRecords(past);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [session, date]);

  const opening = parseFloat(openingBalance) || 0;
  const expectedClosing = opening + todayTotals.inflow - todayTotals.outflow;
  const actual = parseFloat(actualClosing) || 0;
  const variance = actual - expectedClosing;

  const handleSubmit = async () => {
    if (!openingBalance || !actualClosing) return;
    if (variance !== 0 && !varianceNote.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'hq_reconciliation'), {
        date,
        cashierId: session!.customId,
        cashierName: session!.name,
        openingBalance: opening,
        totalInflow: todayTotals.inflow,
        totalOutflow: todayTotals.outflow,
        expectedClosing,
        actualClosing: actual,
        variance,
        varianceNote: varianceNote.trim() || null,
        status: 'submitted',
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 gap-4 p-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle className="text-emerald-500" size={40} />
        </div>
        <h2 className="text-white font-black text-2xl uppercase tracking-widest">Submitted!</h2>
        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Daily close for {date} sent for verification</p>
        <button onClick={() => router.push('/hq/dashboard/cashier')} className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest px-8 py-3 rounded-2xl transition-all">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Daily Close</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">{date}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-emerald-500 text-xl font-black">Rs{todayTotals.inflow.toLocaleString()}</p>
            <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest mt-1">Today Inflow</p>
          </div>
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4">
            <p className="text-rose-500 text-xl font-black">Rs{todayTotals.outflow.toLocaleString()}</p>
            <p className="text-rose-500/50 text-[10px] font-black uppercase tracking-widest mt-1">Today Outflow</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/8 rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="text-amber-500" size={18} />
            <h2 className="text-white font-black text-sm uppercase tracking-widest">Cash Count</h2>
          </div>

          <div>
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest block mb-2">Opening Balance (Rs)</label>
            <input
              type="number"
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
              placeholder="0"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all [appearance:textfield]"
            />
          </div>

          <div className="bg-gray-900 border border-white/5 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-gray-500 uppercase tracking-widest">Opening</span>
              <span className="text-white">Rs{opening.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span className="text-emerald-500/70 uppercase tracking-widest">+ Inflow</span>
              <span className="text-emerald-500">Rs{todayTotals.inflow.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span className="text-rose-500/70 uppercase tracking-widest">- Outflow</span>
              <span className="text-rose-500">Rs{todayTotals.outflow.toLocaleString()}</span>
            </div>
            <div className="border-t border-white/5 pt-2 flex justify-between text-sm font-black">
              <span className="text-amber-500 uppercase tracking-widest">Expected Closing</span>
              <span className="text-amber-500">Rs{expectedClosing.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest block mb-2">Actual Cash in Hand (Rs)</label>
            <input
              type="number"
              value={actualClosing}
              onChange={e => setActualClosing(e.target.value)}
              placeholder="0"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all [appearance:textfield]"
            />
          </div>

          {actualClosing && (
            <div className={`rounded-2xl p-4 flex items-center gap-3 ${variance === 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
              {variance === 0
                ? <CheckCircle className="text-emerald-500 flex-shrink-0" size={18} />
                : <AlertTriangle className="text-rose-500 flex-shrink-0" size={18} />}
              <div>
                <p className={`text-sm font-black ${variance === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {variance === 0 ? 'Balanced!' : `Variance: Rs${Math.abs(variance).toLocaleString()} ${variance > 0 ? 'surplus' : 'shortage'}`}
                </p>
              </div>
            </div>
          )}

          {variance !== 0 && actualClosing && (
            <div>
              <label className="text-rose-500 text-[10px] font-black uppercase tracking-widest block mb-2">Variance Reason (Required) *</label>
              <textarea
                value={varianceNote}
                onChange={e => setVarianceNote(e.target.value)}
                placeholder="Explain the variance..."
                rows={3}
                className="w-full bg-white/5 border border-rose-500/30 rounded-2xl px-4 py-3 text-white text-sm font-medium outline-none focus:border-rose-500/60 transition-all resize-none"
              />
            </div>
          )}

          <button
            disabled={!openingBalance || !actualClosing || (variance !== 0 && !varianceNote.trim()) || submitting}
            onClick={handleSubmit}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-black font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-amber-500/20"
          >
            {submitting ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Submit Daily Close'}
          </button>
        </div>

        {pastRecords.length > 0 && (
          <div className="bg-white/5 border border-white/8 rounded-3xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-white font-black text-xs uppercase tracking-widest">Past Reconciliations</h3>
            </div>
            <div className="divide-y divide-white/5">
              {pastRecords.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-white text-sm font-bold">{r.date}</p>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
                      Variance: {r.variance === 0 ? '—' : `Rs${Math.abs(r.variance).toLocaleString()}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    r.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    r.status === 'flagged' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
