'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, limit, query, startAfter, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Printer, Filter } from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';

type DeptFilter = 'all' | 'rehab' | 'spims';
type StatusFilter = 'all' | 'pending_cashier' | 'pending' | 'approved' | 'rejected';

function normDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  if (val?.seconds) return new Date(val.seconds * 1000).toISOString().slice(0, 10);
  const d = new Date(val);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default function CashierHistoryPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [rehabCursor, setRehabCursor] = useState<any>(null);
  const [spimsCursor, setSpimsCursor] = useState<any>(null);
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'cashier') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'cashier') return;

    const fetchData = async () => {
      try {
        const rehabQ = query(
          collection(db, 'rehab_transactions'),
          where('cashierId', '==', session.customId),
          limit(60)
        );
        const spimsQ = query(
          collection(db, 'spims_transactions'),
          where('cashierId', '==', session.customId),
          limit(60)
        );
        const [rehabSnap, spimsSnap] = await Promise.all([
          getDocs(rehabQ),
          getDocs(spimsQ).catch(() => ({ docs: [] } as any)),
        ]);

        const rehab = rehabSnap.docs.map((d: any) => ({ id: d.id, ...d.data(), dept: 'rehab' } as any));
        const spims = spimsSnap.docs.map((d: any) => ({ id: d.id, ...d.data(), dept: 'spims' } as any));
        const all = [...rehab, ...spims].sort((a, b) => {
          const dateA = normDate(a.createdAt || a.date);
          const dateB = normDate(b.createdAt || b.date);
          if (dateA === dateB) return 0;
          return dateA > dateB ? -1 : 1;
        });

        setTransactions(all);
        setRehabCursor(rehabSnap.docs.length ? rehabSnap.docs[rehabSnap.docs.length - 1] : null);
        setSpimsCursor(spimsSnap.docs.length ? spimsSnap.docs[spimsSnap.docs.length - 1] : null);
        setHasMore(rehabSnap.docs.length === 60 || spimsSnap.docs.length === 60);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const loadMore = async () => {
    if (!session || session.role !== 'cashier' || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const rehabQ = rehabCursor
        ? query(
            collection(db, 'rehab_transactions'),
            where('cashierId', '==', session.customId),
            startAfter(rehabCursor),
            limit(60)
          )
        : null;
      const spimsQ = spimsCursor
        ? query(
            collection(db, 'spims_transactions'),
            where('cashierId', '==', session.customId),
            startAfter(spimsCursor),
            limit(60)
          )
        : null;

      const [rehabSnap, spimsSnap] = await Promise.all([
        rehabQ ? getDocs(rehabQ) : Promise.resolve({ docs: [] } as any),
        spimsQ ? getDocs(spimsQ).catch(() => ({ docs: [] } as any)) : Promise.resolve({ docs: [] } as any),
      ]);

      const rehab = rehabSnap.docs.map((d: any) => ({ id: d.id, ...d.data(), dept: 'rehab' } as any));
      const spims = spimsSnap.docs.map((d: any) => ({ id: d.id, ...d.data(), dept: 'spims' } as any));
      const combined = [...transactions, ...rehab, ...spims].sort((a, b) => {
        const dateA = normDate(a.createdAt || a.date);
        const dateB = normDate(b.createdAt || b.date);
        if (dateA === dateB) return 0;
        return dateA > dateB ? -1 : 1;
      });
      setTransactions(combined);

      const nextRehabCursor = rehabSnap.docs.length ? rehabSnap.docs[rehabSnap.docs.length - 1] : null;
      const nextSpimsCursor = spimsSnap.docs.length ? spimsSnap.docs[spimsSnap.docs.length - 1] : null;
      setRehabCursor(nextRehabCursor || rehabCursor);
      setSpimsCursor(nextSpimsCursor || spimsCursor);
      setHasMore(rehabSnap.docs.length === 60 || spimsSnap.docs.length === 60);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = transactions.filter(t => {
    if (deptFilter !== 'all' && t.dept !== deptFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    const txDate = normDate(t.date || t.createdAt);
    if (dateFrom && txDate < dateFrom) return false;
    if (dateTo && txDate > dateTo) return false;
    return true;
  });

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 p-4 md:p-8 bg-gray-50 min-h-screen" id="printable">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Transaction History</h1>
          <p className="text-gray-400 text-sm mt-1">All your recorded transactions</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-gray-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-700 transition-all"
        >
          <Printer size={14} /> Print
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'rehab', 'spims'] as DeptFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setDeptFilter(f)}
              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                deptFilter === f ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              <Filter size={12} />
              {f === 'all' ? 'All' : f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending_cashier', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                statusFilter === f ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            className="bg-white border border-gray-100 rounded-2xl px-4 py-2.5 text-xs font-bold text-gray-700 outline-none"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            placeholder="From"
          />
          <input
            type="date"
            className="bg-white border border-gray-100 rounded-2xl px-4 py-2.5 text-xs font-bold text-gray-700 outline-none"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            placeholder="To"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest text-sm">No transactions found</p>
      ) : (
        <>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <th className="px-4 py-3 text-xs whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-xs whitespace-nowrap">Dept</th>
                    <th className="px-4 py-3 text-xs whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-xs whitespace-nowrap">Category</th>
                    <th className="px-4 py-3 text-xs whitespace-nowrap">Patient</th>
                    <th className="px-4 py-3 text-xs whitespace-nowrap">Amount</th>
                    <th className="px-4 py-3 text-xs whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-xs whitespace-nowrap">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-all">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{t.date ? formatDateDMY(t.date) : '—'}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                          t.dept === 'rehab' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                        }`}>{t.dept}</span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                          t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>{t.type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-700 whitespace-nowrap">{t.category}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{t.patientName || '—'}</td>
                      <td className="px-4 py-3 text-xs font-black whitespace-nowrap">₨{t.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                          t.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          t.status === 'approved' ? 'bg-green-50 text-green-600' :
                          'bg-red-50 text-red-600'
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[150px] truncate" title={t.rejectionReason || t.note || ''}>
                        {t.rejectionReason || t.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-100">
                    <td colSpan={5} className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Summary</td>
                    <td className="px-4 py-3 text-xs font-black text-green-600">+₨{totalIncome.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-black text-red-600">-₨{totalExpense.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-black text-gray-900">₨{(totalIncome - totalExpense).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
            Showing {filtered.length} transactions
          </p>
          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 bg-gray-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-700 transition-all disabled:opacity-60"
              >
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}