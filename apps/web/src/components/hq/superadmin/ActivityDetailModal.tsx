'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { resolveProfilePath } from '@/lib/hq/superadmin/navigation';
import { cn } from '@/lib/utils';
import { 
  ArrowRight, 
  ExternalLink, 
  Info, 
  User, 
  Activity, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  Search,
  AlertCircle
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
};

const ACTION_COLOR_MAP: Record<string, string> = {
  created:   'text-emerald-500',
  approved:  'text-blue-500',
  rejected:  'text-rose-500',
  deleted:   'text-rose-600',
  updated:   'text-amber-500',
  login:     'text-indigo-500',
};

function formatTimestamp(ms: number) {
  if (!ms) return 'N/A';
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getRelativeTimeFull(ms: number) {
  if (!ms) return 'N/A';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function DetailRow({ label, value, mono, capitalize, last, badge, actionColor }: { 
  label: string; 
  value: any; 
  mono?: boolean; 
  capitalize?: boolean; 
  last?: boolean;
  badge?: boolean;
  actionColor?: string;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between px-5 py-3.5",
      !last && "border-b border-gray-100 dark:border-white/[0.04]"
    )}>
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic shrink-0">{label}</span>
      <span className={cn(
        "text-[11px] font-bold tracking-tight text-right break-all ml-4",
        mono ? "font-mono" : "font-sans",
        capitalize ? "capitalize" : "",
        badge ? "px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10" : "text-black dark:text-gray-300",
        actionColor && ACTION_COLOR_MAP[actionColor]
      )}>
        {value || '—'}
      </span>
    </div>
  );
}

const KNOWN_FIELDS = new Set([
  'id', 'userId', 'customId', 'staffId', 'patientId', 'seekerId', 'studentId', 
  'displayName', 'name', 'role', 'type', 'action', 'source', 'whenMs', 'actorUid', 
  'actorName', 'targetUid', 'readableMessage', 'whenLabel', 'entityLabel',
  'patientName', 'studentName', 'entityId', 'departmentCode', 'dept',
  'by', 'createdBy', 'userName', 'performedBy'
]);

