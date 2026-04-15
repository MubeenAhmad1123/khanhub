'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, ArrowLeft, ShieldCheck, History, Search, Filter, Calendar, TrendingUp, TrendingDown, AlertCircle, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn, formatDateDMY } from '@/lib/utils';
import { formatPKR } from '@/lib/hq/superadmin/format';

export default function ReconciliationAuditPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'flagged'>('all');

  const fetchRecords = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'hq_reconciliation'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to fetch reconciliation records:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    fetchRecords();
  }, [session, sessionLoading, fetchRecords]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = 
        (r.cashierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.date || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  if (loading && records.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">Accessing Audit Vault</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-400 selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => router.back()}
              className="p-2.5 hover:bg-white/5 rounded-2xl transition-all active:scale-95 text-slate-500 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                 <ShieldCheck className="w-6 h-6 text-amber-500" />
                 Audit Trail
              </h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-0.5">Financial Reconciliation Logs</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative group w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by date/cashier..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-bold placeholder:text-slate-600 outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all"
                />
             </div>
             <button 
               onClick={() => router.push('/hq/dashboard/cashier/day-close')}
               className="px-6 py-2.5 bg-amber-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-amber-500/10"
             >
                <Clock className="w-4 h-4" />
                Close Day
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10 md:px-8 space-y-10">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
           {(['all', 'pending', 'verified', 'flagged'] as const).map(s => (
             <button 
               key={s}
               onClick={() => setStatusFilter(s)}
               className={cn(
                 "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                 statusFilter === s ? "bg-white text-black border-white shadow-xl shadow-white/5" : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
               )}
             >
               {s} Records
             </button>
           ))}
        </div>

        {/* Audit Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filtered.map((record) => (
             <div key={record.id} className="group bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-6 hover:bg-white/8 transition-all hover:translate-y-[-4px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                         <Calendar className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                         <p className="text-sm font-black text-white">{record.date}</p>
                         <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Date Marker</p>
                      </div>
                   </div>
                   <div className={cn(
                     "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                     record.status === 'verified' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                     record.status === 'flagged' ? "bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-lg shadow-rose-500/10" :
                     "bg-amber-500/10 text-amber-500 border-amber-500/20"
                   )}>
                      {record.status}
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="bg-black/20 border border-white/5 rounded-[2rem] p-6">
                      <div className="flex justify-between items-end">
                         <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Expected Cash</p>
                            <p className="text-lg font-black text-white/50">{formatPKR(record.expectedBalance || 0)}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Actual Physical</p>
                            <p className="text-2xl font-black text-white">{formatPKR(record.actualClosing || 0)}</p>
                         </div>
                      </div>
                   </div>

                   {record.variance !== 0 && (
                     <div className={cn(
                       "rounded-2xl p-4 flex items-center justify-between border",
                       record.variance > 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
                     )}>
                        <div className="flex items-center gap-3">
                           {record.variance > 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variance</p>
                        </div>
                        <p className={cn("text-xs font-black", record.variance > 0 ? "text-emerald-400" : "text-rose-400")}>
                           {record.variance > 0 ? '+' : ''}{formatPKR(record.variance)}
                        </p>
                     </div>
                   )}
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-white/5 flex items-center justify-center">
                         <FileText className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                         {record.totalTransactions || 0} Txns • {record.cashierName}
                      </p>
                   </div>
                   <button 
                     onClick={() => router.push(`/hq/dashboard/cashier/reconciliation/${record.id}`)}
                     className="text-[9px] font-black uppercase text-amber-500 tracking-widest hover:text-amber-400 transition-colors"
                   >
                     View Detail
                   </button>
                </div>

                {record.varianceNote && (
                  <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-start gap-2">
                       <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                       <p className="text-[10px] font-bold text-slate-400 italic line-clamp-2">"{record.varianceNote}"</p>
                    </div>
                  </div>
                )}
             </div>
           ))}

           {filtered.length === 0 && (
             <div className="col-span-full py-40 text-center">
                <History className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                <h3 className="text-xl font-black text-slate-500 uppercase tracking-tighter">No Audit Records Found</h3>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mt-2">The archives are currently empty for this filter.</p>
             </div>
           )}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-20 border-t border-white/5 text-center opacity-20">
         <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 italic">End of Reconciled Archives • Secure Audit Node</p>
      </footer>
    </div>
  );
}
