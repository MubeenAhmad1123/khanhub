// apps/web/src/app/hq/dashboard/superadmin/spims/students/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';

type StudentRow = {
  id: string;
  name: string;
  className?: string;
  createdAt?: any;
  remaining?: number;
};

export default function SuperadminSpimsStudentsListPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'spims_students'), orderBy('createdAt', 'desc'), limit(500)),
      (snap) => {
        setRows(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              name: String(data.name || '—'),
              className: data.className || data.class || data.grade,
              createdAt: data.createdAt,
              remaining: Number(data.remaining ?? data.amountRemaining ?? 0) || 0,
            };
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [session]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.name} ${r.className || ''}`.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div className="min-h-screen py-12 bg-white dark:bg-black transition-colors duration-300">
      <div className="mx-auto max-w-4xl px-4 sm:px-10">
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-black dark:text-white uppercase">Subject Directory</h1>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-black italic">Centralized SPIMS Enrollments • Global Ledger Status</p>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus-within:border-black dark:focus-within:border-white/40 transition-all shadow-sm px-6 py-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="AUTHORIZE SUBJECT SEARCH..."
            className="w-full bg-transparent text-sm font-black text-black dark:text-white outline-none placeholder:text-black dark:placeholder:text-black uppercase tracking-widest text-[11px]"
          />
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="py-12 flex justify-center">
              <InlineLoading label="Syncing Subject Matrix…" />
            </div>
          ) : !filtered.length ? (
            <EmptyState title="Access Restricted" message="No matching subjects found in terminal." />
          ) : (
            <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black shadow-2xl">
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {filtered.map((r) => (
                  <Link
                    key={r.id}
                    href={`/hq/dashboard/superadmin/spims/students/${r.id}`}
                    className="block p-6 transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm font-black shadow-lg">
                          {r.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-black dark:text-white uppercase tracking-tight group-hover:translate-x-1 transition-transform">{r.name}</p>
                          <p className="mt-1 text-[10px] font-bold text-black dark:text-black uppercase tracking-widest">{r.className ? `Classification: ${r.className}` : 'Unclassified'}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest opacity-40 mb-1">Outstanding</div>
                        <div className="text-xs font-black text-black dark:text-white bg-gray-100 dark:bg-white/10 px-3 py-1.5 rounded-xl">
                          PKR {Number(r.remaining || 0).toLocaleString('en-PK')}
                        </div>
                      </div>
                    </div>
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

