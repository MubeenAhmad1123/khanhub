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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 bg-gray-950 min-h-screen text-white">
      <div className="flex items-center gap-3 mb-8">
        <div className="rounded-2xl bg-amber-400 p-3 shadow-lg shadow-amber-400/20">
          <ShieldCheck className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Financial Reconciliation</h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Verify and audit daily cashier nodes</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center">
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Pending Nodes</p>
           <p className="text-3xl font-black text-amber-400">{stats.pending}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center">
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Verified Today</p>
           <p className="text-3xl font-black text-emerald-400">{stats.verifiedToday}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center">
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Total Node Variance</p>
           <p className="text-3xl font-black text-rose-400">{formatPKR(stats.totalVariance)}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 w-full md:w-auto overflow-x-auto scrollbar-none">
          {['all', 'pending', 'verified', 'flagged'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s as any)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filterStatus === s ? "bg-amber-400 text-black shadow-lg shadow-amber-400/10" : "text-gray-500 hover:text-white"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
           <input 
             value={q}
             onChange={(e) => setQ(e.target.value)}
             placeholder="NODE SEARCH..."
             className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:border-amber-400/50 transition-all"
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
                  "rounded-3xl border border-white/10 bg-white/5 shadow-2xl transition-all overflow-hidden border-l-8 cursor-pointer",
                  (r.status || 'pending') === 'verified' ? "border-l-emerald-500" : (r.status || 'pending') === 'flagged' ? "border-l-rose-500" : "border-l-amber-500",
                  expandedId === r.id ? "ring-2 ring-amber-400/20" : ""
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
                             "text-[8px] font-black uppercase px-2 py-0.5 rounded border",
                             r.portal === 'rehab' ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-blue-400/10 text-blue-400 border-blue-400/20"
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
                       <p className="text-xl font-black text-white">{formatPKR(r.actualClosing || 0)}</p>
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                         (r.status || 'pending') === 'verified' ? "bg-emerald-500/10 text-emerald-400" : (r.status || 'pending') === 'flagged' ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
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
                            <p className={cn("text-sm font-black", (r.variance || 0) !== 0 ? "text-rose-400" : "text-emerald-400")}>
                               {formatPKR(r.variance || r.difference || 0)}
                            </p>
                         </div>
                         <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Inflow/Outflow</p>
                            <p className="text-sm font-black text-white">{formatPKR(r.incomeTotal || 0)} / {formatPKR(r.expenseTotal || 0)}</p>
                         </div>
                      </div>

                      {r.varianceNote && (
                        <div className="bg-amber-400/5 border border-amber-400/20 p-4 rounded-2xl mb-6">
                           <p className="text-[9px] font-black text-amber-500 uppercase mb-1">Cashier Remark - Variance Documentation</p>
                           <p className="text-xs font-bold text-gray-300 leading-relaxed italic">"{r.note || r.varianceNote}"</p>
                        </div>
                      )}

                      {(r.status === 'pending' || !r.status || r.status === 'submitted') && (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            disabled={!!busyId}
                            onClick={(e) => { e.stopPropagation(); act(r, 'flagged'); }}
                            className="flex-1 h-12 rounded-2xl border border-rose-500/30 bg-rose-500/5 text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2"
                          >
                            <XCircle size={16} /> Flag Node
                          </button>
                          <button
                            type="button"
                            disabled={!!busyId}
                            onClick={(e) => { e.stopPropagation(); act(r, 'verified'); }}
                            className="flex-1 h-12 rounded-2xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={16} /> Verify Node
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
