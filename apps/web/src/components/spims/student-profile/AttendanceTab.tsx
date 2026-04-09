// apps/web/src/components/spims/student-profile/AttendanceTab.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { subscribeStudentAttendance, type SpimsStudentAttendance } from '@/lib/spims/studentAttendance';

export default function AttendanceTab({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<SpimsStudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    return subscribeStudentAttendance({
      studentId,
      onData: (r) => {
        setRows(r);
        setLoading(false);
      },
    });
  }, [studentId]);

  const summary = useMemo(() => {
    const present = rows.filter((r) => r.status === 'present').length;
    const absent = rows.filter((r) => r.status === 'absent').length;
    return { present, absent, total: rows.length };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center">
          <div className="text-xl font-black text-gray-900">{summary.total}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Records</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
          <div className="text-xl font-black text-emerald-700">{summary.present}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700/80 mt-1">Present</div>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
          <div className="text-xl font-black text-red-700">{summary.absent}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-red-700/80 mt-1">Absent</div>
        </div>
      </div>

      {!rows.length ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
          <p className="text-sm font-black text-gray-700">No attendance marked yet</p>
          <p className="mt-1 text-xs text-gray-500">Admin will mark attendance and it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 60).map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-gray-900">{r.date}</p>
                <p className="text-xs text-gray-500">Status: {r.status}</p>
              </div>
              {r.status === 'present' ? (
                <div className="inline-flex items-center gap-2 text-emerald-700 font-black text-xs uppercase tracking-widest">
                  <CheckCircle2 className="w-5 h-5" /> Present
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 text-red-700 font-black text-xs uppercase tracking-widest">
                  <XCircle className="w-5 h-5" /> Absent
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

