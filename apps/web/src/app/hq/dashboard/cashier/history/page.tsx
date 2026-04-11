'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, limit, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Printer, Filter, History, TrendingUp, TrendingDown, Clock, Wallet } from 'lucide-react';
import { formatDateDMY, toDate, cn } from '@/lib/utils';

type DeptFilter = 'all' | 'rehab' | 'spims';
type StatusFilter = 'all' | 'pending_cashier' | 'pending' | 'approved' | 'rejected';
type DateMode = 'today' | 'all' | 'range';

function getLocalDateString(val: any): string {
  if (!val) return '';
  const d = toDate(val);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CashierHistoryPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateMode, setDateMode] = useState<DateMode>('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  const fetchData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      let all: any[] = [];
      const depts = ['rehab', 'spims'];

      const snaps = await Promise.all(depts.map(async (dept) => {
        // Fetch last 500 transactions per department to ensure we have enough for filtering
        // We removed the strict cashierId filter to match Terminal History behavior
        const q = query(
          collection(db, `${dept}_transactions`),
          orderBy('createdAt', 'desc'),
          limit(500)
        );
        return getDocs(q).catch(() => ({ docs: [] } as any));
      }));

      snaps.forEach((snap, idx) => {
        const dept = depts[idx];
        const docs = snap.docs.map((d: any) => ({
          id: d.id,
          ...d.data(),
          dept
        }));
        all = [...all, ...docs];
      });

      all.sort((a, b) => {
        const dateA = toDate(a.transactionDate || a.date || a.createdAt)?.getTime() || 0;
        const dateB = toDate(b.transactionDate || b.date || b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      });

      setTransactions(all);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, deptFilter]);

  const todayStr = getLocalDateString(new Date());

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      // Dept Filter
      if (deptFilter !== 'all' && t.dept !== deptFilter) return false;

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          if (!t.status?.includes('pending')) return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // Date Filter
      const txDateStr = getLocalDateString(t.transactionDate || t.date || t.createdAt);
      if (dateMode === 'today') {
        if (txDateStr !== todayStr) return false;
      } else if (dateMode === 'range') {
        if (dateFrom && txDateStr < dateFrom) return false;
        if (dateTo && txDateStr > dateTo) return false;
      }

      return true;
    });
  }, [transactions, deptFilter, statusFilter, dateMode, dateFrom, dateTo, todayStr]);

  const stats = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const pending = filtered.filter(t => t.status?.includes('pending')).length;
    return { income, expense, net: income - expense, pending };
  }, [filtered]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
          <p className="text-gray-500 font-bold animate-pulse text-xs uppercase tracking-[0.2em]">Syncing History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 p-4 md:p-8 md:pl-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 min-h-screen" id="printable">
      <div className="sticky top-0 z-10 backdrop-blur-md bg-gray-950/80 border-b border-white/5 px-4 py-4 md:px-8 md:py-6 -mx-4 md:mx-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg text-black"><History size={20} /></div>
            Transaction History
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1 ml-12">Universal Financial Record</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all active:scale-95"
          >
            Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="h-11 inline-flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 active:scale-95 shadow-lg shadow-white/10"
          >
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      {/* Stats Overview to match Terminal History */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white/5 border border-white/8 rounded-2xl p-4 md:p-5 border-l-4 border-l-emerald-500 hover:bg-white/8 transition-all duration-300">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Income</p>
          <p className="text-lg md:text-2xl font-black text-white mt-1">₨{stats.income.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-4 md:p-5 border-l-4 border-l-rose-500 hover:bg-white/8 transition-all duration-300">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Expense</p>
          <p className="text-lg md:text-2xl font-black text-white mt-1">₨{stats.expense.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-4 md:p-5 border-l-4 border-l-amber-500 hover:bg-white/8 transition-all duration-300">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pending</p>
          <p className="text-lg md:text-2xl font-black text-white mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-4 md:p-5 border-l-4 border-l-blue-500 hover:bg-white/8 transition-all duration-300">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Net Flow</p>
          <p className="text-lg md:text-2xl font-black text-white mt-1">₨{stats.net.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-white/5 border border-white/8 rounded-3xl p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Mode Select */}
          <div className="flex p-1 bg-black/40 rounded-xl border border-white/10 shrink-0">
            {(['today', 'range', 'all'] as DateMode[]).map(m => (
              <button
                key={m}
                onClick={() => setDateMode(m)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200",
                  dateMode === m ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

          {/* Dept Filter */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'rehab', 'spims'] as DeptFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setDeptFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200",
                  deptFilter === f ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/8"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200",
                  statusFilter === f ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/8"
                )}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {dateMode === 'range' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <input
                type="date"
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-bold text-gray-300 outline-none focus:border-amber-500/50 [color-scheme:dark]"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
              <span className="text-gray-600 font-bold">to</span>
              <input
                type="date"
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-bold text-gray-300 outline-none focus:border-amber-500/50 [color-scheme:dark]"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6 bg-white/5 border border-white/8 rounded-3xl">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/8 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/5 animate-pulse" />
            <History className="text-gray-600 relative z-10" size={32} />
          </div>
          <div className="text-center">
            <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">Empty Archive</h3>
            <p className="text-gray-500 text-xs font-bold mt-2">No transactions matching these parameters found.</p>
          </div>
          <button
            onClick={() => { setDeptFilter('all'); setStatusFilter('all'); setDateMode('all'); }}
            className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="hidden md:block bg-white/5 border border-white/8 rounded-3xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/10">
                    <th className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-6 py-5 whitespace-nowrap">Timestamp</th>
                    <th className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-6 py-5 whitespace-nowrap">Department</th>
                    <th className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-6 py-5 whitespace-nowrap">Category / Note</th>
                    <th className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-6 py-5 whitespace-nowrap">Entity / Account</th>
                    <th className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-6 py-5 whitespace-nowrap">Status</th>
                    <th className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-6 py-5 whitespace-nowrap text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((t, index) => (
                    <tr key={t.id} className="group hover:bg-white/[0.04] transition-colors duration-150">
                      <td className="px-6 py-5">
                        <div className="text-sm font-black text-white">{formatDateDMY(t.transactionDate || t.date || t.createdAt)}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-0.5">
                          {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border",
                          t.dept === 'rehab' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}>
                          {t.departmentName || t.dept}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-black text-gray-200">{t.categoryName || t.category}</div>
                        <div className="text-[10px] font-bold text-gray-500 mt-1 max-w-[200px] truncate" title={t.note || t.description || ''}>
                          {t.note || t.description || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-black text-white">{t.patientName || t.staffName || 'General Account'}</div>
                        <div className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">
                          ID: {t.patientId || t.staffId || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em]",
                          t.status === 'approved' ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                            t.status === 'rejected' ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" :
                              "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        )}>
                          <Clock size={10} className={t.status === 'pending' ? 'animate-pulse' : ''} />
                          {t.status || 'pending'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className={cn(
                          "text-base font-black flex items-center justify-end gap-1",
                          t.type === 'income' ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {t.type === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          ₨{t.amount?.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">
                          {t.paymentMethod || 'CASH'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((t) => (
              <div key={t.id} className="bg-white/5 border border-white/8 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{formatDateDMY(t.transactionDate || t.date || t.createdAt)}</p>
                    <h3 className="text-sm font-black text-white">{t.categoryName || t.category}</h3>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                        t.dept === 'rehab' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}>{t.dept}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{t.patientName || 'General Account'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-base font-black", t.type === 'income' ? 'text-emerald-400' : 'text-rose-400')}>
                      {t.type === 'income' ? '+' : '-'}₨{t.amount?.toLocaleString()}
                    </p>
                    <div className={cn(
                      "inline-flex mt-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                      t.status === 'approved' ? "bg-emerald-500/15 text-emerald-400" :
                        t.status === 'rejected' ? "bg-rose-500/15 text-rose-400" :
                          "bg-amber-500/15 text-amber-400"
                    )}>{t.status || 'pending'}</div>
                  </div>
                </div>

                {t.note && (
                  <div className="p-3 bg-black/20 rounded-xl">
                    <p className="text-[10px] text-gray-400 leading-relaxed italic">"{t.note}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/8 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><Wallet size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest uppercase">Filtered Summary</p>
                <p className="text-xl font-black text-white">₨{stats.net.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center md:text-right">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total In</p>
                <p className="text-sm font-black text-emerald-400">₨{stats.income.toLocaleString()}</p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Out</p>
                <p className="text-sm font-black text-rose-400">₨{stats.expense.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] text-center py-4">
            End of Record • {filtered.length} Entries Loaded
          </p>
        </div>
      )}
    </div>
  );
}
