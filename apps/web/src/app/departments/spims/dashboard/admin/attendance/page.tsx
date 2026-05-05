// apps/web/src/app/departments/spims/dashboard/admin/attendance/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SPIMS_COURSES } from '@/types/spims';
import { upsertAttendance, type SpimsStudentAttendanceStatus } from '@/lib/spims/studentAttendance';
import { formatDateDMY, parseDateDMY } from '@/lib/utils';

type StudentRow = { id: string; name: string; rollNo: string; course: string; session: string };

export default function SpimsAdminAttendancePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [course, setCourse] = useState<string>(SPIMS_COURSES[0] || '');
  const [cohortSession, setCohortSession] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [marked, setMarked] = useState<Record<string, SpimsStudentAttendanceStatus>>({});

  useEffect(() => {
    const raw = localStorage.getItem('spims_session');
    if (!raw) {
      router.push('/departments/spims/login');
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/spims/login');
      return;
    }
    setSession(parsed);
    setLoading(false);
  }, [router]);

  const canLoad = !!course && !!cohortSession.trim();

  const load = async () => {
    if (!canLoad) return;
    setBusy(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'spims_students'), where('course', '==', course), where('session', '==', cohortSession.trim()))
      );
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .map((d: any) => ({
          id: d.id,
          name: String(d.name || '—'),
          rollNo: String(d.rollNo || ''),
          course: String(d.course || ''),
          session: String(d.session || ''),
        }))
        .sort((a, b) => String(a.rollNo).localeCompare(String(b.rollNo)));
      setStudents(rows);
      setMarked((prev) => ({ ...prev }));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to load students');
    } finally {
      setBusy(false);
    }
  };

  const presentCount = useMemo(() => Object.values(marked).filter((s) => s === 'present').length, [marked]);

  const save = async () => {
    if (!students.length) return;
    setBusy(true);
    try {
      for (const s of students) {
        const status = marked[s.id] || 'absent';
        await upsertAttendance({
          studentId: s.id,
          date,
          status,
          markedBy: session?.customId || null,
        });
      }
      toast.success('Attendance saved');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Student Attendance</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">Mark attendance for a course + session.</p>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Date</label>
            <input
              type="text"
              placeholder="DD MM YYYY"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900"
              value={formatDateDMY(date)}
              onChange={(e) => setDate(e.target.value)}
              onBlur={(e) => {
                const parsed = parseDateDMY(e.target.value);
                if (parsed) setDate(parsed.toISOString().split('T')[0]);
              }}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Course</label>
            <select
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              {SPIMS_COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Session</label>
            <select
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900"
              value={cohortSession}
              onChange={(e) => setCohortSession(e.target.value)}
            >
              <option value="">Select Session</option>
              <option value="23-25">2023-2025</option>
              <option value="24-26">2024-2026</option>
              <option value="25-27">2025-2027</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            disabled={!canLoad || busy}
            onClick={load}
            className="px-5 py-3 bg-gray-900 text-white rounded-xl text-sm font-black hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? 'Loading…' : 'Load students'}
          </button>
          
          {students.length > 0 && (
            <>
              <div className="h-8 w-px bg-gray-200 mx-2" />
              <button
                type="button"
                onClick={() => {
                  const m: any = {};
                  students.forEach(s => m[s.id] = 'present');
                  setMarked(m);
                }}
                className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100"
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => {
                  const m: any = {};
                  students.forEach(s => m[s.id] = 'absent');
                  setMarked(m);
                }}
                className="px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100"
              >
                All Absent
              </button>
            </>
          )}

          <div className="ml-auto flex items-center gap-4">
             <div className="text-sm font-black text-gray-700">
                Present: <span className="text-emerald-600">{presentCount}</span> / {students.length}
             </div>
             <button
                type="button"
                disabled={!students.length || busy}
                onClick={save}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-2xl text-sm font-black hover:bg-teal-700 shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50"
             >
                <Save size={16} /> {busy ? 'Saving…' : 'Save attendance'}
             </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        {!students.length ? (
          <p className="text-sm text-gray-500">Load a course + session to start marking.</p>
        ) : (
          <div className="space-y-2">
            {students.map((s) => {
              const status = marked[s.id] || 'absent';
              return (
                <div key={s.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900">
                      {s.rollNo ? `${s.rollNo} • ` : ''}{s.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{s.course} • Session {s.session}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMarked((m) => ({ ...m, [s.id]: 'absent' }))}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${
                        status === 'absent' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarked((m) => ({ ...m, [s.id]: 'present' }))}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${
                        status === 'present' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      Present
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

