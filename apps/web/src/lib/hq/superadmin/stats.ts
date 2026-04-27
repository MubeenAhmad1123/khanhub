// apps/web/src/lib/hq/superadmin/stats.ts

import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCached, setCached } from '@/lib/queryCache';
import { pktStartOfToday, pktEndOfToday } from '@/lib/utils';

export type OverviewStats = {
  rehabPatientsTotal: number;
  spimsStudentsTotal: number;
  jobSeekersTotal: number;
  rehabPatientsToday: number;
  spimsStudentsToday: number;
  pendingApprovals: number;
  txAmountToday: number;
  activeStaffCount: number;
  pendingReconciliations: number;
};

const CACHE_TTL = 600; // 10 minutes for dashboard stats

async function getCountByDocs(q: any, max = 100): Promise<number> {
  try {
    const snap = await getDocs(query(q, limit(max)));
    return snap.size;
  } catch (err) {
    console.error('[Stats] getCountByDocs error:', err);
    return 0;
  }
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const cacheKey = 'hq_superadmin_overview_stats';
  const cached = getCached<OverviewStats>(cacheKey);
  if (cached) return cached;

  const PENDING_LIST = ['pending', 'pending_cashier'];

  // We use getCountFromServer only for TOTALS (which could be large)
  // and getDocs.size for PENDING/TODAY (which should be small/manageable)
  const [
    rehabPatientsTotal,
    spimsStudentsTotal,
    jobSeekersTotal,
    pendingRehab,
    pendingSpims,
    pendingJob,
    pendingRecs,
  ] = await Promise.all([
    getCountFromServer(collection(db, 'rehab_patients')).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(collection(db, 'spims_students')).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(collection(db, 'job_center_seekers')).then((r) => r.data().count).catch(() => 0),
    getCountByDocs(query(collection(db, 'rehab_transactions'), where('status', 'in', PENDING_LIST))),
    getCountByDocs(query(collection(db, 'spims_transactions'), where('status', 'in', PENDING_LIST))),
    getCountByDocs(query(collection(db, 'job_center_transactions'), where('status', 'in', PENDING_LIST))),
    getCountByDocs(query(collection(db, 'hq_reconciliation'), where('status', '==', 'pending'))),
  ]);

  const txToday = await fetchTodayTxAmount();
  const activeStaffCount = await fetchActiveStaffCount();

  const data = {
    rehabPatientsTotal,
    spimsStudentsTotal,
    jobSeekersTotal,
    rehabPatientsToday: rehabPatientsTotal, // Placeholder or simple proxy
    spimsStudentsToday: spimsStudentsTotal,
    pendingApprovals: pendingRehab + pendingSpims + pendingJob,
    txAmountToday: txToday,
    activeStaffCount,
    pendingReconciliations: pendingRecs,
  };

  setCached(cacheKey, data, CACHE_TTL);
  return data;
}

export async function fetchTodayTxAmount(): Promise<number> {
  const cacheKey = 'hq_superadmin_tx_amount_today';
  const cached = getCached<number>(cacheKey);
  if (cached !== undefined && cached !== null) return cached;

  const startOfToday = pktStartOfToday();
  const endOfToday = pktEndOfToday();

  const [rehabSnap, spimsSnap, jobSnap, hqSnap] = await Promise.all([
    getDocs(query(collection(db, 'rehab_transactions'), where('createdAt', '>=', Timestamp.fromDate(startOfToday)), where('createdAt', '<=', Timestamp.fromDate(endOfToday)), limit(300))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'spims_transactions'), where('createdAt', '>=', Timestamp.fromDate(startOfToday)), where('createdAt', '<=', Timestamp.fromDate(endOfToday)), limit(300))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'job_center_transactions'), where('createdAt', '>=', Timestamp.fromDate(startOfToday)), where('createdAt', '<=', Timestamp.fromDate(endOfToday)), limit(300))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'cashierTransactions'), where('createdAt', '>=', Timestamp.fromDate(startOfToday)), where('createdAt', '<=', Timestamp.fromDate(endOfToday)), limit(300))).catch(() => ({ docs: [] })),
  ]);

  const sumSnap = (docs: any[]) =>
    docs.reduce((acc: number, d: any) => {
      const data = d.data();
      if (data.status === 'rejected') return acc;
      return acc + (Number(data.amount) || 0);
    }, 0);

  const total = sumSnap((rehabSnap as any).docs) + sumSnap((spimsSnap as any).docs) + sumSnap((jobSnap as any).docs) + sumSnap((hqSnap as any).docs);
  setCached(cacheKey, total, CACHE_TTL);
  return total;
}

export async function fetchActiveStaffCount(): Promise<number> {
  const cacheKey = 'hq_superadmin_active_staff';
  const cached = getCached<number>(cacheKey);
  if (cached !== undefined && cached !== null) return cached;

  // Use getDocs for staff as the count is usually small (<500)
  const [hq, rehab, spims, job] = await Promise.all([
    getCountByDocs(query(collection(db, 'hq_staff'), where('isActive', '==', true)), 500),
    getCountByDocs(query(collection(db, 'rehab_staff'), where('isActive', '==', true)), 500),
    getCountByDocs(query(collection(db, 'spims_staff'), where('isActive', '==', true)), 500),
    getCountByDocs(query(collection(db, 'job_center_staff'), where('isActive', '==', true)), 500),
  ]);
  const total = hq + rehab + spims + job;
  setCached(cacheKey, total, 1800); // 30 minutes for staff
  return total;
}

