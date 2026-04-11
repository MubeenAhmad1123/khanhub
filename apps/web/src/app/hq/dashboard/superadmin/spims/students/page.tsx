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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">SPIMS Students</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Browse and open any student profile.</p>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search student…"
          className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        />
      </div>

      <div className="mt-5">
        {loading ? (
          <InlineLoading label="Loading students…" />
        ) : !filtered.length ? (
          <EmptyState title="No students" message="No students match your search." />
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/hq/dashboard/superadmin/spims/students/${r.id}`}
                className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-gray-900 dark:text-white">{r.name}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{r.className ? `Class: ${r.className}` : '—'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-black text-amber-700 dark:text-amber-300">
                      Remaining: PKR {Number(r.remaining || 0).toLocaleString('en-PK')}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

