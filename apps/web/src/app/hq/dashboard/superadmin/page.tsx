'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, BadgeCheck, Building2, ClipboardList, CreditCard, Users2, UserPlus } from 'lucide-react';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { fetchOverviewStats } from '@/lib/hq/superadmin/stats';
import { fetchTodayClientCounts, formatPKTDate, type TodayClientsResult } from '@/lib/hq/superadmin/clients';
import { fetchUnifiedAuditFeed } from '@/lib/hq/superadmin/audit';
import { StatCard } from '@/components/hq/superadmin/StatCard';
import { InlineLoading } from '@/components/hq/superadmin/DataState';
import { ActivityDetailModal } from '@/components/hq/superadmin/ActivityDetailModal';
import { ClientsFlowModal } from '@/components/hq/superadmin/ClientsFlowModal';
import { isSuperadminEmail } from '@/lib/hq/auth/superadminWhitelist';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_LABELS: Record<string, string> = {
  hq: 'Khan Hub HQ',
  rehab: 'Rehab Center',
  spims: 'SPIMS Academy',
  hospital: 'Khan Hospital',
  sukoon: 'Sukoon Center',
  welfare: 'Welfare Foundation',
  job_center: 'Job Center',
  'job-center': 'Job Center',
};

const SOURCE_BADGE_STYLES: Record<string, string> = {
  hq:          'bg-black dark:bg-white text-white dark:text-black font-black',
  rehab:       'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-bold',
  spims:       'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-bold',
  hospital:    'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-bold border border-black/5 dark:border-white/5',
  sukoon:      'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-bold',
  welfare:     'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-bold',
  job_center:  'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-bold',
  'job-center':'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-bold',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'Just now';
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HqSuperadminPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [stats, setStats] = useState<null | Awaited<ReturnType<typeof fetchOverviewStats>>>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activity, setActivity] = useState<any[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);

  // ── Clients flow state ────────────────────────────────────────────────────
  const [clientsData, setClientsData] = useState<TodayClientsResult | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [flowOpen, setFlowOpen] = useState(false);
  const todayLabel = useMemo(() => formatPKTDate(new Date()), []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
      return;
    }
    // Wait for Firebase Auth to fully initialize before checking the email whitelist.
    // auth.currentUser can be null right after mount (async restore from storage).
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser || !isSuperadminEmail(firebaseUser.email)) {
        console.warn('[Superadmin] Email not in whitelist, redirecting.');
        router.push('/hq/login');
      }
      // Once resolved, we don't need to keep listening
      unsub();
    });
    return () => unsub();
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    let alive = true;
    setStatsLoading(true);
    fetchOverviewStats()
      .then((s) => alive && setStats(s))
      .finally(() => alive && setStatsLoading(false));
    return () => { alive = false; };
  }, [session]);

  // Fetch today's client counts (separate query, lightweight)
  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    let alive = true;
    setClientsLoading(true);
    fetchTodayClientCounts()
      .then((d) => alive && setClientsData(d))
      .catch(() => alive && setClientsData({ total: 0, byDept: [] }))
      .finally(() => alive && setClientsLoading(false));
    return () => { alive = false; };
  }, [session]);

  const loadActivity = async () => {
    if (!session || session.role !== 'superadmin') return;
    try {
      const rows = await fetchUnifiedAuditFeed(15);
      setActivity(rows);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    }
  };

  useEffect(() => {
    void loadActivity();
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
        title: 'Clients today',
        value: clientsLoading ? '—' : (clientsData?.total ?? 0),
        subtitle: 'New registrations',
        icon: UserPlus,
        tone: 'neutral' as const,
        onClick: () => setFlowOpen(true),
      },
      {
        title: 'Rehab patients',
        value: stats?.rehabPatientsTotal ?? 0,
        subtitle: 'Total registered',
        href: '/hq/dashboard/superadmin/rehab/patients',
        icon: Building2,
        tone: 'neutral' as const,
      },
      {
        title: 'SPIMS students',
        value: stats?.spimsStudentsTotal ?? 0,
        subtitle: 'Total enrolled',
        href: '/hq/dashboard/superadmin/spims/students',
        icon: ClipboardList,
        tone: 'neutral' as const,
      },
      {
        title: 'Job seekers',
        value: stats?.jobSeekersTotal ?? 0,
        subtitle: 'Total registered',
        href: '/hq/dashboard/superadmin/departments',
        icon: Users2,
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
    [stats, clientsData, clientsLoading]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

      {/* ── Activity Detail Modal ─────────────────────────────────────────── */}
      <ActivityDetailModal audit={selectedAudit} onClose={() => setSelectedAudit(null)} />

      {/* ── Clients Flow Modal ────────────────────────────────────────────── */}
      {flowOpen && clientsData && (
        <ClientsFlowModal
          open={flowOpen}
          onClose={() => setFlowOpen(false)}
          byDept={clientsData.byDept}
          total={clientsData.total}
          todayLabel={todayLabel}
        />
      )}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-black dark:text-white">HQ Superadmin</h1>
          <p className="mt-1 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Global Governance Hub</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hq/dashboard/superadmin/approvals"
            className="rounded-xl bg-black dark:bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-white dark:text-black hover:opacity-90 active:scale-95 shadow-lg"
          >
            Review approvals
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <StatCard
            key={c.title}
            title={c.title}
            value={c.value}
            subtitle={c.subtitle}
            href={(c as any).href}
            icon={c.icon}
            tone={c.tone}
            format={(c as any).format}
            loading={statsLoading && !('onClick' in c)}
            onClick={(c as any).onClick}
          />
        ))}
      </div>

      {/* ── Bottom Grid ─────────────────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="h-full rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black text-black dark:text-white px-2 border-l-4 border-black dark:border-white uppercase tracking-widest">Execution Terminal</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-grow">
            {[
              { label: 'Manage Users',    href: '/hq/dashboard/superadmin/users' },
              { label: 'Analytics Hub',   href: '/hq/dashboard/superadmin/analytics' },
              { label: 'Departments Hub', href: '/hq/dashboard/superadmin/departments' },
              { label: 'Audit Logs',      href: '/hq/dashboard/superadmin/audit' },
            ].map((btn) => (
              <Link
                key={btn.label}
                className="flex items-center justify-center text-center rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-3 py-6 text-[10px] font-black uppercase tracking-widest text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all active:scale-95"
                href={btn.href}
              >
                {btn.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="h-full rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-[10px] font-black text-black dark:text-white px-2 border-l-4 border-black dark:border-white uppercase tracking-widest">Intelligence Feed</h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => loadActivity()}
                className="text-[9px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-800 transition-colors"
              >
                Refresh
              </button>
              <Link href="/hq/dashboard/superadmin/audit" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                View All
              </Link>
            </div>
          </div>
          {!activity.length ? (
            <div className="flex-grow flex items-center justify-center py-10">
              <InlineLoading label="Listening for updates…" />
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
              {activity.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAudit(a)}
                  className="group relative w-full text-left overflow-hidden rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-200/40 dark:bg-white/5 p-4 transition-all hover:bg-white dark:hover:bg-white/10 border-l-4 border-l-black dark:border-l-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-black dark:text-white leading-tight transition-colors">
                        {a.readableMessage}
                      </p>
                      <div className="mt-2 flex items-center flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${SOURCE_BADGE_STYLES[a.source] || 'bg-white/5 text-gray-400'}`}>
                          {a.source}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                          by <span className="text-gray-600 dark:text-gray-300">{a.actorName}</span>
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[9px] font-black uppercase text-gray-400 italic">
                        {getRelativeTime(a.whenMs)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
