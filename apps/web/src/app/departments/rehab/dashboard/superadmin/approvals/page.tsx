'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, updateDoc, doc, query, where, orderBy, Timestamp, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, 
  Filter, Loader2, Receipt, AlertCircle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ApprovalsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [historyTab, setHistoryTab] = useState<'approved' | 'rejected'>('approved');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) {
      router.push('/departments/rehab/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'superadmin') {
      router.push('/departments/rehab/login');
      return;
    }
    setSession(parsed);
    setLoading(false);
  }, [router]);

  // Realtime listener for pending transactions
  useEffect(() => {
    if (!session) return;
    
    const q = query(
      collection(db, 'rehab_transactions'),
      where('status', '==', 'pending'),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [session]);

  // Fetch History
  useEffect(() => {
    if (!session) return;
    
    const fetchHistory = async () => {
      const field = historyTab === 'approved' ? 'approvedAt' : 'rejectedAt';
      const q = query(
        collection(db, 'rehab_transactions'),
        where('status', '==', historyTab),
        orderBy(field, 'desc'),
        limit(30)
      );
      
      const snap = await getDocs(q);
      setHistoryTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    
    fetchHistory();
  }, [session, historyTab]);

  const handleApprove = async (txId: string) => {
    try {
      setActionLoading(txId);
      await updateDoc(doc(db, 'rehab_transactions', txId), {
        status: 'approved',
        approvedBy: session.uid,
        approvedAt: Timestamp.now()
      });
      toast.success('Approved ✓');
    } catch (error) {
      console.error("Approve error", error);
      toast.error("Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (txId: string) => {
    if (rejectId !== txId) {
      setRejectId(txId);
      setRejectReason('');
      return;
    }
    
    try {
      setActionLoading(txId);
      await updateDoc(doc(db, 'rehab_transactions', txId), {
        status: 'rejected',
        rejectedBy: session.uid,
        rejectedAt: Timestamp.now(),
        rejectReason: rejectReason || null
      });
      toast.success('Rejected');
      setRejectId(null);
      setRejectReason('');
    } catch (error) {
      console.error("Reject error", error);
      toast.error("Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const TransactionCard = ({ tx, type }: { tx: any, type: 'pending' | 'history' }) => (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-start gap-4 flex-1">
          <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}>
            {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                tx.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {tx.type}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-sm font-medium text-gray-600 capitalize">
                {tx.category.replace('_', ' ')}
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-1">
              {tx.amount.toLocaleString()} PKR
            </div>
            {tx.description && (
              <p className="text-sm text-gray-600 mb-2">{tx.description}</p>
            )}
            <div className="text-xs text-gray-400 space-y-1">
              <div>Date: {tx.date?.toDate?.()?.toLocaleDateString() || 'Unknown'}</div>
              <div>Submitted by: {tx.cashierId}</div>
              {type === 'history' && tx.status === 'rejected' && tx.rejectReason && (
                <div className="text-red-500 font-medium mt-1">Reason: {tx.rejectReason}</div>
              )}
            </div>
          </div>
        </div>

        {type === 'pending' ? (
          <div className="flex flex-col gap-2 min-w-[140px]">
             {rejectId === tx.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-red-500 outline-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleReject(tx.id)}
                    disabled={actionLoading === tx.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1.5 rounded transition-colors disabled:opacity-50"
                  >Confirm</button>
                  <button 
                    onClick={() => setRejectId(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-1.5 rounded transition-colors"
                  >Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleApprove(tx.id)}
                  disabled={actionLoading === tx.id}
                  className="w-full flex items-center justify-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                  Approve
                </button>
                <button
                  onClick={() => handleReject(tx.id)}
                  disabled={actionLoading === tx.id}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 whitespace-nowrap">
            {tx.status === 'approved' ? (
              <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> Approved
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full text-sm font-medium">
                <XCircle className="w-4 h-4" /> Rejected
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-teal-600" />
              Transaction Approvals
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and manage financial entries
            </p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-medium text-sm border border-yellow-200">
            <Clock className="w-4 h-4" />
            {pendingTransactions.length} Pending
          </div>
        </div>

        {/* Pending Section */}
        <section>
          <div className="space-y-4">
            {pendingTransactions.length === 0 ? (
              <div className="bg-white border text-center border-gray-200 border-dashed rounded-xl p-12 text-gray-500">
                <p className="text-lg font-medium text-gray-600 mb-1">No pending transactions 🎉</p>
                <p className="text-sm">You are all caught up!</p>
              </div>
            ) : (
              pendingTransactions.map(tx => <TransactionCard key={tx.id} tx={tx} type="pending" />)
            )}
          </div>
        </section>

        {/* History Section */}
        <section className="pt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-2">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" />
              History
            </h2>
            <div className="flex gap-4">
              <button 
                onClick={() => setHistoryTab('approved')}
                className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                  historyTab === 'approved' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Approved
              </button>
              <button 
                onClick={() => setHistoryTab('rejected')}
                className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                  historyTab === 'rejected' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {historyTransactions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No recent history found.</p>
            ) : (
              historyTransactions.map(tx => <TransactionCard key={tx.id} tx={tx} type="history" />)
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
