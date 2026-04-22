// apps/web/src/app/hq/dashboard/superadmin/staff/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { listStaffCards, type StaffDept } from '@/lib/hq/superadmin/staff';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { Users2 } from 'lucide-react';

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
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-black italic">Global staff registry • Operational performance matrix</p>
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
                  : 'bg-white dark:bg-black text-black dark:text-black border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-white'
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
                : 'bg-white dark:bg-black text-black dark:text-black border-gray-100 dark:border-white/10'
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
                : 'bg-white dark:bg-black text-black dark:text-black border-gray-100 dark:border-white/10'
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
            className="w-full bg-transparent text-sm font-black text-black dark:text-white outline-none placeholder:text-black dark:placeholder:text-black uppercase tracking-widest text-[11px]"
          />
        </div>

        <div className="mt-8">
          {loading ? (
            <InlineLoading label="Syncing Personnel Hub…" />
          ) : !filtered.length ? (
            <EmptyState title="Registry Empty" message="No personnel records match current filter parameters." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((r) => {
                const deptColor = 
                  r.dept === 'hq' ? 'border-black dark:border-white' :
                  r.dept === 'rehab' ? 'border-teal-500' :
                  r.dept === 'spims' ? 'border-sky-500' :
                  'border-gray-200 dark:border-white/10';
                
                const deptText = 
                  r.dept === 'hq' ? 'text-black dark:text-white' :
                  r.dept === 'rehab' ? 'text-teal-600 dark:text-teal-400' :
                  r.dept === 'spims' ? 'text-sky-600 dark:text-sky-400' :
                  'text-black';

                const deptBg = 
                  r.dept === 'hq' ? 'bg-black/5 dark:bg-white/5' :
                  r.dept === 'rehab' ? 'bg-teal-500/5' :
                  r.dept === 'spims' ? 'bg-sky-500/5' :
                  'bg-gray-50 dark:bg-white/5';

                return (
                  <Link
                    key={r.id}
                    href={`/hq/dashboard/superadmin/staff/${r.id}`}
                    className={`group relative overflow-hidden rounded-[2.5rem] border-2 ${deptColor} ${deptBg} p-6 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-black/5`}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Users2 size={40} className={deptText} />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${deptColor} ${deptText}`}>
                          {String(r.dept).toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold text-black dark:text-black uppercase tracking-widest">
                          ID: {r.id.slice(0, 4)}
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-black dark:text-white leading-tight mb-1 group-hover:text-black dark:group-hover:text-white">
                        {r.name}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-black mb-6 italic">
                        {r.role}
                      </p>

                      <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="text-center p-2 rounded-2xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/5">
                          <p className="text-[10px] font-black text-black uppercase tracking-tighter">P</p>
                          <p className="text-sm font-black text-emerald-500">{r.presentCount}</p>
                        </div>
                        <div className="text-center p-2 rounded-2xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/5">
                          <p className="text-[10px] font-black text-black uppercase tracking-tighter">L</p>
                          <p className="text-sm font-black text-amber-500">{r.lateCount}</p>
                        </div>
                        <div className="text-center p-2 rounded-2xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/5">
                          <p className="text-[10px] font-black text-black uppercase tracking-tighter">A</p>
                          <p className="text-sm font-black text-rose-500">{r.absentCount}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/10">
                        <div>
                          <p className="text-[10px] font-black text-black uppercase tracking-widest">Growth Points</p>
                          <p className="text-lg font-black text-black dark:text-white">{r.growthPointsTotal}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-black uppercase tracking-widest">Fines</p>
                          <p className="text-sm font-black text-rose-500">₨{Number(r.totalFines || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

