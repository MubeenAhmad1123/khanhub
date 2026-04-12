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
  const [activity, setActivity] = useState<any[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);

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
      limitCount: 15,
      onData: (rows) => {
        setActivity(rows);
      },
    });
  }, [session]);

  function getRelativeTime(timestamp: number) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

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
      {/* Detail Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gray-950 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Activity Details</h3>
                <p className="text-[10px] font-bold text-gray-500">{selectedAudit.id}</p>
              </div>
              <button 
                onClick={() => setSelectedAudit(null)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="mb-6 rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-base font-black text-white leading-tight">
                  {selectedAudit.readableMessage}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    selectedAudit.source === 'hq' ? 'bg-gray-100/10 text-gray-400' :
                    selectedAudit.source === 'rehab' ? 'bg-rose-500/10 text-rose-400' :
                    selectedAudit.source === 'spims' ? 'bg-teal-500/10 text-teal-400' :
                    selectedAudit.source === 'hospital' ? 'bg-blue-500/10 text-blue-400' :
                    selectedAudit.source === 'sukoon' ? 'bg-purple-500/10 text-purple-400' :
                    selectedAudit.source === 'welfare' ? 'bg-amber-500/10 text-amber-400' :
                    selectedAudit.source === 'job_center' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-white/5 text-gray-400'
                  }`}>
                    {selectedAudit.source}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">
                    {selectedAudit.whenLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Technical Metadata</h4>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                    <pre className="text-[11px] font-mono text-gray-300 whitespace-pre-wrap break-all leading-relaxed">
                      {JSON.stringify(selectedAudit._raw, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 bg-white/5 p-4">
              <button 
                onClick={() => setSelectedAudit(null)}
                className="w-full rounded-xl bg-white py-3 text-xs font-black uppercase tracking-widest text-gray-950 transition hover:bg-gray-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">HQ Superadmin</h1>
          <p className="mt-1 text-sm text-gray-400">Everything in one place. Tap a card to drill in.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hq/dashboard/superadmin/approvals"
            className="rounded-xl bg-white px-4 py-2 text-sm font-black text-gray-900 active:scale-[0.99]"
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
        <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white px-2 border-l-4 border-amber-500">Quick actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-grow">
            {[
              { label: 'Manage Users', href: '/hq/dashboard/superadmin/users' },
              { label: 'System Settings', href: '/hq/dashboard/superadmin/settings' },
              { label: 'Departments Hub', href: '/hq/dashboard/superadmin/departments' },
              { label: 'Audit Logs', href: '/hq/dashboard/superadmin/audit' },
            ].map((btn) => (
              <Link 
                key={btn.label}
                className="flex items-center justify-center rounded-2xl border border-white/5 bg-white/5 px-3 py-6 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-95" 
                href={btn.href}
              >
                {btn.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-sm font-black text-white border-l-4 border-indigo-500 pl-2">Recent activity</h2>
            <Link href="/hq/dashboard/superadmin/audit" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
              View All
            </Link>
          </div>
          {!activity.length ? (
            <div className="flex-grow flex items-center justify-center py-10">
              <InlineLoading label="Listening for updates…" />
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
              {activity.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAudit(a)}
                  className={`group relative w-full text-left overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/[0.07] border-l-4 ${
                    a.action === 'created' ? 'border-l-green-500' :
                    a.action === 'approved' ? 'border-l-blue-500' :
                    a.action === 'rejected' ? 'border-l-red-500' :
                    a.action === 'login' ? 'border-l-purple-500' :
                    'border-l-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white leading-tight group-hover:text-amber-400 transition-colors">
                        {a.readableMessage}
                      </p>
                      <div className="mt-2 flex items-center flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          a.source === 'hq' ? 'bg-gray-100/10 text-gray-400' :
                          a.source === 'rehab' ? 'bg-rose-500/10 text-rose-400' :
                          a.source === 'spims' ? 'bg-teal-500/10 text-teal-400' :
                          a.source === 'hospital' ? 'bg-blue-500/10 text-blue-400' :
                          a.source === 'sukoon' ? 'bg-purple-500/10 text-purple-400' :
                          a.source === 'welfare' ? 'bg-amber-500/10 text-amber-400' :
                          a.source === 'job_center' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-white/5 text-gray-400'
                        }`}>
                          {a.source}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">
                          by <span className="text-gray-300">{a.actorName}</span>
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[10px] font-black uppercase text-gray-500">
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
