// src/app/departments/welfare/dashboard/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy
} from 'firebase/firestore';
import {
  Heart, UserCog, TrendingUp,
  Users, ChevronRight, Activity, Loader2,
  Plus, BarChart3
} from 'lucide-react';
import { LogoLoader } from '@/components/ui';
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <LogoLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Greeting */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-slate-900">
            {getGreeting()}, {session?.displayName?.split(' ')?.[0] || session?.name?.split(' ')?.[0] || 'Admin'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-light">
            Today is {formatDateDMY(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href={session?.role === 'superadmin' ? "/departments/welfare/dashboard/superadmin/reports" : "/departments/welfare/dashboard/admin/reports"}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-medium transition-all shadow-sm whitespace-nowrap hover:-translate-y-0.5"
          >
            <BarChart3 size={15} />
            Finance Reports
          </Link>
          <Link 
            href="/departments/welfare/dashboard/admin/children/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-sm font-medium transition-all shadow-sm whitespace-nowrap hover:-translate-y-0.5"
          >
            <Plus size={15} />
            Add Child
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Children</span>
            <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
              <Heart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-normal text-slate-900 tracking-tight">{totalChildren}</div>
          <p className="text-xs text-slate-400 mt-2">Currently enrolled in welfare</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Donors</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-normal text-slate-900 tracking-tight">{totalDonors}</div>
          <p className="text-xs text-slate-400 mt-2">Registered contributors</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">System Status</span>
            <div className="p-2 bg-violet-50 rounded-xl text-violet-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-normal text-slate-900 tracking-tight text-emerald-600 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-2xl">Active</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">All services functional</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Children */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-medium text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" /> 
              Recent Admissions
            </h2>
            <Link href="/departments/welfare/dashboard/admin/children" className="text-xs text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1 font-medium">
              View registry <ChevronRight size={12} />
            </Link>
          </div>
          
          <div className="p-4 flex-1">
            {activeChildren.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-slate-400 text-sm font-light">No active children found.</p>
                <Link href="/departments/welfare/dashboard/admin/children/new" className="text-slate-900 text-xs underline mt-2 font-medium hover:text-slate-600">
                  Add your first child
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {activeChildren.map(child => (
                  <Link 
                    key={child.id} 
                    href={`/departments/welfare/dashboard/admin/children/${child.id}`}
                    className="flex items-center justify-between p-3 hover:bg-slate-50/50 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium text-sm group-hover:bg-slate-200 transition-colors">
                        {child.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{child.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{child.customId || child.id}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] p-6">
          <h2 className="text-base font-medium text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" /> 
            Quick Access
          </h2>
          <div className="flex flex-col gap-3">
            <Link 
              href="/departments/welfare/dashboard/admin/children/new"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Plus size={16} />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">New Admission</span>
            </Link>
            
            <Link 
              href="/departments/welfare/dashboard/admin/children"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Users size={16} />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Child Registry</span>
            </Link>

            <Link 
              href="/departments/welfare/dashboard/admin/donors"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Heart size={16} />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Donor Registry</span>
            </Link>

            <Link 
              href="/departments/welfare/dashboard/profile"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <UserCog size={16} />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">My Staff Profile</span>
            </Link>
          </div>

          <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">System Notice</h3>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Staff records, finance, and payroll tools are managed under the <span className="text-slate-900 font-medium">HQ Manager Portal</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

