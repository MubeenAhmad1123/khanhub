// d:\khanhub\apps\web\src\app\departments\job-center\dashboard\admin\page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy, limit, Timestamp
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
      // 1. Fetch Seekers
      const seekersQuery = query(
        collection(db, 'jobcenter_seekers'), 
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const seekersSnap = await getDocs(seekersQuery);
      setTotalSeekers(seekersSnap.size); // This is just for the first page, we need a count really.
      // For now, let's just get the count from a general query
      const allSeekersSnap = await getDocs(query(collection(db, 'jobcenter_seekers'), where('isActive', '==', true)));
      setTotalSeekers(allSeekersSnap.size);
      
      setRecentSeekers(seekersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Fetch Employers
      const employersQuery = query(
        collection(db, 'jobcenter_employers'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const employersSnap = await getDocs(employersQuery);
      const allEmployersSnap = await getDocs(query(collection(db, 'jobcenter_employers'), where('isActive', '==', true)));
      setTotalEmployers(allEmployersSnap.size);
      
      setRecentEmployers(employersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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
    <div className="space-y-6 pb-10 w-full animate-in fade-in duration-500">

      {/* Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">
            {getGreeting()}, {session?.displayName?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.15em] mt-1 flex items-center gap-2">
            <Calendar size={14} className="text-blue-500" />
            {formatDateDMY(new Date())}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link 
            href="/departments/job-center/dashboard/admin/seekers/new"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-black transition-all shadow-xl shadow-blue-100 whitespace-nowrap group"
          >
            <UserPlus size={18} className="group-hover:scale-110 transition-transform" /> 
            Add seeker
          </Link>
          <Link 
            href="/departments/job-center/dashboard/admin/employers/new"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-black transition-all shadow-xl shadow-indigo-100 whitespace-nowrap group"
          >
            <Building size={18} className="group-hover:scale-110 transition-transform" /> 
            Add Employer
          </Link>
        </div>
      </div>

      {/* High-Level Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Seeker Stat */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex items-center gap-6 group hover:border-blue-200 transition-all hover:shadow-lg">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <Users size={28} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-4xl font-black text-gray-900">{totalSeekers}</div>
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Active Seekers</div>
          </div>
        </div>

        {/* Employer Stat */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex items-center gap-6 group hover:border-indigo-200 transition-all hover:shadow-lg">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <Building2 size={28} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-4xl font-black text-gray-900">{totalEmployers}</div>
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Registered Companies</div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex items-center gap-6 group hover:border-green-200 transition-all hover:shadow-lg sm:col-span-2 lg:col-span-1 text-black">
          <div className="w-16 h-16 rounded-3xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-all duration-300">
            <Activity size={28} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-xl font-black text-gray-900">System Live</div>
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Real-time matching</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Seekers List */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Search size={20} />
              </div>
              <h2 className="font-black text-gray-900 tracking-tight">Recent Job Seekers</h2>
            </div>
            <Link href="/departments/job-center/dashboard/admin/seekers" className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-transform group">
              View All <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="p-4 space-y-2 flex-grow">
            {recentSeekers.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <p className="text-sm font-bold">No seekers registered yet.</p>
              </div>
            ) : (
              recentSeekers.map(seeker => (
                <Link 
                  key={seeker.id} 
                  href={`/departments/job-center/dashboard/admin/seekers/${seeker.id}`}
                  className="flex items-center justify-between p-4 rounded-3xl hover:bg-blue-50/50 transition-all group border border-transparent hover:border-blue-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 font-black group-hover:bg-white group-hover:shadow-sm overflow-hidden">
                      {seeker.photoUrl ? <img src={seeker.photoUrl} alt="" className="w-full h-full object-cover" /> : seeker.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-none">{seeker.name}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{seeker.loginId || 'ID PENDING'}</p>
                    </div>
                  </div>
                  <ArrowUpRight size={18} className="text-gray-300 group-hover:text-blue-600 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Employers List */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Building size={20} />
              </div>
              <h2 className="font-black text-gray-900 tracking-tight">Recent Companies</h2>
            </div>
            <Link href="/departments/job-center/dashboard/admin/employers" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-transform group">
              View All <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="p-4 space-y-2 flex-grow">
            {recentEmployers.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <p className="text-sm font-bold">No employers registered yet.</p>
              </div>
            ) : (
              recentEmployers.map(emp => (
                <Link 
                  key={emp.id} 
                  href={`/departments/job-center/dashboard/admin/employers/${emp.id}`}
                  className="flex items-center justify-between p-4 rounded-3xl hover:bg-indigo-50/50 transition-all group border border-transparent hover:border-indigo-100"
                >
                  <div className="flex items-center gap-4 text-black">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 font-black group-hover:bg-white group-hover:shadow-sm overflow-hidden">
                      {emp.logoUrl ? <img src={emp.logoUrl} alt="" className="w-full h-full object-cover" /> : emp.companyName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-none">{emp.companyName}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{emp.industry || 'No Industry Set'}</p>
                    </div>
                  </div>
                  <ArrowUpRight size={18} className="text-gray-300 group-hover:text-indigo-600 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Shortcuts & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/departments/job-center/dashboard/admin/seekers/new" className="bg-blue-50 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-blue-600 hover:text-white transition-all group shadow-sm hover:shadow-lg">
            <UserPlus size={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Add Seeker</span>
          </Link>
          <Link href="/departments/job-center/dashboard/admin/employers/new" className="bg-indigo-50 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-indigo-600 hover:text-white transition-all group shadow-sm hover:shadow-lg">
            <Building size={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Add Employer</span>
          </Link>
          <Link href="/departments/job-center/dashboard/admin/staff" className="bg-gray-50 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-gray-900 hover:text-white transition-all group shadow-sm hover:shadow-lg text-black">
            <Users size={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Manage Staff</span>
          </Link>
          <Link href="/departments/job-center/dashboard/profile" className="bg-gray-50 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-gray-900 hover:text-white transition-all group shadow-sm hover:shadow-lg text-black">
            <Activity size={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">My Profile</span>
          </Link>
        </div>
        
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-[2.5rem] text-white flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Notice Board</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-300 font-medium">
              Job Center Portal is now independent. Company and Seeker profiles are managed here. For payroll and complex HR, use the <span className="text-blue-400 font-bold">HQ Manager Portal</span>.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] font-black uppercase tracking-widest">System v2.0</span>
            <ArrowUpRight size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
