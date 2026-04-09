// apps/web/src/app/hq/dashboard/superadmin/audit/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { subscribeUnifiedAuditFeed } from '@/lib/hq/superadmin/audit';
import { CsvExportButton } from '@/components/hq/superadmin/CsvExportButton';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';

export default function SuperadminAuditPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [source, setSource] = useState<'all' | 'hq' | 'rehab' | 'spims'>('all');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    return subscribeUnifiedAuditFeed({
      limitCount: 60,
      onData: (r) => {
        setRows(r);
        setLoading(false);
      },
      onError: () => setLoading(false),
    });
  }, [session]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (source !== 'all' && r.source !== source) return false;
      if (!s) return true;
      const hay = `${r.source} ${r.action} ${r.message} ${r.actorName} ${r.entityLabel || ''}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q, source]);

  const csvRows = useMemo(
    () =>
      filtered.map((r) => ({
        source: r.source,
        action: r.action,
        actorName: r.actorName,
        message: r.message,
        entityLabel: r.entityLabel || '',
        when: r.whenLabel || '',
      })),
    [filtered]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Audit</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Unified HQ + Rehab + SPIMS feed.</p>
        </div>
        <CsvExportButton filename="hq_unified_audit.csv" rows={csvRows} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:max-w-md">
        {(['all', 'hq', 'rehab', 'spims'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSource(t)}
            className={`h-11 rounded-2xl text-xs font-black uppercase tracking-widest transition ${
              source === t
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search audit…"
          className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        />
      </div>

      <div className="mt-5">
        {loading ? (
          <InlineLoading label="Loading audit…" />
        ) : !filtered.length ? (
          <EmptyState title="No audit entries" message="Nothing matches your filters." />
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 dark:text-white">{r.message}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {r.source} • {r.action} • by {r.actorName}
                      {r.entityLabel ? ` • ${r.entityLabel}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs font-bold text-gray-400">{r.whenLabel}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

