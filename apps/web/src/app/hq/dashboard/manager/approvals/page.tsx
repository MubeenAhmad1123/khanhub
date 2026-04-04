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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600 dark:text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 p-4 md:p-8 bg-gray-50 dark:bg-[#0A0A0A] min-h-screen">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Approvals</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Review and approve pending transactions</p>
      </div>

      {message.text && (
        <div className={`p-6 rounded-3xl border font-bold animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' 
            ? 'bg-green-50/50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20' 
            : 'bg-red-50/50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2 p-1 bg-white/50 dark:bg-white/5 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
        {(['all', 'rehab', 'spims', 'urgent'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${
              filter === f
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-md scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5'
            }`}
          >
            <Filter size={10} />
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] ${
              filter === f ? 'bg-white/20 dark:bg-black/10' : 'bg-gray-100 dark:bg-white/10'
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-[#111111] rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <p className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-xs">No pending approvals found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(t => {
            const isUrgent = t.createdAt && (Date.now() - new Date(t.createdAt).getTime()) > 48 * 60 * 60 * 1000;
            const isRejecting = rejectingId === t.id;

            return (
              <div key={t.id} className={`group bg-white dark:bg-[#111111] rounded-[2.5rem] border transition-all duration-300 hover:shadow-xl hover:shadow-black/5 ${
                isUrgent 
                  ? 'border-red-200 dark:border-red-500/30 ring-2 ring-red-50 dark:ring-red-500/10' 
                  : 'border-gray-100 dark:border-white/5'
              }`}>
                <div className="p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                        t.dept === 'rehab' 
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20' 
                          : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20'
                      }`}>
                        {t.dept}
                      </span>
                      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                        t.type === 'income' 
                          ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20' 
                          : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20'
                      }`}>
                        {t.type}
                      </span>
                      {isUrgent && (
                        <span className="px-3 py-1 rounded-xl bg-red-500 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-red-500/20">
                          <AlertTriangle size={10} strokeWidth={3} /> Urgent
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-2xl text-gray-900 dark:text-white tracking-tight">₨{t.amount?.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{timeAgo(t.createdAt)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-gray-50 dark:bg-white/5 rounded-3xl mb-6">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Category</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t.category}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Entity</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{t.patientName || t.studentName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Cashier</p>
                      <p className="font-mono font-bold text-gray-900 dark:text-gray-100 text-sm">{t.cashierId}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Date</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t.date ? new Date(t.date).toLocaleDateString('en-PK') : '—'}</p>
                    </div>
                  </div>

                  {t.note && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-4 rounded-3xl mb-6 border border-gray-100 dark:border-white/5">
                      <p className="font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-[9px] mb-1">Note</p>
                      <p className="font-medium leading-relaxed">{t.note}</p>
                    </div>
                  )}

                  {isRejecting ? (
                    <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                      <input
                        type="text"
                        placeholder="Type rejection reason..."
                        className="w-full bg-white dark:bg-[#1A1A1A] border border-red-100 dark:border-red-500/20 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 placeholder:text-gray-400"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(t.id, t.dept)}
                          disabled={actionLoading === t.id || !rejectReason.trim()}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="px-8 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
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
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95"
                      >
                        {actionLoading === t.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} strokeWidth={3} />}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(t.id)}
                        disabled={actionLoading === t.id}
                        className="flex-1 bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                      >
                        <XCircle size={14} strokeWidth={3} /> Reject
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