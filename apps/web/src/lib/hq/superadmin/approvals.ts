// apps/web/src/lib/hq/superadmin/approvals.ts

import {
  collection,
  endAt,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAt,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AmountBucket, DeptFilter, ProofFilter, SortOrder, UnifiedTx } from './types';
import { toDate } from '@/lib/utils';
import { getPresetRange, type DateRangePreset } from './time';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';

export type ApprovalsFilters = {
  dept: DeptFilter;
  datePreset: DateRangePreset;
  customFrom?: string;
  customTo?: string;
  amountBucket: AmountBucket;
  sort: SortOrder;
  proof: ProofFilter;
  entityQuery: string;
  txTypes?: string[];
  cashierName?: string;
};

export type ApprovalsTab = 'pending' | 'approved_today' | 'rejected_today' | 'history';

export type EntityPick = {
  id: string;
  dept: 'rehab' | 'spims';
  name: string;
};

const PENDING_STATUSES = ['pending', 'pending_cashier'] as const;
const REJECT_STATUSES = ['rejected', 'rejected_cashier'] as const;

function getAmountBucketPredicate(bucket: AmountBucket) {
  return (amt: number) => {
    if (bucket === 'all') return true;
    if (bucket === 'under_1000') return amt < 1000;
    if (bucket === '1000_5000') return amt >= 1000 && amt <= 5000;
    if (bucket === '5000_20000') return amt > 5000 && amt <= 20000;
    return amt > 20000;
  };
}

function sortComparator(sort: SortOrder) {
  return (a: UnifiedTx, b: UnifiedTx) => {
    const aAmt = Number(a.amount || 0);
    const bAmt = Number(b.amount || 0);
    const aTime = toDate(a.createdAt || a.date || a.transactionDate).getTime();
    const bTime = toDate(b.createdAt || b.date || b.transactionDate).getTime();
    if (sort === 'highest') return bAmt - aAmt;
    if (sort === 'lowest') return aAmt - bAmt;
    if (sort === 'oldest') return aTime - bTime;
    return bTime - aTime; // 'newest' or 'all'
  };
}

function normalizeTx(dept: 'rehab' | 'spims', id: string, data: Record<string, unknown>): UnifiedTx {
  const patientId = data.patientId != null ? String(data.patientId) : undefined;
  const studentId = data.studentId != null ? String(data.studentId) : undefined;
  const rejectionReason =
    (data.rejectionReason as string | undefined) || (data.rejectedReason as string | undefined);
  return {
    id,
    dept,
    status: String(data.status || ''),
    createdAt: data.createdAt,
    date: data.date,
    transactionDate: data.transactionDate,
    amount: Number(data.amount) || 0,
    type: data.type as string | undefined,
    category: data.category as string | undefined,
    categoryName: data.categoryName as string | undefined,
    feePaymentType: data.feePaymentType as string | undefined,
    proofUrl: (data.proofUrl as string | null | undefined) ?? null,
    proofRequired: data.proofRequired as boolean | undefined,
    proofMissingReason: data.proofMissingReason as string | undefined,
    description: data.description as string | undefined,
    patientId,
    patientName: data.patientName as string | undefined,
    studentId,
    studentName: data.studentName as string | undefined,
    staffId: data.staffId as string | undefined,
    staffName: data.staffName as string | undefined,
    cashierId: data.cashierId as string | undefined,
    cashierName: data.cashierName as string | undefined,
    cashierRole: data.cashierRole as string | undefined,
    createdByName: data.createdByName as string | undefined,
    departmentName: data.departmentName as string | undefined,
    forwardedFromLabel: data.forwardedFromLabel as string | undefined,
    feePaymentId: data.feePaymentId as string | undefined,
    processedBy: data.processedBy as string | undefined,
    processedAt: data.processedAt,
    approvedAt: data.approvedAt,
    rejectedAt: data.rejectedAt,
    rejectedReason: rejectionReason,
    rejectionReason,
  };
}

export function typeLabel(tx: UnifiedTx): string {
  const raw = String(tx.categoryName || tx.category || tx.type || 'Transaction');
  if (raw.toLowerCase().includes('fee') || raw.toLowerCase().includes('month')) return 'Monthly Fee';
  return raw;
}

export function mapTxToTypeOption(tx: UnifiedTx): string {
  const t = typeLabel(tx).toLowerCase();
  if (t.includes('month') || t.includes('fee')) return 'Monthly Fee';
  if (t.includes('admission')) return 'Admission';
  if (t.includes('registration')) return 'Registration';
  if (t.includes('exam')) return 'Examination';
  return 'Other';
}

