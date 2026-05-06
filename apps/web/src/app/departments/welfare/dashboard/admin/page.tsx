// src/app/departments/welfare/dashboard/admin/page.tsx
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

  const [totalChildren, setTotalChildren] = useState(0);
  const [totalDonors, setTotalDonors] = useState(0);
  const [activeChildren, setActiveChildren] = useState<any[]>([]);

  useEffect(() => {
    const sessionData = localStorage.getItem('welfare_session');
    if (!sessionData) { router.push('/departments/welfare/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/welfare/login'); return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    loadDashboard();
  }, [session]);

  const loadDashboard = async () => {
    try {
      const childrenSnap = await getDocs(query(
        collection(db, 'welfare_children'), 
        where('isActive', '==', true),
        orderBy('name', 'asc')
      ));

      setTotalChildren(childrenSnap.size);
      setActiveChildren(childrenSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).slice(0, 5));

      const donorsSnap = await getDocs(query(
        collection(db, 'welfare_donors'),
        where('isActive', '==', true)
      ));
      setTotalDonors(donorsSnap.size);

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-4 md:space-y-6 pb-10 w-full overflow-x-hidden">

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white">
            {getGreeting()}, {session?.displayName?.split(' ')?.[0] || session?.name?.split(' ')?.[0] || 'Admin'} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
            {formatDateDMY(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/departments/welfare/dashboard/admin/children/new"
            className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl text-sm font-black hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 whitespace-nowrap"
          >
            <Plus size={16} /> Add Child
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white dark:bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm p-4 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-teal-100 dark:hover:border-teal-500/30 transition-colors">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Heart className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white">{totalChildren}</div>
            <div className="text-[9px] md:text-sm text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest mt-1">Active Children</div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm p-4 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-blue-100 dark:hover:border-blue-500/30 transition-colors">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <div className="text-xl md:text-4xl font-black text-gray-900 dark:text-white">{totalDonors}</div>
            <div className="text-[9px] md:text-sm text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest mt-1">Active Donors</div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm p-4 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-purple-100 dark:hover:border-purple-500/30 transition-colors sm:col-span-2 lg:col-span-1">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <div className="text-xl md:text-4xl font-black text-gray-900 dark:text-white">Real-time</div>
            <div className="text-[9px] md:text-sm text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest mt-1">Data Insights</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Recent Children */}
        <div className="lg:col-span-2 bg-white dark:bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="p-4 md:p-8 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-3 text-sm md:text-base">
              <Activity className="w-5 h-5 text-teal-500" /> Recent Children
            </h2>
            <Link href="/departments/welfare/dashboard/admin/children" className="text-[9px] md:text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-transform whitespace-nowrap">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="p-3 md:p-4">
            {activeChildren.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm font-medium">No active children found.</p>
                <Link href="/departments/welfare/dashboard/admin/children/new" className="text-teal-600 text-sm font-bold mt-2 inline-block">Add your first child</Link>
              </div>
            ) : (
                <div className="grid grid-cols-1 gap-2">
                  {activeChildren.map(child => (
                    <Link 
                      key={child.id} 
                      href={`/departments/welfare/dashboard/admin/children/${child.id}`}
                      className="flex items-center justify-between p-3 md:p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group active:bg-gray-100 dark:active:bg-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 font-black text-sm group-hover:bg-teal-50 dark:group-hover:bg-teal-500/20 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex-shrink-0">
                          {child.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{child.name}</p>
                          <p className="text-[9px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest">{child.customId || child.id}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-teal-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </Link>
                  ))}
                </div>
            )}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="bg-white dark:bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm p-4 md:p-8">
          <h2 className="font-black text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center gap-3 text-sm md:text-base">
            <TrendingUp className="w-5 h-5 text-teal-500" /> Quick Tasks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
            <Link 
              href="/departments/welfare/dashboard/admin/children/new"
              className="flex items-center gap-3 p-4 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-colors group active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                <Plus size={18} />
              </div>
              <span className="font-bold text-sm">New Admission</span>
            </Link>
            
            <Link 
              href="/departments/welfare/dashboard/admin/children"
              className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors group active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                <Users size={18} />
              </div>
              <span className="font-bold text-sm">Child Registry</span>
            </Link>

            <Link 
              href="/departments/welfare/dashboard/admin/donors"
              className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors group active:scale-95"
            >
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                <Heart size={18} />
              </div>
              <span className="font-bold text-sm">Donor Registry</span>
            </Link>

            <Link 
              href="/departments/welfare/dashboard/profile"
              className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20 transition-colors group active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                <UserCog size={18} />
              </div>
              <span className="font-bold text-sm">My Staff Profile</span>
            </Link>
          </div>

          <div className="mt-6 md:mt-10 p-4 md:p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl md:rounded-3xl text-white">
            <h3 className="font-black text-[9px] uppercase tracking-[0.2em] opacity-50 mb-2">Notice</h3>
            <p className="text-xs leading-relaxed text-gray-300">
              Staff management, finance, and attendance logs have been moved to the <span className="text-teal-400 font-bold">HQ Manager Portal</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
