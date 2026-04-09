// apps/web/src/app/hq/dashboard/superadmin/staff/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { listStaffCards, type StaffDept } from '@/lib/hq/superadmin/staff';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';

export default function SuperadminStaffPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { session, loading: sessionLoading } = useHqSession();
  const [dept, setDept] = useState<'all' | StaffDept>((sp.get('dept') as any) || 'all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [role, setRole] = useState<'all' | 'admin' | 'staff' | 'cashier'>('all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    let alive = true;
    setLoading(true);
    listStaffCards({ dept, status, role })
      .then((r) => alive && setRows(r))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [session, dept, status, role]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.name} ${r.role} ${r.dept}`.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Staff</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Merged staff directory + quick metrics.</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
        {(['all', 'rehab', 'spims'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setDept(t as any)}
            className={`h-11 rounded-2xl text-xs font-black uppercase tracking-widest transition ${
              dept === t ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setStatus(status === 'active' ? 'all' : 'active')}
          className="h-11 rounded-2xl bg-gray-50 text-xs font-black uppercase tracking-widest text-gray-700 dark:bg-white/5 dark:text-gray-200"
        >
          {status === 'active' ? 'Active only' : 'All status'}
        </button>
        <button
          type="button"
          onClick={() => setRole(role === 'staff' ? 'all' : 'staff')}
          className="h-11 rounded-2xl bg-gray-50 text-xs font-black uppercase tracking-widest text-gray-700 dark:bg-white/5 dark:text-gray-200"
        >
          {role === 'staff' ? 'Staff only' : 'All roles'}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search staff…"
          className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        />
      </div>

      <div className="mt-5">
        {loading ? (
          <InlineLoading label="Loading staff…" />
        ) : !filtered.length ? (
          <EmptyState title="No staff" message="No staff match your filters." />
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/hq/dashboard/superadmin/staff/${r.id}`}
                className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-gray-900 dark:text-white">
                      {r.name} <span className="text-gray-400">•</span> {String(r.dept).toUpperCase()}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Role: {r.role} • Present {r.presentCount} • Late {r.lateCount} • Absent {r.absentCount}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-black text-gray-900 dark:text-white">GP: {r.growthPointsTotal}</p>
                    <p className="mt-1 text-xs font-black text-amber-700 dark:text-amber-300">Fines: PKR {Number(r.outstandingFines || 0).toLocaleString('en-PK')}</p>
                  </div>
                </div>
                {r.lastDutyLabel ? (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{r.lastDutyLabel}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

