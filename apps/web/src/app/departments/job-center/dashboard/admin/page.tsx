// d:\Khan Hub\apps\web\src\app\departments\job-center\dashboard\admin\page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy, limit, Timestamp, getCountFromServer
} from 'firebase/firestore';
import {
  Users, Building2, Briefcase, Plus, ChevronRight, Activity, 
  Loader2, TrendingUp, UserPlus, Building, Search, ArrowUpRight, Calendar
} from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalSeekers, setTotalSeekers] = useState(0);
  const [totalEmployers, setTotalEmployers] = useState(0);
  const [recentSeekers, setRecentSeekers] = useState<any[]>([]);
  const [recentEmployers, setRecentEmployers] = useState<any[]>([]);

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) { router.push('/departments/job-center/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/job-center/login'); return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    loadDashboard();
  }, [session]);

  const loadDashboard = async () => {
    try {
      // 1. Fetch Seekers (Recent 5)
      const recentSeekersQuery = query(
        collection(db, 'jobcenter_seekers'), 
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const seekersSnap = await getDocs(recentSeekersQuery);
      setRecentSeekers(seekersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Count Seekers by fetching limited slice (Save aggregation quota)
      const totalSeekersSnap = await getDocs(query(collection(db, 'jobcenter_seekers'), where('isActive', '==', true), limit(100)));
      setTotalSeekers(totalSeekersSnap.size);

      // 3. Fetch Employers (Recent 5)
      const recentEmployersQuery = query(
        collection(db, 'jobcenter_employers'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const employersSnap = await getDocs(recentEmployersQuery);
      setRecentEmployers(employersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 4. Count Employers by fetching limited slice (Save aggregation quota)
      const totalEmployersSnap = await getDocs(query(collection(db, 'jobcenter_employers'), where('isActive', '==', true), limit(100)));
      setTotalEmployers(totalEmployersSnap.size);

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">

      {/* Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-black/5 pb-10">
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-black tracking-tighter leading-tight">
            {getGreeting()}, <span className="text-pink-600">{session?.displayName?.split(' ')?.[0] || session?.name?.split(' ')?.[0] || 'Admin'}</span> 👋
          </h1>
          <p className="text-xs text-gray-400 font-black uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
            <Calendar size={14} className="text-pink-500" />
            {formatDateDMY(new Date())} • Khan Hub Job Center Admin
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link 
            href="/departments/job-center/dashboard/admin/seekers/new"
            className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl text-[13px] font-black hover:bg-pink-600 transition-all active:scale-95 shadow-2xl shadow-black/10 group"
          >
            <UserPlus size={20} className="group-hover:scale-110 transition-transform" /> 
            Add Seeker
          </Link>
          <Link 
            href="/departments/job-center/dashboard/admin/employers/new"
            className="flex items-center gap-3 px-8 py-4 bg-pink-600 text-white rounded-2xl text-[13px] font-black hover:bg-black transition-all active:scale-95 shadow-2xl shadow-pink-200 group"
          >
            <Building size={20} className="group-hover:scale-110 transition-transform" /> 
            Add Employer
          </Link>
        </div>
      </div>

      {/* High-Level Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Seeker Stat */}
        <div className="bg-white rounded-[3rem] border border-black/5 shadow-sm p-10 flex items-center gap-8 group hover:border-black/20 transition-all duration-500">
          <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-xl shadow-indigo-100 group-hover:shadow-black/20">
            <Users size={32} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-5xl font-black text-black tracking-tighter">{totalSeekers}</div>
            <div className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">Active Seekers</div>
          </div>
        </div>

        {/* Employer Stat */}
        <div className="bg-white rounded-[3rem] border border-black/5 shadow-sm p-10 flex items-center gap-8 group hover:border-pink-200 transition-all duration-500">
          <div className="w-20 h-20 rounded-[2rem] bg-pink-50 text-pink-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-pink-600 group-hover:text-white transition-all duration-500 shadow-xl shadow-pink-100 group-hover:shadow-pink-200">
            <Building2 size={32} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-5xl font-black text-black tracking-tighter">{totalEmployers}</div>
            <div className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">Companies</div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-black rounded-[3rem] shadow-2xl shadow-black/20 p-10 flex items-center gap-8 group transition-all duration-500 sm:col-span-2 lg:col-span-1">
          <div className="w-20 h-20 rounded-[2rem] bg-white/10 text-pink-400 flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-all duration-500">
            <Activity size={32} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">System Live</div>
            <div className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em] mt-2 italic">Real-time tracking</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Recent Seekers List */}
        <div className="bg-white rounded-[3rem] border border-black/5 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-700">
          <div className="p-10 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white">
                <Search size={24} />
              </div>
              <h2 className="text-xl font-black text-black tracking-tight">Recent Seekers</h2>
            </div>
            <Link href="/departments/job-center/dashboard/admin/seekers" className="text-[11px] font-black text-pink-600 uppercase tracking-[0.2em] flex items-center gap-2 hover:translate-x-2 transition-transform">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="p-6 space-y-3 flex-grow bg-gray-50/30">
            {recentSeekers.length === 0 ? (
              <div className="text-center py-16 opacity-30">
                <p className="text-sm font-black uppercase tracking-widest">No seekers found</p>
              </div>
            ) : (
              recentSeekers.map(seeker => (
                <Link 
                  key={seeker.id} 
                  href={`/departments/job-center/dashboard/admin/seekers/${seeker.id}`}
                  className="flex items-center justify-between p-6 rounded-[2rem] bg-white hover:bg-black transition-all group/item border border-black/5 hover:border-black shadow-sm active:scale-[0.98]"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 font-black group-hover/item:bg-white/10 group-hover/item:text-white overflow-hidden transition-colors">
                      {seeker.photoUrl ? <img src={seeker.photoUrl} alt="" className="w-full h-full object-cover" /> : seeker.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-lg text-black group-hover/item:text-white leading-none transition-colors">{seeker.name}</p>
                      <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mt-2">{seeker.loginId || 'ID PENDING'}</p>
                    </div>
                  </div>
                  <ArrowUpRight size={20} className="text-gray-300 group-hover/item:text-pink-500 group-hover/item:-translate-y-1 group-hover/item:translate-x-1 transition-all" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Employers List */}
        <div className="bg-white rounded-[3rem] border border-black/5 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-700">
          <div className="p-10 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-100">
                <Building size={24} />
              </div>
              <h2 className="text-xl font-black text-black tracking-tight">Recent Companies</h2>
            </div>
            <Link href="/departments/job-center/dashboard/admin/employers" className="text-[11px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2 hover:translate-x-2 transition-transform">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="p-6 space-y-3 flex-grow bg-pink-50/20">
            {recentEmployers.length === 0 ? (
              <div className="text-center py-16 opacity-30">
                <p className="text-sm font-black uppercase tracking-widest">No companies found</p>
              </div>
            ) : (
              recentEmployers.map(emp => (
                <Link 
                  key={emp.id} 
                  href={`/departments/job-center/dashboard/admin/employers/${emp.id}`}
                  className="flex items-center justify-between p-6 rounded-[2rem] bg-white hover:bg-pink-600 transition-all group/item border border-black/5 hover:border-pink-500 shadow-sm active:scale-[0.98]"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 font-black group-hover/item:bg-white/10 group-hover/item:text-white overflow-hidden transition-colors">
                      {emp.logoUrl ? <img src={emp.logoUrl} alt="" className="w-full h-full object-cover" /> : emp.companyName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-lg text-black group-hover/item:text-white leading-none transition-colors">{emp.companyName}</p>
                      <p className="text-[10px] font-black text-gray-400 group-hover/item:text-pink-200 uppercase tracking-widest mt-2 transition-colors">{emp.industry || 'No Industry Set'}</p>
                    </div>
                  </div>
                  <ArrowUpRight size={20} className="text-gray-300 group-hover/item:text-white group-hover/item:-translate-y-1 group-hover/item:translate-x-1 transition-all" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Shortcuts & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Link href="/departments/job-center/dashboard/admin/seekers/new" className="bg-white border border-black/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-black hover:text-white transition-all group shadow-sm hover:shadow-2xl">
            <UserPlus size={28} className="group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Add Seeker</span>
          </Link>
          <Link href="/departments/job-center/dashboard/admin/employers/new" className="bg-pink-50 border border-pink-100 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-pink-600 hover:text-white transition-all group shadow-sm hover:shadow-2xl text-pink-600">
            <Building size={28} className="group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Add Employer</span>
          </Link>
          <Link href="/departments/job-center/dashboard/admin/staff" className="bg-white border border-black/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-black hover:text-white transition-all group shadow-sm hover:shadow-2xl">
            <Users size={28} className="group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Staff</span>
          </Link>
          <Link href="/departments/job-center/dashboard/profile" className="bg-white border border-black/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-black hover:text-white transition-all group shadow-sm hover:shadow-2xl">
            <Activity size={28} className="group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Profile</span>
          </Link>
        </div>
        
        <div className="bg-gradient-to-br from-black to-gray-900 p-10 rounded-[3rem] text-white flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-[80px]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-pink-500 animate-pulse" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50">Internal Notice</h3>
            </div>
            <p className="text-base leading-relaxed text-gray-300 font-bold italic tracking-tight">
              Job Center Portal is now optimized. Manage <span className="text-pink-400">Companies</span> and <span className="text-white">Seekers</span> profiles independently.
            </p>
          </div>
          <div className="mt-10 flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">System v2.5 Optimized</span>
            <ArrowUpRight size={20} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
