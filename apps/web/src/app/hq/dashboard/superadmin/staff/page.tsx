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
    <div className="min-h-screen py-6 bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">Staff</h1>
          <p className="mt-1 text-sm text-gray-400 font-medium">Merged staff directory + quick metrics.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['all', 'hq', 'rehab', 'spims'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDept(t as any)}
              className={`h-9 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                dept === t 
                  ? 'bg-white text-slate-900 shadow-xl' 
                  : 'bg-white/5 border border-transparent text-gray-200 hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-md">
          <button
            type="button"
            onClick={() => setStatus(status === 'active' ? 'all' : 'active')}
            className={`h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              status === 'active'
                ? 'bg-blue-500/20 border border-blue-500/20 text-blue-400'
                : 'bg-white/5 border border-transparent text-gray-200 hover:bg-white/10'
            }`}
          >
            {status === 'active' ? 'Active only' : 'All status'}
          </button>
          <button
            type="button"
            onClick={() => setRole(role === 'staff' ? 'all' : 'staff')}
            className={`h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              role === 'staff'
                ? 'bg-blue-500/20 border border-blue-500/20 text-blue-400'
                : 'bg-white/5 border border-transparent text-gray-200 hover:bg-white/10'
            }`}
          >
            {role === 'staff' ? 'Staff only' : 'All roles'}
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-all shadow-sm focus-within:border-teal-500/50">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search staff…"
            className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="mt-5">
          {loading ? (
            <InlineLoading label="Loading staff…" />
          ) : !filtered.length ? (
            <EmptyState title="No staff" message="No staff match your filters." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm">
              <div className="divide-y divide-white/5">
                {filtered.map((r) => (
                  <Link
                    key={r.id}
                    href={`/hq/dashboard/superadmin/staff/${r.id}`}
                    className="block p-4 transition-colors hover:bg-white/5 active:bg-white/10 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {r.name} <span className="text-gray-500">•</span> {String(r.dept).toUpperCase()}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          Role: {r.role} • Present {r.presentCount} • Late {r.lateCount} • Absent {r.absentCount}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-black text-white">GP: {r.growthPointsTotal}</p>
                        <p className="mt-1 text-xs font-black text-amber-400">Fines: PKR {Number(r.totalFines || 0).toLocaleString('en-PK')}</p>
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

