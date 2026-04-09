// apps/web/src/app/departments/spims/dashboard/admin/students/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, Search, GraduationCap } from 'lucide-react';
import { listStudents } from '@/lib/spims/students';
import type { SpimsStudent } from '@/types/spims';
import { formatDateDMY } from '@/lib/utils';

export default function SpimsStudentsListPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ role: string } | null>(null);
  const [students, setStudents] = useState<SpimsStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

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
    void load();
  }, [router]);

  async function load() {
    try {
      setLoading(true);
      const list = await listStudents();
      setStudents(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return students;
    return students.filter(
      (st) =>
        (st.name || '').toLowerCase().includes(s) ||
        (st.rollNo || '').toLowerCase().includes(s) ||
        (st.cnic || '').toLowerCase().includes(s) ||
        (st.course || '').toLowerCase().includes(s) ||
        (st.session || '').toLowerCase().includes(s) ||
        st.id.toLowerCase().includes(s)
    );
  }, [students, q]);

  if (!session || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-9 h-9 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="text-[#1D9E75]" size={32} /> Students
          </h1>
          <p className="text-gray-500 font-medium mt-1">SPIMS college register</p>
        </div>
        <Link
          href="/departments/spims/dashboard/admin/students/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1D9E75] text-white px-5 py-3 text-sm font-black shadow-lg shadow-[#1D9E75]/20"
        >
          <Plus size={18} /> New admission
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          className="w-full rounded-2xl border border-gray-200 pl-12 pr-4 py-3 text-sm font-semibold shadow-sm"
          placeholder="Search name, roll, CNIC, course…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">
              <th className="px-4 py-3">Roll</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Admission</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 font-medium">
                  No students found.
                </td>
              </tr>
            ) : (
              filtered.map((st) => (
                <tr key={st.id} className="border-t border-gray-100 hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-gray-800">{st.rollNo}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{st.name}</td>
                  <td className="px-4 py-3 text-gray-600">{st.course}</td>
                  <td className="px-4 py-3 text-gray-600">{st.session}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-[#1D9E75]/10 text-[#1D9E75]">
                      {st.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDateDMY(st.admissionDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/departments/spims/dashboard/admin/students/${st.id}`}
                      className="text-[#1D9E75] font-black text-xs uppercase tracking-wider hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
