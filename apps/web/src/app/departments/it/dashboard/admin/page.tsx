'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy, limit, getCountFromServer
} from 'firebase/firestore';
import {
  Users, Building2, Monitor, Laptop, Plus, ChevronRight, Activity, 
  TrendingUp, UserPlus, Search, ArrowUpRight, Calendar, GraduationCap
} from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';
import { Spinner } from '@/components/ui';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function ITAdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/it/login'); return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    loadDashboard();
  }, [session]);

  const loadDashboard = async () => {
    try {
      // 1. Fetch Students (Recent 5)
      const recentStudentsQuery = query(
        collection(db, 'it_students'), 
        where('status', '==', 'active'),
        orderBy('joiningDate', 'desc'),
        limit(5)
      );
      const studentsSnap = await getDocs(recentStudentsQuery);
      setRecentStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Count Students by fetching limited slice
      const totalStudentsSnap = await getDocs(query(collection(db, 'it_students'), where('status', '==', 'active'), limit(100)));
      setTotalStudents(totalStudentsSnap.size);

      // 3. Fetch Clients (Recent 5)
      const recentClientsQuery = query(
        collection(db, 'it_clients'),
        where('status', '==', 'active'),
        limit(5)
      );
      const clientsSnap = await getDocs(recentClientsQuery);
      setRecentClients(clientsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 4. Count Clients by fetching limited slice
      const totalClientsSnap = await getDocs(query(collection(db, 'it_clients'), where('status', '==', 'active'), limit(100)));
      setTotalClients(totalClientsSnap.size);

    } catch (error) {
      console.error('IT Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] p-4 md:p-10 space-y-10 pb-20 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">

      {/* Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-black/5 pb-10">
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-black tracking-tighter leading-tight">
            {getGreeting()}, <span className="text-indigo-600">{session?.displayName?.split(' ')?.[0] || session?.name?.split(' ')?.[0] || 'Admin'}</span> 💻
          </h1>
          <p className="text-xs text-gray-400 font-black uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
            <Calendar size={14} className="text-indigo-500" />
            {formatDateDMY(new Date())} • Khan Hub IT Admin
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link 
            href="/departments/it/dashboard/admin/students/new"
            className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl text-[13px] font-black hover:bg-indigo-600 transition-all active:scale-95 shadow-2xl shadow-black/10 group"
          >
            <GraduationCap size={20} className="group-hover:scale-110 transition-transform" /> 
            New Student
          </Link>
          <Link 
            href="/departments/it/dashboard/admin/clients/new"
            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[13px] font-black hover:bg-black transition-all active:scale-95 shadow-2xl shadow-indigo-200 group"
          >
            <Building2 size={20} className="group-hover:scale-110 transition-transform" /> 
            New Client
          </Link>
        </div>
      </div>

      {/* High-Level Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Student Stat */}
        <div className="bg-white rounded-[3rem] border border-black/5 shadow-sm p-10 flex items-center gap-8 group hover:border-indigo-200 transition-all duration-500">
          <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-xl shadow-indigo-100 group-hover:shadow-black/20">
            <GraduationCap size={32} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-5xl font-black text-black tracking-tighter">{totalStudents}</div>
            <div className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">Active Interns</div>
          </div>
        </div>

        {/* Client Stat */}
        <div className="bg-white rounded-[3rem] border border-black/5 shadow-sm p-10 flex items-center gap-8 group hover:border-purple-200 transition-all duration-500">
          <div className="w-20 h-20 rounded-[2rem] bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 shadow-xl shadow-purple-100 group-hover:shadow-purple-200">
            <Building2 size={32} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-5xl font-black text-black tracking-tighter">{totalClients}</div>
            <div className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">Active Clients</div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-black rounded-[3rem] shadow-2xl shadow-black/20 p-10 flex items-center gap-8 group transition-all duration-500 sm:col-span-2 lg:col-span-1">
          <div className="w-20 h-20 rounded-[2rem] bg-white/10 text-indigo-400 flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-all duration-500">
            <Monitor size={32} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">IT Node Active</div>
            <div className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em] mt-2 italic">Tech Infrastructure Up</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Recent Students List */}
        <div className="bg-white rounded-[3rem] border border-black/5 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-700">
          <div className="p-10 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white">
                <Laptop size={24} />
              </div>
              <h2 className="text-xl font-black text-black tracking-tight">Recent Interns</h2>
            </div>
            <Link href="/departments/it/dashboard/admin/students" className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 hover:translate-x-2 transition-transform">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="p-6 space-y-3 flex-grow bg-gray-50/30">
            {recentStudents.length === 0 ? (
              <div className="text-center py-16 opacity-30">
                <p className="text-sm font-black uppercase tracking-widest">No interns registered</p>
              </div>
            ) : (
              recentStudents.map(student => (
                <div 
                  key={student.id} 
                  className="flex items-center justify-between p-6 rounded-[2rem] bg-white border border-black/5 shadow-sm"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                      {student.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-lg text-black leading-none">{student.name}</p>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">{student.course || 'GENERAL IT'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Clients List */}
        <div className="bg-white rounded-[3rem] border border-black/5 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-700">
          <div className="p-10 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <Building2 size={24} />
              </div>
              <h2 className="text-xl font-black text-black tracking-tight">Recent Clients</h2>
            </div>
            <Link href="/departments/it/dashboard/admin/clients" className="text-[11px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2 hover:translate-x-2 transition-transform">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="p-6 space-y-3 flex-grow bg-indigo-50/20">
            {recentClients.length === 0 ? (
              <div className="text-center py-16 opacity-30">
                <p className="text-sm font-black uppercase tracking-widest">No clients found</p>
              </div>
            ) : (
              recentClients.map(client => (
                <div 
                  key={client.id} 
                  className="flex items-center justify-between p-6 rounded-[2rem] bg-white border border-black/5 shadow-sm"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 font-black">
                      {client.companyName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-lg text-black leading-none">{client.companyName}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{client.contactPerson}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Shortcuts & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Link href="/departments/it/dashboard/admin/students/new" className="bg-white border border-black/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-black hover:text-white transition-all group shadow-sm hover:shadow-2xl">
            <UserPlus size={28} className="group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Add Student</span>
          </Link>
          <Link href="/departments/it/dashboard/admin/clients/new" className="bg-indigo-50 border border-indigo-100 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-indigo-600 hover:text-white transition-all group shadow-sm hover:shadow-2xl text-indigo-600">
            <Building2 size={28} className="group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Add Client</span>
          </Link>
          <Link href="/departments/it/dashboard/admin/staff" className="bg-white border border-black/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-black hover:text-white transition-all group shadow-sm hover:shadow-2xl">
            <Users size={28} className="group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Staff Team</span>
          </Link>
          <Link href="/departments/it/dashboard/profile" className="bg-white border border-black/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-black hover:text-white transition-all group shadow-sm hover:shadow-2xl">
            <Activity size={28} className="group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Status</span>
          </Link>
        </div>
        
        <div className="bg-gradient-to-br from-black to-gray-900 p-10 rounded-[3rem] text-white flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[80px]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50">Tech Bulletin</h3>
            </div>
            <p className="text-base leading-relaxed text-gray-300 font-bold italic tracking-tight">
              IT Node is officially live. Management of <span className="text-indigo-400">Students</span> and <span className="text-white">Project Clients</span> is now centralized.
            </p>
          </div>
          <div className="mt-10 flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">System v3.0 Powered</span>
            <ArrowUpRight size={20} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
