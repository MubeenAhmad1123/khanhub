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
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen bg-[#FCFBF8] py-12 transition-colors duration-500">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-gray-200 border border-gray-100 group overflow-hidden relative transition-all duration-700 hover:scale-105 hover:rotate-3">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Building2 className="text-indigo-600 relative z-10" size={36} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tight text-gray-900 uppercase leading-none">Governance</h1>
                <p className="mt-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.5em]">
                  Operational Matrix • Institutional Hub
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/hq/dashboard/superadmin/approvals"
              className="px-10 py-5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl shadow-xl shadow-indigo-600/30 hover:scale-105 hover:shadow-indigo-600/40 active:scale-95 transition-all flex items-center gap-3"
            >
              <BadgeCheck size={18} />
              Review Approvals
            </Link>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-16">
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
        <div className="space-y-12">
          <div className="relative rounded-[4rem] bg-white p-12 shadow-2xl shadow-gray-200/60 border border-gray-100 overflow-hidden group transition-all duration-700">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-48 -mt-48 blur-3xl opacity-50" />
            
            <div className="relative flex flex-col md:flex-row items-center justify-between mb-16 gap-6">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <ShieldCheck size={40} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Institutional Control</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-2">System Config • Global Synchronization</p>
                </div>
              </div>
              <div className="flex items-center gap-4 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                Live Sync Active
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: 'Personnel',   href: '/hq/dashboard/superadmin/staff',       icon: Users2, tone: 'rehab', desc: 'Staff registry & compliance' },
                { label: 'Analytics',   href: '/hq/dashboard/superadmin/analytics',   icon: Activity, tone: 'spims', desc: 'Real-time data matrix' },
                { label: 'Departments', href: '/hq/dashboard/superadmin/departments', icon: Building2, tone: 'hq', desc: 'Institutional structure' },
                { label: 'Finance',     href: '/hq/dashboard/superadmin/finance',     icon: CreditCard, tone: 'primary', desc: 'Global financial ledger' },
              ].map((btn) => {
                const colors = {
                  rehab: 'from-emerald-400 to-teal-500 text-white shadow-emerald-500/30',
                  spims: 'from-sky-400 to-blue-500 text-white shadow-sky-500/30',
                  hq: 'from-violet-400 to-purple-500 text-white shadow-violet-500/30',
                  primary: 'from-rose-400 to-pink-500 text-white shadow-rose-500/30'
                };
                return (
                  <Link
                    key={btn.label}
                    className="group relative flex flex-col items-center text-center gap-8 rounded-[3.5rem] bg-gray-50/50 p-10 transition-all duration-700 hover:bg-white hover:shadow-2xl hover:shadow-gray-200/60 hover:-translate-y-3 border border-transparent hover:border-gray-100"
                    href={btn.href}
                  >
                    <div className={cn("w-24 h-24 rounded-[2.5rem] bg-gradient-to-br flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700", colors[btn.tone as keyof typeof colors])}>
                      <btn.icon size={40} strokeWidth={2} />
                    </div>
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-900">{btn.label}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest max-w-[140px] leading-relaxed group-hover:text-gray-500 transition-colors">{btn.desc}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
