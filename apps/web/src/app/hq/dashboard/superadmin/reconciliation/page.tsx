// apps/web/src/app/hq/dashboard/superadmin/reconciliation/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { decideReconciliation } from '@/app/hq/actions/reconciliation';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';

export default function SuperadminReconciliationPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    return onSnapshot(
      query(collection(db, 'hq_reconciliation'), orderBy('date', 'desc'), limit(80)),
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [session]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.cashierName || ''} ${r.cashierId || ''} ${r.date || ''} ${r.status || ''}`.toLowerCase().includes(s));
  }, [rows, q]);

  const act = async (id: string, status: 'verified' | 'flagged') => {
    setBusyId(id);
    try {
      const res = await decideReconciliation({ id, status });
      if (!res.success) throw new Error(res.error || 'Failed');
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Reconciliation</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Daily cash close submissions.</p>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search cashier / date / status…"
          className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        />
      </div>

      <div className="mt-5">
        {loading ? (
          <InlineLoading label="Loading reconciliation…" />
        ) : !filtered.length ? (
          <EmptyState title="No submissions" message="No reconciliation submissions yet." />
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 dark:text-white">{r.date || '—'}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {r.cashierName || 'Cashier'} • {r.cashierId || '—'} • Status: {String(r.status || 'pending')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!!busyId}
                      onClick={() => act(r.id, 'flagged')}
                      className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-black uppercase tracking-widest text-gray-900 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      Flag
                    </button>
                    <button
                      type="button"
                      disabled={!!busyId}
                      onClick={() => act(r.id, 'verified')}
                      className="h-10 rounded-xl bg-gray-900 px-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
                    >
                      Verify
                    </button>
                  </div>
                </div>
                {r.note ? <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{String(r.note)}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

