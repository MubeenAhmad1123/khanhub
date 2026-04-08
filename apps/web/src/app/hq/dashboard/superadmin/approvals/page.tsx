'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { formatDateDMY } from '@/lib/utils';
import { sendHqNotification } from '@/lib/hqNotifications';
import { 
  Loader2, CheckCircle, XCircle, Clock, History, 
  ChevronDown, ChevronUp, DollarSign, ArrowUpRight, 
  ArrowDownLeft, User, Calendar, Tag
} from 'lucide-react';

type TabType = 'rehab' | 'spims';

export default function HqApprovalsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [activeTab, setActiveTab] = useState<TabType>('rehab');
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const buildTxUpdate = (status: 'approved' | 'rejected', reason?: string) => {
    const payload: Record<string, any> = {
      status,
      processedAt: Timestamp.now(),
      processedBy: session?.customId,
    };
    if (status === 'approved') {
      if (session?.customId) payload.approvedBy = session.customId;
      payload.approvedAt = Timestamp.now();
    }
    if (status === 'rejected') {
      if (session?.customId) payload.rejectedBy = session.customId;
      payload.rejectedAt = Timestamp.now();
      payload.rejectionReason = (reason || '').trim();
    }
    return payload;
  };

  const getEntity = (tx: any) => {
    if (tx?.patientId || tx?.patientName) {
      return {
        kind: 'patient' as const,
        id: tx.patientId,
        name: tx.patientName,
        href:
          tx.patientId
            ? `/hq/dashboard/superadmin/rehab/patients/${tx.patientId}`
            : null,
      };
    }
    if (tx?.staffId || tx?.staffName) {
      return {
        kind: 'staff' as const,
        id: tx.staffId,
        name: tx.staffName,
        href: null,
      };
    }
    if (tx?.studentId || tx?.studentName) {
      return {
        kind: 'student' as const,
        id: tx.studentId,
        name: tx.studentName,
        href: null,
      };
    }
    return { kind: 'unknown' as const, id: null, name: null, href: null };
  };

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;

    setLoading(true);
    const collectionName = activeTab === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
    
    // Listen for pending
    const qPending = query(
      collection(db, collectionName), 
      where('status', '==', 'pending')
    );
    
    const unsubscribePending = onSnapshot(qPending, (snapshot) => {
      setPendingTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      setLoading(false);
    });

    // Listen for history (approved/rejected)
    const qHistory = query(
      collection(db, collectionName), 
      where('status', 'in', ['approved', 'rejected']),
      limit(50)
    );
    
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      rows.sort((a, b) => {
        const aVal = a?.processedAt;
        const bVal = b?.processedAt;
        const aMs = aVal instanceof Timestamp ? aVal.toMillis() : aVal?.seconds ? aVal.seconds * 1000 : (aVal ? new Date(aVal).getTime() : 0);
        const bMs = bVal instanceof Timestamp ? bVal.toMillis() : bVal?.seconds ? bVal.seconds * 1000 : (bVal ? new Date(bVal).getTime() : 0);
        return bMs - aMs;
      });
      setHistoryTransactions(rows);
    });

    return () => {
      unsubscribePending();
      unsubscribeHistory();
    };
  }, [activeTab, session]);

  const handleAction = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    setActionLoading(id);
    const collectionName = activeTab === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
    
    try {
      // Load tx first (needed for profile sync on rehab approvals)
      const txSnap = await getDoc(doc(db, collectionName, id));
      const tx = txSnap.exists() ? ({ id: txSnap.id, ...txSnap.data() } as any) : null;

      // Idempotency guard — prevent double processing
      if (tx?.processedAt) {
        alert('This transaction has already been processed. Refresh the page.');
        setActionLoading(null);
        return;
      }

      if (status === 'approved' && tx?.proofRequired) {
        // New rule: proof OR missing-proof reason must be present before approval.
        const hasProof = !!tx?.proofUrl || !!tx?.proofMissingReason;
        if (!hasProof) {
          alert('Cannot approve: proof upload is required (or missing-proof reason).');
          setActionLoading(null);
          return;
        }
      }

      await updateDoc(doc(db, collectionName, id), buildTxUpdate(status, reason));

      if (tx?.cashierId) {
        await sendHqNotification({
          recipientId: tx.cashierId,
          recipientRole: 'cashier',
          type: status === 'approved' ? 'tx_approved' : 'tx_rejected',
          title: status === 'approved' ? 'Transaction Approved' : 'Transaction Rejected',
          body: status === 'approved'
            ? `Your transaction of Rs ${Number(tx.amount || 0).toLocaleString()} has been approved.`
            : `Transaction of Rs ${Number(tx.amount || 0).toLocaleString()} was rejected. Reason: ${reason || 'N/A'}`,
          relatedId: id,
        });
      }

      // Sync to rehab profiles only when APPROVED
      if (status === 'approved' && activeTab === 'rehab' && tx?.category) {
        try {
          const txDate: Date =
            tx?.date instanceof Timestamp
              ? tx.date.toDate()
              : tx?.date?.seconds
                ? new Date(tx.date.seconds * 1000)
                : tx?.transactionDate instanceof Timestamp
                  ? tx.transactionDate.toDate()
                  : new Date();

          const month = txDate.toISOString().slice(0, 7);

          const isPatientFee =
            tx.category === 'patient_fee' || tx.category === 'fee' || tx.category === 'admission_fee';

          if (isPatientFee && tx.patientId) {
            const feesQ = query(
              collection(db, 'rehab_fees'),
              where('patientId', '==', tx.patientId),
              where('month', '==', month)
            );
            const feesSnap = await getDocs(feesQ);
            const amountPaid = Number(tx.amount) || 0;
            const proofUrl = tx.proofUrl || undefined;
            const proofMissingReason = proofUrl ? undefined : (tx.proofMissingReason || undefined);

            if (feesSnap.empty) {
              const patientSnap = await getDoc(doc(db, 'rehab_patients', tx.patientId));
              const packageAmount = patientSnap.exists() ? (patientSnap.data().packageAmount || 60000) : 60000;
              const amountRemaining = Math.max(0, packageAmount - amountPaid);

              await addDoc(collection(db, 'rehab_fees'), {
                patientId: tx.patientId,
                patientName: tx.patientName || '',
                month,
                packageAmount,
                amountPaid,
                amountRemaining,
                payments: [
                  {
                    id,
                    amount: amountPaid,
                    date: Timestamp.fromDate(txDate),
                    cashierId: tx.cashierId || 'HQ',
                    approvedBy: session?.customId,
                    status: 'approved',
                    note: tx.description || '',
                    proofUrl: proofUrl || null,
                    proofMissingReason: proofMissingReason || null,
                  },
                ],
                lastPaymentDate: serverTimestamp(),
                lastPaymentAmount: amountPaid,
                createdAt: serverTimestamp(),
              });
            } else {
              const feeDoc = feesSnap.docs[0];
              const current = feeDoc.data() as any;
              const newPaid = (current.amountPaid || 0) + amountPaid;
              const newRemaining = Math.max(0, (current.packageAmount || 60000) - newPaid);
              const existingPayments = current.payments || [];

              await updateDoc(doc(db, 'rehab_fees', feeDoc.id), {
                amountPaid: newPaid,
                amountRemaining: newRemaining,
                lastPaymentDate: serverTimestamp(),
                lastPaymentAmount: amountPaid,
                payments: [
                  ...existingPayments,
                  {
                    id,
                    amount: amountPaid,
                    date: Timestamp.fromDate(txDate),
                    cashierId: tx.cashierId || 'HQ',
                    approvedBy: session?.customId,
                    status: 'approved',
                    note: tx.description || '',
                    proofUrl: proofUrl || null,
                    proofMissingReason: proofMissingReason || null,
                  },
                ],
              });
            }
          }

          if (tx.category === 'staff_salary' && tx.staffId) {
            const salaryQ = query(
              collection(db, 'rehab_salary_records'),
              where('staffId', '==', tx.staffId),
              where('month', '==', month)
            );
            const salarySnap = await getDocs(salaryQ);
            const amount = Number(tx.amount) || 0;
            const proofUrl = tx.proofUrl || undefined;
            const proofMissingReason = proofUrl ? undefined : (tx.proofMissingReason || undefined);

            const proofEntry = {
              id,
              amount,
              date: Timestamp.fromDate(txDate),
              proofUrl: proofUrl || null,
              proofMissingReason: proofMissingReason || null,
            };

            if (salarySnap.empty) {
              await addDoc(collection(db, 'rehab_salary_records'), {
                staffId: tx.staffId,
                staffName: tx.staffName || '',
                month,
                amount,
                transactionId: id,
                paidAt: serverTimestamp(),
                approvedBy: session?.customId,
                proofs: [proofEntry],
                createdAt: serverTimestamp(),
              });
            } else {
              const salaryDoc = salarySnap.docs[0];
              const current = salaryDoc.data() as any;
              const currentAmount = Number(current.amount) || 0;
              const proofs = current.proofs || [];

              await updateDoc(doc(db, 'rehab_salary_records', salaryDoc.id), {
                amount: currentAmount + amount,
                lastPaidAt: serverTimestamp(),
                transactionId: id,
                proofs: [...proofs, proofEntry],
              });
            }
          }
        } catch (syncErr) {
          console.error('Rehab profile sync failed:', syncErr);
        }
      }
    } catch (err) {
      console.error(`Error ${status} transaction:`, err);
      alert(`Failed to ${status} transaction`);
    } finally {
      setActionLoading(null);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a]">
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-3xl bg-white/5 border border-white/8 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:pl-0 bg-[#0f172a] text-slate-200">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <CheckCircle className="text-teal-500" size={32} />
              Cross-System Approvals
            </h1>
            <p className="text-slate-400 mt-1 font-medium text-sm">Review and authorize department transactions</p>
          </div>
          <div className="inline-flex bg-white/5 rounded-2xl p-1 border border-white/8 w-fit">
            {(['rehab', 'spims'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`min-h-[44px] px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                  activeTab === tab 
                    ? 'bg-amber-500 text-black' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'rehab' ? 'Rehab Center' : 'SPIMS College'}
              </button>
            ))}
          </div>
        </div>

        {/* Pending Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="text-amber-500" size={20} />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Pending Authorization</h2>
            <span className="bg-amber-500 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full">
              {pendingTransactions.length}
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 rounded-3xl bg-white/5 border border-white/8 animate-pulse" />
              ))}
            </div>
          ) : pendingTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="text-emerald-500" size={28} />
              </div>
              <p className="text-emerald-500/60 font-black uppercase tracking-widest text-xs">All clear — no pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTransactions.map((tx, index) => (
                <div key={tx.id} style={{ animationDelay: `${index * 80}ms` }} className="animate-in fade-in slide-in-from-bottom-3 duration-400 bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 hover:bg-amber-500/10 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tx?.type === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        {tx?.type === 'income' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">Rs. {Number(tx?.amount || 0).toLocaleString()}</p>
                        <p className="text-xs font-bold text-amber-500/70 uppercase tracking-widest">{tx?.categoryName || tx?.category || 'General'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={!!actionLoading}
                        onClick={() => handleAction(tx.id, 'approved')}
                        className="min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-90 transition-transform duration-100"
                      >
                        {actionLoading === tx.id ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                      </button>
                      <button
                        disabled={!!actionLoading}
                        onClick={() => {
                          setRejectTarget({ id: tx.id });
                          setRejectionReason('');
                        }}
                        className="min-h-[44px] bg-rose-600 hover:bg-rose-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-rose-900/20 active:scale-90 transition-transform duration-100"
                      >
                        {actionLoading === tx.id ? <Loader2 className="animate-spin" size={20} /> : <XCircle size={20} />}
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const entity = getEntity(tx);
                    const dateInput = tx?.createdAt || tx?.transactionDate || tx?.date;
                    const createdAtStr =
                      dateInput instanceof Timestamp
                        ? dateInput.toDate().toLocaleString()
                        : dateInput?.seconds
                          ? new Date(dateInput.seconds * 1000).toLocaleString()
                          : dateInput
                            ? new Date(dateInput).toLocaleString()
                            : 'N/A';

                    const requestedByName =
                      tx?.cashierForwardedByName ||
                      tx?.createdByName ||
                      tx?.createdBy ||
                      tx?.cashierId ||
                      'System';

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-300 font-medium min-w-0">
                          <User size={14} className="text-amber-500/50 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              {entity.kind === 'patient' ? 'Patient' : entity.kind === 'staff' ? 'Staff' : entity.kind === 'student' ? 'Student' : 'Account'}
                            </p>
                            <p className="font-black text-white truncate">
                              {entity.name || '—'}
                            </p>
                            {entity.href ? (
                              <a
                                href={entity.href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block mt-2 text-[10px] font-black uppercase tracking-widest text-teal-400 hover:text-teal-300"
                              >
                                View Profile
                              </a>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 text-slate-400 font-medium">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                              <Calendar size={14} className="text-amber-500/50" /> Date
                            </span>
                            <span className="text-xs font-bold text-slate-300 text-right">{createdAtStr}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-slate-400 font-medium">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                              <Tag size={14} className="text-amber-500/50" /> Requested by
                            </span>
                            <span className="text-xs font-bold text-slate-200 text-right truncate max-w-[220px]">
                              {requestedByName}
                            </span>
                          </div>

                          {tx?.paymentMethod ? (
                            <div className="flex items-center justify-between gap-2 text-slate-400 font-medium">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Method
                              </span>
                              <span className="text-xs font-bold text-slate-300">{String(tx.paymentMethod).replace(/_/g, ' ')}</span>
                            </div>
                          ) : null}

                          {tx?.referenceNo ? (
                            <div className="flex items-center justify-between gap-2 text-slate-400 font-medium">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Ref
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-300">{tx.referenceNo}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}

                  {tx?.description ? (
                    <div className="mt-4 text-xs font-bold text-slate-300 bg-slate-900/30 border border-slate-700/40 rounded-2xl px-4 py-3">
                      {tx.description}
                    </div>
                  ) : null}

                  {(tx?.proofUrl || tx?.proofMissingReason) && (
                    <div className="mt-3">
                      {tx?.proofUrl ? (
                        <div className="flex items-start gap-3">
                          <a
                            href={tx.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-black uppercase tracking-widest text-teal-400 hover:text-teal-300 whitespace-nowrap"
                          >
                            View Proof
                          </a>
                          {typeof tx.proofUrl === 'string' && /\.(png|jpg|jpeg|webp|gif)$/i.test(tx.proofUrl) && (
                            <img src={tx.proofUrl} alt="Proof of payment" className="w-20 h-20 rounded-xl object-cover border border-slate-700/50" />
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl uppercase tracking-widest">
                          Missing Proof Reason: {tx?.proofMissingReason || '—'}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-amber-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Requested By:</span>
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        {tx?.cashierForwardedByName || tx?.createdByName || tx.createdBy || tx.cashierId || 'System'}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      ID: {tx.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="mt-20">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="min-h-[44px] flex items-center justify-between w-full p-6 bg-slate-800/30 border border-slate-700/50 rounded-3xl hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-teal-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <History className="text-teal-500" size={24} />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center">
                  Approval History
                  {historyTransactions.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 text-[9px] font-black ml-2">
                      {historyTransactions.length > 99 ? '99+' : historyTransactions.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Review past authorizations ({historyTransactions.length})</p>
              </div>
            </div>
            {showHistory ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
          </button>

          {showHistory && (
            <div className="mt-6 animate-in slide-in-from-top-4 duration-300">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/50 border-b border-slate-700/50">
                        <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Transaction</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Amount</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Authorizer</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {historyTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-bold">No history records yet</td>
                        </tr>
                      ) : (
                        historyTransactions.map((tx, index) => (
                          <tr key={tx.id} style={{ animationDelay: `${index * 30}ms` }} className="animate-in fade-in duration-300 hover:bg-slate-700/40 transition-colors duration-150">
                            <td className="px-6 py-5">
                              <div>
                                <p className="font-bold text-white">{tx.description}</p>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tx.category}</p>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {tx.type === 'income' ? '+' : '-'} Rs. {Number(tx.amount).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                tx?.status === 'approved' 
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              }`}>
                                {tx?.status === 'approved' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                {tx?.status || 'UNKNOWN'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{tx.approvedBy || tx.rejectedBy || 'N/A'}</p>
                            </td>
                            <td className="px-6 py-5 text-xs text-slate-500 font-bold">
                              {formatDateDMY(tx?.processedAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <h3 className="text-white font-black text-xl uppercase tracking-widest mb-2">Rejection Reason</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
              This reason will be visible to the cashier.
            </p>
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none resize-none focus:border-amber-500/50 transition-colors"
              rows={4}
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setRejectTarget(null)}
                className="min-h-[44px] flex-1 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs uppercase tracking-widest py-3 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!rejectionReason.trim() || !!actionLoading}
                onClick={async () => {
                  if (!rejectionReason.trim()) return;
                  await handleAction(rejectTarget.id, 'rejected', rejectionReason.trim());
                  setRejectTarget(null);
                }}
                className="min-h-[44px] flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3 rounded-2xl transition-all"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
