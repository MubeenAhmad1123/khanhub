'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, limit, onSnapshot, doc, updateDoc, Timestamp, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Clock, Loader2, FileText, CheckCircle2, XCircle, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import { formatDateDMY, cn } from '@/lib/utils';
import Link from 'next/link';

const DEPARTMENTS = [
  { code: 'rehab', label: 'Rehab Center', txCollection: 'rehab_transactions' },
  { code: 'spims', label: 'Spims', txCollection: 'spims_transactions' },
  { code: 'hospital', label: 'Khan Hospital', txCollection: 'hospital_transactions' },
  { code: 'sukoon-center', label: 'Sukoon Center', txCollection: 'sukoon_transactions' },
  { code: 'welfare', label: 'Welfare', txCollection: 'welfare_transactions' },
  { code: 'job-center', label: 'Job Center', txCollection: 'jobcenter_transactions' },
];

export default function CashierPendingPage() {
  const { session, loading: sessionLoading } = useHqSession();
  const [incomingReqs, setIncomingReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const subscribeIncoming = useCallback(() => {
    if (!session?.customId) return;
    setLoading(true);
    setError(null);
    try {
      const cashierCustomId = String(session.customId || '').trim().toUpperCase();
      let rowsMap: Record<string, any[]> = {};
      DEPARTMENTS.forEach(d => rowsMap[d.txCollection] = []);

      const merge = () => {
        const allTx = DEPARTMENTS.flatMap((dept) =>
          rowsMap[dept.txCollection].map((tx: any) => ({ ...tx, _txCollection: dept.txCollection }))
        );
        
        const visible = allTx.filter((tx: any) => {
          const txCashier = String(tx.cashierId || '').trim().toUpperCase();
          if (!txCashier || txCashier === 'CASHIER') return true;
          return txCashier === cashierCustomId;
        });

        const createdMs = (row: any) => {
          const c = row.createdAt;
          if (!c) return 0;
          if (typeof c.toMillis === 'function') return c.toMillis();
          if (typeof c.seconds === 'number') return c.seconds * 1000;
          return 0;
        };
        visible.sort((a: any, b: any) => createdMs(b) - createdMs(a));
        setIncomingReqs(visible);
        setLoading(false);
      };

      const onErr = (err: unknown) => {
        console.warn('[HQ Cashier Pending] error:', err);
        setError(`${(err as any)?.code || 'error'}: ${(err as any)?.message || 'Failed to load pending requests.'}`);
        setLoading(false);
      };

      const unsubs = DEPARTMENTS.map(dept => {
        const qDept = query(
          collection(db, dept.txCollection),
          where('status', '==', 'pending_cashier'),
          limit(100)
        );
        return onSnapshot(
          qDept,
          (snap) => {
            rowsMap[dept.txCollection] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            merge();
          },
          onErr
        );
      });

      return () => {
        unsubs.forEach(u => u());
      };
    } catch (err) {
      console.error('[HQ Cashier Pending] setup error:', err);
      setError('Failed to load pending requests.');
      setLoading(false);
    }
  }, [session?.customId]);

  useEffect(() => {
    if (!session?.customId || sessionLoading) return;
    const unsub = subscribeIncoming();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [sessionLoading, session?.customId, subscribeIncoming]);

  const handleApprove = async (tx: any) => {
    if (!tx.id) return;
    setActionId(tx.id);
    try {
      const col = tx._txCollection;
      await updateDoc(doc(db, col, tx.id), {
        status: 'pending',
        forwardedAt: Timestamp.now(),
        forwardedBy: session?.customId || 'HQ-CASHIER'
      });
      
      // Notify superadmin
      await addDoc(collection(db, 'hq_notifications'), {
        type: 'transaction_forwarded',
        title: 'Transaction Forwarded',
        body: `Cashier ${session?.name || 'HQ Cashier'} forwarded a Rs ${Number(tx.amount || 0).toLocaleString()} ${tx.type || 'income'} transaction for approval.`,
        targetRole: 'superadmin',
        targetUserId: '',
        targetCustomId: 'SUPERADMIN',
        read: false,
        createdAt: Timestamp.now(),
        link: '/hq/dashboard/superadmin'
      });
    } catch (err) {
      console.error('Failed to approve transaction', err);
      alert('Failed to approve transaction.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (tx: any) => {
    if (!tx.id) return;
    const reason = prompt("Enter reason for rejection:");
    if (reason === null) return;
    
    setActionId(tx.id);
    try {
      const col = tx._txCollection;
      await updateDoc(doc(db, col, tx.id), {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectedBy: session?.customId || 'HQ-CASHIER',
        rejectReason: reason.trim() || 'Rejected by cashier'
      });
    } catch (err) {
      console.error('Failed to reject transaction', err);
      alert('Failed to reject transaction.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between h-auto sm:h-24 py-4 sm:py-0 gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
              <Link 
                href="/hq/dashboard/cashier"
                className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors flex-shrink-0 self-start sm:self-auto"
              >
                <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
              </Link>
              <div className="text-center sm:text-left flex-1 sm:flex-none">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-[1000] tracking-tighter text-zinc-900 uppercase">
                  Pending Approvals
                </h1>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-zinc-400 mt-1 sm:mt-2">
                  Review & Forward
                </p>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-2 sm:py-3 bg-amber-100 text-amber-700 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} />
              {incomingReqs.length} Pending
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-8 p-6 rounded-[2rem] bg-rose-50 border-2 border-rose-100 text-rose-600 text-sm font-black uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6">
            <Loader2 size={48} className="animate-spin text-indigo-600" />
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Loading Queue...</p>
          </div>
        ) : incomingReqs.length === 0 ? (
          <div className="py-32 text-center space-y-8 bg-white rounded-[3rem] border border-zinc-100 shadow-xl shadow-zinc-200/20">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-zinc-50 rounded-[2.5rem] sm:rounded-[3rem] flex items-center justify-center mx-auto shadow-inner border-2 border-zinc-100">
              <CheckCircle2 className="text-emerald-400 w-12 h-12 sm:w-16 sm:h-16" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-[1000] text-zinc-900 uppercase tracking-tighter">All Caught Up</h2>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-400 mt-3">There are no pending requests right now.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {incomingReqs.map((req) => (
              <div 
                key={req.id} 
                className="bg-white rounded-[2rem] p-6 sm:p-8 border-2 border-zinc-100 shadow-xl shadow-zinc-200/40 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-600/10 transition-all flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                      req.type === 'income' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
                    )}>
                      {req.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{req.departmentCode === 'spims' ? 'Request' : req.departmentCode}</p>
                      <h4 className="text-lg font-black text-zinc-900 uppercase tracking-tight mt-1 truncate max-w-[150px]">{req.patientName || req.donorName || 'General Request'}</h4>
                    </div>
                  </div>
                </div>
                
                <div className="mb-8">
                  <p className="text-3xl font-[1000] text-zinc-900 tracking-tighter tabular-nums">Rs {Number(req.amount).toLocaleString()}</p>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">{formatDateDMY(req.date || req.createdAt)}</p>
                </div>

                <div className="mt-auto flex gap-3 pt-6 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={actionId === req.id}
                    onClick={() => handleApprove(req)}
                    className="flex-1 h-12 rounded-[1.2rem] bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {actionId === req.id ? <Loader2 size={16} className="animate-spin" /> : (
                      <>
                        <CheckCircle2 size={16} /> Approve
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={actionId === req.id}
                    onClick={() => handleReject(req)}
                    className="flex-1 h-12 rounded-[1.2rem] bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
