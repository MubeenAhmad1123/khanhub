'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { formatDateDMY } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Filter } from 'lucide-react';
import LogoLoader from "@/components/ui/LogoLoader";

import { getDeptPrefix, getDeptCollection, StaffDept } from '@/lib/hq/superadmin/staff';
import { awardStaffPoint } from '@/app/hq/actions/points';

type FilterType = 'all' | 'hq' | 'rehab' | 'spims' | 'hospital' | 'sukoon' | 'welfare' | 'job-center' | 'social-media' | 'it' | 'urgent';

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
    'social-media': transactions.filter(t => t.dept === 'social-media').length,
    it: transactions.filter(t => t.dept === 'it').length,
    urgent: transactions.filter(t => {
      const time = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
      return time && (Date.now() - time) > 48 * 60 * 60 * 1000;
    }).length,
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
        <LogoLoader showText={true} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 p-4 md:p-8 bg-[#FDFDFD] min-h-screen overflow-x-hidden w-full max-w-full text-gray-900 font-sans">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Staff Contributions</h1>
        <p className="text-gray-500 text-sm font-medium">Review and approve employee contributions</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border font-semibold text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
            : 'bg-rose-50 text-rose-700 border-rose-100'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-100 rounded-2xl w-full">
        {(['all', 'hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it', 'urgent'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap border shadow-sm ${
              filter === f
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
            }`}
          >
            <Filter size={12} />
            {f === 'job-center' ? 'Job Center' : f === 'social-media' ? 'Social Media' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mb-3 text-gray-400 text-xl font-bold">
            !
          </div>
          <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">Clear Horizon — No Pending Tasks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filtered.map(t => {
            const isUrgent = t.createdAt && (Date.now() - new Date(t.createdAt).getTime()) > 48 * 60 * 60 * 1000;
            const isRejecting = rejectingId === t.id;

            return (
              <div key={t.id} className={`group bg-white rounded-3xl border transition-all duration-300 hover:shadow-md ${
                isUrgent 
                  ? 'border-indigo-200 bg-indigo-50/10' 
                  : 'border-gray-100 hover:border-gray-200'
              }`}>
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-indigo-100 bg-indigo-50 text-indigo-600">
                        {t.dept}
                      </span>
                      {isUrgent && (
                        <span className="px-3 py-1 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle size={12} strokeWidth={2.5} /> Critical
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg md:text-xl text-gray-900 tracking-tight leading-none mb-1">{t.title}</p>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{t.createdAt?.seconds ? timeAgo(new Date(t.createdAt.seconds * 1000).toISOString()) : 'Just now'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-50/60 rounded-2xl mb-5">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contributor</p>
                      <p className="font-bold text-gray-800 text-sm truncate">{t.staffName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date Submitted</p>
                      <p className="font-bold text-gray-800 text-sm">{t.createdAt?.seconds ? formatDateDMY(new Date(t.createdAt.seconds * 1000).toISOString()) : '—'}</p>
                    </div>
                  </div>

                  {t.content && (
                    <div className="text-sm text-gray-600 bg-white p-4 rounded-2xl mb-5 border border-gray-100">
                      <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-2">Description</p>
                      <p className="font-medium leading-relaxed">{t.content}</p>
                    </div>
                  )}

                  {isRejecting ? (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                      <input
                        type="text"
                        placeholder="State rejection criteria..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-300"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReject(t.id, t.dept)}
                          disabled={actionLoading === t.id || !rejectReason.trim()}
                          className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm hover:bg-black active:scale-[0.98]"
                        >
                          Confirm Denial
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="px-6 bg-white text-gray-700 border border-gray-200 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-all"
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
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                      >
                        {actionLoading === t.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} strokeWidth={2.5} />}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(t.id)}
                        disabled={actionLoading === t.id}
                        className="flex-1 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                      >
                        <XCircle size={16} strokeWidth={2.5} /> Deny
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
