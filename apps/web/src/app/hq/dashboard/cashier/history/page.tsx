'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, limit, query, where, orderBy, Timestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Printer, Filter, History, TrendingUp, TrendingDown, Clock, Wallet, ArrowLeft, Search, RefreshCw, Calendar } from 'lucide-react';
import { formatDateDMY, parseDateDMY, toDate, cn } from '@/lib/utils';

const DEPARTMENTS = [
  { code: 'rehab', label: 'Rehab Center', txCollection: 'rehab_transactions' },
  { code: 'spims', label: 'Spims', txCollection: 'spims_transactions' },
  { code: 'hospital', label: 'Khan Hospital', txCollection: 'hospital_transactions' },
  { code: 'sukoon-center', label: 'Sukoon Center', txCollection: 'sukoon_transactions' },
  { code: 'welfare', label: 'Welfare', txCollection: 'welfare_transactions' },
  { code: 'job-center', label: 'Job Center', txCollection: 'job_center_transactions' },
];

type DeptFilter = 'all' | 'rehab' | 'spims' | 'hospital' | 'sukoon-center' | 'welfare' | 'job-center';
type StatusFilter = 'all' | 'pending_cashier' | 'pending' | 'approved' | 'rejected';
type DateMode = 'today' | 'all' | 'range';

type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryName?: string;
  description: string;
  paymentMethod: string;
  dept: string;
  departmentName: string;
  status: string;
  createdAt: any;
  date?: any;
  transactionDate?: any;
  note?: string;
  patientName?: string;
  staffName?: string;
  patientId?: string;
  staffId?: string;
  createdBy?: string;
  cashierId?: string;
};

