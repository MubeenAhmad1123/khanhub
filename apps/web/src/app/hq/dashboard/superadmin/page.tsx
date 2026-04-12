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
  hq:          'bg-gray-100/10 text-gray-400',
  rehab:       'bg-rose-500/10 text-rose-400',
  spims:       'bg-teal-500/10 text-teal-400',
  hospital:    'bg-blue-500/10 text-blue-400',
  sukoon:      'bg-purple-500/10 text-purple-400',
  welfare:     'bg-amber-500/10 text-amber-400',
  job_center:  'bg-orange-500/10 text-orange-400',
  'job-center':'bg-orange-500/10 text-orange-400',
};

const ACTION_BADGE_STYLES: Record<string, string> = {
  created:   'bg-green-500/15 text-green-400',
  registered:'bg-green-500/15 text-green-400',
  approved:  'bg-blue-500/15 text-blue-400',
  login:     'bg-purple-500/15 text-purple-400',
  rejected:  'bg-red-500/15 text-red-400',
  reset:     'bg-amber-500/15 text-amber-400',
  updated:   'bg-sky-500/15 text-sky-400',
  other:     'bg-gray-500/15 text-gray-400',
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
    <div className={`flex items-start justify-between gap-4 px-4 py-3 ${!last ? 'border-b border-white/[0.04]' : ''}`}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 shrink-0 pt-0.5 w-28">{label}</span>
      {badge ? (
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wide ${badgeStyle}`}>
          {display}
        </span>
      ) : (
        <span className={`text-[13px] font-semibold text-gray-100 text-right leading-snug ${capitalize ? 'capitalize' : ''} ${mono ? 'font-mono text-[11px] text-gray-300' : ''}`}>
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
    <div className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/5 bg-white/5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">More Details</p>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedAudit(null); }}
        >
          <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/10 bg-gray-950 shadow-2xl animate-in zoom-in-95">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Activity Details</h3>
              <button
                onClick={() => setSelectedAudit(null)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[75vh] overflow-y-auto divide-y divide-white/[0.04] custom-scrollbar">

              {/* Section 1 — Summary */}
              <div className="p-5">
                <p className="text-[15px] font-black text-white leading-snug">
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
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">User Details</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  <DetailRow label="Full Name"   value={selectedAudit._raw?.details?.displayName || selectedAudit._raw?.details?.name || selectedAudit._raw?.name || selectedAudit._raw?.displayName || selectedAudit.entityLabel} />
                  <DetailRow label="Role"        value={selectedAudit._raw?.details?.role || selectedAudit._raw?.details?.type || selectedAudit._raw?.role || selectedAudit._raw?.type} capitalize />
                  <DetailRow label="Custom ID"   value={selectedAudit._raw?.details?.customId || selectedAudit._raw?.details?.userId || selectedAudit._raw?.customId || selectedAudit._raw?.userId || selectedAudit._raw?.staffId || selectedAudit._raw?.patientId || selectedAudit._raw?.clientId} mono />
                  <DetailRow label="Department"  value={DEPT_LABELS[selectedAudit.source] || selectedAudit.source} last />
                </div>
              </div>

              {/* Section 3 — Action Info */}
              <div>
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Action Info</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
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
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-indigo-500/10 bg-indigo-500/10 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-400">Full Profile Record</p>
                    {profileLoading && <span className="w-3 h-3 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin"></span>}
                  </div>
                  <div className="divide-y divide-white/[0.04]">
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
                        else if (typeof val === 'object' && !Array.isArray(val) && 'seconds' in val) display = formatTimestamp((val as any).seconds * 1000);
                        else if (typeof val === 'object') display = JSON.stringify(val);
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
        <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white px-2 border-l-4 border-amber-500">Quick actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-grow">
            {[
              { label: 'Manage Users',    href: '/hq/dashboard/superadmin/users' },
              { label: 'System Settings', href: '/hq/dashboard/superadmin/settings' },
              { label: 'Departments Hub', href: '/hq/dashboard/superadmin/departments' },
              { label: 'Audit Logs',      href: '/hq/dashboard/superadmin/audit' },
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

        {/* Recent Activity */}
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
                    a.action === 'created'    ? 'border-l-green-500' :
                    a.action === 'approved'   ? 'border-l-blue-500'  :
                    a.action === 'rejected'   ? 'border-l-red-500'   :
                    a.action === 'login'      ? 'border-l-purple-500':
                    'border-l-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white leading-tight group-hover:text-amber-400 transition-colors">
                        {a.readableMessage}
                      </p>
                      <div className="mt-2 flex items-center flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${SOURCE_BADGE_STYLES[a.source] || 'bg-white/5 text-gray-400'}`}>
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
