'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, ArrowLeft, Calendar, History, Search, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      let q;
      // If cashier, only show their own records to satisfy security rules
      if (session.role === 'cashier') {
        const cashierId = (session.customId || '').toUpperCase();
        q = query(
          collection(db, 'hq_reconciliation'),
          where('cashierId', '==', cashierId),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      } else {
        q = query(
          collection(db, 'hq_reconciliation'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }

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
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin' && session.role !== 'manager')) {
      router.push('/hq/login');
      return;
    }
    fetchRecords();
  }, [session, sessionLoading, fetchRecords, router]);

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
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Accessing Audit Vault</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => router.back()}
              className="p-2.5 hover:bg-zinc-50 rounded-2xl transition-all active:scale-95 text-zinc-400 hover:text-zinc-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                 Audit Archives
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Financial Reconciliation Logs</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative group w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by date/cashier..."
                  className="w-full bg-white border border-zinc-100 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-bold placeholder:text-zinc-200 outline-none focus:border-indigo-500 focus:shadow-xl focus:shadow-indigo-100/50 transition-all"
                />
             </div>
             <button 
               onClick={() => router.push('/hq/dashboard/cashier/day-close')}
               className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-900 transition-all active:scale-95 flex items-center gap-2 shadow-2xl shadow-indigo-600/20"
             >
                <Clock className="w-4 h-4" />
                Close Day
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10 md:px-8 space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'verified', 'flagged'] as const).map(s => (
                <button 
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95",
                    statusFilter === s 
                        ? "bg-zinc-900 text-white border-zinc-900 shadow-xl shadow-zinc-200/50 scale-105" 
                        : "bg-white border-zinc-100 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
                )}
                >
                {s} Records
                </button>
            ))}
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Displaying</p>
                <p className="text-sm font-black text-zinc-900 leading-none">{filtered.length} Entries Found</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filtered.map((record) => (
             <div key={record.id} className="group bg-white border border-zinc-100 rounded-[3rem] p-10 space-y-8 hover:shadow-2xl hover:shadow-zinc-200/50 transition-all duration-500 hover:translate-y-[-8px] relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/5 rounded-full -mr-24 -mt-24 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="flex items-center justify-between relative z-10">
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all duration-500">
                         <Calendar className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors duration-500" />
                      </div>
                      <div>
                         <p className="text-base font-black text-zinc-900 leading-tight">{record.date}</p>
                         <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">Shift Identifier</p>
                      </div>
                   </div>
                   <div className={cn(
                     "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors",
                     record.status === 'verified' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                     record.status === 'flagged' ? "bg-rose-50 text-rose-600 border-rose-100 shadow-xl shadow-rose-100/50" :
                     "bg-amber-50 text-amber-600 border-amber-100"
                   )}>
                      {record.status}
                   </div>
                </div>

                <div className="space-y-6 flex-grow relative z-10">
                   <div className="bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-8 space-y-6 group-hover:bg-white group-hover:shadow-inner transition-all duration-500">
                      <div className="flex justify-between items-start">
                         <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Liquidity Target</p>
                            <p className="text-xl font-black text-zinc-900/30 line-through decoration-zinc-300">{formatPKR(record.expectedClosing || 0)}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Physical In-Hand</p>
                            <p className="text-3xl font-black text-zinc-900 tracking-tighter">{formatPKR(record.actualClosing || 0)}</p>
                         </div>
                      </div>

                      {record.variance !== 0 ? (
                        <div className={cn(
                            "rounded-2xl p-4 flex items-center justify-between border",
                            record.variance > 0 ? "bg-indigo-600 text-white border-indigo-600" : "bg-rose-500 text-white border-rose-500"
                        )}>
                            <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                {record.variance > 0 ? <TrendingUp className="w-4 h-4 text-white" /> : <TrendingDown className="w-4 h-4 text-white" />}
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest">Net Variance</p>
                            </div>
                            <p className="text-sm font-black italic">
                            {record.variance > 0 ? 'Surplus' : 'Shortage'} {formatPKR(Math.abs(record.variance))}
                            </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-500 text-white rounded-2xl p-4 flex items-center justify-between border border-emerald-500">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/20 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Audit Status</p>
                            </div>
                            <p className="text-sm font-black italic">Perfect Match</p>
                        </div>
                      )}
                   </div>

                   {record.varianceNote && (
                        <div className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 italic relative group-hover:bg-zinc-100/50 transition-colors">
                            <AlertCircle className="absolute -top-2 -left-2 w-6 h-6 text-rose-500 bg-white rounded-full p-1 shadow-sm" />
                            <p className="text-xs font-bold text-zinc-500 leading-relaxed line-clamp-3">"{record.varianceNote}"</p>
                        </div>
                   )}
                </div>

                <div className="pt-8 border-t border-zinc-100 flex items-center justify-between relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 border border-white shadow-sm flex items-center justify-center overflow-hidden">
                         <span className="text-[10px] font-black text-zinc-400">{(record.cashierName || 'U').charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-900 leading-none">{record.cashierName || 'Staff Agent'}</p>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter mt-1">Authorized Cashier</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => router.push(`/hq/dashboard/cashier/reconciliation/${record.id}`)}
                     className="px-5 py-2.5 bg-zinc-50 text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all shadow-sm active:scale-95"
                   >
                     Inspect Detail
                   </button>
                </div>
             </div>
           ))}

           {filtered.length === 0 && (
             <div className="col-span-full py-60 text-center animate-in fade-in zoom-in-95 duration-700">
                <div className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <History className="w-12 h-12 text-zinc-200" />
                </div>
                <h3 className="text-2xl font-black text-zinc-400 uppercase tracking-tighter">Vault is Empty</h3>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mt-3">No matching archival records were found in this node.</p>
             </div>
           )}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-32 text-center">
         <div className="h-px w-32 bg-zinc-100 mx-auto mb-10" />
         <p className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-300 italic">End of Reconciled Archives • Secure Audit Node</p>
      </footer>
    </div>
  );
}
