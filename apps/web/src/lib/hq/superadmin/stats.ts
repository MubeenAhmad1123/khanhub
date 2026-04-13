// apps/web/src/lib/hq/superadmin/stats.ts

import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { endOfDay, startOfDay } from './time';

export type OverviewStats = {
  rehabPatientsToday: number;
  spimsStudentsToday: number;
  pendingApprovals: number;
  txAmountToday: number;
  activeStaffCount: number;
  pendingReconciliations: number;
};

function isoDayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const today = new Date();
  const from = startOfDay(today);
  const to = endOfDay(today);

  // Patients/students “today” is interpreted as created today when timestamps exist.
  // If your schema differs, we can adjust to admissionDate/enrollmentDate.
  const rehabPatientsQ = query(
    collection(db, 'rehab_patients'),
    where('createdAt', '>=', from),
    where('createdAt', '<=', to)
  );
  const spimsStudentsQ = query(
    collection(db, 'spims_students'),
    where('createdAt', '>=', from),
    where('createdAt', '<=', to)
  );
  const jobCenterSeekersQ = query(
    collection(db, 'job_center_seekers'),
    where('createdAt', '>=', from),
    where('createdAt', '<=', to)
  );

  const PENDING_LIST = ['pending', 'pending_cashier'];

  const pendingRehabTxQ = query(
    collection(db, 'rehab_transactions'),
    where('status', 'in', PENDING_LIST)
  );
  const pendingSpimsTxQ = query(
    collection(db, 'spims_transactions'),
    where('status', 'in', PENDING_LIST)
  );
  const pendingJobTxQ = query(
    collection(db, 'job_center_transactions'),
    where('status', 'in', PENDING_LIST)
  );

  const pendingRecsQ = query(collection(db, 'hq_reconciliation'), where('status', '==', 'pending'));

  const [
    rehabPatientsCount,
    spimsStudentsCount,
    jobCenterSeekersCount,
    pendingRehab,
    pendingSpims,
    pendingJob,
    pendingRecs,
  ] = await Promise.all([
    getCountFromServer(rehabPatientsQ).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(spimsStudentsQ).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(jobCenterSeekersQ).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(pendingRehabTxQ).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(pendingSpimsTxQ).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(pendingJobTxQ).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(pendingRecsQ).then((r) => r.data().count).catch(() => 0),
  ]);

  // “Total transactions today (combined amount)” uses approved + pending, for today only.
  const txToday = await fetchTodayTxAmount();

  // Active staff count across HQ + rehab + spims staff collections.
  const activeStaffCount = await fetchActiveStaffCount();

  return {
    rehabPatientsToday: rehabPatientsCount + jobCenterSeekersCount, // Combined count for dashboard card or separate if needed
    spimsStudentsToday: spimsStudentsCount,
    pendingApprovals: pendingRehab + pendingSpims + pendingJob,
    txAmountToday: txToday,
    activeStaffCount,
    pendingReconciliations: pendingRecs,
  };
}

export async function fetchTodayTxAmount(): Promise<number> {
  const today = new Date();
  const dayKey = isoDayKey(today);

  // Many tx docs have `date`/`transactionDate`/`createdAt`. We try `createdAt` first for consistent indexing.
  // For speed and to avoid extra indexes, we query a small window: latest N and filter client-side by dayKey.
  const [rehabSnap, spimsSnap, jobSnap] = await Promise.all([
    getDocs(query(collection(db, 'rehab_transactions'), orderBy('createdAt', 'desc'), limit(300))).catch(
      () => ({ docs: [] } as any)
    ),
    getDocs(query(collection(db, 'spims_transactions'), orderBy('createdAt', 'desc'), limit(300))).catch(
      () => ({ docs: [] } as any)
    ),
    getDocs(query(collection(db, 'job_center_transactions'), orderBy('createdAt', 'desc'), limit(300))).catch(
      () => ({ docs: [] } as any)
    ),
  ]);

  const sum = (docs: any[]) =>
    docs.reduce((acc, d) => {
      const data = d.data();
      const createdAt = data.createdAt?.toDate?.() ? data.createdAt.toDate() : data.createdAt;
      const key = createdAt ? isoDayKey(new Date(createdAt)) : '';
      if (key !== dayKey) return acc;
      return acc + (Number(data.amount) || 0);
    }, 0);

  return sum(rehabSnap.docs) + sum(spimsSnap.docs) + sum(jobSnap.docs);
}

export async function fetchActiveStaffCount(): Promise<number> {
  const [hq, rehab, spims, job] = await Promise.all([
    getCountFromServer(query(collection(db, 'hq_staff'), where('isActive', '==', true))).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(query(collection(db, 'rehab_staff'), where('isActive', '==', true))).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(query(collection(db, 'spims_staff'), where('isActive', '==', true))).then((r) => r.data().count).catch(() => 0),
    getCountFromServer(query(collection(db, 'job_center_staff'), where('isActive', '==', true))).then((r) => r.data().count).catch(() => 0),
  ]);
  return hq + rehab + spims + job;
}

