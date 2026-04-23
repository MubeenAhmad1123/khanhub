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

// Tab-specific time filters (shown in the dropdown on each tab)
export type TabTimePreset =
  | 'all'        // all pending / all time
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_year';

export type TabTimeFilters = {
  pending: TabTimePreset;
  approved_today: TabTimePreset;
  rejected_today: TabTimePreset;
  history: TabTimePreset;
};

export const DEFAULT_TAB_TIME_FILTERS: TabTimeFilters = {
  pending: 'all',
  approved_today: 'all',
  rejected_today: 'all',
  history: 'all',
};

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
  dept: 'rehab' | 'spims' | 'job-center';
  name: string;
};

const ALL_DEPTS: DeptFilter[] = ['rehab', 'spims', 'job-center', 'hospital', 'sukoon-center', 'welfare'];

const DEPT_TX_MAP: Record<string, string> = {
  rehab: 'rehab_transactions',
  spims: 'spims_transactions',
  'job-center': 'job_center_transactions',
  hospital: 'hospital_transactions',
  'sukoon-center': 'sukoon_transactions',
  welfare: 'welfare_transactions'
};

function normalizeTx(dept: DeptFilter, id: string, data: Record<string, unknown>): UnifiedTx {
  const patientId = data.patientId != null ? String(data.patientId) : undefined;
  const studentId = data.studentId != null ? String(data.studentId) : undefined;
  const seekerId = data.seekerId != null ? String(data.seekerId) : undefined;
  const donorId = data.donorId != null ? String(data.donorId) : undefined;
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
    patientName: (data.patientName || data.fullName || data.name) as string | undefined,
    studentId,
    studentName: (data.studentName || data.fullName || data.name) as string | undefined,
    seekerId,
    seekerName: (data.seekerName || data.fullName || data.name) as string | undefined,
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

export const PENDING_STATUSES = ['pending'];
export const REJECT_STATUSES = ['rejected'];

function getAmountBucketPredicate(bucket: AmountBucket) {
  return (tx: UnifiedTx) => {
    if (bucket === 'all') return true;
    const a = tx.amount || 0;
    if (bucket === 'under_1000') return a >= 0 && a <= 1000;
    if (bucket === '1000_5000') return a > 1000 && a <= 5000;
    if (bucket === '5000_20000') return a > 5000 && a <= 20000;
    if (bucket === 'over_20000') return a > 20000;
    return true;
  };
}

function sortComparator(order: SortOrder) {
  return (a: UnifiedTx, b: UnifiedTx) => {
    const tA = toDate(a.createdAt || a.date || a.transactionDate).getTime();
    const tB = toDate(b.createdAt || b.date || b.transactionDate).getTime();
    if (order === 'newest') return tB - tA;
    if (order === 'oldest') return tA - tB;
    if (order === 'highest') return (b.amount || 0) - (a.amount || 0);
    if (order === 'lowest') return (a.amount || 0) - (b.amount || 0);
    return 0;
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

/** Returns today 00:00:00 .. 23:59:59 in PKT (UTC+5) as UTC Date objects */
function todayRangePKT(): { start: Date; end: Date } {
  const now = new Date();
  // Shift to PKT (+5h)
  const pktMs = now.getTime() + 5 * 60 * 60 * 1000;
  const pktDate = new Date(pktMs);
  const y = pktDate.getUTCFullYear();
  const m = pktDate.getUTCMonth();
  const d = pktDate.getUTCDate();
  // Start of PKT day expressed as UTC
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0) - 5 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);
  return { start, end };
}

function getTabTimeRange(preset: TabTimePreset): { from: Date; to: Date } {
  const now = new Date();
  if (preset === 'all') {
    return { from: new Date(0), to: new Date(32503680000000) };
  }
  if (preset === 'today') {
    const { start, end } = todayRangePKT();
    return { from: start, to: end };
  }
  if (preset === 'this_week') {
    // Current week starting Monday
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { from: monday, to: sunday };
  }
  if (preset === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from: firstDay, to: lastDay };
  }
  if (preset === 'this_year') {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { from: firstDay, to: lastDay };
  }
  return { from: new Date(0), to: new Date(32503680000000) };
}

