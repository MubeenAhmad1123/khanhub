'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, BadgeCheck, Building2, ClipboardList, CreditCard, Users2, UserPlus, TrendingUp, Search } from 'lucide-react';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { fetchOverviewStats } from '@/lib/hq/superadmin/stats';
import { fetchTodayClientCounts, formatPKTDate, type TodayClientsResult } from '@/lib/hq/superadmin/clients';
import { StatCard } from '@/components/hq/superadmin/StatCard';
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HqSuperadminPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [stats, setStats] = useState<null | Awaited<ReturnType<typeof fetchOverviewStats>>>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser || !isSuperadminEmail(firebaseUser.email)) {
        console.warn('[Superadmin] Email not in whitelist, redirecting.');
        router.push('/hq/login');
      }
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
      {
        title: 'Departmental Velocity',
        value: '94%',
        subtitle: 'Global compliance',
        icon: TrendingUp,
        tone: 'primary' as const,
      },
    ],
    [stats, clientsData, clientsLoading]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
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
          <h1 className="text-2xl font-black tracking-tight text-black dark:text-white uppercase">HQ Governance Hub</h1>
          <p className="mt-1 text-sm font-bold text-black dark:text-black uppercase tracking-widest italic">Global Operations Matrix</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hq/dashboard/superadmin/approvals"
            className="rounded-xl bg-black dark:bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-white dark:text-black hover:opacity-90 active:scale-95 shadow-lg border-2 border-transparent hover:border-black dark:hover:border-white transition-all"
          >
            Review approvals
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c, idx) => (
          <StatCard
            key={c.title}
            title={c.title}
            value={c.value}
            subtitle={c.subtitle}
            href={(c as any).href}
            icon={c.icon}
            tone={
              idx % 6 === 0 ? 'danger' :
              idx % 6 === 1 ? 'primary' :
              idx % 6 === 2 ? 'hq' :
              idx % 6 === 3 ? 'rehab' :
              idx % 6 === 4 ? 'spims' :
              'warning'
            }
            format={(c as any).format}
            loading={statsLoading && !('onClick' in c)}
            onClick={(c as any).onClick}
          />
        ))}
      </div>

      {/* ── Governance Terminal ─────────────────────────────────────────────── */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Execution Terminal */}
        <div className="rounded-[2.5rem] border-4 border-black dark:border-white bg-white dark:bg-black p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] dark:shadow-[10px_10px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[10px] font-black text-black dark:text-white px-2 border-l-4 border-black dark:border-white uppercase tracking-widest italic">Institutional Control Terminal</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Personnel Hub',   href: '/hq/dashboard/superadmin/staff',       icon: Users2, color: 'bg-indigo-500' },
              { label: 'Analytics Matrix', href: '/hq/dashboard/superadmin/analytics',   icon: Activity, color: 'bg-emerald-500' },
              { label: 'Departmental Map', href: '/hq/dashboard/superadmin/departments', icon: Building2, color: 'bg-amber-500' },
              { label: 'Secure Archives',  href: '/hq/dashboard/superadmin/audit',       icon: ClipboardList, color: 'bg-rose-500' },
            ].map((btn) => (
              <Link
                key={btn.label}
                className="group relative flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-black dark:border-white bg-gray-50 dark:bg-white/5 p-8 transition-all hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black active:scale-95 overflow-hidden shadow-sm"
                href={btn.href}
              >
                <div className={`absolute top-0 left-0 w-full h-1.5 ${btn.color}`} />
                <div className="p-3 rounded-2xl bg-white dark:bg-white/10 group-hover:bg-transparent transition-colors">
                  <btn.icon size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{btn.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Strategic Intelligence */}
        <div className="rounded-[2.5rem] border-4 border-black dark:border-white bg-gradient-to-br from-[#1a1a1a] to-[#000000] p-8 shadow-2xl text-white relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
          <div className="relative z-10">
            <h2 className="text-[10px] font-black px-2 border-l-4 border-indigo-500 uppercase tracking-widest mb-8 italic">Network Intelligence Matrix</h2>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Governance Integrity</p>
                  <p className="text-sm font-black italic">99.9%</p>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full w-[99.9%] bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Operational Velocity</p>
                  <p className="text-sm font-black italic">94.2%</p>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full w-[94.2%] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
              <div className="pt-6 border-t border-white/10 mt-6">
                <p className="text-xs font-medium italic opacity-70 leading-relaxed">
                  "Institutional governance parameters are operating within optimal range. Global synchronization for staff performance and growth points is active."
                </p>
                <div className="mt-4 flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Node Alpha: Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Node Beta: Syncing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
