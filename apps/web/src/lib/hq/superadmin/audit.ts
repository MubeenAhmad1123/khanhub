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

function normalizeAudit(source: 'hq' | 'rehab' | 'spims', id: string, data: any): UnifiedAuditEntry {
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

  const rawActor = data.actorName || data.userName || data.byName || data.createdByName || data.name || '—';
  const actorName = typeof rawActor === 'object' ? (rawActor.name || rawActor.displayName || JSON.stringify(rawActor)) : String(rawActor);
  
  const rawMsg = data.message || data.title || data.details || data.summary || data.text || data.action || 'Activity';
  const message = typeof rawMsg === 'object' ? (rawMsg.text || rawMsg.label || JSON.stringify(rawMsg)) : String(rawMsg);

  const rawEntity = data.entityLabel || data.entityName || data.patientName || data.studentName || data.staffName;
  const entityLabel = typeof rawEntity === 'object' ? (rawEntity.name || rawEntity.label || JSON.stringify(rawEntity)) : (rawEntity ? String(rawEntity) : undefined);

  return {
    id: `${source}_${id}`,
    source,
    createdAt,
    actorName,
    actorId: data.actorId || data.userId || data.by || data.createdBy,
    action,
    message,
    entityLabel,
    entityId: data.entityId || data.patientId || data.studentId || data.staffId,
    dept: (data.departmentCode || data.dept || source) as any,
  };
}

export function subscribeUnifiedAuditFeed({
  limitCount = 20,
  onData,
  onError,
}: {
  limitCount?: number;
  onData: (entries: (UnifiedAuditEntry & { whenLabel: string; whenMs: number })[]) => void;
  onError?: (err: unknown) => void;
}) {
  const unsubscribers: Array<() => void> = [];
  const buffers: Record<'hq' | 'rehab' | 'spims', UnifiedAuditEntry[]> = { hq: [], rehab: [], spims: [] };

  const push = () => {
    const merged = ([] as UnifiedAuditEntry[]).concat(buffers.hq, buffers.rehab, buffers.spims);
    const decorated = merged
      .map((e) => {
        const d = toDate(e.createdAt);
        const ms = d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
        return { ...e, whenLabel: formatDateDMY(d), whenMs: ms };
      })
      .sort((a, b) => b.whenMs - a.whenMs)
      .slice(0, limitCount);
    onData(decorated);
  };

  (['hq', 'rehab', 'spims'] as const).forEach((source) => {
    const col = source === 'hq' ? 'hq_audit' : source === 'rehab' ? 'rehab_audit' : 'spims_audit';
    const q = query(collection(db, col), orderBy('createdAt', 'desc'), limit(limitCount));
    const unsub = onSnapshot(
      q,
      (snap) => {
        buffers[source] = snap.docs.map((d) => normalizeAudit(source, d.id, d.data()));
        push();
      },
      (err) => onError?.(err)
    );
    unsubscribers.push(unsub);
  });

  return () => unsubscribers.forEach((u) => u());
}

