// apps/web/src/app/hq/dashboard/superadmin/staff/[id]/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';

function parseIdParam(id: string): { dept: 'rehab' | 'spims'; staffDocId: string } | null {
  const idx = id.indexOf('_');
  if (idx <= 0) return null;
  const dept = id.slice(0, idx) as any;
  const staffDocId = id.slice(idx + 1);
  if (dept !== 'rehab' && dept !== 'spims') return null;
  if (!staffDocId) return null;
  return { dept, staffDocId };
}

export default function SuperadminStaffProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const parsed = parseIdParam(params.id);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    if (!parsed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getDoc(doc(db, parsed.dept === 'rehab' ? 'rehab_staff' : 'spims_staff', parsed.staffDocId))
      .then((snap) => setStaff(snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null))
      .finally(() => setLoading(false));
  }, [session, parsed?.dept, parsed?.staffDocId]);

  const header = useMemo(() => {
    if (!parsed) return { dept: '—', docId: params.id };
    return { dept: parsed.dept.toUpperCase(), docId: parsed.staffDocId };
  }, [parsed, params.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <InlineLoading label="Loading staff profile…" />
      </div>
    );
  }

  if (!parsed || !staff) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <EmptyState title="Not found" message="Staff profile does not exist." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight text-gray-900 dark:text-white">{staff.name || 'Staff'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{header.dept} staff profile (HQ view).</p>
        </div>
        <Link
          href="/hq/dashboard/superadmin/staff"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          Back
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Role</div>
          <div className="mt-1 text-sm font-black text-gray-900 dark:text-white">{String(staff.role || '—')}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active</div>
          <div className="mt-1 text-sm font-black text-gray-900 dark:text-white">{staff.isActive === false ? 'No' : 'Yes'}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</div>
          <div className="mt-1 text-sm font-black text-gray-900 dark:text-white">{String(staff.phone || '—')}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Doc ID</div>
          <div className="mt-1 text-xs font-mono text-gray-700 dark:text-gray-200 break-all">{header.docId}</div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="text-sm font-black text-gray-900 dark:text-white">Next</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Attendance calendar, growth points, fines, salary, and duty logs can be wired here next using your department collections.
        </p>
      </div>
    </div>
  );
}

