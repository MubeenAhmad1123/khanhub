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
    <div className="min-h-screen py-12 bg-white dark:bg-black transition-colors duration-300">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-black dark:text-white uppercase">Personnel Core</h1>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 italic">Global staff registry • Operational performance matrix</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {(['all', 'hq', 'rehab', 'spims'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDept(t as any)}
              className={`h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                dept === t 
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' 
                  : 'bg-white dark:bg-black text-gray-400 dark:text-gray-500 border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-2 gap-3 sm:max-w-md">
          <button
            type="button"
            onClick={() => setStatus(status === 'active' ? 'all' : 'active')}
            className={`h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
              status === 'active'
                ? 'bg-black text-white border-black dark:bg-white dark:text-black'
                : 'bg-white dark:bg-black text-gray-400 dark:text-gray-500 border-gray-100 dark:border-white/10'
            }`}
          >
            {status === 'active' ? 'Active only' : 'All status'}
          </button>
          <button
            type="button"
            onClick={() => setRole(role === 'staff' ? 'all' : 'staff')}
            className={`h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
              role === 'staff'
                ? 'bg-black text-white border-black dark:bg-white dark:text-black'
                : 'bg-white dark:bg-black text-gray-400 dark:text-gray-500 border-gray-100 dark:border-white/10'
            }`}
          >
            {role === 'staff' ? 'Staff only' : 'All roles'}
          </button>
        </div>

        <div className="mt-6 rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black px-6 py-4 transition-all shadow-sm focus-within:border-black dark:focus-within:border-white/40">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search personnel sequence…"
            className="w-full bg-transparent text-sm font-black text-black dark:text-white outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 uppercase tracking-widest text-[11px]"
          />
        </div>

        <div className="mt-8">
          {loading ? (
            <InlineLoading label="Syncing Personnel Hub…" />
          ) : !filtered.length ? (
            <EmptyState title="Registry Empty" message="No personnel records match current filter parameters." />
          ) : (
            <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black shadow-xl">
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {filtered.map((r) => (
                  <Link
                    key={r.id}
                    href={`/hq/dashboard/superadmin/staff/${r.id}`}
                    className="block p-4 transition-colors hover:bg-white/5 active:bg-white/10 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-black dark:text-white">
                          {r.name} <span className="text-gray-300 dark:text-gray-700 mx-1">/</span> <span className="text-gray-400 dark:text-gray-500 text-xs">{String(r.dept).toUpperCase()}</span>
                        </p>
                        <p className="mt-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                          {r.role} • <span className="text-black dark:text-white">{r.presentCount}P</span> • <span className="text-gray-400 dark:text-gray-600">{r.lateCount}L</span> • <span className="text-gray-300 dark:text-gray-700">{r.absentCount}A</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-black text-black dark:text-white">GP: {r.growthPointsTotal}</p>
                        <p className="mt-1 text-[10px] font-black text-black dark:text-white uppercase tracking-widest italic opacity-40">Fines: {Number(r.totalFines || 0).toLocaleString('en-PK')}</p>
                      </div>
                    </div>
                    {r.lastDutyLabel ? (
                      <p className="mt-2 text-[11px] text-gray-500 line-clamp-1 italic">{r.lastDutyLabel}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

