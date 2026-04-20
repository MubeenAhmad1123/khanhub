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

export type OverviewStats = {
  /** Total registered rehab patients (all time) */
  rehabPatientsTotal: number;
  /** Total enrolled SPIMS students (all time) */
  spimsStudentsTotal: number;
  /** Total job center seekers (all time) */
  jobSeekersTotal: number;
  /** Legacy alias kept for backward compat — same as rehabPatientsTotal */
  rehabPatientsToday: number;
  /** Legacy alias kept for backward compat — same as spimsStudentsTotal */
  spimsStudentsToday: number;
  pendingApprovals: number;
  txAmountToday: number;
  activeStaffCount: number;
  pendingReconciliations: number;
};

/** PKT day key: YYYY-MM-DD in Asia/Karachi timezone */
function pktDayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Start of today in PKT as a UTC Date (for Firestore Timestamp comparison) */
function pktStartOfToday(): Date {
  const now = new Date();
  // Format: YYYY-MM-DDT00:00:00 in PKT = YYYY-MM-DDT00:00:00+05:00
  const pktStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  // midnight PKT in UTC
  return new Date(`${pktStr}T00:00:00+05:00`);
}

/** End of today in PKT as a UTC Date */
function pktEndOfToday(): Date {
  const start = pktStartOfToday();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

let cachedStats: { data: OverviewStats; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 1 minute

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const now = Date.now();
  if (cachedStats && now - cachedStats.timestamp < CACHE_TTL) {
    return cachedStats.data;
  }

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
    // Total counts — no date filter so they always show real numbers
    getCountFromServer(query(collection(db, 'rehab_patients')))
      .then((r) => r.data().count)
      .catch(() => 0),
    getCountFromServer(query(collection(db, 'spims_students')))
      .then((r) => r.data().count)
      .catch(() => 0),
    getCountFromServer(query(collection(db, 'job_center_seekers')))
      .then((r) => r.data().count)
      .catch(() => 0),
    // Pending approvals
    getCountFromServer(query(collection(db, 'rehab_transactions'), where('status', 'in', PENDING_LIST)))
      .then((r) => r.data().count)
      .catch(() => 0),
    getCountFromServer(query(collection(db, 'spims_transactions'), where('status', 'in', PENDING_LIST)))
      .then((r) => r.data().count)
      .catch(() => 0),
    getCountFromServer(query(collection(db, 'job_center_transactions'), where('status', 'in', PENDING_LIST)))
      .then((r) => r.data().count)
      .catch(() => 0),
    getCountFromServer(query(collection(db, 'hq_reconciliation'), where('status', '==', 'pending')))
      .then((r) => r.data().count)
      .catch(() => 0),
  ]);

  const txToday = await fetchTodayTxAmount();
  const activeStaffCount = await fetchActiveStaffCount();

  const data = {
    rehabPatientsTotal,
    spimsStudentsTotal,
    jobSeekersTotal,
    // Legacy aliases for backward compat
    rehabPatientsToday: rehabPatientsTotal,
    spimsStudentsToday: spimsStudentsTotal,
    pendingApprovals: pendingRehab + pendingSpims + pendingJob,
    txAmountToday: txToday,
    activeStaffCount,
    pendingReconciliations: pendingRecs,
  };

  cachedStats = { data, timestamp: now };
  return data;
}

export async function fetchTodayTxAmount(): Promise<number> {
  const todayKey = pktDayKey(new Date());

  /** Extract a JS Date from a Firestore document's date field */
  function resolveDate(data: Record<string, any>): Date | null {
    const raw =
      data.transactionDate ??
      data.date ??
      data.createdAt ??
      null;
    if (!raw) return null;
    if (raw instanceof Timestamp) return raw.toDate();
    if (raw?.toDate) return raw.toDate();
    if (typeof raw === 'string') return new Date(raw);
    if (raw instanceof Date) return raw;
    return null;
  }

  const [rehabSnap, spimsSnap, jobSnap, hqSnap] = await Promise.all([
    getDocs(query(collection(db, 'rehab_transactions'), orderBy('createdAt', 'desc'), limit(300))).catch(
      (): { docs: any[] } => ({ docs: [] })
    ),
    getDocs(query(collection(db, 'spims_transactions'), orderBy('createdAt', 'desc'), limit(300))).catch(
      (): { docs: any[] } => ({ docs: [] })
    ),
    getDocs(query(collection(db, 'job_center_transactions'), orderBy('createdAt', 'desc'), limit(300))).catch(
      (): { docs: any[] } => ({ docs: [] })
    ),
    getDocs(query(collection(db, 'cashierTransactions'), orderBy('createdAt', 'desc'), limit(300))).catch(
      (): { docs: any[] } => ({ docs: [] })
    ),
  ]);

  const sumSnap = (docs: any[]) =>
    docs.reduce((acc: number, d: any) => {
      const data = d.data();
      if (data.status === 'rejected') return acc;
      const date = resolveDate(data);
      if (!date || pktDayKey(date) !== todayKey) return acc;
      return acc + (Number(data.amount) || 0);
    }, 0);

  return (
    sumSnap(rehabSnap.docs) +
    sumSnap(spimsSnap.docs) +
    sumSnap(jobSnap.docs) +
    sumSnap(hqSnap.docs)
  );
}

export async function fetchActiveStaffCount(): Promise<number> {
  const [hq, rehab, spims, job] = await Promise.all([
    getCountFromServer(query(collection(db, 'hq_staff'), where('isActive', '==', true)))
      .then((r) => r.data().count)
      .catch(() => 0),
    getCountFromServer(query(collection(db, 'rehab_staff'), where('isActive', '==', true)))
      .then((r) => r.data().count)
      .catch(() => 0),
    getCountFromServer(query(collection(db, 'spims_staff'), where('isActive', '==', true)))
      .then((r) => r.data().count)
      .catch(() => 0),
    getCountFromServer(query(collection(db, 'job_center_staff'), where('isActive', '==', true)))
      .then((r) => r.data().count)
      .catch(() => 0),
  ]);
  return hq + rehab + spims + job;
}
