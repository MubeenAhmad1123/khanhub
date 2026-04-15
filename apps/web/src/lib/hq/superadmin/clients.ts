// apps/web/src/lib/hq/superadmin/clients.ts
// Centralized "today's new clients" data layer for the HQ Superadmin dashboard.

import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

/** YYYY-MM-DD string in Asia/Karachi (PKT = UTC+5) */
export function pktDayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Midnight PKT as a UTC Date — for Firestore Timestamp comparisons */
export function pktStartOfToday(): Date {
  const key = pktDayKey(new Date());
  return new Date(`${key}T00:00:00+05:00`);
}

/** 23:59:59.999 PKT as a UTC Date */
export function pktEndOfToday(): Date {
  const start = pktStartOfToday();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Resolve a Firestore Timestamp / ISO string / Date to a JS Date */
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

/** Format a Date as "HH:MM" in PKT */
export function formatPKTTime(d: Date | null): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/** Format a Date as "15 Apr 2026" in PKT */
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
    collections: string[];   // one or more Firestore collection names to try
    metaField: string;       // department-specific descriptor field
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
    // Try both collection name variants used across the codebase
    collections: ['jobcenter_seekers', 'job_center_seekers'],
    metaField: 'jobType',
    phoneField: ['phone', 'contactNumber', 'contact'],
    profileBase: '/departments/job-center/dashboard/seeker',
  },
};

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Fetches today's (PKT) new clients from all three departments.
 * Returns summary counts by dept for the dashboard card / breakdown modal.
 */
export async function fetchTodayClientCounts(): Promise<TodayClientsResult> {
  const from = Timestamp.fromDate(pktStartOfToday());
  const to = Timestamp.fromDate(pktEndOfToday());

  const depts = Object.keys(DEPT_CONFIG) as ClientDept[];

  const counts = await Promise.all(
    depts.map(async (dept) => {
      const cfg = DEPT_CONFIG[dept];
      let count = 0;

      for (const col of cfg.collections) {
        try {
          const snap = await getDocs(
            query(
              collection(db, col),
              where('createdAt', '>=', from),
              where('createdAt', '<=', to)
            )
          );
          count += snap.size;
          break; // stop at the first collection that doesn't throw
        } catch {
          // try next collection variant
        }
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

  return {
    total: counts.reduce((s, c) => s + c.count, 0),
    byDept: counts,
  };
}

/**
 * Fetches the full list of clients registered TODAY for a single department.
 * Used when the user drills into a specific department.
 */
export async function fetchTodayClientsByDept(
  dept: ClientDept
): Promise<TodayClient[]> {
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
          orderBy('createdAt', 'desc')
        )
      );
      docs = snap.docs;
      break;
    } catch {
      // try next variant
    }
  }

  return docs.map((d) => {
    const data = d.data() as Record<string, any>;

    const phone =
      cfg.phoneField.map((f) => data[f]).find(Boolean) ?? undefined;

    const meta =
      data[cfg.metaField] ||
      data['course'] ||
      data['class'] ||
      data['grade'] ||
      data['diagnosis'] ||
      undefined;

    const registeredAt = toDate(data.createdAt);

    const profilePath =
      dept === 'job-center'
        ? `${cfg.profileBase}/${d.id}`
        : `${cfg.profileBase}/${d.id}`;

    return {
      id: d.id,
      name: String(data.name || data.fullName || '—'),
      phone: phone ? String(phone) : undefined,
      registeredAt,
      meta: meta ? String(meta) : undefined,
      dept,
      profilePath,
    } satisfies TodayClient;
  });
}
