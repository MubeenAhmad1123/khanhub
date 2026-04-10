// apps/web/src/components/spims/student-profile/FinanceSummaryTab.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, TrendingUp, Wallet } from 'lucide-react';
import type { SpimsFeePayment, SpimsStudent } from '@/types/spims';
import { formatDateDMY, toDate } from '@/lib/utils';

export default function FinanceSummaryTab({
  student,
}: {
  student: SpimsStudent;
}) {
  const [rows, setRows] = useState<SpimsFeePayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'spims_fees'),
      where('studentId', '==', student.id),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              ...x,
              date: x.date?.toDate ? x.date.toDate() : x.date,
            } as SpimsFeePayment;
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [student.id]);

  const { totalPaid, remaining, monthlyPaidCurrentMonth, monthlyRemaining } = useMemo(() => {
    const approved = rows.filter((r) => r.status === 'approved');
    const paid = approved.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const pkg = Number(student.totalPackage) || 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyPaid = approved
      .filter((r) => {
        if (r.type !== 'monthly') return false;
        const d = toDate(r.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const mFee = Number(student.monthlyFee) || 0;

    return {
      totalPaid: paid,
      remaining: Math.max(0, pkg - paid),
      monthlyPaidCurrentMonth: monthlyPaid,
      monthlyRemaining: Math.max(0, mFee - monthlyPaid),
    };
  }, [rows, student.totalPackage, student.monthlyFee]);

  const courseDuration = useMemo(() => {
    if (!student.course) return 'N/A';
    const match = student.course.match(/(\d+)\s*Year/i);
    return match ? `${match[1]} Years` : 'N/A';
  }, [student.course]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[#1D9E75] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-black text-gray-900">Finance summary</h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total package</div>
          <div className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Wallet className="text-[#1D9E75]" size={20} />
            Rs {(Number(student.totalPackage) || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-400 font-bold mt-1">Duration: {courseDuration}</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Monthly tuition</div>
          <div className="text-xl font-black text-emerald-700">
            Rs {monthlyPaidCurrentMonth.toLocaleString()}
          </div>
          <div className="text-[10px] font-bold mt-1 text-amber-700">
            Rem: Rs {monthlyRemaining.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total paid</div>
          <div className="text-xl font-black text-[#1D9E75] flex items-center gap-2">
            <TrendingUp size={20} />
            Rs {totalPaid.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current balance</div>
          <div className="text-xl font-black text-amber-700">Rs {remaining.toLocaleString()}</div>
          <div className="text-[10px] text-gray-400 font-bold mt-1">Overall Course Remaining</div>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-black text-sm text-gray-800 uppercase tracking-widest">
          Payment history
        </div>
        <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 font-medium">No payments recorded.</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-black text-gray-900">Rs {(Number(r.amount) || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-400 font-medium">{formatDateDMY(r.date)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-gray-500">{r.type}</span>
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">{r.status.replace('_', ' ')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
