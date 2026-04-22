'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Activity, BadgeCheck, Building2, ClipboardList, CreditCard, 
  Users2, UserPlus, TrendingUp, Search, ShieldCheck, ChevronRight 
} from 'lucide-react';
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

// ─── Components ───────────────────────────────────────────────────────────────



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
    <div className="min-h-screen bg-[#FCFBF4] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Building2 className="text-white" size={24} />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-black uppercase">HQ Governance Hub</h1>
            </div>
            <p className="text-[10px] font-black text-black/60 uppercase tracking-[0.4em] italic pl-1">
              Global Operations Matrix • Real-time Institutional Oversight
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/hq/dashboard/superadmin/approvals"
              className="group relative px-8 py-4 bg-white border-4 border-black text-xs font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-2xl"
            >
              Review Approvals
            </Link>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5 mb-12">
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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Execution Terminal */}
          <div className="lg:col-span-2 rounded-[3rem] border-4 border-black bg-white p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <ShieldCheck className="text-black" size={28} />
                <h2 className="text-xl font-black text-black uppercase tracking-tight">Institutional Control Matrix</h2>
              </div>
              <div className="px-4 py-1 bg-black text-white rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
                System Active
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Personnel Hub',   href: '/hq/dashboard/superadmin/staff',       icon: Users2, color: 'from-indigo-600 to-blue-700', desc: 'Staff registry & compliance' },
                { label: 'Analytics Matrix', href: '/hq/dashboard/superadmin/analytics',   icon: Activity, color: 'from-emerald-500 to-teal-600', desc: 'Real-time data visualization' },
                { label: 'Departmental Map', href: '/hq/dashboard/superadmin/departments', icon: Building2, color: 'from-amber-500 to-orange-600', desc: 'Institutional structure' },
                { label: 'Finance Center',   href: '/hq/dashboard/superadmin/finance',     icon: CreditCard, color: 'from-rose-500 to-pink-600', desc: 'Global financial ledger' },
              ].map((btn) => (
                <Link
                  key={btn.label}
                  className="group relative flex flex-col items-center text-center gap-4 rounded-[2.5rem] border-4 border-black bg-[#FCFBF4] p-8 transition-all hover:bg-black hover:text-white active:scale-[0.98] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                  href={btn.href}
                >
                  <div className={`w-20 h-20 shrink-0 rounded-3xl bg-gradient-to-br ${btn.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform border-2 border-black/10`}>
                    <btn.icon size={32} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-[0.2em]">{btn.label}</span>
                    <span className="text-[10px] font-bold text-black/40 group-hover:text-white/60 uppercase tracking-widest mt-2">{btn.desc}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
