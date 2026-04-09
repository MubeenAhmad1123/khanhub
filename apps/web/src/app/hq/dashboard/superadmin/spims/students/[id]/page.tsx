// apps/web/src/app/hq/dashboard/superadmin/spims/students/[id]/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, onSnapshot, collection, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { formatPKR } from '@/lib/hq/superadmin/format';

export default function SuperadminSpimsStudentProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const studentId = params.id;
  const [student, setStudent] = useState<any | null>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    const unsub1 = onSnapshot(doc(db, 'spims_students', studentId), (snap) => {
      setStudent(snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null);
      setLoading(false);
    });

    const unsub2 = onSnapshot(
      query(
        collection(db, 'spims_transactions'),
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snap) => setTx(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any))),
      () => {}
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [session, studentId]);

  const totals = useMemo(() => {
    const approved = tx.filter((t) => String(t.status) === 'approved');
    const totalApproved = approved.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pendingCount = tx.filter((t) => String(t.status) === 'pending').length;
    return { totalApproved, pendingCount };
  }, [tx]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <InlineLoading label="Loading student…" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <EmptyState title="Not found" message="Student record does not exist." />
      </div>
    );
  }

  const remaining = Number(student.remaining ?? student.amountRemaining ?? 0) || 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight text-gray-900 dark:text-white">{student.name || 'Student'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">SPIMS student profile (HQ read view).</p>
        </div>
        <Link
          href="/hq/dashboard/superadmin/spims/students"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          Back
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Remaining</div>
          <div className="mt-1 text-sm font-black text-amber-700 dark:text-amber-300">{formatPKR(remaining)}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Approved total</div>
          <div className="mt-1 text-sm font-black text-gray-900 dark:text-white">{formatPKR(totals.totalApproved)}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending</div>
          <div className="mt-1 text-sm font-black text-gray-900 dark:text-white">{totals.pendingCount}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Student ID</div>
          <div className="mt-1 text-xs font-mono text-gray-700 dark:text-gray-200 break-all">{studentId}</div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="text-sm font-black text-gray-900 dark:text-white">Recent transactions</h2>
        {!tx.length ? (
          <div className="mt-4">
            <EmptyState title="No transactions" message="No recent transactions for this student." />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {tx.slice(0, 20).map((t) => (
              <div key={t.id} className="rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                      {String(t.categoryName || t.category || t.type || 'Transaction')}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Status: {String(t.status || '—')}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-gray-900 dark:text-white">{formatPKR(Number(t.amount || 0))}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

