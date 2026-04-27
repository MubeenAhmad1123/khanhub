// apps/web/src/lib/hq/superadmin/clients.ts
// Centralized "today's new clients" data layer for the HQ Superadmin dashboard.

import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
  getCountFromServer,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCached, setCached } from '@/lib/queryCache';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientDept = 'rehab' | 'spims' | 'job-center';

export interface TodayClient {
  id: string;
  name: string;
  phone?: string;
  registeredAt: Date | null;
  /** Department-specific metadata label (course, addictionType, etc.) */
  meta?: string;
  dept: ClientDept;
  /** Full URL to existing profile page */
  profilePath: string;
}

export interface DeptClientCount {
  dept: ClientDept;
  label: string;
  count: number;
  color: string;       // Tailwind text color
  bgColor: string;     // Tailwind bg color
  borderColor: string; // Tailwind border color
  dotColor: string;    // Tailwind bg color for dot
}

export interface TodayClientsResult {
  total: number;
  byDept: DeptClientCount[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function pktDayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function pktStartOfToday(): Date {
  const key = pktDayKey(new Date());
  return new Date(`${key}T00:00:00+05:00`);
}

export function pktEndOfToday(): Date {
  const start = pktStartOfToday();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function toDate(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw?.toDate) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === 'string') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatPKTTime(d: Date | null): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

export function formatPKTDate(d: Date | null): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

// ─── Dept config ─────────────────────────────────────────────────────────────

const DEPT_CONFIG: Record<
  ClientDept,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    dotColor: string;
    collections: string[];
    metaField: string;
    phoneField: string[];
    profileBase: string;
  }
> = {
  rehab: {
    label: 'Rehab Patients',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/5',
    borderColor: 'border-violet-500/20',
    dotColor: 'bg-violet-500',
    collections: ['rehab_patients'],
    metaField: 'addictionType',
    phoneField: ['phone', 'contactNumber', 'contact'],
    profileBase: '/hq/dashboard/superadmin/rehab/patients',
  },
  spims: {
    label: 'SPIMS Students',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/5',
    borderColor: 'border-sky-500/20',
    dotColor: 'bg-sky-500',
    collections: ['spims_students'],
    metaField: 'className',
    phoneField: ['phone', 'contactNumber', 'contact'],
    profileBase: '/hq/dashboard/superadmin/spims/students',
  },
  'job-center': {
    label: 'Job Seekers',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/20',
    dotColor: 'bg-emerald-500',
    collections: ['jobcenter_seekers', 'job_center_seekers'],
    metaField: 'jobType',
    phoneField: ['phone', 'contactNumber', 'contact'],
    profileBase: '/departments/job-center/dashboard/seeker',
  },
};

const COUNT_CACHE_TTL = 300; // 5 minutes for counts
const LIST_CACHE_TTL = 600; // 10 minutes for lists

export async function fetchTodayClientCounts(): Promise<TodayClientsResult> {
  const cacheKey = 'hq_today_client_counts';
  const cached = getCached<TodayClientsResult>(cacheKey);
  if (cached) return cached;

  const from = Timestamp.fromDate(pktStartOfToday());
  const to = Timestamp.fromDate(pktEndOfToday());
  const depts = Object.keys(DEPT_CONFIG) as ClientDept[];

  const counts = await Promise.all(
    depts.map(async (dept) => {
      const cfg = DEPT_CONFIG[dept];
      let count = 0;
      // Use getDocs instead of getCountFromServer to save aggregation quota on Spark plan
      for (const col of cfg.collections) {
        try {
          const snap = await getDocs(
            query(collection(db, col), where('createdAt', '>=', from), where('createdAt', '<=', to), limit(100))
          );
          count = snap.size;
          break;
        } catch { }
      }
      return {
        dept,
        label: cfg.label,
        count,
        color: cfg.color,
        bgColor: cfg.bgColor,
        borderColor: cfg.borderColor,
        dotColor: cfg.dotColor,
      } satisfies DeptClientCount;
    })
  );

  const data = {
    total: counts.reduce((s, c) => s + c.count, 0),
    byDept: counts,
  };
  setCached(cacheKey, data, COUNT_CACHE_TTL);
  return data;
}

export async function fetchTodayClientsByDept(
  dept: ClientDept
): Promise<TodayClient[]> {
  const cacheKey = `hq_today_clients_${dept}`;
  const cached = getCached<TodayClient[]>(cacheKey);
  if (cached) return cached;

  const cfg = DEPT_CONFIG[dept];
  const from = Timestamp.fromDate(pktStartOfToday());
  const to = Timestamp.fromDate(pktEndOfToday());

  let docs: any[] = [];
  for (const col of cfg.collections) {
    try {
      const snap = await getDocs(
        query(
          collection(db, col),
          where('createdAt', '>=', from),
          where('createdAt', '<=', to),
          limit(50)
        )
      );
      docs = snap.docs;
      break;
    } catch { }
  }

  const results = docs.map((d) => {
    const data = d.data() as Record<string, any>;
    const phone = cfg.phoneField.map((f) => data[f]).find(Boolean) ?? undefined;
    const meta = data[cfg.metaField] || data['course'] || data['class'] || data['grade'] || data['diagnosis'] || undefined;
    const registeredAt = toDate(data.createdAt);
    const profilePath = `${cfg.profileBase}/${d.id}`;

    return {
      id: d.id,
      name: String(data.name || data.fullName || '—'),
      phone: phone ? String(phone) : undefined,
      registeredAt,
      meta: meta ? String(meta) : undefined,
      dept,
      profilePath,
    } satisfies TodayClient;
  }).sort((a, b) => (b.registeredAt?.getTime() || 0) - (a.registeredAt?.getTime() || 0));

  setCached(cacheKey, results, LIST_CACHE_TTL);
  return results;
}