function pickRange(filters: ApprovalsFilters): { from: Date; to: Date } {
  if (filters.datePreset !== 'custom') return getPresetRange(filters.datePreset);
  const from = filters.customFrom ? new Date(filters.customFrom) : new Date();
  const to = filters.customTo ? new Date(filters.customTo) : new Date();
  return { from, to };
}

function inDateRange(tx: UnifiedTx, from: Date, to: Date) {
  const raw = tx.createdAt || tx.date || tx.transactionDate;
  const t = toDate(raw);
  return t >= from && t <= to;
}

function isTodayPakistan(tx: UnifiedTx, kind: 'processed' | 'created') {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let raw: unknown;
  if (kind === 'processed') {
    raw =
      tx.processedAt ||
      tx.approvedAt ||
      tx.rejectedAt ||
      tx.createdAt ||
      tx.date ||
      tx.transactionDate;
  } else {
    raw = tx.createdAt || tx.date || tx.transactionDate;
  }
  const t = toDate(raw);
  return t >= start && t <= end;
}

function buildQueriesForTab(tab: ApprovalsTab, col: string) {
  if (tab === 'pending') {
    return [
      query(
        collection(db, col),
        where('status', 'in', [...PENDING_STATUSES]),
        orderBy('createdAt', 'desc'),
        limit(500)
      ),
    ];
  }
  if (tab === 'approved_today') {
    return [
      query(
        collection(db, col),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(400)
      ),
    ];
  }
  if (tab === 'rejected_today') {
    return [
      query(
        collection(db, col),
        where('status', 'in', [...REJECT_STATUSES]),
        orderBy('createdAt', 'desc'),
        limit(400)
      ),
    ];
  }
  // history — broad pull; filters applied client-side
  return [query(collection(db, col), orderBy('createdAt', 'desc'), limit(800))];
}

function tabFilterClient(tab: ApprovalsTab, tx: UnifiedTx): boolean {
  if (tab === 'approved_today') return isTodayPakistan(tx, 'processed');
  if (tab === 'rejected_today') return isTodayPakistan(tx, 'processed');
  return true;
}

/**
 * Main feed: real-time merged rehab + spims transactions.
 * Server-side: status (+ orderBy) only; everything else is client-side.
 */
export function subscribeApprovalsFeed(
  filters: ApprovalsFilters,
  tab: ApprovalsTab,
  onData: (rows: UnifiedTx[]) => void,
  onError?: (err: unknown) => void
) {
  const unsub: Array<() => void> = [];
  const buffers: Record<'rehab' | 'spims', UnifiedTx[]> = { rehab: [], spims: [] };

  const { from, to } = pickRange(filters);

  const apply = () => {
    const all = ([] as UnifiedTx[]).concat(buffers.rehab, buffers.spims);

    const amtOk = getAmountBucketPredicate(filters.amountBucket);
    const proofOk = (tx: UnifiedTx) => {
      if (filters.proof === 'all') return true;
      const has = !!tx.proofUrl;
      return filters.proof === 'has_proof' ? has : !has;
    };
    const entityQ = filters.entityQuery.trim().toLowerCase();
    const entityOk = (tx: UnifiedTx) => {
      if (!entityQ) return true;
      const name = String(tx.patientName || tx.studentName || tx.staffName || '').toLowerCase();
      return name.includes(entityQ);
    };

    const txTypeOk = (tx: UnifiedTx) => {
      const types = filters.txTypes || [];
      if (types.length === 0 || types.includes('All')) return true;
      const mapped = mapTxToTypeOption(tx);
      return types.includes(mapped);
    };

    const dateOk = (tx: UnifiedTx) => {
      if (tab === 'pending') return inDateRange(tx, from, to);
      if (tab === 'approved_today' || tab === 'rejected_today') return tabFilterClient(tab, tx);
      // history — respect date preset
      return inDateRange(tx, from, to);
    };

    const filtered = all
      .filter((tx) => dateOk(tx))
      .filter((tx) => amtOk(Number(tx.amount || 0)))
      .filter(proofOk)
      .filter(entityOk)
      .filter(txTypeOk)
      .filter((tx) => {
        if (!filters.cashierName || filters.cashierName === 'all') return true;
        return (tx.cashierName || '') === filters.cashierName;
      })
      .sort(sortComparator(filters.sort));

    onData(filtered);
  };

  const wantsDept = (dept: 'rehab' | 'spims') => filters.dept === 'all' || filters.dept === dept;

  (['rehab', 'spims'] as const).forEach((dept) => {
    if (!wantsDept(dept)) {
      buffers[dept] = [];
      apply();
      return;
    }

    const col = dept === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
    const queries = buildQueriesForTab(tab, col);

    queries.forEach((q) => {
      const u = onSnapshot(
        q,
        (snap: QuerySnapshot<DocumentData>) => {
          const chunk = snap.docs.map((d) => normalizeTx(dept, d.id, d.data() as Record<string, unknown>));
          // Merge: replace dept slice from this query result is wrong if multiple queries.
          // We only ever attach one listener per dept per tab (single query).
          buffers[dept] = chunk;
          apply();
        },
        (err: unknown) => onError?.(err)
      );
      unsub.push(u);
    });
  });

  return () => unsub.forEach((u) => u());
}

