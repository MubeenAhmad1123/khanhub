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
import { fetchDailyBreakdown } from './finance';

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

  try {
    const breakdown = await fetchDailyBreakdown(new Date());
    const total = breakdown.grandIncome;
    setCached(cacheKey, total, CACHE_TTL);
    return total;
  } catch (err) {
    console.error('[Stats] fetchTodayTxAmount error:', err);
    return 0;
  }
}

export async function fetchActiveStaffCount(): Promise<number> {
  const cacheKey = 'hq_superadmin_active_staff';
  const cached = getCached<number>(cacheKey);
  if (cached !== undefined && cached !== null) return cached;

  const targetDepts = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];
  
  const base = await Promise.all(
    targetDepts.map(async (d) => {
      let col = '';
      if (d === 'hq') col = 'hq_users';
      else if (d === 'job-center') col = 'jobcenter_users';
      else if (d === 'social-media') col = 'media_users';
      else {
        const slug = d.replace('-', '_');
        col = `${slug}_users`;
      }
      const snap = await getDocs(query(collection(db, col), limit(200))).catch(() => ({ docs: [] } as any));
      return snap.docs.map((docSnap: any) => docSnap.data());
    })
  );

  const activeStaff = base.flat().filter((s: any) => {
    // 1. Exclude system accounts (super, network)
    const n = String(s.name || s.displayName || '').toLowerCase();
    const e = String(s.email || '').toLowerCase();
    if (n.includes('super') || n.includes('network') || e.includes('super') || e.includes('network')) {
      return false;
    }

    // 2. Strict Active Check
    const statusStr = String(s.status || '').toLowerCase();
    const isActuallyActive = s.isActive !== false && statusStr !== 'inactive' && statusStr !== 'resigned' && statusStr !== 'terminated' && statusStr !== 'active_vacancy';
    
    if (!isActuallyActive || statusStr === 'active_vacancy') return false;

    // 3. Role validation - ensure only valid staff roles are counted (exclude other, student, superadmin)
    const r = String(s.role || '').toLowerCase();
    let normalizedRole = 'other';
    if (r.includes('internee')) normalizedRole = 'internee';
    else if (r.includes('trial')) normalizedRole = 'trial';
    else if (r.includes('contract')) normalizedRole = 'contract';
    else if (r.includes('worker') || r.includes('junior')) normalizedRole = 'worker';
    else {
      const STAFF_WHITELIST = ['admin', 'staff', 'cashier', 'superadmin', 'manager', 'doctor', 'nurse', 'counselor', 'personnel', 'worker', 'internee', 'trial', 'contract', 'volunteer', 'supervisor', 'executive'];
      if (STAFF_WHITELIST.includes(r)) normalizedRole = r;
    }

    if (normalizedRole === 'superadmin') return false;
    if (normalizedRole === 'other' || normalizedRole === 'student') return false;

    return true;
  });

  const total = activeStaff.length;
  setCached(cacheKey, total, 1800); // 30 minutes for staff
  return total;
}
