'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, getDocs, limit, query, Timestamp, where } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, Loader2, Search, Send } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn } from '@/lib/utils';

type CashierUser = { uid: string; customId: string; name: string; role: string; isActive?: boolean };
type RehabPatient = { id: string; name: string; inpatientNumber?: string; packageAmount?: number; isActive?: boolean };

export default function SuperadminFeeRequestsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const [cashiers, setCashiers] = useState<CashierUser[]>([]);
  const [cashiersLoading, setCashiersLoading] = useState(true);

  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<RehabPatient[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<RehabPatient | null>(null);

  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [amount, setAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
    }
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    const run = async () => {
      setCashiersLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'hq_users'), where('role', '==', 'cashier')));
        const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as any)).filter((u: CashierUser) => u.isActive !== false);
        setCashiers(list);
        if (!selectedCashierId && list[0]?.customId) setSelectedCashierId(list[0].customId);
      } finally {
        setCashiersLoading(false);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.role]);

  const canSubmit = useMemo(() => {
    if (!selectedPatient) return false;
    if (!selectedCashierId) return false;
    if (!amount || Number(amount) <= 0) return false;
    if (!txDate) return false;
    return true;
  }, [selectedPatient, selectedCashierId, amount, txDate]);

  async function searchPatients() {
    const qStr = patientQuery.trim();
    if (!qStr) return;
    setPatientSearchLoading(true);
    try {
      const qy = query(
        collection(db, 'rehab_patients'),
        where('name', '>=', qStr),
        where('name', '<=', `${qStr}\uf8ff`),
        limit(20)
      );
      const snap = await getDocs(qy);
      setPatientResults(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
    } finally {
      setPatientSearchLoading(false);
    }
  }

  async function createFeeRequest(e: React.FormEvent) {
    e.preventDefault();
    if (processing) return;
    setMessage(null);
    if (!canSubmit) return setMessage({ type: 'error', text: 'Select patient, cashier, date and valid amount.' });

    setProcessing(true);
    try {
      await addDoc(collection(db, 'rehab_transactions'), {
        type: 'income',
        category: 'patient_fee',
        amount: Number(amount),
        description: note || 'Fee added by HQ',
        patientId: selectedPatient!.id,
        patientName: selectedPatient!.name,
        cashierId: selectedCashierId,
        status: 'pending_cashier',
        proofRequired: true,
        date: Timestamp.fromDate(new Date(`${txDate}T00:00:00`)),
        transactionDate: Timestamp.fromDate(new Date(`${txDate}T00:00:00`)),
        createdBy: session?.uid,
        createdByName: session?.name || 'HQ Superadmin',
        createdAt: Timestamp.now(),
        forwardedToCashierAt: Timestamp.now(),
      });

      setMessage({ type: 'success', text: 'Fee request sent to cashier.' });
      setAmount('');
      setNote('');
      setSelectedPatient(null);
      setPatientResults([]);
      setPatientQuery('');
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to create fee request.' });
    } finally {
      setProcessing(false);
    }
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-black dark:text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black overflow-x-hidden w-full max-w-full transition-colors duration-300 py-12">
      <div className="space-y-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl lg:text-4xl font-black text-black dark:text-white uppercase tracking-tighter">Protocol Requests</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 italic">
            Manual Authorization Cascade • Global Ledger Injection
          </p>
        </div>

        <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
          <form onSubmit={createFeeRequest} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-4">Subject Identification</p>
                <div className="flex gap-3">
                  <input
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder="SEARCH SUBJECT NAME..."
                    className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-black dark:text-white outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 uppercase tracking-widest text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={searchPatients}
                    className="px-6 py-4 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-black active:scale-95 transition-all shadow-xl"
                  >
                    {patientSearchLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </button>
                </div>

                {selectedPatient ? (
                  <div className="mt-4 p-6 rounded-3xl bg-black dark:bg-white text-white dark:text-black shadow-xl border border-black dark:border-white transform scale-[1.02] transition-all">
                    <p className="text-lg font-black uppercase tracking-tight truncate">{selectedPatient.name}</p>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">
                      {selectedPatient.inpatientNumber || selectedPatient.id}
                    </p>
                    <button
                      type="button"
                      className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] border-b border-white/40 dark:border-black/40 hover:border-white dark:hover:border-black transition-all"
                      onClick={() => setSelectedPatient(null)}
                    >
                      Reset Selection
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPatient(p)}
                        className="w-full text-left p-5 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-white transform hover:translate-x-1 transition-all"
                      >
                        <div className="text-sm font-black text-black dark:text-white uppercase tracking-tight">{p.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">{p.inpatientNumber || p.id}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 min-w-0">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-4">Authorization Node</p>
                  <select
                    value={selectedCashierId}
                    onChange={(e) => setSelectedCashierId(e.target.value)}
                    disabled={cashiersLoading}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest text-black dark:text-white outline-none disabled:opacity-30 appearance-none shadow-sm cursor-pointer focus:border-black dark:focus:border-white/40"
                  >
                    {cashiers.map((c) => (
                      <option key={c.customId} value={c.customId}>
                        {c.name.toUpperCase()} ({c.customId})
                      </option>
                    ))}
                  </select>
                  {cashiers.length === 0 && !cashiersLoading && (
                    <p className="mt-3 text-[9px] font-black text-rose-500 uppercase tracking-widest italic">Critical error: no active authorization nodes found.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-4">Ledger Date</p>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white/40 shadow-sm"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-4">Value (PKR)</p>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-black dark:text-white outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 shadow-sm focus:border-black dark:focus:border-white/40"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-4">Authorization Memo</p>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="ENTER AUTHORIZATION SUMMARY..."
                    className="w-full min-h-[140px] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[1.5rem] px-6 py-4 text-sm font-black text-black dark:text-white outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 resize-none uppercase tracking-widest text-[11px] shadow-sm focus:border-black dark:focus:border-white/40"
                  />
                </div>
              </div>
            </div>

            {message && (
              <div
                className={cn(
                  'p-6 rounded-3xl border flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500',
                  message.type === 'success'
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                    : 'bg-rose-500 text-white border-rose-600'
                )}
              >
                {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                <p className="text-xs font-black uppercase tracking-[0.1em]">{message.text}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || processing}
              className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-[12px] flex items-center justify-center gap-3 disabled:opacity-30 bg-black text-white dark:bg-white dark:text-black hover:scale-[1.01] transition-all shadow-2xl active:scale-[0.98]"
            >
              {processing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              <span>Commit Protocol Task</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

