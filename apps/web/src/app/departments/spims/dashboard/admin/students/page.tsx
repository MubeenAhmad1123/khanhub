// apps/web/src/app/departments/spims/dashboard/admin/students/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, Search, GraduationCap, ArrowRight } from 'lucide-react';
import { listStudents } from '@/lib/spims/students';
import type { SpimsStudent } from '@/types/spims';
import { formatDateDMY } from '@/lib/utils';

export default function SpimsStudentsListPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ role: string } | null>(null);
  const [students, setStudents] = useState<SpimsStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedSession, setSelectedSession] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

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

  const allCourses = useMemo(() => Array.from(new Set(students.map(s => s.course))).sort(), [students]);
  const allSessions = useMemo(() => Array.from(new Set(students.map(s => s.session))).sort(), [students]);
  const allStatuses = ['Active', 'Pass', '1st Year Supply', '2nd Year Supply', 'Fail', 'Left'];

  const filtered = useMemo(() => {
    let list = students;

    // Filter by Course
    if (selectedCourse !== 'all') {
      list = list.filter(st => st.course === selectedCourse);
    }

    // Filter by Session
    if (selectedSession !== 'all') {
      list = list.filter(st => st.session === selectedSession);
    }

    // Filter by Status
    if (selectedStatus !== 'all') {
      list = list.filter(st => (st.status || 'Active') === selectedStatus);
    }

    // Search Query
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (st) =>
          (st.name || '').toLowerCase().includes(s) ||
          (st.rollNo || '').toLowerCase().includes(s) ||
          (st.cnic || '').toLowerCase().includes(s) ||
          (st.course || '').toLowerCase().includes(s) ||
          (st.session || '').toLowerCase().includes(s) ||
          st.id.toLowerCase().includes(s)
      );
    }

    return list;
  }, [students, q, selectedCourse, selectedSession, selectedStatus]);

  if (!session || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-9 h-9 animate-spin text-[#1D9E75]" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1D9E75]/60 animate-pulse">Fetching Students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="text-[#1D9E75]" size={32} /> Students
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">SPIMS college register</p>
        </div>
        <Link
          href="/departments/spims/dashboard/admin/students/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1D9E75] text-white px-5 py-3 text-sm font-black shadow-lg shadow-[#1D9E75]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={18} /> New admission
        </Link>
      </div>

      <div className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-0 bg-[#1D9E75]/5 rounded-3xl blur-2xl group-focus-within:bg-[#1D9E75]/10 transition-all opacity-0 group-focus-within:opacity-100" />
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-[#1D9E75]" />
            <input
              className="w-full rounded-2xl border border-gray-100 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl pl-12 pr-4 py-4 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] outline-none transition-all"
              placeholder="Search name, roll, CNIC, course…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
           <div className="relative">
              <select
                className="w-full appearance-none bg-white border border-gray-100 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">All Courses</option>
                {allCourses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">▼</div>
           </div>

           <div className="relative">
              <select
                className="w-full appearance-none bg-white border border-gray-100 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                <option value="all">All Sessions</option>
                {allSessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">▼</div>
           </div>

           <div className="relative">
              <select
                className="w-full appearance-none bg-white border border-gray-100 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">▼</div>
           </div>
        </div>
      </div>

      {/* Responsive Content */}
      <div className="bg-gray-50/50 rounded-[2.5rem] overflow-hidden md:border border-gray-100">
        {/* Desktop/Tablet Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Roll No</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Student Name</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Course</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Session</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    No students found matching your search
                  </td>
                </tr>
              ) : (
                filtered.map((st) => (
                  <tr key={st.id} className="bg-white hover:bg-gray-50/80 transition-all group">
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black bg-[#1D9E75]/10 text-[#1D9E75] px-3 py-1 rounded-lg">
                        {st.rollNo}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 leading-none mb-1">{st.name}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{st.contact || (st as any).phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black uppercase text-gray-500 tracking-tight">{st.course}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider font-mono">{st.session}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/departments/spims/dashboard/admin/students/${st.id}`}
                        className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#1D9E75]/20 transition-all duration-300 hover:scale-105 active:scale-95"
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

        {/* Improved Mobile View - No fixed height to allow full page scroll */}
        <div className="sm:hidden space-y-4">
          {filtered.length === 0 ? (
             <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No students found</p>
             </div>
          ) : (
            filtered.map((st) => (
              <Link 
                href={`/departments/spims/dashboard/admin/students/${st.id}`}
                key={st.id} 
                className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm active:scale-[0.97] transition-all flex items-center justify-between gap-4 group hover:border-[#1D9E75]/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black bg-[#1D9E75]/10 text-[#1D9E75] px-2 py-0.5 rounded-md">{st.rollNo}</span>
                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">{st.course}</span>
                  </div>
                  <h3 className="text-sm font-black text-gray-900 truncate mb-1">{st.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[8px] font-black uppercase text-gray-500">{st.session}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                    <span className="text-[8px] font-black text-[#1D9E75] uppercase">{st.status || 'Active'}</span>
                    <span className="text-[8px] font-black text-gray-400 font-mono">{st.contact || (st as any).phone || 'N/A'}</span>
                  </div>
                </div>
                <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 group-active:bg-[#1D9E75] group-active:text-white transition-all transform group-hover:translate-x-1">
                  <ArrowRight size={18} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
