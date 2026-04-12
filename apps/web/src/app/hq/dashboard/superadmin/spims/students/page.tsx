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
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-transparent py-6">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#111827] dark:text-white">SPIMS Students</h1>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-gray-400 font-medium">Browse and open any student profile.</p>
        </div>

        <div className="mt-4 rounded-2xl border border-[#D1D5DB] bg-[#FFFFFF] px-4 py-3 dark:border-white/10 dark:bg-white/5 focus-within:border-teal-500/50 transition-all shadow-sm">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student…"
            className="w-full bg-transparent text-sm font-semibold text-[#111827] outline-none placeholder:text-[#9CA3AF] dark:text-white dark:placeholder:text-gray-400"
          />
        </div>

        <div className="mt-5">
          {loading ? (
            <InlineLoading label="Loading students…" />
          ) : !filtered.length ? (
            <EmptyState title="No students" message="No students match your search." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white dark:border-white/10 dark:bg-white/5 shadow-sm">
              <div className="divide-y divide-[#F3F4F6] dark:divide-white/5">
                {filtered.map((r) => (
                  <Link
                    key={r.id}
                    href={`/hq/dashboard/superadmin/spims/students/${r.id}`}
                    className="block p-4 transition-colors hover:bg-[#F9FAFB] active:bg-[#F3F4F6] dark:hover:bg-white/5 dark:active:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#111827] dark:text-white">{r.name}</p>
                        <p className="mt-1 text-xs text-[#9CA3AF] dark:text-gray-400">{r.className ? `Class: ${r.className}` : '—'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-black text-amber-600 dark:text-amber-400">
                          Remaining: PKR {Number(r.remaining || 0).toLocaleString('en-PK')}
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