function MoreDetailsSection({ raw }: { raw: any }) {
  if (!raw || typeof raw !== 'object') return null;

  const extras = Object.entries(raw).filter(([key, val]) => {
    if (KNOWN_FIELDS.has(key)) return false;
    if (val === null || val === undefined || val === '') return false;
    if (typeof val === 'object' && !Array.isArray(val) && 'seconds' in val) return false; 
    return true;
  });

  if (extras.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] overflow-hidden mt-4">
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/5 bg-gray-100 dark:bg-white/5 flex items-center gap-2">
        <Info className="w-3 h-3 text-gray-400" />
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Operation Payload</p>
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

// ─── Main Modal Component ─────────────────────────────────────────────────────

interface ActivityDetailModalProps {
  audit: any;
  onClose: () => void;
}

export function ActivityDetailModal({ audit, onClose }: ActivityDetailModalProps) {
  const router = useRouter();
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileCache = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!audit) return;

    const fetchProfile = async () => {
      const details = audit._raw?.details || {};
      const customId = details.customId || details.userId || audit._raw?.customId || audit._raw?.userId || audit._raw?.staffId || audit.entityId;
      
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
        const src = (audit.source || '').replace('-', '_');
        const collectionsToCheck = [
          `${src}_users`, `${src}_patients`, `${src}_seekers`, 
          `${src}_students`, `${src}_children`, `${src}_clients`, 
          `${src}_staff`, `${src}_admins`, 'users', 'staff', 
          'patients', 'students', 'accounts'
        ];

        for (const colName of collectionsToCheck) {
          try {
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
          } catch (e) { /* skip collection if it doesn't exist or no perms */ }
        }
        
        profileCache.current[customId] = 'not_found';
        setProfileData('not_found');
      } catch (err) {
        setProfileData('not_found');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [audit]);

  if (!audit) return null;

  const handleVisitProfile = () => {
    const details = audit._raw?.details || {};
    const customId = details.customId || details.userId || audit._raw?.customId || audit._raw?.userId || audit._raw?.staffId || audit.entityId;
    const role = details.role || details.type || audit._raw?.role || audit._raw?.type || 'user';
    const path = resolveProfilePath(audit.source, role, customId);
    router.push(path);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[520px] max-h-[90vh] overflow-hidden rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-[#050505] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black dark:text-white">Activity Intelligence</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 italic">Internal Surveillance Record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2.5 text-gray-400 transition-all hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white active:scale-90"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* Action Hero */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", ACTION_COLOR_MAP[audit.action] || 'bg-gray-400')} />
              <p className={cn("text-[10px] font-black uppercase tracking-[0.3em] italic", ACTION_COLOR_MAP[audit.action] || 'text-gray-400')}>{audit.action}</p>
            </div>
            <h2 className="text-2xl font-black text-black dark:text-white leading-tight tracking-tight italic uppercase">
              {audit.readableMessage}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={cn(
                "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-black/5 dark:border-white/5",
                SOURCE_BADGE_STYLES[audit.source] || 'bg-gray-100 dark:bg-white/5 text-gray-500'
              )}>
                {DEPT_LABELS[audit.source] || audit.source}
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-[10px] font-bold text-gray-400 italic">
                <Clock className="w-3 h-3" />
                {audit.whenLabel}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* User Details */}
            <section>
              <div className="flex items-center gap-2 mb-3 px-1">
                <User className="w-3 h-3 text-gray-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Origin Entity</p>
              </div>
              <div className="rounded-[2rem] border border-gray-100 dark:border-white/5 bg-white dark:bg-black/40 overflow-hidden divide-y divide-gray-100 dark:divide-white/[0.04]">
                <DetailRow label="Subject Identity" value={audit._raw?.details?.displayName || audit._raw?.details?.name || audit._raw?.name || audit._raw?.displayName || audit.entityLabel} />
                <DetailRow label="Designated Role" value={audit._raw?.details?.role || audit._raw?.details?.type || audit._raw?.role || audit._raw?.type} capitalize />
                <DetailRow label="Credential ID" value={audit._raw?.details?.customId || audit._raw?.details?.userId || audit._raw?.customId || audit._raw?.userId || audit._raw?.staffId || audit.entityId} mono />
              </div>
            </section>

            {/* Event Metrics */}
            <section>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Activity className="w-3 h-3 text-gray-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Execution context</p>
              </div>
              <div className="rounded-[2rem] border border-gray-100 dark:border-white/5 bg-white dark:bg-black/40 overflow-hidden divide-y divide-gray-100 dark:divide-white/[0.04]">
                <DetailRow label="Actor"    value={!audit.actorName || audit.actorName === 'System' || audit.actorName === 'server_action' ? 'Automated System' : audit.actorName} />
                <DetailRow label="Timeline" value={formatTimestamp(audit.whenMs)} />
                <DetailRow label="Latency"  value={getRelativeTimeFull(audit.whenMs)} last />
              </div>
            </section>

            {/* Extra Payload */}
            <MoreDetailsSection raw={audit._raw?.details || audit._raw} />

            {/* Dynamic Profile Sync */}
            <section className="pt-2">
              <div className="rounded-[2.5rem] border border-indigo-500/10 dark:border-indigo-500/20 bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03] overflow-hidden group">
                <div className="px-6 py-4 border-b border-indigo-500/10 bg-indigo-500/[0.05] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-3 h-3 text-indigo-500" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Database Synchronization</p>
                  </div>
                  {profileLoading && <span className="w-3 h-3 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></span>}
                </div>
                
                <div className="p-2">
                  <div className="rounded-[1.8rem] bg-white dark:bg-black/60 divide-y divide-gray-50 dark:divide-white/[0.04] transition-all">
                    {profileLoading ? (
                      <div className="px-6 py-12 text-center">
                        <div className="flex justify-center gap-1 mb-3">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                          ))}
                        </div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Deep-scanning cloud matrix...</p>
                      </div>
                    ) : profileData === 'not_found' ? (
                      <div className="px-6 py-10 text-center">
                        <AlertCircle className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No secondary profile fragments detected in the data layer</p>
                      </div>
                    ) : profileData ? (
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(profileData)
                            .filter(([k, v]) => !KNOWN_FIELDS.has(k) && v !== undefined && v !== null && v !== '')
                            .slice(0, 10) // show only top 10
                            .map(([key, val]) => {
                              const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                              let display = '';
                              if (typeof val === 'boolean') display = val ? 'True' : 'False';
                              else if (val && typeof val === 'object' && 'seconds' in val) display = formatTimestamp((val as any).seconds * 1000);
                              else display = String(val);
                              
                              return (
                                <div key={key} className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent hover:border-indigo-500/10 transition-colors">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
                                  <p className="text-[10px] font-bold text-black dark:text-white truncate">{display}</p>
                                </div>
                              );
                            })
                          }
                        </div>
                        
                        {/* Summary link if profile is complex */}
                        <div className="mt-4 px-2">
                          <p className="text-[9px] font-bold text-gray-500 italic uppercase tracking-widest opacity-50">Profile fully synchronized. Ready for navigation.</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-8 flex items-center gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-6 h-14 rounded-2xl border border-gray-100 dark:border-white/10 text-gray-400 dark:text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-white/5 transition-all active:scale-95"
          >
            Acknowledge
          </button>
          <button 
            onClick={handleVisitProfile}
            className="flex-[1.5] px-6 h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl hover:shadow-black/20 dark:hover:shadow-white/20"
          >
            Visit Full Profile
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
