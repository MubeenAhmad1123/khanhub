// src/app/departments/job-center/dashboard/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy, limit, Timestamp
} from 'firebase/firestore';
import {
  Heart, UserCog, TrendingUp, TrendingDown,
  Users, Calendar, ChevronRight, Activity, Loader2,
  BarChart3, Plus, AlertCircle
} from 'lucide-react';
import { formatDateDMY, toDate } from '@/lib/utils';

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

  const [totalSeekers, setTotalSeekers] = useState(0);
  const [activeSeekers, setActiveSeekers] = useState<any[]>([]);

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) { router.push('/departments/job-center/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin') {
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
      const seekersSnap = await getDocs(query(
        collection(db, 'jobcenter_seekers'), 
        where('isActive', '==', true),
        orderBy('name', 'asc')
      ));

      setTotalSeekers(seekersSnap.size);
      setActiveSeekers(seekersSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).slice(0, 5));

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-10 w-full overflow-x-hidden">

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-gray-900">
            {getGreeting()}, {session?.displayName?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {formatDateDMY(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/departments/job-center/dashboard/admin/seekers/new"
            className="flex items-center gap-2 px-5 py-3 bg-orange-600 text-white rounded-xl text-sm font-black hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 whitespace-nowrap"
          >
            <Plus size={16} /> Add Seeker
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm p-4 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-orange-100 transition-colors">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Heart className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black text-gray-900">{totalSeekers}</div>
            <div className="text-[9px] md:text-sm text-gray-500 font-black uppercase tracking-widest mt-1">Active Seekers</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm p-4 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-blue-100 transition-colors">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <div className="text-xl md:text-4xl font-black text-gray-900">Seeker Focus</div>
            <div className="text-[9px] md:text-sm text-gray-500 font-black uppercase tracking-widest mt-1">Management Mode</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm p-4 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-purple-100 transition-colors sm:col-span-2 lg:col-span-1">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <div className="text-xl md:text-4xl font-black text-gray-900">Real-time</div>
            <div className="text-[9px] md:text-sm text-gray-500 font-black uppercase tracking-widest mt-1">Data Insights</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Recent seekers */}
        <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 md:p-8 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-black text-gray-900 flex items-center gap-3 text-sm md:text-base">
              <Activity className="w-5 h-5 text-orange-500" /> Recent Seekers
            </h2>
            <Link href="/departments/job-center/dashboard/admin/seekers" className="text-[9px] md:text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-transform whitespace-nowrap">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="p-3 md:p-4">
            {activeSeekers.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm font-medium">No active seekers found.</p>
                <Link href="/departments/job-center/dashboard/admin/seekers/new" className="text-orange-600 text-sm font-bold mt-2 inline-block">Add your first seeker</Link>
              </div>
            ) : (
                <div className="grid grid-cols-1 gap-2">
                  {activeSeekers.map(seeker => (
                    <Link 
                      key={seeker.id} 
                      href={`/departments/job-center/dashboard/admin/seekers/${seeker.id}`}
                      className="flex items-center justify-between p-3 md:p-4 rounded-2xl hover:bg-gray-50 transition-colors group active:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-black text-sm group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors flex-shrink-0">
                          {seeker.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{seeker.name}</p>
                          <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">{seeker.customId || seeker.id}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </Link>
                  ))}
                </div>
            )}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm p-4 md:p-8">
          <h2 className="font-black text-gray-900 mb-4 md:mb-6 flex items-center gap-3 text-sm md:text-base">
            <TrendingUp className="w-5 h-5 text-orange-500" /> Quick Tasks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
            <Link 
              href="/departments/job-center/dashboard/admin/seekers/new"
              className="flex items-center gap-3 p-4 rounded-2xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors group active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                <Plus size={18} />
              </div>
              <span className="font-bold text-sm">New Admission</span>
            </Link>
            
            <Link 
              href="/departments/job-center/dashboard/admin/seekers"
              className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors group active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                <Users size={18} />
              </div>
              <span className="font-bold text-sm">Seeker Registry</span>
            </Link>

            <Link 
              href="/departments/job-center/dashboard/profile"
              className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors group active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                <UserCog size={18} />
              </div>
              <span className="font-bold text-sm">My Staff Profile</span>
            </Link>
          </div>

          <div className="mt-6 md:mt-10 p-4 md:p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl md:rounded-3xl text-white">
            <h3 className="font-black text-[9px] uppercase tracking-[0.2em] opacity-50 mb-2">Notice</h3>
            <p className="text-xs leading-relaxed text-gray-300">
              Staff management, finance, and attendance logs have been moved to the <span className="text-orange-400 font-bold">HQ Manager Portal</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

