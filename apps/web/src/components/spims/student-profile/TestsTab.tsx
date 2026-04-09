// apps/web/src/components/spims/student-profile/TestsTab.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import type { SpimsStudent } from '@/types/spims';
import { subscribeStudentTests, type SpimsTest } from '@/lib/spims/tests';

export default function TestsTab({ student }: { student: SpimsStudent }) {
  const [rows, setRows] = useState<SpimsTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?.id) return;
    setLoading(true);
    return subscribeStudentTests({
      studentId: student.id,
      course: String(student.course || ''),
      session: String(student.session || ''),
      onData: (r) => {
        setRows(r);
        setLoading(false);
      },
    });
  }, [student?.id, student?.course, student?.session]);

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center">
          <ClipboardList className="w-6 h-6 text-gray-400" />
        </div>
        <p className="mt-3 text-sm font-black text-gray-700">No tests announced</p>
        <p className="mt-1 text-xs text-gray-500">When admin announces a test, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((t) => (
        <div key={t.id} className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-sm font-black text-gray-900">{t.title}</p>
          <p className="mt-1 text-xs text-gray-500">
            Scope: {t.scope}
            {t.course ? ` • ${t.course}` : ''}
            {t.session ? ` • Session ${t.session}` : ''}
          </p>
          {t.note ? <p className="mt-2 text-sm text-gray-700">{t.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

