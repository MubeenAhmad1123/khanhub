'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { formatDateDMY } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Filter } from 'lucide-react';

import { getDeptPrefix, getDeptCollection, StaffDept } from '@/lib/hq/superadmin/staff';
import { awardStaffPoint } from '@/app/hq/actions/points';

type FilterType = 'all' | 'hq' | 'rehab' | 'spims' | 'hospital' | 'sukoon' | 'welfare' | 'job-center' | 'urgent';

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
        setLoading(true);
        const depts = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'] as StaffDept[];
        
        const snaps = await Promise.all(
          depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_contributions`), where('isApproved', '==', false))))
        );

        let allContribs: any[] = [];
        for (let i = 0; i < depts.length; i++) {
          const dept = depts[i];
          const snap = snaps[i];
          const docs = snap.docs.map(docSnap => ({ 
            id: docSnap.id, 
            ...docSnap.data(), 
            dept 
          }));
          allContribs = [...allContribs, ...docs];
        }

        // Fetch Staff Names
        const staffIds = Array.from(new Set(allContribs.map(c => c.staffId).filter(Boolean)));
        const staffMap: Record<string, string> = {};
        
        await Promise.all(depts.map(async (d) => {
          const col = getDeptCollection(d);
          const staffSnap = await getDocs(collection(db, col));
          staffSnap.docs.forEach(docSnap => {
            staffMap[docSnap.id] = docSnap.data().name || 'Unknown Staff';
          });
        }));

        const enriched = allContribs.map(c => ({
          ...c,
          staffName: staffMap[c.staffId] || 'Unknown Staff'
        }));

        enriched.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });

        setTransactions(enriched);
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
      const col = `${getDeptPrefix(dept as StaffDept)}_contributions`;
      await updateDoc(doc(db, col, id), {
        isApproved: true,
        points: 1,
        approvedBy: session?.customId,
        approvedAt: new Date().toISOString(),
      });

      // Award Growth Point
      const contribSnap = await getDocs(query(collection(db, col), where('__name__', '==', id)));
      if (!contribSnap.empty) {
        const cData = contribSnap.docs[0].data();
        if (cData.staffId && cData.date) {
          await awardStaffPoint(cData.staffId, dept, 'contribution', cData.date);
        }
      }

      setTransactions(prev => prev.filter(t => t.id !== id));
      setMessage({ type: 'success', text: 'Contribution approved (+1 point awarded)' });
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
      const col = `${getDeptPrefix(dept as StaffDept)}_contributions`;
      await updateDoc(doc(db, col, id), {
        isApproved: false,
        status: 'rejected',
        rejectionReason: rejectReason,
      });
      setTransactions(prev => prev.filter(t => t.id !== id));
      setRejectingId(null);
      setRejectReason('');
      setMessage({ type: 'success', text: 'Contribution rejected' });
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
    hq: transactions.filter(t => t.dept === 'hq').length,
    rehab: transactions.filter(t => t.dept === 'rehab').length,
    spims: transactions.filter(t => t.dept === 'spims').length,
    hospital: transactions.filter(t => t.dept === 'hospital').length,
    sukoon: transactions.filter(t => t.dept === 'sukoon').length,
    welfare: transactions.filter(t => t.dept === 'welfare').length,
    'job-center': transactions.filter(t => t.dept === 'job-center').length,
    urgent: transactions.filter(t => {
      const time = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
      return time && (Date.now() - time) > 48 * 60 * 60 * 1000;
    }).length,
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600 dark:text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 p-4 md:p-8 bg-gray-50 dark:bg-[#0A0A0A] min-h-screen overflow-x-hidden w-full max-w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Staff Contribs</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Review and approve employee contributions</p>
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

      <div className="flex flex-wrap gap-2 p-1 bg-white/50 dark:bg-white/5 rounded-2xl w-full">
        {(['all', 'hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'urgent'] as FilterType[]).map(f => (
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
            {f === 'job-center' ? 'Job Center' : f.charAt(0).toUpperCase() + f.slice(1)}
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
          <p className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-xs">No pending contributions found</p>
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
                        t.dept === 'rehab' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20' :
                        t.dept === 'spims' ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20' :
                        'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-500/20'
                      }`}>
                        {t.dept}
                      </span>
                      {isUrgent && (
                        <span className="px-3 py-1 rounded-xl bg-red-500 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-red-500/20">
                          <AlertTriangle size={10} strokeWidth={3} /> Urgent
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl text-gray-900 dark:text-white tracking-tight">{t.title}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{t.createdAt?.seconds ? timeAgo(new Date(t.createdAt.seconds * 1000).toISOString()) : 'Just now'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-5 bg-gray-50 dark:bg-white/5 rounded-3xl mb-6">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Contributor</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{t.staffName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Submission Date</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t.createdAt?.seconds ? formatDateDMY(new Date(t.createdAt.seconds * 1000).toISOString()) : '—'}</p>
                    </div>
                  </div>

                  {t.content && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-4 rounded-3xl mb-6 border border-gray-100 dark:border-white/5">
                      <p className="font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-[9px] mb-1">Description</p>
                      <p className="font-medium leading-relaxed">{t.content}</p>
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