/** All transactions for one entity (both statuses). Merges patientId + studentId listeners for SPIMS. */
export function subscribeEntityTransactions({
  entity,
  onData,
  onError,
}: {
  entity: EntityPick;
  onData: (rows: UnifiedTx[]) => void;
  onError?: (err: unknown) => void;
}) {
  const unsub: Array<() => void> = [];
  /** SPIMS may subscribe twice (patientId + studentId); merge latest snapshot per listener */
  const buffers: { rehab: UnifiedTx[]; spimsA: UnifiedTx[]; spimsB: UnifiedTx[] } = {
    rehab: [],
    spimsA: [],
    spimsB: [],
  };

  const bump = () => {
    const map = new Map<string, UnifiedTx>();
    buffers.rehab.forEach((tx) => map.set(`r_${tx.id}`, tx));
    buffers.spimsA.forEach((tx) => map.set(`s_${tx.id}`, tx));
    buffers.spimsB.forEach((tx) => map.set(`s_${tx.id}`, tx));
    onData(Array.from(map.values()).sort(sortComparator('newest')));
  };

  const attach = (
    slot: 'rehab' | 'spimsA' | 'spimsB',
    dept: 'rehab' | 'spims',
    field: 'patientId' | 'studentId',
    id: string
  ) => {
    const col = dept === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
    const q = query(
      collection(db, col),
      where(field, '==', id),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const u = onSnapshot(
      q,
      (snap) => {
        const chunk = snap.docs.map((d) => normalizeTx(dept, d.id, d.data() as Record<string, unknown>));
        buffers[slot] = chunk;
        bump();
      },
      (e) => onError?.(e)
    );
    unsub.push(u);
  };

  if (entity.dept === 'rehab') {
    attach('rehab', 'rehab', 'patientId', entity.id);
  } else {
    attach('spimsA', 'spims', 'patientId', entity.id);
    attach('spimsB', 'spims', 'studentId', entity.id);
  }

  return () => unsub.forEach((x) => x());
}

export function subscribePendingApprovalsCount({
  onCount,
  onError,
}: {
  onCount: (n: number) => void;
  onError?: (err: unknown) => void;
}) {
  let r = 0;
  let s = 0;
  const push = () => onCount(r + s);

  const qR = query(
    collection(db, 'rehab_transactions'),
    where('status', 'in', [...PENDING_STATUSES]),
    orderBy('createdAt', 'desc'),
    limit(500)
  );
  const qS = query(
    collection(db, 'spims_transactions'),
    where('status', 'in', [...PENDING_STATUSES]),
    orderBy('createdAt', 'desc'),
    limit(500)
  );

  const u1 = onSnapshot(
    qR,
    (snap) => {
      r = snap.size;
      push();
    },
    (e) => onError?.(e)
  );
  const u2 = onSnapshot(
    qS,
    (snap) => {
      s = snap.size;
      push();
    },
    (e) => onError?.(e)
  );

  return () => {
    u1();
    u2();
  };
}

export async function searchEntitiesByNamePrefix({
  dept,
  namePrefix,
}: {
  dept: 'rehab' | 'spims';
  namePrefix: string;
}): Promise<Array<{ id: string; name: string; dept: 'rehab' | 'spims' }>> {
  const p = namePrefix.trim();
  if (!p) return [];
  const col = dept === 'rehab' ? 'rehab_patients' : 'spims_students';
  const field = 'name';
  const q = query(
    collection(db, col),
    orderBy(field),
    startAt(p),
    endAt(p + '\uf8ff'),
    limit(12)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    name: String((d.data() as Record<string, unknown>)?.name || '—'),
    dept,
  }));
}

export async function searchEntitiesCombined(
  prefix: string,
  deptFilter: 'all' | 'rehab' | 'spims'
): Promise<Array<{ id: string; name: string; dept: 'rehab' | 'spims' }>> {
  const parts: Promise<{ id: string; name: string; dept: 'rehab' | 'spims' }[]>[] = [];
  if (deptFilter === 'all' || deptFilter === 'rehab') parts.push(searchEntitiesByNamePrefix({ dept: 'rehab', namePrefix: prefix }));
  if (deptFilter === 'all' || deptFilter === 'spims') parts.push(searchEntitiesByNamePrefix({ dept: 'spims', namePrefix: prefix }));
  const rows = (await Promise.all(parts)).flat();
  return rows.slice(0, 16);
}
