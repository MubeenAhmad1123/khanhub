'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Filter } from 'lucide-react';

type FilterType = 'all' | 'rehab' | 'spims' | 'urgent';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ManagerApprovalsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'manager') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'manager') return;

    const fetchData = async () => {
      try {
        const [rehabSnap, spimsSnap] = await Promise.all([
          getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'pending'))),
          getDocs(query(collection(db, 'spims_transactions'), where('status', '==', 'pending'))).catch(() => ({ docs: [] })),
        ]);

        const rehab = rehabSnap.docs.map(d => ({ id: d.id, ...d.data(), dept: 'rehab' } as any));
        const spims = spimsSnap.docs.map(d => ({ id: d.id, ...d.data(), dept: 'spims' } as any));
        const all = [...rehab, ...spims];

        all.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setTransactions(all);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const handleApprove = async (id: string, dept: string) => {
    setActionLoading(id);
    try {
      const col = dept === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
      await updateDoc(doc(db, col, id), {
        status: 'approved',
        approvedBy: session?.customId,
        approvedAt: new Date().toISOString(),
      });
      setTransactions(prev => prev.filter(t => t.id !== id));
      setMessage({ type: 'success', text: 'Transaction approved' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, dept: string) => {
    if (!rejectReason.trim()) return;
    setActionLoading(id);
    try {
      const col = dept === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
      await updateDoc(doc(db, col, id), {
        status: 'rejected',
        rejectionReason: rejectReason,
      });
      setTransactions(prev => prev.filter(t => t.id !== id));
      setRejectingId(null);
      setRejectReason('');
      setMessage({ type: 'success', text: 'Transaction rejected' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = transactions.filter(t => {
    if (filter === 'urgent') {
      return t.createdAt && (Date.now() - new Date(t.createdAt).getTime()) > 48 * 60 * 60 * 1000;
    }
    if (filter === 'all') return true;
    return t.dept === filter;
  });

  const counts = {
    all: transactions.length,
    rehab: transactions.filter(t => t.dept === 'rehab').length,
    spims: transactions.filter(t => t.dept === 'spims').length,
    urgent: transactions.filter(t => t.createdAt && (Date.now() - new Date(t.createdAt).getTime()) > 48 * 60 * 60 * 1000).length,
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Approvals</h1>
        <p className="text-gray-400 text-sm mt-1">Review and approve pending transactions</p>
      </div>

      {message.text && (
        <div className={`p-6 rounded-3xl border font-bold ${
          message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['all', 'rehab', 'spims', 'urgent'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              filter === f
                ? 'bg-gray-800 text-white shadow-lg'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            <Filter size={12} />
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] ${
              filter === f ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => {
            const isUrgent = t.createdAt && (Date.now() - new Date(t.createdAt).getTime()) > 48 * 60 * 60 * 1000;
            const isRejecting = rejectingId === t.id;

            return (
              <div key={t.id} className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${
                isUrgent ? 'border-red-200 ring-2 ring-red-100' : 'border-gray-100'
              }`}>
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        t.dept === 'rehab' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'
                      }`}>
                        {t.dept}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        t.type === 'income' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {t.type}
                      </span>
                      {isUrgent && (
                        <span className="px-3 py-1 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                          <AlertTriangle size={10} /> Urgent
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl text-gray-900">₨{t.amount?.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(t.createdAt)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</p><p className="font-bold text-gray-700">{t.category}</p></div>
                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient</p><p className="font-bold text-gray-700">{t.patientName || t.studentName || 'N/A'}</p></div>
                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cashier</p><p className="font-mono font-bold text-gray-700">{t.cashierId}</p></div>
                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p><p className="font-bold text-gray-700">{t.date ? new Date(t.date).toLocaleDateString('en-PK') : '—'}</p></div>
                  </div>

                  {t.note && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl mb-4">
                      <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Note: </span>
                      {t.note}
                    </p>
                  )}

                  {isRejecting ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Rejection reason..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-red-100"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(t.id, t.dept)}
                          disabled={actionLoading === t.id || !rejectReason.trim()}
                          className="flex-1 bg-red-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="px-6 bg-gray-100 text-gray-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(t.id, t.dept)}
                        disabled={actionLoading === t.id}
                        className="flex-1 bg-green-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(t.id)}
                        disabled={actionLoading === t.id}
                        className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}