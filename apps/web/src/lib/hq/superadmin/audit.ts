// apps/web/src/lib/hq/superadmin/audit.ts
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UnifiedAuditEntry } from './types';
import { toDate, formatDateDMY } from '@/lib/utils';

/**
 * Parses raw JSON audit messages into human-readable sentences.
 * Logic:
 * 1. Checks if message is valid JSON
 * 2. Uses action + fields (name, role, customId) to build a string
 */
export function parseAuditMessage(entry: Partial<UnifiedAuditEntry>): string {
  const msg = entry.message || '';
  if (!msg.trim().startsWith('{')) return msg;

  try {
    const p = JSON.parse(msg);
    const action = (entry.action || '').toLowerCase();
    const name = p.name || p.displayName || entry.entityLabel || '';
    const role = p.role || p.type || '';
    const customId = p.customId || p.userId || p.id || '';

    if (action === 'created') {
      return `User ${name || 'Member'}${role ? ` (${role})` : ''} was created${customId ? ` [${customId}]` : ''}`;
    }
    if (action === 'login') {
      return `User ${name || 'Member'} logged in successfully`;
    }
    if (action === 'approved') {
      return `Transaction for ${name || 'someone'} was approved`;
    }
    if (action === 'rejected') {
      return `Transaction for ${name || 'someone'} was rejected`;
    }
    if (action === 'registered') {
      return `Superadmin ${name || 'Member'}${customId ? ` (${customId})` : ''} was registered`;
    }
    
    // Fallback formatting
    if (name) {
      return `${name}${role ? ` (${role})` : ''} performed action: ${action}`;
    }
    
    return msg; // Fallback to raw if no name extracted
  } catch {
    return msg;
  }
}

function normalizeAudit(source: string, id: string, data: any): UnifiedAuditEntry {
  const createdAt = data.createdAt ?? data.timestamp ?? data.time ?? data.at;
  
  const rawAction = data.action || data.type || data.event || '';
  const actionStr = typeof rawAction === 'object' ? (rawAction.label || JSON.stringify(rawAction)) : String(rawAction);
  const actionRaw = actionStr.toLowerCase();
  
  const action =
    actionRaw.includes('approve') ? 'approved'
    : actionRaw.includes('reject') ? 'rejected'
    : actionRaw.includes('reset') ? 'reset'
    : actionRaw.includes('login') ? 'login'
    : actionRaw.includes('create') ? 'created'
    : actionRaw.includes('update') ? 'updated'
    : 'other';

  // Fix Problem 2: Missing actor name -> "System"
  const rawActor = data.actorName || data.userName || data.byName || data.createdByName || data.name || 'System';
  const actorName = typeof rawActor === 'object' 
    ? (rawActor.name || rawActor.displayName || JSON.stringify(rawActor)) 
    : (String(rawActor) === '—' || !rawActor ? 'System' : String(rawActor));
  
  const rawMsg = data.message || data.title || data.details || data.summary || data.text || data.action || 'Activity';
  const message = typeof rawMsg === 'object' ? (rawMsg.text || rawMsg.label || JSON.stringify(rawMsg)) : String(rawMsg);

  const rawEntity = data.entityLabel || data.entityName || data.patientName || data.studentName || data.staffName;
  const entityLabel = typeof rawEntity === 'object' ? (rawEntity.name || rawEntity.label || JSON.stringify(rawEntity)) : (rawEntity ? String(rawEntity) : undefined);

  return {
    id: `${source}_${id}`,
    source: source as any,
    createdAt,
    actorName,
    actorId: data.actorId || data.userId || data.by || data.createdBy,
    action: action as any,
    message,
    entityLabel,
    entityId: data.entityId || data.patientId || data.studentId || data.staffId,
    dept: (data.departmentCode || data.dept || source) as any,
  };
}

// Full audit sources list including existing and potential future departments
const DEFAULT_SOURCES = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'];

export function subscribeUnifiedAuditFeed({
  limitCount = 50,
  sources = DEFAULT_SOURCES,
  onData,
  onError,
}: {
  limitCount?: number;
  sources?: string[];
  onData: (entries: (UnifiedAuditEntry & { whenLabel: string; whenMs: number; readableMessage: string })[]) => void;
  onError?: (err: unknown) => void;
}) {
  const unsubscribers: Array<() => void> = [];
  const buffers: Record<string, UnifiedAuditEntry[]> = {};
  
  // Initialize buffers
  sources.forEach(s => buffers[s] = []);

  const push = () => {
    const merged = Object.values(buffers).flat();
    const decorated = merged
      .map((e) => {
        const d = toDate(e.createdAt);
        const ms = d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
        return { 
          ...e, 
          whenLabel: formatDateDMY(d), 
          whenMs: ms,
          readableMessage: parseAuditMessage(e) 
        };
      })
      .sort((a, b) => b.whenMs - a.whenMs)
      .slice(0, limitCount * sources.length); // Allow enough depth for merging
    
    // Finally slice to limitCount to show requested total
    onData(decorated.slice(0, limitCount));
  };

  sources.forEach((source) => {
    const col = source === 'hq' ? 'hq_audit' : `${source}_audit`;
    const q = query(collection(db, col), orderBy('createdAt', 'desc'), limit(limitCount));
    
    const unsub = onSnapshot(
      q,
      (snap) => {
        buffers[source] = snap.docs.map((d) => normalizeAudit(source, d.id, d.data()));
        push();
      },
      (err) => {
        console.error(`Audit Feed Error [${source}]:`, err);
        onError?.(err);
      }
    );
    unsubscribers.push(unsub);
  });

  return () => unsubscribers.forEach((u) => u());
}
