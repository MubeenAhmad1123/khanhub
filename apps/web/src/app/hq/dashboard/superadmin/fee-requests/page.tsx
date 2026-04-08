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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden w-full max-w-full">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Fee Requests</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Create an admin-added fee that must be “Added” by cashier, then approved to apply on patient profile.
          </p>
        </div>

        <div className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 rounded-3xl p-6 overflow-hidden">
          <form onSubmit={createFeeRequest} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Patient</p>
                <div className="flex gap-2">
                  <input
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder="Search patient name..."
                    className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={searchPatients}
                    className="px-4 py-3 rounded-2xl bg-teal-600 text-white font-black"
                  >
                    {patientSearchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </button>
                </div>

                {selectedPatient ? (
                  <div className="mt-3 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20">
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">{selectedPatient.name}</p>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate">
                      {selectedPatient.inpatientNumber || selectedPatient.id}
                    </p>
                    <button
                      type="button"
                      className="mt-3 text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-400"
                      onClick={() => setSelectedPatient(null)}
                    >
                      Change patient
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPatient(p)}
                        className="w-full text-left p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-teal-500/40"
                      >
                        <div className="text-sm font-black text-gray-900 dark:text-white truncate">{p.name}</div>
                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate">{p.inpatientNumber || p.id}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 min-w-0">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Assign Cashier</p>
                  <select
                    value={selectedCashierId}
                    onChange={(e) => setSelectedCashierId(e.target.value)}
                    disabled={cashiersLoading}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black text-gray-900 dark:text-white outline-none disabled:opacity-60"
                  >
                    {cashiers.map((c) => (
                      <option key={c.customId} value={c.customId}>
                        {c.name} ({c.customId})
                      </option>
                    ))}
                  </select>
                  {cashiers.length === 0 && !cashiersLoading && (
                    <p className="mt-2 text-xs font-bold text-amber-600">No cashier users found in `hq_users`.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Date</p>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Amount (PKR)</p>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Note</p>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note shown in approvals…"
                    className="w-full min-h-[110px] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none placeholder:text-gray-400 resize-none"
                  />
                </div>
              </div>
            </div>

            {message && (
              <div
                className={cn(
                  'p-3 rounded-2xl border flex items-center gap-2',
                  message.type === 'success'
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                )}
              >
                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <p className="text-sm font-bold">{message.text}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || processing}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-white flex items-center justify-center gap-2 disabled:opacity-50 bg-teal-600 hover:bg-teal-700"
            >
              {processing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Send to Cashier
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

