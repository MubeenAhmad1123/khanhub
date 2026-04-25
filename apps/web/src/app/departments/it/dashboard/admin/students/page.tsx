'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import { 
  Plus, Search, ChevronRight, User, Calendar, 
  CheckCircle, AlertCircle, X, GraduationCap, Laptop, BookOpen
} from 'lucide-react';
import { Spinner } from '@/components/ui';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

export default function ITStudentsListPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/it/login'); return;
    }
    setSession(parsed);
    fetchStudents();
  }, [router]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'it_students'), orderBy('joiningDate', 'desc')));
      
      const all = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        joiningDate: toDate(d.data().joiningDate)
      }));

      setStudents(all);
    } catch (err: any) {
      console.error('Fetch IT students error:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <Spinner size="lg" />
      </div>
    );
  }

  const filteredStudents = students.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    
    const s = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      (p.course || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-black/5 pb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-black flex items-center gap-4 tracking-tighter">
              <GraduationCap className="w-10 h-10 text-indigo-600" />
              IT Intern Registry
            </h1>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-2">Managing the next generation of tech talent</p>
          </div>
          <Link 
            href="/departments/it/dashboard/admin/students/new"
            className="bg-indigo-600 hover:bg-black text-white px-8 py-4 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Enrol New Student
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Laptop className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Interns</p><p className="text-2xl font-black text-black">{students.filter(s => s.status === 'active').length}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600"><CheckCircle className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Graduated</p><p className="text-2xl font-black text-black">{students.filter(s => s.status === 'completed').length}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><BookOpen className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Courses</p><p className="text-2xl font-black text-black">12</p></div>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400"><User className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Enrolled</p><p className="text-2xl font-black text-black">{students.length}</p></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search interns by name or course..."
              className="w-full bg-white border border-black/5 rounded-[2rem] pl-14 pr-6 py-5 text-sm font-bold outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {['all', 'active', 'completed', 'dropped'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  statusFilter === f ? 'bg-black text-white shadow-xl' : 'bg-white text-gray-400 border border-black/5 hover:bg-gray-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-20 text-center border border-black/5 shadow-sm">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-200">
              <Search size={40} />
            </div>
            <h3 className="text-2xl font-black text-black mb-2">No interns found</h3>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Refine your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map(student => (
              <Link 
                href={`/departments/it/dashboard/admin/students/${student.id}`} 
                key={student.id}
                className="bg-white rounded-[2.5rem] p-8 border border-black/5 hover:border-indigo-500 shadow-sm hover:shadow-2xl transition-all group active:scale-[0.98] relative overflow-hidden"
              >
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-3xl">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-black truncate leading-tight">{student.name}</h3>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">{student.id}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400"><Laptop size={14} /></div>
                      <span className="text-xs font-black text-black uppercase tracking-tight">{student.course || 'Core IT'}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      student.status === 'active' ? 'bg-green-100 text-green-700' : 
                      student.status === 'completed' ? 'bg-blue-100 text-blue-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {student.status}
                    </span>
                  </div>

                  <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Calendar size={14} className="text-indigo-400" />
                      {formatDateDMY(student.joiningDate)}
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
