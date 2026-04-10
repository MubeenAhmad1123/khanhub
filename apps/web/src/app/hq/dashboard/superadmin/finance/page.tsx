// apps/web/src/app/hq/dashboard/superadmin/finance/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { fetchFinanceInsights, fetchFinanceSummary, type FinanceTab } from '@/lib/hq/superadmin/finance';
import { StatCard } from '@/components/hq/superadmin/StatCard';
import { CsvExportButton } from '@/components/hq/superadmin/CsvExportButton';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { formatPKR } from '@/lib/hq/superadmin/format';
import { FileText } from 'lucide-react';
import { FinanceReportModal } from '@/components/hq/superadmin/FinanceReportModal';

export default function SuperadminFinancePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { session, loading: sessionLoading } = useHqSession();
  const initialTab = (sp.get('tab') as FinanceTab) || 'combined';
  const [tab, setTab] = useState<FinanceTab>(initialTab);
  const [summary, setSummary] = useState<null | Awaited<ReturnType<typeof fetchFinanceSummary>>>(null);
  const [insights, setInsights] = useState<null | Awaited<ReturnType<typeof fetchFinanceInsights>>>(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    let alive = true;
    setLoading(true);
    Promise.all([fetchFinanceSummary(), fetchFinanceInsights(tab)])
      .then(([s, i]) => {
        if (!alive) return;
        setSummary(s);
        setInsights(i);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [session, tab]);

  const csvRows = useMemo(() => {
    const top = insights?.topOutstanding || [];
    return top.map((r) => ({
      name: r.name,
      outstanding: r.outstanding,
      totalReceived: r.totalReceived ?? '',
      totalDue: r.totalDue ?? '',
    }));
  }, [insights]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Finance</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Summary + trends + dues.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex h-11 items-center gap-2 rounded-2xl bg-orange-600 px-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-orange-700 active:scale-95"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">Detailed Report</span>
          </button>
          <CsvExportButton filename={`top_pending_${tab}.csv`} rows={csvRows} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
        {(['combined', 'rehab', 'spims'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-11 rounded-2xl text-xs font-black uppercase tracking-widest transition ${
              tab === t ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading || !summary || !insights ? (
        <div className="mt-6">
          <InlineLoading label="Loading finance…" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard title="Collected today" value={summary.collectedToday} subtitle="Approved" tone="primary" format="pkr" />
            <StatCard title="This month" value={summary.collectedThisMonth} subtitle="Approved" tone="neutral" format="pkr" />
            <StatCard title="Total Dues" value={summary.outstandingTotal} subtitle="Total" tone="warning" format="pkr" />
            <StatCard title="Pending approvals" value={summary.pendingApprovals} subtitle="Needs action" tone="danger" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <h2 className="text-sm font-black text-gray-900 dark:text-white">30-day daily series</h2>
              <div className="mt-3 space-y-2">
                {insights.daily.slice(-10).map((p) => (
                  <div key={p.day} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/5">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{p.day}</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">{formatPKR(p.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Showing last 10 points (full chart can be added next).</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <h2 className="text-sm font-black text-gray-900 dark:text-white">Type breakdown (30 days)</h2>
              <div className="mt-3 space-y-2">
                {insights.types
                  .filter((t) => t.amount > 0)
                  .sort((a, b) => b.amount - a.amount)
                  .map((t) => (
                    <div key={t.type} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/5">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{t.type}</span>
                      <span className="text-xs font-black text-gray-900 dark:text-white">{formatPKR(t.amount)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-gray-900 dark:text-white">Top pending</h2>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                Total rows: {insights.topOutstanding.length}
              </div>
            </div>
            {!insights.topOutstanding.length ? (
              <div className="mt-4">
                <EmptyState title="No pending balances" message="Looks clean right now." />
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-widest text-gray-400">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Pending</th>
                      <th className="py-2 pr-4">Received</th>
                      <th className="py-2">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.topOutstanding.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100 dark:border-white/10">
                        <td className="py-3 pr-4 font-bold text-gray-900 dark:text-white">{r.name}</td>
                        <td className="py-3 pr-4 font-black text-amber-600 dark:text-amber-300">{formatPKR(r.outstanding)}</td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{r.totalReceived ? formatPKR(Number(r.totalReceived)) : '—'}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-300">{r.totalDue ? formatPKR(Number(r.totalDue)) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showReportModal && (
        <FinanceReportModal
          tab={tab}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

