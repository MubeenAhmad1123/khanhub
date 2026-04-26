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

const CACHE_TTL = 120; // 2 minutes for dashboard stats

function pktDayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function pktStartOfToday(): Date {
  const now = new Date();
  const pktStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${pktStr}T00:00:00+05:00`);
}

function pktEndOfToday(): Date {
  const start = pktStartOfToday();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const cacheKey = 'hq_superadmin_overview_stats';
  const cached = getCached<OverviewStats>(cacheKey);
  if (cached) return cached;

  const PENDING_LIST = ['pending', 'pending_cashier'];

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
    getCountFromServer(query(collection(db, 'rehab_transactions'), where('status', 'in', PENDING_LIST))).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(query(collection(db, 'spims_transactions'), where('status', 'in', PENDING_LIST))).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(query(collection(db, 'job_center_transactions'), where('status', 'in', PENDING_LIST))).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(query(collection(db, 'hq_reconciliation'), where('status', '==', 'pending'))).then((r) => r.data().count).catch(() => 0),
  ]);

  const txToday = await fetchTodayTxAmount();
  const activeStaffCount = await fetchActiveStaffCount();

  const data = {
    rehabPatientsTotal,
    spimsStudentsTotal,
    jobSeekersTotal,
    rehabPatientsToday: rehabPatientsTotal,
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


  const todayKey = pktDayKey(new Date());
  const startOfToday = pktStartOfToday();
  const endOfToday = pktEndOfToday();

  const [rehabSnap, spimsSnap, jobSnap, hqSnap] = await Promise.all([
    getDocs(query(collection(db, 'rehab_transactions'), where('createdAt', '>=', Timestamp.fromDate(startOfToday)), where('createdAt', '<=', Timestamp.fromDate(endOfToday)), limit(500))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'spims_transactions'), where('createdAt', '>=', Timestamp.fromDate(startOfToday)), where('createdAt', '<=', Timestamp.fromDate(endOfToday)), limit(500))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'job_center_transactions'), where('createdAt', '>=', Timestamp.fromDate(startOfToday)), where('createdAt', '<=', Timestamp.fromDate(endOfToday)), limit(500))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'cashierTransactions'), where('createdAt', '>=', Timestamp.fromDate(startOfToday)), where('createdAt', '<=', Timestamp.fromDate(endOfToday)), limit(500))).catch(() => ({ docs: [] })),
  ]);

  const sumSnap = (docs: any[]) =>
    docs.reduce((acc: number, d: any) => {
      const data = d.data();
      if (data.status === 'rejected') return acc;
      return acc + (Number(data.amount) || 0);
    }, 0);

  const total = sumSnap(rehabSnap.docs) + sumSnap(spimsSnap.docs) + sumSnap(jobSnap.docs) + sumSnap(hqSnap.docs);
  setCached(cacheKey, total, CACHE_TTL);
  return total;
}

export async function fetchActiveStaffCount(): Promise<number> {
  const cacheKey = 'hq_superadmin_active_staff';
  const cached = getCached<number>(cacheKey);
  if (cached !== undefined && cached !== null) return cached;


  const [hq, rehab, spims, job] = await Promise.all([
    getCountFromServer(query(collection(db, 'hq_staff'), where('isActive', '==', true))).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(query(collection(db, 'rehab_staff'), where('isActive', '==', true))).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(query(collection(db, 'spims_staff'), where('isActive', '==', true))).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(query(collection(db, 'job_center_staff'), where('isActive', '==', true))).then((r) => r.data().count).catch(() => 0),
  ]);
  const total = hq + rehab + spims + job;
  setCached(cacheKey, total, 300); // Staff count can be cached longer (5 mins)
  return total;
}

