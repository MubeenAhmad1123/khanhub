// apps/web/src/app/departments/spims/dashboard/admin/tests/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SPIMS_COURSES } from '@/types/spims';
import { subscribeAdminTests, deleteSpimsTest, type SpimsTest, type SpimsTestScope } from '@/lib/spims/tests';
import { announceSpimsTestServer } from '@/app/hq/actions/spims';
import { BrutalistCalendar } from '@/components/ui/BrutalistCalendar';

export default function SpimsAdminTestsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SpimsTest[]>([]);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [scope, setScope] = useState<SpimsTestScope>('course_session');
  const [course, setCourse] = useState<string>(SPIMS_COURSES[0] || '');
  const [cohortSession, setCohortSession] = useState('');
  const [studentId, setStudentId] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);

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

  useEffect(() => {
    if (!session) return;
    return subscribeAdminTests((r) => setRows(r));
  }, [session]);

  const [allStudents, setAllStudents] = useState<{id: string, name: string, rollNo: string}[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    if (scope === 'student' && !allStudents.length) {
      getDocs(collection(db, 'spims_students')).then((snap: any) => {
        setAllStudents(snap.docs.map((d: any) => ({ id: d.id, name: d.data().name, rollNo: d.data().rollNo })));
      });
    }
  }, [scope, allStudents.length]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.toLowerCase();
    return allStudents.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.rollNo && s.rollNo.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [allStudents, studentSearch]);

  const canCreate = useMemo(() => {
    if (!title.trim()) return false;
    if (scope === 'all') return true;
    if (scope === 'student') return !!studentId.trim();
    return !!course && !!cohortSession.trim();
  }, [title, scope, course, cohortSession, studentId]);

  const create = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const result = await announceSpimsTestServer({
        title: title.trim(),
        scope,
        course: scope === 'course_session' ? course : null,
        session: scope === 'course_session' ? cohortSession.trim() : null,
        studentId: scope === 'student' ? studentId.trim() : null,
        note: note.trim() || null,
        createdBy: session?.customId || 'Admin',
        testDate: testDate,
      });

      if (result.success) {
        setTitle('');
        setNote('');
        setStudentId('');
        setStudentSearch('');
        toast.success(`Test announced to ${result.notifiedCount} students`);
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to announce test');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await deleteSpimsTest(id);
      toast.success('Deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
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
    <div className="max-w-4xl mx-auto space-y-6 pb-24 text-gray-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Tests / Announcements</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Announce surprise or scheduled tests for students.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Create</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Title</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Surprise test on Anatomy (Chapter 3)"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Scope</label>
            <select
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900"
              value={scope}
              onChange={(e) => setScope(e.target.value as SpimsTestScope)}
            >
              <option value="course_session">Class (course + session)</option>
              <option value="student">Single student</option>
              <option value="all">All students</option>
            </select>
          </div>

          <div>
            <BrutalistCalendar
              label="Test Date"
              value={testDate}
              onChange={setTestDate}
              className="border-gray-200"
            />
          </div>

          {scope === 'course_session' ? (
            <>
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
            </>
          ) : null}

          {scope === 'student' ? (
            <div className="sm:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Search Student</label>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Type student name or roll no..."
                />
                {filteredStudents.length > 0 && !studentId && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                    {filteredStudents.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setStudentId(s.id);
                          setStudentSearch(`${s.name} (${s.rollNo || 'No Roll'})`);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <p className="font-bold text-gray-900">{s.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{s.rollNo || 'No Roll No'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {studentId && (
                <div className="flex items-center justify-between bg-teal-50 px-4 py-2 rounded-xl border border-teal-100">
                   <p className="text-xs font-bold text-teal-700">Selected student ID: {studentId}</p>
                   <button onClick={() => { setStudentId(''); setStudentSearch(''); }} className="text-[10px] font-black text-teal-600 hover:underline uppercase">Clear</button>
                </div>
              )}
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Note (optional)</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900 min-h-[90px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Extra instructions…"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!canCreate || creating}
          onClick={create}
          className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl text-sm font-black hover:bg-teal-700 disabled:opacity-50"
        >
          <Plus size={16} /> {creating ? 'Creating…' : 'Announce'}
        </button>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Recent</h2>
        {!rows.length ? (
          <p className="text-sm text-gray-500">No announcements yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 60).map((r) => (
              <div key={r.id} className="rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900">{r.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Scope: {r.scope}
                    {r.course ? ` • ${r.course}` : ''}
                    {r.session ? ` • Session ${r.session}` : ''}
                    {r.studentId ? ` • Student ${r.studentId}` : ''}
                    {r.testDate ? ` • Test Date: ${r.testDate}` : ''}
                  </p>
                  {r.note ? <p className="mt-2 text-sm text-gray-700">{r.note}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-black text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

