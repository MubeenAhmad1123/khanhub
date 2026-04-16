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

      <div className="rounded-[2.5rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 text-left border-b border-gray-100">
                <th className="px-6 py-4">Roll</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Admission</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    No students matching your search
                  </td>
                </tr>
              ) : (
                filtered.map((st) => (
                  <tr key={st.id} className="group hover:bg-[#1D9E75]/5 transition-all duration-300">
                    <td className="px-6 py-5 font-mono font-black text-[#1D9E75]">{st.rollNo}</td>
                    <td className="px-6 py-5">
                      <p className="font-black text-gray-900 leading-none">{st.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">{st.cnic}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-black text-gray-700 uppercase">{st.course}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{st.session}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-block text-[9px] font-black uppercase px-3 py-1.5 rounded-full bg-[#1D9E75]/10 text-[#1D9E75]">
                        {st.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-gray-500 font-bold text-xs">{formatDateDMY(st.admissionDate)}</td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/departments/spims/dashboard/admin/students/${st.id}`}
                        className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#1D9E75]/20 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300"
                      >
                        Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 ? (
             <div className="px-6 py-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                No students found
             </div>
          ) : (
            filtered.map((st) => (
              <div key={st.id} className="p-5 flex items-center justify-between gap-4 active:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black bg-[#1D9E75]/10 text-[#1D9E75] px-2 py-0.5 rounded-md">{st.rollNo}</span>
                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">{st.course}</span>
                  </div>
                  <h3 className="text-sm font-black text-gray-900 truncate">{st.name}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[8px] font-black uppercase text-gray-500">{st.session}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[8px] font-black text-[#1D9E75] uppercase">{st.status}</span>
                  </div>
                </div>
                <Link
                  href={`/departments/spims/dashboard/admin/students/${st.id}`}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 border border-gray-100 text-[#1D9E75] font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  View
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
