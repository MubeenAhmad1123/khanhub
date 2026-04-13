// apps/web/src/app/hq/dashboard/superadmin/audit/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { subscribeUnifiedAuditFeed } from '@/lib/hq/superadmin/audit';
import { CsvExportButton } from '@/components/hq/superadmin/CsvExportButton';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- Icons (Inline SVG) ---
const SettingsIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SearchIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const HistoryIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
  </svg>
);

const ActionIcon = ({ type, size = 10 }: { type: string; size?: number }) => {
  switch (type) {
    case 'created':
    case 'approved':
    case 'login':
      return <div className="p-2 rounded-full bg-black dark:bg-white text-white dark:text-black shadow-sm"><svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg></div>;
    case 'rejected':
      return <div className="p-2 rounded-full bg-gray-200 dark:bg-white/20 text-gray-400 dark:text-gray-500"><svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg></div>;
    default:
      return <div className="p-2 rounded-full border border-gray-100 dark:border-white/10 text-gray-300 dark:text-gray-700"><svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg></div>;
  }
};

const CloseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
);

// --- Helpers ---
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

type DateRange = 'all' | 'today' | '7d' | '30d';

export default function SuperadminAuditPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [actionType, setActionType] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateRange>('all');
  
  // Retention Modal State
  const [showRetention, setShowRetention] = useState(false);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [savingRetention, setSavingRetention] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  // Load Retention Settings
  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    getDoc(doc(db, 'hqSettings', 'auditRetention')).then(snap => {
      if (snap.exists()) {
        setRetentionDays(snap.data().days);
      }
    });
  }, [session]);

  const saveRetention = async (days: number | null) => {
    setSavingRetention(true);
    await setDoc(doc(db, 'hqSettings', 'auditRetention'), { days, updatedAt: new Date() });
    setRetentionDays(days);
    setSavingRetention(false);
    setShowRetention(false);
  };

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    return subscribeUnifiedAuditFeed({
      limitCount: 150, // Higher depth for better filtering
      onData: (r) => {
        setRows(r);
        setLoading(false);
      },
      onError: () => setLoading(false),
    });
  }, [session]);

  // Dynamic Sources from data
  const dynamicSources = useMemo(() => {
    const sSet = new Set<string>();
    rows.forEach(r => sSet.add(r.source));
    return ['all', ...Array.from(sSet).sort()];
  }, [rows]);

  // Action Count Map
  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => {
      counts[r.action] = (counts[r.action] || 0) + 1;
    });
    return counts;
  }, [rows]);

  // Filter Logic
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    return rows.filter((r) => {
      // Portal Filter
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      
      // Action Filter
      if (actionType !== 'all' && r.action !== actionType) return false;
      
      // Date Filter
      if (dateFilter !== 'all') {
        if (dateFilter === 'today' && r.whenMs < todayStart) return false;
        if (dateFilter === '7d' && r.whenMs < now - (7 * 24 * 3600 * 1000)) return false;
        if (dateFilter === '30d' && r.whenMs < now - (30 * 24 * 3600 * 1000)) return false;
      }

      // Query Filter
      if (!s) return true;
      const hay = `${r.source} ${r.action} ${r.readableMessage} ${r.actorName} ${r.entityLabel || ''}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q, sourceFilter, actionType, dateFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    filtered: filtered.length,
    lastActivity: rows[0] ? getRelativeTime(rows[0].whenMs) : 'Never'
  }), [rows, filtered]);

  const csvRows = useMemo(() => filtered.map((r) => ({
    source: r.source,
    action: r.action,
    actorName: r.actorName,
    message: r.readableMessage,
    entityLabel: r.entityLabel || '',
    when: r.whenLabel || '',
  })), [filtered]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Retention Settings Modal */}
      {showRetention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md animate-in zoom-in-95 rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black tracking-tight text-black dark:text-white uppercase">Retention Governance</h2>
              <button onClick={() => setShowRetention(false)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"><CloseIcon /></button>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 font-bold italic">Entries older than your selected period will be automatically purged by the system to maintain peak performance.</p>
            
            <div className="space-y-4">
              {[30, 45, 60, 90, null].map(val => (
                <button
                  key={String(val)}
                  onClick={() => saveRetention(val)}
                  disabled={savingRetention}
                  className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl border transition-all ${
                    retentionDays === val 
                      ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' 
                      : 'border-gray-100 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 hover:border-black dark:hover:border-white active:scale-[0.98]'
                  }`}
                >
                  <span className="font-black text-xs uppercase tracking-widest">{val ? `${val} Days` : 'Never (Infinite)'}</span>
                  {retentionDays === val && <div className="w-2 h-2 rounded-full bg-current" />}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowRetention(false)}
              className="mt-8 w-full py-5 rounded-2xl border border-gray-100 dark:border-white/5 text-gray-400 dark:text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tight text-black dark:text-white uppercase px-2 py-1 border-l-8 border-black dark:border-white">Operation Audit</h1>
            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-black/10 dark:border-white/10 ${retentionDays ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-400'}`}>
              TTL: {retentionDays ? `${retentionDays} days` : 'Permanent'}
            </div>
          </div>
          <p className="mt-2 text-[10px] font-black italic text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-4">Global Governance Feed • Real-time Cross-Departmental Surveillance</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowRetention(true)}
            className="flex items-center gap-3 h-12 px-6 rounded-2xl border border-gray-100 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest text-black dark:border-white/10 dark:bg-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all active:scale-95"
          >
            <SettingsIcon />
            Retention
          </button>
          <CsvExportButton filename="khanhub_audit_export.csv" rows={csvRows} />
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Logs', value: stats.total, color: 'text-black dark:text-white' },
          { label: 'Filtered Result', value: stats.filtered, color: 'text-black dark:text-white' },
          { label: 'Active Sources', value: dynamicSources.length - 1, color: 'text-black dark:text-white' },
          { label: 'Last Pulse', value: stats.lastActivity, color: 'text-gray-400 italic' },
        ].map((s, i) => (
          <div key={i} className="rounded-3xl border border-gray-100 bg-white p-6 dark:border-white/10 dark:bg-black shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Section */}
      <div className="flex flex-col gap-6 p-6 rounded-3xl border border-gray-100 bg-gray-50 dark:bg-white/5 dark:border-white/10">
        <section>
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2 italic">
            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
            Portal Matrix
          </h3>
          <div className="flex flex-wrap gap-2">
            {dynamicSources.map((t) => (
              <button
                key={t}
                onClick={() => setSourceFilter(t)}
                className={`h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm border ${
                  sourceFilter === t
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white transform scale-105 z-10'
                    : 'bg-white border-gray-100 text-gray-400 dark:bg-black dark:border-white/5 dark:text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-8">
          <section>
            <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2 italic">
              <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
              Impact Vector
            </h3>
            <div className="flex flex-wrap gap-2">
              {['all', 'created', 'approved', 'rejected', 'login', 'other'].map((t) => (
                <button
                  key={t}
                  onClick={() => setActionType(t)}
                  className={`h-11 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center border ${
                    actionType === t
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-lg'
                      : 'bg-white border-gray-100 text-gray-400 dark:bg-black dark:border-white/5 dark:text-gray-500 hover:border-black dark:hover:border-white'
                  }`}
                >
                  {t}
                  {t !== 'all' && actionCounts[t] !== undefined && (
                    <span className={`ml-2 px-2 py-0.5 rounded-lg text-[9px] font-black ${actionType === t ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                      {actionCounts[t] || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2 italic">
              <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
              Temporal Boundary
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'All Time', val: 'all' },
                { label: 'Today', val: 'today' },
                { label: '7 Days', val: '7d' },
                { label: '30 Days', val: '30d' },
              ].map((b) => (
                <button
                  key={b.val}
                  onClick={() => setDateFilter(b.val as DateRange)}
                  className={`h-11 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    dateFilter === b.val
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-lg'
                      : 'bg-white border-gray-100 text-gray-400 dark:bg-black dark:border-white/5 dark:text-gray-500 hover:border-black dark:hover:border-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="relative mt-2 group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-black dark:group-focus-within:text-white transition-colors">
            <SearchIcon />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search activity, entity names, or staff ID..."
            className="h-16 w-full rounded-[2rem] border border-gray-100 bg-white pl-16 pr-8 text-sm font-black text-black outline-none transition-all placeholder:text-gray-300 dark:border-white/5 dark:bg-black dark:text-white focus:border-black dark:focus:border-white/40 shadow-sm"
          />
        </div>
      </div>

      {/* Audit List */}
      <div className="mt-8">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-black/10 dark:border-white/10 border-t-black dark:border-t-white rounded-full animate-spin mb-6" />
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.3em]">Syncing global audit stream...</p>
          </div>
        ) : !filtered.length ? (
          <div className="rounded-[2.5rem] border border-dashed border-gray-100 py-32 text-center dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white dark:bg-black text-gray-200 dark:text-gray-800 mb-6 shadow-sm">
              <HistoryIcon size={32} />
            </div>
            <h3 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">Dead Silence</h3>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-black uppercase tracking-widest max-w-xs mx-auto mt-2 italic">Operation sequence empty for selection</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Activity stream</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{filtered.length} visible</span>
            </div>
            {filtered.map((r) => (
              <div
                key={r.id}
                className={`group relative overflow-hidden rounded-[2rem] border border-gray-50 bg-white p-6 shadow-sm transition-all hover:translate-x-1 hover:border-black dark:hover:border-white dark:border-white/[0.02] dark:bg-white/[0.03] border-l-8 ${
                  r.action === 'created' ? 'border-l-black dark:border-l-white opacity-90' :
                  r.action === 'approved' ? 'border-l-black dark:border-l-white' :
                  r.action === 'rejected' ? 'border-l-gray-300 dark:border-l-gray-700' :
                  r.action === 'login' ? 'border-l-black dark:border-l-white opacity-80' :
                  'border-l-gray-100 dark:border-l-white/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <ActionIcon type={r.action} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                      {r.readableMessage}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-black/5 dark:border-white/5 ${
                        r.source === 'hq' ? 'bg-black dark:bg-white text-white dark:text-black' :
                        r.source === 'rehab' ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400' :
                        'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500'
                      }`}>
                        {r.source}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                        {r.action} by <span className="text-gray-700 dark:text-gray-300">{r.actorName}</span>
                      </span>
                      {r.entityLabel && (
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                          • for <span className="text-gray-700 dark:text-gray-300">{r.entityLabel}</span>
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600 pl-2">
                        {r.whenLabel}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div 
                      className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-help transition-colors"
                      title={r.whenLabel}
                    >
                      {getRelativeTime(r.whenMs)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
