'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, BadgeCheck, Building2, ClipboardList, CreditCard, Users2 } from 'lucide-react';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { fetchOverviewStats } from '@/lib/hq/superadmin/stats';
import { subscribeUnifiedAuditFeed } from '@/lib/hq/superadmin/audit';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { StatCard } from '@/components/hq/superadmin/StatCard';
import { InlineLoading } from '@/components/hq/superadmin/DataState';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_LABELS: Record<string, string> = {
  hq: 'KhanHub HQ',
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

const ACTION_BADGE_STYLES: Record<string, string> = {
  created:   'bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-tighter',
  registered:'bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-tighter',
  approved:  'bg-black/5 dark:bg-white/5 text-black dark:text-white font-black border border-black dark:border-white',
  login:     'bg-gray-50 dark:bg-gray-900 text-gray-400 font-bold',
  rejected:  'bg-gray-200 dark:bg-gray-800 text-gray-500 line-through font-bold decoration-black dark:decoration-white',
  reset:     'bg-gray-100 dark:bg-white/10 text-gray-400 font-bold',
  updated:   'bg-gray-50 dark:bg-white/5 text-gray-500 font-bold underline decoration-2 underline-offset-4',
  other:     'bg-gray-100/5 text-gray-300',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAction(action: string): string {
  const map: Record<string, string> = {
    created:    'User Created',
    registered: 'User Registered',
    approved:   'Approved',
    rejected:   'Rejected',
    login:      'Login',
    reset:      'Password Reset',
    updated:    'Updated',
    other:      'Action Performed',
  };
  return map[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatTimestamp(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

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

function getRelativeTimeFull(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 1) return `${d} days ago`;
  if (d === 1) return '1 day ago';
  if (h > 1) return `${h} hours ago`;
  if (h === 1) return '1 hour ago';
  if (m > 1) return `${m} minutes ago`;
  if (m === 1) return '1 minute ago';
  return 'Just now';
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  capitalize,
  mono,
  badge,
  actionColor,
  last,
}: {
  label: string;
  value?: string | null;
  capitalize?: boolean;
  mono?: boolean;
  badge?: boolean;
  actionColor?: string;
  last?: boolean;
}) {
  const display = value && value.trim() ? value : '—';
  const badgeStyle = badge && actionColor ? (ACTION_BADGE_STYLES[actionColor] || ACTION_BADGE_STYLES.other) : '';

  return (
    <div className={`flex items-start justify-between gap-4 px-4 py-3 ${!last ? 'border-b border-gray-100 dark:border-white/[0.04]' : ''}`}>
      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 shrink-0 pt-0.5 w-28 italic">{label}</span>
      {badge ? (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border ${badgeStyle}`}>
          {display}
        </span>
      ) : (
        <span className={`text-[13px] font-bold text-black dark:text-white text-right leading-snug ${capitalize ? 'capitalize' : ''} ${mono ? 'font-mono text-[11px] text-gray-500 dark:text-gray-400' : ''}`}>
          {display}
        </span>
      )}
    </div>
  );
}

// Fields to exclude from "More Details" — already shown in structured sections
const KNOWN_FIELDS = new Set([
  'name', 'displayName', 'role', 'type', 'customId', 'userId', 'staffId',
  'patientId', 'clientId', 'action', 'event', 'actorName', 'actorId', 'byName',
  'createdByName', 'message', 'title', 'details', 'summary', 'text',
  'createdAt', 'timestamp', 'time', 'at', 'entityLabel', 'entityName',
  'patientName', 'studentName', 'entityId', 'departmentCode', 'dept',
  'by', 'createdBy', 'userName', 'performedBy'
]);

function MoreDetailsSection({ raw }: { raw: any }) {
  if (!raw || typeof raw !== 'object') return null;

  const extras = Object.entries(raw).filter(([key, val]) => {
    if (KNOWN_FIELDS.has(key)) return false;
    if (val === null || val === undefined || val === '') return false;
    if (typeof val === 'object' && !Array.isArray(val) && 'seconds' in val) return false; // skip Firestore Timestamps
    return true;
  });

  if (extras.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/5 bg-gray-100 dark:bg-white/5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">More Details</p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {extras.map(([key, val], i) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          let display = '';
          if (typeof val === 'boolean') display = val ? 'Yes' : 'No';
          else if (typeof val === 'object') display = JSON.stringify(val);
          else display = String(val);
          return (
            <DetailRow
              key={key}
              label={label}
              value={display}
              last={i === extras.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HqSuperadminPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [stats, setStats] = useState<null | Awaited<ReturnType<typeof fetchOverviewStats>>>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activity, setActivity] = useState<any[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);
  
  // Profile loading state for the detail modal
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileCache = useRef<Record<string, any>>({});

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
    return () => { alive = false; };
  }, [session]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    return subscribeUnifiedAuditFeed({
      limitCount: 15,
      onData: (rows) => { setActivity(rows); },
    });
  }, [session]);

  // Dynamic Full Profile Fetcher
  useEffect(() => {
    if (!selectedAudit) {
      setProfileData(null);
      return;
    }

    const fetchProfile = async () => {
      const details = selectedAudit._raw?.details || {};
      const customId = details.customId || details.userId || selectedAudit._raw?.customId || selectedAudit._raw?.userId || selectedAudit._raw?.staffId || selectedAudit.entityId;
      
      if (!customId) {
        setProfileData('not_found');
        return;
      }

      if (profileCache.current[customId]) {
        setProfileData(profileCache.current[customId]);
        return;
      }

      setProfileLoading(true);
      try {
        const src = (selectedAudit.source || '').replace('-', '_');
        const collectionsToCheck = [
          `${src}_users`,
          `${src}_patients`,
          `${src}_seekers`,
          `${src}_students`,
          `${src}_children`,
          `${src}_clients`,
          `${src}_staff`,
          `${src}_admins`,
          'users',
          'staff',
          'patients',
          'students',
          'accounts'
        ];

        for (const colName of collectionsToCheck) {
          const colRef = collection(db, colName);
          const fieldsToSearch = ['customId', 'uid', 'userId', 'id', 'clientId', 'studentId', 'patientId', 'seekerId', 'staffId'];
          
          for (const field of fieldsToSearch) {
            const q = query(colRef, where(field, '==', customId), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const data = snap.docs[0].data();
              profileCache.current[customId] = data;
              setProfileData(data);
              setProfileLoading(false);
              return;
            }
          }
        }
        
        profileCache.current[customId] = 'not_found';
        setProfileData('not_found');
      } catch (err) {
        console.error("Profile fetch error:", err);
        setProfileData('not_found');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [selectedAudit]);

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

      {/* ── Activity Detail Modal ─────────────────────────────────────────── */}
      {selectedAudit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedAudit(null); }}
        >
          <div className="w-full max-w-[480px] overflow-hidden rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-in zoom-in-95">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">Activity Details</h3>
              <button
                onClick={() => setSelectedAudit(null)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[75vh] overflow-y-auto divide-y divide-gray-100 dark:divide-white/[0.04] custom-scrollbar">

              {/* Section 1 — Summary */}
              <div className="p-5">
                <p className="text-[15px] font-black text-black dark:text-white leading-snug">
                  {selectedAudit.readableMessage}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${SOURCE_BADGE_STYLES[selectedAudit.source] || 'bg-white/5 text-gray-400'}`}>
                    {DEPT_LABELS[selectedAudit.source] || selectedAudit.source}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400">{selectedAudit.whenLabel}</span>
                </div>
              </div>

              {/* Section 2 — User Details */}
              <div>
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 italic">User Details</p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                  <DetailRow label="Full Name"   value={selectedAudit._raw?.details?.displayName || selectedAudit._raw?.details?.name || selectedAudit._raw?.name || selectedAudit._raw?.displayName || selectedAudit.entityLabel} />
                  <DetailRow label="Role"        value={selectedAudit._raw?.details?.role || selectedAudit._raw?.details?.type || selectedAudit._raw?.role || selectedAudit._raw?.type} capitalize />
                  <DetailRow label="Custom ID"   value={selectedAudit._raw?.details?.customId || selectedAudit._raw?.details?.userId || selectedAudit._raw?.customId || selectedAudit._raw?.userId || selectedAudit._raw?.staffId || selectedAudit._raw?.patientId || selectedAudit._raw?.clientId} mono />
                  <DetailRow label="Department"  value={DEPT_LABELS[selectedAudit.source] || selectedAudit.source} last />
                </div>
              </div>

              {/* Section 3 — Action Info */}
              <div>
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 italic">Action Info</p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                  <DetailRow label="Action Type"   value={formatAction(selectedAudit.action)} badge actionColor={selectedAudit.action} />
                  <DetailRow label="Performed By"  value={!selectedAudit.actorName || selectedAudit.actorName === 'System' || selectedAudit.actorName === 'server_action' ? 'System (Automated)' : selectedAudit.actorName} />
                  <DetailRow label="Timestamp"     value={formatTimestamp(selectedAudit.whenMs)} />
                  <DetailRow label="Time Ago"      value={getRelativeTimeFull(selectedAudit.whenMs)} last />
                </div>
              </div>

              {/* Section 4 — More Details (auto-rendered extra fields) */}
              <div className="p-5 space-y-3">
                <MoreDetailsSection raw={selectedAudit._raw?.details || selectedAudit._raw} />
              </div>

              {/* Section 5 — Full Profile (Dynamic) */}
              <div className="p-5">
                <div className="rounded-2xl border border-indigo-500/10 dark:border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-indigo-500/10 bg-indigo-500/5 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Full Profile Record</p>
                    {profileLoading && <span className="w-3 h-3 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin"></span>}
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                    {profileLoading && (
                      <div className="px-4 py-6 text-center text-xs font-semibold text-gray-500 tracking-wider uppercase">Searching database...</div>
                    )}
                    {!profileLoading && profileData === 'not_found' && (
                      <div className="px-4 py-6 text-center text-[11px] font-bold text-gray-500">No additional profile data found for this user.</div>
                    )}
                    {!profileLoading && profileData && profileData !== 'not_found' && Object.entries(profileData)
                      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([key, val], i, arr) => {
                        const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                        let display = '';
                        if (typeof val === 'boolean') display = val ? 'Yes' : 'No';
                        else if (val && typeof val === 'object' && !Array.isArray(val) && 'seconds' in val) display = formatTimestamp((val as any).seconds * 1000);
                        else if (val && typeof val === 'object') display = JSON.stringify(val);
                        else display = String(val);

                        return (
                          <DetailRow
                            key={key}
                            label={label}
                            value={display}
                            last={i === arr.length - 1}
                          />
                        );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-white/5 bg-white/5 p-4">
              <button
                onClick={() => setSelectedAudit(null)}
                className="w-full rounded-xl bg-white/10 py-3 text-xs font-black uppercase tracking-widest text-gray-300 transition hover:bg-white/20 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
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
            <Link href="/hq/dashboard/superadmin/audit" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              View All
            </Link>
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