export default function CashierHistoryPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateMode, setDateMode] = useState<DateMode>('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const activeDepts = deptFilter === 'all' 
        ? DEPARTMENTS 
        : DEPARTMENTS.filter(d => d.code === deptFilter);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startTimestamp = Timestamp.fromDate(today);
      const endTimestamp = Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000));

      const fetchPromises = activeDepts.map(async (dept) => {
        try {
          const constraints: QueryConstraint[] = [];
          
          if (dateMode === 'today') {
            constraints.push(where('date', '>=', startTimestamp));
            constraints.push(where('date', '<', endTimestamp));
            constraints.push(orderBy('date', 'desc'));
          } else if (dateMode === 'range' && dateFrom) {
            const from = Timestamp.fromDate(new Date(`${dateFrom}T00:00:00`));
            const to = Timestamp.fromDate(dateTo ? new Date(`${dateTo}T23:59:59`) : new Date());
            constraints.push(where('date', '>=', from));
            constraints.push(where('date', '<=', to));
            constraints.push(orderBy('date', 'desc'));
          } else {
            constraints.push(orderBy('createdAt', 'desc'));
            constraints.push(limit(300));
          }

          if (statusFilter !== 'all') {
            if (statusFilter === 'pending') {
              constraints.push(where('status', 'in', ['pending', 'pending_cashier']));
            } else {
              constraints.push(where('status', '==', statusFilter));
            }
          }

          const q = query(collection(db, dept.txCollection), ...constraints);
          const snap = await getDocs(q);
          return snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            dept: dept.code,
            departmentName: dept.label
          })) as Transaction[];
        } catch (err) {
          console.warn(`[History] Optimized fetch failed for ${dept.code}, falling back...`, err);
          const qBasic = query(collection(db, dept.txCollection), orderBy('createdAt', 'desc'), limit(200));
          const snap = await getDocs(qBasic);
          return snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(), 
            dept: dept.code, 
            departmentName: dept.label 
          })) as Transaction[];
        }
      });

      const results = await Promise.all(fetchPromises);
      const flattened = results.flat();

      flattened.sort((a, b: Transaction) => {
        const dateA = toDate(a.transactionDate || a.date || a.createdAt)?.getTime() || 0;
        const dateB = toDate(b.transactionDate || b.date || b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      });

      setTransactions(flattened);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [session, deptFilter, statusFilter, dateMode, dateFrom, dateTo]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    fetchData();
  }, [sessionLoading, session, fetchData]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(t => 
      (t.patientName || t.staffName || '').toLowerCase().includes(q) ||
      (t.categoryName || t.category || '').toLowerCase().includes(q) ||
      (t.description || t.note || '').toLowerCase().includes(q) ||
      (t.id || '').toLowerCase().includes(q)
    );
  }, [transactions, searchQuery]);

  const stats = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const pending = filtered.filter(t => String(t.status || '').includes('pending')).length;
    return { income, expense, net: income - expense, pending };
  }, [filtered]);

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
          <p className="text-gray-500 font-bold animate-pulse text-xs uppercase tracking-[0.2em]">Accessing Archives...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-400 selection:text-black">
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 md:px-8">
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
                 <History className="w-6 h-6 text-amber-500" />
                 Master Ledger
              </h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-0.5">Global Audit View</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative group w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search archives..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-bold placeholder:text-slate-600 outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all"
                />
             </div>
             <button 
               onClick={() => fetchData()}
               className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all active:rotate-180"
             >
                <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
             </button>
             <button 
               onClick={() => window.print()}
               className="px-6 py-2.5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-white/5"
             >
                <Printer className="w-4 h-4" />
                Print
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           {[
             { label: 'Total Inflow', val: stats.income, color: 'text-emerald-400', border: 'border-emerald-500/20' },
             { label: 'Total Outflow', val: stats.expense, color: 'text-rose-400', border: 'border-rose-500/20' },
             { label: 'Pending Items', val: stats.pending, color: 'text-amber-400', border: 'border-amber-500/20', raw: true },
             { label: 'Net Liquidity', val: stats.net, color: 'text-sky-400', border: 'border-sky-500/20' }
           ].map((s, idx) => (
             <div key={idx} className={cn("bg-white/5 border rounded-3xl p-6 transition-all hover:bg-white/8 hover:translate-y-[-2px]", s.border)}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
                <p className={cn("text-2xl font-black tracking-tight", s.color)}>
                  {s.raw ? s.val : `Rs ${s.val.toLocaleString()}`}
                </p>
             </div>
           ))}
        </div>

        <div className="bg-white/5 border border-white/5 rounded-[32px] p-6 space-y-6">
           <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 overflow-hidden shrink-0">
                 {(['today', 'range', 'all'] as DateMode[]).map(m => (
                   <button 
                     key={m}
                     onClick={() => setDateMode(m)}
                     className={cn(
                       "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                       dateMode === m ? "bg-amber-500 text-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                     )}
                   >
                     {m}
                   </button>
                 ))}
              </div>

              <div className="h-8 w-[1px] bg-white/10 hidden lg:block" />

              <div className="flex flex-wrap gap-2">
                 {DEPARTMENTS.concat([{ code: 'all', label: 'All Depts' } as any]).map(d => (
                   <button 
                     key={d.code}
                     onClick={() => setDeptFilter(d.code as any)}
                     className={cn(
                       "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                       deptFilter === d.code ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-slate-500 hover:text-white"
                     )}
                   >
                     {d.code === 'all' ? 'All' : d.code}
                   </button>
                 ))}
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
              <div className="flex flex-wrap gap-2">
                 {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(s => (
                   <button 
                     key={s}
                     onClick={() => setStatusFilter(s)}
                     className={cn(
                       "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                       statusFilter === s ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : "bg-white/5 border-white/10 text-slate-500 hover:text-white"
                     )}
                   >
                     {s.replace('_', ' ')}
                   </button>
                 ))}
              </div>

              {dateMode === 'range' && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300 ml-auto">
                   <div className="relative group">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-within:text-amber-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="DD MM YYYY"
                        value={formatDateDMY(dateFrom)}
                        onChange={e => setDateFrom(e.target.value)}
                        onBlur={e => {
                          const parsed = parseDateDMY(e.target.value);
                          if (parsed) setDateFrom(parsed.toISOString().split('T')[0]);
                        }}
                        className="bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[10px] font-bold text-slate-300 outline-none focus:border-amber-500/40 [color-scheme:dark]"
                      />
                   </div>
                   <span className="text-slate-700 font-black uppercase text-[10px]">to</span>
                   <div className="relative group">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-within:text-amber-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="DD MM YYYY"
                        value={formatDateDMY(dateTo)}
                        onChange={e => setDateTo(e.target.value)}
                        onBlur={e => {
                          const parsed = parseDateDMY(e.target.value);
                          if (parsed) setDateTo(parsed.toISOString().split('T')[0]);
                        }}
                        className="bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[10px] font-bold text-slate-300 outline-none focus:border-amber-500/40 [color-scheme:dark]"
                      />
                   </div>
                </div>
              )}
           </div>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Transaction Date</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Source Dept</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Entity / Account</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Description</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-white/[0.04] transition-colors duration-150">
                    <td className="px-8 py-6">
                       <div className="text-sm font-black text-white">{formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}</div>
                       <div className="text-[10px] font-black text-slate-600 uppercase mt-1">
                          {tx.createdAt?.seconds ? new Date(tx.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ref: Auto'}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={cn(
                         "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                         tx.dept === 'rehab' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                         tx.dept === 'spims' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                         tx.dept === 'hospital' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                         "bg-white/5 text-slate-400 border-white/10"
                       )}>
                          {tx.departmentName || tx.dept}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="text-sm font-black text-white capitalize">{tx.patientName || tx.staffName || 'General Account'}</div>
                       <div className="text-[10px] font-black text-slate-600 uppercase mt-1 tracking-tighter">
                          ID: {tx.patientId || tx.staffId || 'MASTER'}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="text-xs font-bold text-slate-300 max-w-[240px] truncate leading-relaxed">
                          {tx.categoryName || tx.category}: {tx.description || tx.note || 'Internal Flow'}
                       </div>
                       <div className="text-[9px] font-black text-slate-600 uppercase mt-1 italic">
                          By: {tx.createdBy || tx.cashierId || 'System'}
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <div className={cn(
                         "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                         tx.status === 'approved' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                         tx.status?.includes('pending') ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/10" :
                         "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                       )}>
                          <Clock className={cn("w-2.5 h-2.5", tx.status?.includes('pending') && "animate-pulse")} />
                          {tx.status || 'pending'}
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className={cn(
                         "text-base font-black flex items-center justify-end gap-1.5",
                         tx.type === 'income' ? "text-emerald-400" : "text-rose-400"
                       )}>
                          {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          Rs {Number(tx.amount || 0).toLocaleString()}
                       </div>
                       <div className="text-[10px] font-black text-slate-600 uppercase mt-1 tracking-widest">
                          {tx.paymentMethod?.replace('_', ' ') || 'CASH'}
                       </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                     <td colSpan={6} className="px-8 py-32 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                           <History className="w-8 h-8" />
                        </div>
                        <p className="text-slate-500 font-bold italic">No records match your current filters.</p>
                     </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center py-10 opacity-30">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">End of Financial Record • {filtered.length} Entries</p>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .bg-slate-950, .bg-gray-950\/80 { background: white !important; }
          header, .bg-white\/5, .bg-black\/40 { background: white !important; border-color: #eee !important; box-shadow: none !important; }
          button, input, select { display: none !important; }
          .text-white, .text-slate-100 { color: black !important; }
          .text-slate-500, .text-slate-600 { color: #666 !important; }
          .divide-white\/5 { divide-color: #eee !important; }
          .border-white\/5, .border-white\/10 { border-color: #ddd !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th { color: #333 !important; padding: 10px !important; border-bottom: 2px solid #333 !important; }
          td { border-bottom: 1px solid #eee !important; padding: 10px !important; }
          .shadow-2xl, .shadow-lg { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
