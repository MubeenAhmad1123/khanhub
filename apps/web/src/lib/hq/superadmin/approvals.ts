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
  customFrom?: string; // yyyy-mm-dd
  customTo?: string;   // yyyy-mm-dd
  amountBucket: AmountBucket;
  sort: SortOrder;
  proof: ProofFilter;
  entityQuery: string;
};

export type ApprovalsTab = 'pending' | 'approved_today' | 'rejected_today' | 'history';

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
    return bTime - aTime;
  };
}

function normalizeTx(dept: 'rehab' | 'spims', id: string, data: any): UnifiedTx {
  return {
    id,
    dept,
    status: String(data.status || ''),
    createdAt: data.createdAt,
    date: data.date,
    transactionDate: data.transactionDate,
    amount: Number(data.amount) || 0,
    type: data.type,
    category: data.category,
    categoryName: data.categoryName,
    proofUrl: data.proofUrl ?? null,
    proofRequired: data.proofRequired,
    description: data.description,
    patientId: data.patientId,
    patientName: data.patientName,
    studentId: data.studentId || data.patientId,
    studentName: data.studentName || data.patientName,
    staffId: data.staffId,
    staffName: data.staffName,
    cashierId: data.cashierId,
    cashierName: data.cashierName,
    feePaymentId: data.feePaymentId,
    processedBy: data.processedBy,
    processedAt: data.processedAt,
    rejectedReason: data.rejectedReason,
  };
}

function pickRange(filters: ApprovalsFilters): { from: Date; to: Date } {
  if (filters.datePreset !== 'custom') return getPresetRange(filters.datePreset);
  const from = filters.customFrom ? new Date(filters.customFrom) : new Date();
  const to = filters.customTo ? new Date(filters.customTo) : new Date();
  return { from, to };
}

export function subscribeApprovalsFeed({
  tab,
  filters,
  onData,
  onError,
}: {
  tab: ApprovalsTab;
  filters: ApprovalsFilters;
  onData: (rows: UnifiedTx[]) => void;
  onError?: (err: unknown) => void;
}) {
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

    const filtered = all
      .filter((tx) => amtOk(Number(tx.amount || 0)))
      .filter(proofOk)
      .filter(entityOk)
      .sort(sortComparator(filters.sort));

    onData(filtered);
  };

  const wantsDept = (dept: 'rehab' | 'spims') => filters.dept === 'all' || filters.dept === dept;

  (['rehab', 'spims'] as const).forEach((dept) => {
    if (!wantsDept(dept)) return;

    const col = dept === 'rehab' ? 'rehab_transactions' : 'spims_transactions';

    // Base query: time window + ordering.
    // We rely on `createdAt` descending (your requested indexes include status+createdAt).
    // If any collection uses `date` instead, we’ll switch consistently during QA.
    let qBase: any = query(
      collection(db, col),
      where('createdAt', '>=', from),
      where('createdAt', '<=', to),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    if (tab === 'pending') qBase = query(qBase, where('status', 'in', ['pending', 'pending_cashier']));
    if (tab === 'approved_today') qBase = query(qBase, where('status', '==', 'approved'));
    if (tab === 'rejected_today') qBase = query(qBase, where('status', 'in', ['rejected', 'rejected_cashier']));
    if (tab === 'history') {
      // all history: broader, but still time bounded by filters.
    }

    const u = onSnapshot(
      qBase,
      (snap: QuerySnapshot<DocumentData>) => {
        buffers[dept] = snap.docs.map((d) => normalizeTx(dept, d.id, d.data()));
        apply();
      },
      (err: unknown) => onError?.(err)
    );
    unsub.push(u);
  });

  return () => unsub.forEach((u) => u());
}

export async function searchEntitiesByNamePrefix({
  dept,
  namePrefix,
}: {
  dept: 'rehab' | 'spims';
  namePrefix: string;
}): Promise<Array<{ id: string; name: string }>> {
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
  return snap.docs.map((d) => ({ id: d.id, name: String((d.data() as any)?.name || '—') }));
}

