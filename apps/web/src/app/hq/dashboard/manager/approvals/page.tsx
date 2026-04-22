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
        const depts = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'] as StaffDept[];
        
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
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8]">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 p-4 md:p-8 bg-[#FCFBF8] min-h-screen overflow-x-hidden w-full max-w-full text-black">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Staff Contribs</h1>
        <p className="text-black dark:text-black text-sm font-medium">Review and approve employee contributions</p>
      </div>

      {message.text && (
        <div className={`p-6 rounded-3xl border-2 font-black animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' 
            ? 'bg-black text-white border-black' 
            : 'bg-white text-black border-red-600'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2 p-2 bg-black/5 rounded-2xl w-full border border-black/10">
        {(['all', 'hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'urgent'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border-2 ${
              filter === f
                ? 'bg-black text-white border-black shadow-lg scale-[1.02]'
                : 'bg-white text-black border-black/10 hover:border-black'
            }`}
          >
            <Filter size={10} />
            {f === 'job-center' ? 'Job Center' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] ${
              filter === f ? 'bg-white/20' : 'bg-black/10'
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2.5rem] border-4 border-black shadow-2xl">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 text-white text-3xl font-black">
            !
          </div>
          <p className="text-black font-black uppercase tracking-[0.3em] text-sm">Clear Horizon — No Pending Tasks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(t => {
            const isUrgent = t.createdAt && (Date.now() - new Date(t.createdAt).getTime()) > 48 * 60 * 60 * 1000;
            const isRejecting = rejectingId === t.id;

            return (
              <div key={t.id} className={`group bg-white rounded-[2.5rem] border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                isUrgent 
                  ? 'border-black ring-4 ring-black/5' 
                  : 'border-black/10 hover:border-black'
              }`}>
                <div className="p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 border-black bg-black text-white">
                        {t.dept}
                      </span>
                      {isUrgent && (
                        <span className="px-4 py-1.5 rounded-full bg-white border-2 border-black text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                          <AlertTriangle size={10} strokeWidth={3} /> Critical
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-2xl text-black tracking-tight">{t.title}</p>
                      <p className="text-[10px] text-black font-black uppercase tracking-[0.15em] opacity-40">{t.createdAt?.seconds ? timeAgo(new Date(t.createdAt.seconds * 1000).toISOString()) : 'Just now'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-6 bg-black/5 rounded-3xl mb-8 border border-black/5">
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1 opacity-50">Contributor</p>
                      <p className="font-black text-black text-sm truncate">{t.staffName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1 opacity-50">Date Submitted</p>
                      <p className="font-black text-black text-sm">{t.createdAt?.seconds ? formatDateDMY(new Date(t.createdAt.seconds * 1000).toISOString()) : '—'}</p>
                    </div>
                  </div>

                  {t.content && (
                    <div className="text-sm text-black bg-white p-6 rounded-3xl mb-8 border-2 border-black/10">
                      <p className="font-black text-black uppercase tracking-widest text-[9px] mb-2 opacity-40">Description</p>
                      <p className="font-bold leading-relaxed">{t.content}</p>
                    </div>
                  )}

                  {isRejecting ? (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                      <input
                        type="text"
                        placeholder="State rejection criteria..."
                        className="w-full bg-black/5 border-2 border-black rounded-2xl px-6 py-4 text-sm font-black text-black outline-none focus:ring-8 focus:ring-black/5 placeholder:text-black/30"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReject(t.id, t.dept)}
                          disabled={actionLoading === t.id || !rejectReason.trim()}
                          className="flex-1 bg-black text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-95"
                        >
                          Confirm Denial
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="px-10 bg-white text-black border-2 border-black py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleApprove(t.id, t.dept)}
                        disabled={actionLoading === t.id}
                        className="flex-1 bg-black hover:bg-black/90 text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-black/20 active:scale-95 hover:scale-[1.02]"
                      >
                        {actionLoading === t.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} strokeWidth={3} />}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(t.id)}
                        disabled={actionLoading === t.id}
                        className="flex-1 bg-white border-2 border-black text-black py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                      >
                        <XCircle size={16} strokeWidth={3} /> Deny
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
