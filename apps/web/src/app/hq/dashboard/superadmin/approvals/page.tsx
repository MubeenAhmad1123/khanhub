// apps/web/src/app/hq/dashboard/superadmin/approvals/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, RefreshCcw } from 'lucide-react';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { subscribeApprovalsFeed, type ApprovalsFilters, type ApprovalsTab } from '@/lib/hq/superadmin/approvals';
import { TxCard, type SuperadminTxCard } from '@/components/hq/superadmin/TxCard';
import { FilterDrawer } from '@/components/hq/superadmin/FilterDrawer';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { formatDateDMY, toDate } from '@/lib/utils';
import { decideTransaction } from '@/app/hq/actions/approvals';

const DEFAULT_FILTERS: ApprovalsFilters = {
  dept: 'all',
  datePreset: 'today',
  amountBucket: 'all',
  sort: 'newest',
  proof: 'all',
  entityQuery: '',
};

function toCard(tx: any): SuperadminTxCard {
  const entityName = String(tx.patientName || tx.studentName || tx.staffName || '—');
  const entityHref =
    tx.dept === 'rehab' && tx.patientId ? `/hq/dashboard/superadmin/rehab/patients/${tx.patientId}` : undefined;
  const when = toDate(tx.createdAt || tx.date || tx.transactionDate);
  return {
    id: tx.id,
    dept: tx.dept,
    entityName,
    entityHref,
    amount: Number(tx.amount || 0),
    typeLabel: String(tx.categoryName || tx.category || tx.type || 'Transaction'),
    submittedAtLabel: formatDateDMY(when),
    submittedByLabel: String(tx.cashierName || tx.cashierId || tx.createdByName || tx.createdBy || '—'),
    note: tx.description,
    status: (String(tx.status || 'pending') as any),
    proofUrl: tx.proofUrl ?? null,
    hasProof: !!tx.proofUrl,
  };
}

export default function HqApprovalsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [tab, setTab] = useState<ApprovalsTab>('pending');
  const [filters, setFilters] = useState<ApprovalsFilters>(DEFAULT_FILTERS);
  const [openFilters, setOpenFilters] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    const unsub = subscribeApprovalsFeed({
      tab,
      filters,
      onData: (r) => {
        setRows(r);
        setLoading(false);
      },
      onError: () => setLoading(false),
    });
    return () => unsub();
  }, [session, tab, filters]);

  const cards = useMemo(() => rows.map(toCard), [rows]);

  const doUpdate = async (tx: any, status: 'approved' | 'rejected') => {
    if (!tx?.id) return;
    setBusyId(tx.id);
    try {
      const dept = tx.dept === 'rehab' ? 'rehab' : 'spims';
      const res = await decideTransaction({ dept, txId: tx.id, decision: status });
      if (!res.success) throw new Error(res.error || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Approvals</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Mobile-first review. Filter. Approve or reject.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpenFilters(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {([
          { id: 'pending', label: 'Pending' },
          { id: 'approved_today', label: 'Approved' },
          { id: 'rejected_today', label: 'Rejected' },
          { id: 'history', label: 'History' },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`h-11 rounded-2xl text-xs font-black uppercase tracking-widest transition ${
              tab === t.id
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {loading ? (
          <InlineLoading label="Loading approvals…" />
        ) : !cards.length ? (
          <EmptyState title="Nothing here" message="No transactions match your filters." />
        ) : (
          <div className="space-y-3">
            {cards.map((c) => {
              const raw = rows.find((r) => r.id === c.id);
              const disable = !!busyId;
              return (
                <TxCard
                  key={c.id}
                  tx={c}
                  disableActions={disable}
                  onApprove={tab === 'pending' ? () => doUpdate(raw, 'approved') : undefined}
                  onReject={tab === 'pending' ? () => doUpdate(raw, 'rejected') : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      <FilterDrawer
        open={openFilters}
        onOpenChange={setOpenFilters}
        title="Filters"
        right={
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 text-xs font-black uppercase tracking-widest text-white dark:bg-white dark:text-gray-900"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Department</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['all', 'rehab', 'spims'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, dept: d }))}
                  className={`h-11 rounded-2xl text-xs font-black uppercase tracking-widest ${
                    filters.dept === d
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['today', 'yesterday', 'this_week'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, datePreset: p }))}
                  className={`h-11 rounded-2xl text-xs font-black uppercase tracking-widest ${
                    filters.datePreset === p
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-200'
                  }`}
                >
                  {p.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Entity search</div>
            <div className="mt-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <input
                value={filters.entityQuery}
                onChange={(e) => setFilters((f) => ({ ...f, entityQuery: e.target.value }))}
                placeholder="Type a name…"
                className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              />
            </div>
          </div>
        </div>
      </FilterDrawer>
    </div>
  );
}