function isApprovedToday(tx: UnifiedTx): boolean {
  const { start, end } = todayRangePKT();
  // prefer approvedAt / processedAt, fallback to updatedAt, createdAt
  const raw = tx.approvedAt || tx.processedAt || tx.createdAt || tx.date || tx.transactionDate;
  const t = toDate(raw);
  return t >= start && t <= end;
}

function isRejectedToday(tx: UnifiedTx): boolean {
  const { start, end } = todayRangePKT();
  const raw = tx.rejectedAt || tx.processedAt || tx.createdAt || tx.date || tx.transactionDate;
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
        limit(50)
      ),
    ];
  }
  if (tab === 'approved_today') {
    return [
      query(
        collection(db, col),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
    ];
  }
  if (tab === 'rejected_today') {
    return [
      query(
        collection(db, col),
        where('status', 'in', [...REJECT_STATUSES]),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
    ];
  }
  // history — broad pull; filters applied client-side
  return [query(collection(db, col), orderBy('createdAt', 'desc'), limit(100))];
}

function tabFilterClient(
  tab: ApprovalsTab,
  tabTimePreset: TabTimePreset,
  tx: UnifiedTx
): boolean {
  if (tab === 'approved_today') {
    if (tabTimePreset === 'all' || tabTimePreset === 'today') return isApprovedToday(tx);
    const { from, to } = getTabTimeRange(tabTimePreset);
    const raw = tx.approvedAt || tx.processedAt || tx.createdAt || tx.date || tx.transactionDate;
    const t = toDate(raw);
    return t >= from && t <= to;
  }
  if (tab === 'rejected_today') {
    if (tabTimePreset === 'all' || tabTimePreset === 'today') return isRejectedToday(tx);
    const { from, to } = getTabTimeRange(tabTimePreset);
    const raw = tx.rejectedAt || tx.processedAt || tx.createdAt || tx.date || tx.transactionDate;
    const t = toDate(raw);
    return t >= from && t <= to;
  }
  return true;
}

/**
 * Main feed: real-time merged transactions across all enabled departments.
 */
export function subscribeApprovalsFeed(
  filters: ApprovalsFilters,
  tab: ApprovalsTab,
  onData: (rows: UnifiedTx[]) => void,
  onError?: (err: unknown) => void,
  tabTimePreset: TabTimePreset = 'all'
) {
  const unsub: Array<() => void> = [];
  const buffers: Record<string, UnifiedTx[]> = {};
  ALL_DEPTS.forEach(d => buffers[d] = []);

  const { from, to } = pickRange(filters);

  const apply = () => {
    let all: UnifiedTx[] = [];
    ALL_DEPTS.forEach(d => {
      if (buffers[d]) all = all.concat(buffers[d]);
    });

    const amtOk = getAmountBucketPredicate(filters.amountBucket);
    const proofOk = (tx: UnifiedTx) => {
      if (filters.proof === 'all') return true;
      const has = !!tx.proofUrl;
      return filters.proof === 'has_proof' ? has : !has;
    };
    const entityQ = filters.entityQuery.trim().toLowerCase();
    const entityOk = (tx: UnifiedTx) => {
      if (!entityQ) return true;
      const name = String(tx.patientName || tx.studentName || tx.seekerName || tx.staffName || '').toLowerCase();
      return name.includes(entityQ);
    };

    const txTypeOk = (tx: UnifiedTx) => {
      const types = filters.txTypes || [];
      if (types.length === 0 || types.includes('All')) return true;
      const mapped = mapTxToTypeOption(tx);
      return types.includes(mapped);
    };

    const dateOk = (tx: UnifiedTx) => {
      if (tab === 'pending') {
        if (filters.datePreset === 'all') return true;
        return inDateRange(tx, from, to);
      }
      if (tab === 'approved_today' || tab === 'rejected_today') {
        return tabFilterClient(tab, tabTimePreset, tx);
      }
      if (tabTimePreset !== 'all') {
        const ttr = getTabTimeRange(tabTimePreset);
        return inDateRange(tx, ttr.from, ttr.to);
      }
      return inDateRange(tx, from, to);
    };

    const filtered = all
      .filter((tx) => dateOk(tx))
      .filter(amtOk)
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

  const wantsDept = (dept: DeptFilter) => filters.dept === 'all' || filters.dept === dept;

  ALL_DEPTS.forEach((dept) => {
    if (!wantsDept(dept)) {
      buffers[dept] = [];
      apply();
      return;
    }

    const col = DEPT_TX_MAP[dept];
    if (!col) return;

    const queries = buildQueriesForTab(tab, col);

    queries.forEach((q) => {
      const u = onSnapshot(
        q,
        (snap: QuerySnapshot<DocumentData>) => {
          const chunk = snap.docs.map((d) => normalizeTx(dept, d.id, d.data() as Record<string, unknown>));
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

/** All transactions for one entity (both statuses). */
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
  const buffers: Record<string, UnifiedTx[]> = {};

  const bump = () => {
    const map = new Map<string, UnifiedTx>();
    Object.values(buffers).forEach(list => {
      list.forEach(tx => map.set(`${tx.dept}_${tx.id}`, tx));
    });
    onData(Array.from(map.values()).sort(sortComparator('newest')));
  };

  const attach = (
    dept: DeptFilter,
    field: string,
    id: string
  ) => {
    const col = DEPT_TX_MAP[dept];
    if (!col) return;

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
        buffers[`${dept}_${field}`] = chunk;
        bump();
      },
      (e) => onError?.(e)
    );
    unsub.push(u);
  };

  if (entity.dept === 'rehab') {
    attach('rehab', 'patientId', entity.id);
  } else if (entity.dept === 'spims') {
    attach('spims', 'studentId', entity.id);
    attach('spims', 'patientId', entity.id);
  } else if (entity.dept === 'job-center') {
    attach('job-center', 'seekerId', entity.id);
  } else if (DEPT_TX_MAP[entity.dept]) {
    // Generic fallback for hospital, welfare, sukoon
    attach(entity.dept, 'patientId', entity.id);
    attach(entity.dept, 'donorId', entity.id);
    attach(entity.dept, 'entityId', entity.id);
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
  const counts: Record<string, number> = {};
  const push = () => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    onCount(total);
  };

  const unsubs = ALL_DEPTS.map(dept => {
    const col = DEPT_TX_MAP[dept];
    if (!col) return () => {};
    
    const q = query(
      collection(db, col),
      where('status', 'in', [...PENDING_STATUSES]),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(
      q,
      (snap) => {
        counts[dept] = snap.size;
        push();
      },
      (e) => onError?.(e)
    );
  });

  return () => unsubs.forEach(u => u());
}

export async function searchEntitiesByNamePrefix({
  dept,
  namePrefix,
}: {
  dept: 'rehab' | 'spims' | 'job-center';
  namePrefix: string;
}): Promise<Array<{ id: string; name: string; dept: 'rehab' | 'spims' | 'job-center' }>> {
  const p = namePrefix.trim();
  if (!p) return [];
  const col = dept === 'rehab' ? 'rehab_patients' : dept === 'spims' ? 'spims_students' : 'job_center_seekers';
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
  deptFilter: 'all' | DeptFilter
): Promise<Array<{ id: string; name: string; dept: 'rehab' | 'spims' | 'job-center' }>> {
  const parts: Promise<{ id: string; name: string; dept: 'rehab' | 'spims' | 'job-center' }[]>[] = [];
  if (deptFilter === 'all' || deptFilter === 'rehab') parts.push(searchEntitiesByNamePrefix({ dept: 'rehab', namePrefix: prefix }));
  if (deptFilter === 'all' || deptFilter === 'spims') parts.push(searchEntitiesByNamePrefix({ dept: 'spims', namePrefix: prefix }));
  if (deptFilter === 'all' || deptFilter === 'job-center') parts.push(searchEntitiesByNamePrefix({ dept: 'job-center', namePrefix: prefix }));
  
  // We can add search for hospital/welfare etc later if those entity collections follow name prefixing
  const rows = (await Promise.all(parts)).flat() as any[];
  return rows.slice(0, 16);
}
