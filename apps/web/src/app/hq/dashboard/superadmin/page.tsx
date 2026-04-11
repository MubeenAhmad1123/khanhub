'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, BadgeCheck, Building2, ClipboardList, CreditCard, Users2 } from 'lucide-react';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { fetchOverviewStats } from '@/lib/hq/superadmin/stats';
import { subscribeUnifiedAuditFeed } from '@/lib/hq/superadmin/audit';
import { StatCard } from '@/components/hq/superadmin/StatCard';
import { InlineLoading } from '@/components/hq/superadmin/DataState';

export default function HqSuperadminPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [stats, setStats] = useState<null | Awaited<ReturnType<typeof fetchOverviewStats>>>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activity, setActivity] = useState<Array<{ id: string; when: string; msg: string; who: string }>>([]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    let alive = true;
    setStatsLoading(true);
    fetchOverviewStats()
      .then((s) => alive && setStats(s))
      .finally(() => alive && setStatsLoading(false));
    return () => {
      alive = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    return subscribeUnifiedAuditFeed({
      limitCount: 12,
      onData: (rows) => {
        setActivity(
          rows.map((r) => ({
            id: r.id,
            when: r.whenLabel,
            msg: r.message,
            who: r.actorName,
          }))
        );
      },
    });
  }, [session]);

  const cards = useMemo(
    () => [
      {
        title: 'Pending approvals',
        value: stats?.pendingApprovals ?? 0,
        subtitle: 'Needs action',
        href: '/hq/dashboard/superadmin/approvals',
        icon: BadgeCheck,
        tone: 'danger' as const,
      },
      {
        title: 'Transactions today',
        value: stats?.txAmountToday ?? 0,
        subtitle: 'Combined amount',
        href: '/hq/dashboard/superadmin/finance',
        icon: CreditCard,
        tone: 'primary' as const,
        format: 'pkr' as const,
      },
      {
        title: 'Rehab patients today',
        value: stats?.rehabPatientsToday ?? 0,
        subtitle: 'New today',
        href: '/hq/dashboard/superadmin/departments',
        icon: Building2,
        tone: 'neutral' as const,
      },
      {
        title: 'SPIMS students today',
        value: stats?.spimsStudentsToday ?? 0,
        subtitle: 'New today',
        href: '/hq/dashboard/superadmin/spims/students',
        icon: ClipboardList,
        tone: 'neutral' as const,
      },
      {
        title: 'Active staff',
        value: stats?.activeStaffCount ?? 0,
        subtitle: 'Across departments',
        href: '/hq/dashboard/superadmin/staff',
        icon: Users2,
        tone: 'neutral' as const,
      },
      {
        title: 'Reconciliations',
        value: stats?.pendingReconciliations ?? 0,
        subtitle: 'Pending',
        href: '/hq/dashboard/superadmin/reconciliation',
        icon: Activity,
        tone: 'warning' as const,
      },
    ],
    [stats]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">HQ Superadmin</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Everything in one place. Tap a card to drill in.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hq/dashboard/superadmin/approvals"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-black text-white active:scale-[0.99] dark:bg-white dark:text-gray-900"
          >
            Review approvals
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <StatCard
            key={c.title}
            title={c.title}
            value={c.value}
            subtitle={c.subtitle}
            href={c.href}
            icon={c.icon}
            tone={c.tone}
            format={(c as any).format}
            loading={statsLoading}
          />
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 dark:text-white">Quick actions</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link className="flex items-center justify-center rounded-xl border border-gray-300 bg-gray-100 px-3 py-3 text-sm font-bold text-gray-900 hover:bg-gray-200 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" href="/hq/dashboard/superadmin/users">
              Manage users
            </Link>
            <Link className="flex items-center justify-center rounded-xl border border-gray-300 bg-gray-100 px-3 py-3 text-sm font-bold text-gray-900 hover:bg-gray-200 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" href="/hq/dashboard/superadmin/settings">
              Settings
            </Link>
            <Link className="flex items-center justify-center rounded-xl border border-gray-300 bg-gray-100 px-3 py-3 text-sm font-bold text-gray-900 hover:bg-gray-200 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" href="/hq/dashboard/superadmin/departments">
              Departments hub
            </Link>
            <Link className="flex items-center justify-center rounded-xl border border-gray-300 bg-gray-100 px-3 py-3 text-sm font-bold text-gray-900 hover:bg-gray-200 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" href="/hq/dashboard/superadmin/audit">
              Audit logs
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 dark:text-white">Recent activity</h2>
          </div>
          {!activity.length ? (
            <div className="mt-4">
              <InlineLoading label="Listening for updates…" />
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {activity.slice(0, 8).map((a) => (
                <div key={a.id} className="rounded-xl border border-gray-300 bg-gray-100 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{a.msg}</p>
                    <span className="shrink-0 text-xs font-semibold text-gray-600 dark:text-gray-400">{a.when}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">by {a.who}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
