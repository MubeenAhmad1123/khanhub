// apps/web/src/app/hq/dashboard/superadmin/reconciliation/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, limit, getDocs, orderBy, query, addDoc, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCached, setCached } from '@/lib/queryCache';

import { useHqSession } from '@/hooks/hq/useHqSession';
import { decideReconciliation } from '@/app/hq/actions/reconciliation';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { formatPKR } from '@/lib/hq/superadmin/format';
import { 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  XCircle,
  Clock,
  User,
  BadgePercent
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/hq/superadmin/StatCard';

const DEPT_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  hq: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  rehab: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100' },
  spims: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100' },
  hospital: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  sukoon: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
  welfare: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  'job-center': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
};

export default function SuperadminReconciliationPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'flagged'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  const loadData = async () => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);

    try {
      const cacheKey = 'reconciliation_list';
      let recList = getCached<any[]>(cacheKey);

      if (!recList) {
        const q = query(collection(db, 'hq_reconciliation'), orderBy('createdAt', 'desc'), limit(100));
        const snap = await getDocs(q);
        recList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCached(cacheKey, recList, 60); // 1 min cache
      }
      setRows(recList);
    } catch (err) {
      console.error("Error loading reconciliation data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);


  const filtered = useMemo(() => {
    let list = rows;
    if (filterStatus !== 'all') {
      list = list.filter(r => (r.status || 'pending') === filterStatus);
    }
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => `${r.cashierName || ''} ${r.cashierId || r.portal || ''} ${r.date || ''}`.toLowerCase().includes(s));
  }, [rows, q, filterStatus]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const pending = rows.filter(r => (r.status || 'pending') === 'pending').length;
    const verifiedToday = rows.filter(r => r.status === 'verified' && (r.date === today || r.dateStr === today)).length;
    const totalVariance = rows.reduce((acc, r) => acc + Math.abs(r.variance || r.difference || 0), 0);
    
    return { pending, verifiedToday, totalVariance };
  }, [rows]);

  const act = async (row: any, status: 'verified' | 'flagged') => {
    setBusyId(row.id);
    try {
      const res = await decideReconciliation({ id: row.id, status });
      if (!res.success) throw new Error(res.error || 'Operation failed');

      await addDoc(collection(db, 'hq_audit'), {
        action: status === 'verified' ? 'approved' : 'rejected',
        actorName: session?.name || 'Superadmin',
        actorId: session?.customId,
        message: `Reconciliation ${status} for cashier ${row.cashierName} on ${row.date}`,
        source: 'hq',
        createdAt: Timestamp.now()
      });

    } catch (e: any) {
      alert(e?.message || 'Error executing decision');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-8 py-20 bg-[#FCFBF8] min-h-screen">
      <div className="flex items-center gap-8 mb-16">
        <div className="rounded-[2.5rem] bg-black p-6 shadow-2xl shadow-gray-200">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tight text-black">Verifications</h1>
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] italic mt-2">Governance Ledger Audit Hub</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Pending Nodes</p>
           <p className="text-5xl font-black text-black tracking-tighter">{stats.pending}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Verified Today</p>
           <p className="text-5xl font-black text-black tracking-tighter">{stats.verifiedToday}</p>
        </div>
        <div className="bg-black rounded-[2.5rem] p-10 shadow-2xl shadow-black/20">
           <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Total Variance</p>
           <p className="text-4xl font-black text-white tracking-tighter">{formatPKR(stats.totalVariance)}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col xl:flex-row gap-8 items-center justify-between mb-12">
        <div className="flex bg-white border border-gray-100 rounded-[2rem] p-2 shadow-xl shadow-gray-200/50 w-full xl:w-auto overflow-x-auto no-scrollbar">
          {['all', 'pending', 'verified', 'flagged'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s as any)}
              className={cn(
                "px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                filterStatus === s 
                  ? "bg-black text-white shadow-xl scale-105" 
                  : "text-gray-400 hover:text-black hover:bg-gray-50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative w-full xl:w-96 group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-300 group-focus-within:text-black transition-colors" />
           <input 
             value={q}
             onChange={(e) => setQ(e.target.value)}
             placeholder="SEARCH AUDIT STREAM..."
             className="w-full h-20 bg-white border border-gray-100 rounded-[2.5rem] pl-16 pr-8 text-sm font-bold text-black outline-none focus:ring-8 focus:ring-black/5 transition-all shadow-2xl shadow-gray-200/50"
           />
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="py-40 flex justify-center"><InlineLoading label="Sychronizing Audit Stream..." /></div>
        ) : !filtered.length ? (
          <div className="py-20"><EmptyState title="Clear Ledger" message="All nodes reconciled or no data matching filters." /></div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
             {filtered.map((r) => {
               const theme = DEPT_THEMES[r.portal] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100' };
               return (
                <div 
                  key={r.id} 
                  className={cn(
                    "rounded-[3rem] border transition-all overflow-hidden bg-white shadow-2xl shadow-gray-200/50",
                    (r.status || 'pending') === 'verified' ? "border-black opacity-100" : "border-gray-100 opacity-90",
                    expandedId === r.id ? "scale-[1.02] ring-8 ring-black/5" : "hover:border-black hover:-translate-y-1"
                  )}
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <div className="p-10">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                      <div className="flex gap-8">
                         <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-xl", theme.bg, theme.text)}>
                            <BadgePercent size={36} strokeWidth={2.5} />
                         </div>
                         <div>
                           <div className="flex items-center gap-4 mb-4">
                             <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{r.date || r.dateStr || '—'}</h3>
                             <span className={cn(
                               "text-[10px] font-black uppercase px-5 py-2 rounded-xl shadow-lg",
                               theme.bg, theme.text
                             )}>
                               {r.portal || 'hq'}
                             </span>
                           </div>
                           <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                              <span className="flex items-center gap-2"><User size={14} className="text-indigo-600"/> {r.cashierName}</span>
                              <span className="flex items-center gap-2"><Clock size={14} className="text-indigo-600"/> {r.totalTransactions || 0} TX</span>
                           </div>
                         </div>
                      </div>

                      <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                         <p className="text-4xl font-black text-black tracking-tighter">{formatPKR(r.actualClosing || 0)}</p>
                          <span className={cn(
                           "text-[11px] font-black uppercase tracking-[0.3em] px-8 py-3 rounded-2xl transition-all shadow-xl",
                           (r.status || 'pending') === 'verified' ? "bg-black text-white" : 
                           (r.status || 'pending') === 'flagged' ? "bg-rose-500 text-white" : 
                           "bg-gray-50 text-gray-400"
                         )}>
                           {r.status || 'pending'}
                         </span>
                      </div>
                    </div>

                    {expandedId === r.id && (
                      <div className="mt-12 border-t border-gray-100 pt-10 animate-in fade-in slide-in-from-top-6 duration-500">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                           <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 shadow-inner">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Expected</p>
                              <p className="text-xl font-black text-black">{formatPKR(r.expectedBalance || 0)}</p>
                           </div>
                           <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 shadow-inner">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Actual</p>
                              <p className="text-xl font-black text-black">{formatPKR(r.actualClosing || 0)}</p>
                           </div>
                           <div className="bg-black p-8 rounded-[2rem] shadow-2xl">
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Variance</p>
                              <p className={cn("text-xl font-black", (r.variance || 0) !== 0 ? "text-rose-400" : "text-emerald-400")}>
                                 {formatPKR(r.variance || r.difference || 0)}
                              </p>
                           </div>
                           <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 shadow-inner">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">In/Out Flow</p>
                              <p className="text-xl font-black text-black">{formatPKR(r.incomeTotal || 0)} / {formatPKR(r.expenseTotal || 0)}</p>
                           </div>
                        </div>

                        {r.varianceNote && (
                          <div className="bg-indigo-50/30 border border-indigo-100 p-10 rounded-[2.5rem] mb-10 shadow-inner">
                             <p className="text-[11px] font-black text-indigo-400 uppercase mb-5 tracking-[0.4em] italic">Cashier Remark Node</p>
                             <p className="text-lg font-bold text-gray-900 leading-relaxed italic pl-8 border-l-8 border-indigo-500">"{r.note || r.varianceNote}"</p>
                          </div>
                        )}

                         {(r.status === 'pending' || !r.status || r.status === 'submitted') && (
                          <div className="flex flex-col sm:flex-row gap-6">
                            <button
                              type="button"
                              disabled={!!busyId}
                              onClick={(e) => { e.stopPropagation(); act(r, 'flagged'); }}
                              className="flex-1 h-24 rounded-[2.5rem] bg-white border border-gray-100 text-[12px] font-black uppercase tracking-[0.4em] text-rose-600 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl shadow-gray-200/50"
                            >
                              <XCircle size={28} /> Terminate Flow
                            </button>
                            <button
                              type="button"
                              disabled={!!busyId}
                              onClick={(e) => { e.stopPropagation(); act(r, 'verified'); }}
                              className="flex-1 h-24 rounded-[2.5rem] bg-black text-white text-[13px] font-black uppercase tracking-[0.5em] shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-6"
                            >
                              <CheckCircle2 size={32} /> Authorize Ledger
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-8 flex justify-center text-gray-300">
                      {expandedId === r.id ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
                    </div>
                  </div>
                </div>
               );
             })}
          </div>
        )}
      </div>
    </div>
  );
}
