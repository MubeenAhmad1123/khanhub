'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
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
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribePending = onSnapshot(qPending, (snapshot) => {
      setPendingTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      setLoading(false);
    });

    // Listen for history (approved/rejected)
    const qHistory = query(
      collection(db, collectionName), 
      where('status', 'in', ['approved', 'rejected']),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      setHistoryTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    return () => {
      unsubscribePending();
      unsubscribeHistory();
    };
  }, [activeTab, session]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActionLoading(id);
    const collectionName = activeTab === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
    
    try {
      // Load tx first (needed for profile sync on rehab approvals)
      const txSnap = await getDoc(doc(db, collectionName, id));
      const tx = txSnap.exists() ? ({ id: txSnap.id, ...txSnap.data() } as any) : null;

      await updateDoc(doc(db, collectionName, id), {
        status,
        approvedBy: status === 'approved' ? session?.customId : undefined,
        rejectedBy: status === 'rejected' ? session?.customId : undefined,
        approvedAt: status === 'approved' ? Timestamp.now() : undefined,
        rejectedAt: status === 'rejected' ? Timestamp.now() : undefined,
        processedAt: Timestamp.now(),
        processedBy: session?.customId
      });

      // Apply to rehab profiles only when APPROVED (patient_fee / canteen)
      if (status === 'approved' && activeTab === 'rehab' && tx?.patientId && tx?.category) {
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

          if (tx.category === 'patient_fee') {
            const feesQ = query(
              collection(db, 'rehab_fees'),
              where('patientId', '==', tx.patientId),
              where('month', '==', month)
            );
            const feesSnap = await getDocs(feesQ);

            if (feesSnap.empty) {
              const patientSnap = await getDoc(doc(db, 'rehab_patients', tx.patientId));
              const packageAmount = patientSnap.exists() ? (patientSnap.data().packageAmount || 60000) : 60000;
              const amountPaid = Number(tx.amount) || 0;
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
                  },
                ],
                lastPaymentDate: serverTimestamp(),
                lastPaymentAmount: amountPaid,
                createdAt: serverTimestamp(),
              });
            } else {
              const feeDoc = feesSnap.docs[0];
              const current = feeDoc.data() as any;
              const newPaid = (current.amountPaid || 0) + (Number(tx.amount) || 0);
              const newRemaining = Math.max(0, (current.packageAmount || 60000) - newPaid);
              const existingPayments = current.payments || [];

              await updateDoc(doc(db, 'rehab_fees', feeDoc.id), {
                amountPaid: newPaid,
                amountRemaining: newRemaining,
                lastPaymentDate: serverTimestamp(),
                lastPaymentAmount: Number(tx.amount) || 0,
                payments: [
                  ...existingPayments,
                  {
                    id,
                    amount: Number(tx.amount) || 0,
                    date: Timestamp.fromDate(txDate),
                    cashierId: tx.cashierId || 'HQ',
                    approvedBy: session?.customId,
                    status: 'approved',
                    note: tx.description || '',
                  },
                ],
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

  if (sessionLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <CheckCircle className="text-teal-500" size={32} />
              Cross-System Approvals
            </h1>
            <p className="text-slate-400 mt-1 font-medium text-sm">Review and authorize department transactions</p>
          </div>
          <div className="flex p-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 w-fit">
            {(['rehab', 'spims'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-teal-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
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
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-teal-500" size={32} />
              <p className="text-slate-500 font-bold">Fetching pending requests...</p>
            </div>
          ) : pendingTransactions.length === 0 ? (
            <div className="bg-slate-800/20 border border-dashed border-slate-700 rounded-3xl py-20 text-center">
              <div className="flex flex-col items-center gap-4 opacity-30">
                <CheckCircle size={48} />
                <p className="text-lg font-bold">All caught up! No pending approvals.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingTransactions.map((tx) => (
                <div key={tx.id} className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 hover:bg-amber-500/10 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tx?.type === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        {tx?.type === 'income' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">Rs. {Number(tx?.amount || 0).toLocaleString()}</p>
                        <p className="text-xs font-bold text-amber-500/70 uppercase tracking-widest">{tx?.category || 'General'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={!!actionLoading}
                        onClick={() => handleAction(tx.id, 'approved')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                      >
                        {actionLoading === tx.id ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                      </button>
                      <button
                        disabled={!!actionLoading}
                        onClick={() => handleAction(tx.id, 'rejected')}
                        className="bg-rose-600 hover:bg-rose-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-rose-900/20"
                      >
                        {actionLoading === tx.id ? <Loader2 className="animate-spin" size={20} /> : <XCircle size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <User size={14} className="text-amber-500/50" />
                      <span className="truncate">{tx?.description || 'No description'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium justify-end">
                      <Calendar size={14} className="text-amber-500/50" />
                      {(() => {
                        const dateInput = tx?.createdAt;
                        if (dateInput instanceof Timestamp) return dateInput.toDate().toLocaleString();
                        if (dateInput?.seconds) return new Date(dateInput.seconds * 1000).toLocaleString();
                        if (dateInput) return new Date(dateInput).toLocaleString();
                        return 'N/A';
                      })()}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-amber-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Requested By:</span>
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        {tx.createdBy || tx.cashierId || 'System'}
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
            className="flex items-center justify-between w-full p-6 bg-slate-800/30 border border-slate-700/50 rounded-3xl hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-teal-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <History className="text-teal-500" size={24} />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Approval History</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Review past authorizations ({historyTransactions.length})</p>
              </div>
            </div>
            {showHistory ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
          </button>

          {showHistory && (
            <div className="mt-6 animate-in slide-in-from-top-4 duration-300">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
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
                        historyTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
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
                              {(() => {
                                const input = tx?.processedAt;
                                if (input instanceof Timestamp) return input.toDate().toLocaleDateString();
                                if (input?.seconds) return new Date(input.seconds * 1000).toLocaleDateString();
                                if (input) return new Date(input).toLocaleDateString();
                                return 'N/A';
                              })()}
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
    </div>
  );
}
