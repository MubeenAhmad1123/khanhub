// apps/web/src/app/hq/dashboard/superadmin/reconciliation/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, limit, onSnapshot, orderBy, query, addDoc, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    const colRef = collection(db, 'hq_reconciliation');
    let baseQuery = query(colRef, orderBy('createdAt', 'desc'), limit(100));
    
    return onSnapshot(baseQuery, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
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

      // Audit Log for the action
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
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-black min-h-screen text-black dark:text-white transition-colors duration-300">
      <div className="flex items-center gap-4 mb-10">
        <div className="rounded-2xl bg-black dark:bg-white p-3 shadow-xl">
          <ShieldCheck className="h-7 w-7 text-white dark:text-black" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Ledger Verification</h1>
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] italic">Governance Node Audit Hub</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 shadow-sm">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Pending Verification</p>
           <p className="text-4xl font-black text-black dark:text-white">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 shadow-sm">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Cleared Today</p>
           <p className="text-4xl font-black text-black dark:text-white">{stats.verifiedToday}</p>
        </div>
        <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 shadow-sm">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Aggregate Variance</p>
           <p className="text-4xl font-black text-black dark:text-white">{formatPKR(stats.totalVariance)}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-8">
        <div className="flex bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-1.5 w-full md:w-auto">
          {['all', 'pending', 'verified', 'flagged'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s as any)}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filterStatus === s 
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" 
                  : "text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72 group">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
           <input 
             value={q}
             onChange={(e) => setQ(e.target.value)}
             placeholder="NODE SEARCH SEQUENCE..."
             className="w-full bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-black dark:focus:border-white/40 transition-all shadow-sm"
           />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center"><InlineLoading label="Sychronizing Audit Stream..." /></div>
        ) : !filtered.length ? (
          <EmptyState title="Clear Ledger" message="All nodes reconciled or no data matching filters." />
        ) : (
          <div className="grid grid-cols-1 gap-4">
             {filtered.map((r) => (
              <div 
                key={r.id} 
                className={cn(
                  "rounded-[2.5rem] border transition-all overflow-hidden border-l-[12px] cursor-pointer bg-white dark:bg-[#050505] shadow-sm",
                  (r.status || 'pending') === 'verified' ? "border-black dark:border-white opacity-100" : (r.status || 'pending') === 'flagged' ? "border-gray-300 dark:border-gray-700 opacity-80" : "border-gray-100 dark:border-white/5 opacity-60",
                  expandedId === r.id ? "shadow-2xl translate-x-1 ring-1 ring-black/5 dark:ring-white/5" : "hover:border-black dark:hover:border-white"
                )}
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                       <div className="rounded-2xl bg-white/5 p-4 border border-white/5 hidden sm:block">
                          <BadgePercent className="h-5 w-5 text-gray-400" />
                       </div>
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <h3 className="text-lg font-black uppercase leading-none">{r.date || r.dateStr || '—'}</h3>
                           <span className={cn(
                             "text-[9px] font-black uppercase px-3 py-1 rounded-lg border",
                             r.portal === 'rehab' ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xl" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 border-transparent"
                           )}>
                             {r.portal || 'hq'}
                           </span>
                         </div>
                         <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><User size={12}/> {r.cashierName}</span>
                            <span className="flex items-center gap-1"><Clock size={12}/> {r.totalTransactions || 0} TX</span>
                         </div>
                       </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                       <p className="text-2xl font-black text-black dark:text-white font-mono">{formatPKR(r.actualClosing || 0)}</p>
                        <span className={cn(
                         "text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-2xl border transition-all shadow-sm",
                         (r.status || 'pending') === 'verified' ? "bg-black dark:bg-white text-white dark:text-black border-transparent" : 
                         (r.status || 'pending') === 'flagged' ? "bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10 italic" : 
                         "bg-white dark:bg-black text-gray-300 border-dashed border-gray-100 dark:border-white/10"
                       )}>
                         {r.status || 'pending'}
                       </span>
                    </div>
                  </div>

                  {expandedId === r.id && (
                    <div className="mt-8 border-t border-white/5 pt-6 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                         <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Expected</p>
                            <p className="text-sm font-black text-white">{formatPKR(r.expectedBalance || 0)}</p>
                         </div>
                         <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Actual</p>
                            <p className="text-sm font-black text-white">{formatPKR(r.actualClosing || 0)}</p>
                         </div>
                         <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Variance</p>
                            <p className={cn("text-sm font-black", (r.variance || 0) !== 0 ? "text-white dark:text-black bg-black dark:bg-white px-3 py-1 rounded-xl shadow-2xl" : "text-gray-400 dark:text-gray-600 italic")}>
                               {formatPKR(r.variance || r.difference || 0)}
                            </p>
                         </div>
                         <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Inflow/Outflow</p>
                            <p className="text-sm font-black text-white">{formatPKR(r.incomeTotal || 0)} / {formatPKR(r.expenseTotal || 0)}</p>
                         </div>
                      </div>

                      {r.varianceNote && (
                        <div className="bg-gray-50 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 p-8 rounded-[2rem] mb-6 shadow-inner">
                           <p className="text-[10px] font-black text-black dark:text-white uppercase mb-4 tracking-[0.2em] italic opacity-40">Cashier Remark Node</p>
                           <p className="text-sm font-bold text-gray-600 dark:text-gray-300 leading-relaxed italic border-l-4 border-black dark:border-white pl-6">"{r.note || r.varianceNote}"</p>
                        </div>
                      )}

                       {(r.status === 'pending' || !r.status || r.status === 'submitted') && (
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button
                            type="button"
                            disabled={!!busyId}
                            onClick={(e) => { e.stopPropagation(); act(r, 'flagged'); }}
                            className="flex-1 h-16 rounded-2xl border border-gray-100 bg-white dark:bg-white/5 dark:border-white/10 text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
                          >
                            <XCircle size={20} /> Terminate Flow
                          </button>
                          <button
                            type="button"
                            disabled={!!busyId}
                            onClick={(e) => { e.stopPropagation(); act(r, 'verified'); }}
                            className="flex-1 h-16 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                          >
                            <CheckCircle2 size={24} /> Authorize Ledger
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-center text-gray-600">
                    {expandedId === r.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
