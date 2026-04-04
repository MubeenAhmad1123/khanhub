// src/app/departments/rehab/dashboard/admin/page.tsx
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
import { toDate } from '@/lib/utils';

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

  const [totalPatients, setTotalPatients] = useState(0);
  const [activePatients, setActivePatients] = useState<any[]>([]);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) { router.push('/departments/rehab/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin') {
      router.push('/departments/rehab/login'); return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    loadDashboard();
  }, [session]);

  const loadDashboard = async () => {
    try {
      const patientsSnap = await getDocs(query(
        collection(db, 'rehab_patients'), 
        where('isActive', '==', true),
        orderBy('name', 'asc')
      ));

      setTotalPatients(patientsSnap.size);
      setActivePatients(patientsSnap.docs.map(d => ({
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
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">
            {getGreeting()}, {session?.displayName?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/departments/rehab/dashboard/admin/patients/new"
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-2xl text-sm font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-100"
          >
            <Plus size={18} /> Add Patient
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex items-center gap-6 group hover:border-teal-100 transition-colors">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <div className="text-4xl font-black text-gray-900">{totalPatients}</div>
            <div className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Active Patients</div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex items-center gap-6 group hover:border-blue-100 transition-colors">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <div className="text-4xl font-black text-gray-900">Patient Focus</div>
            <div className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Management Mode</div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex items-center gap-6 group hover:border-purple-100 transition-colors">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <div className="text-4xl font-black text-gray-900">Real-time</div>
            <div className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Data Insights</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Patients */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-black text-gray-900 flex items-center gap-3">
              <Activity className="w-6 h-6 text-teal-500" /> Recent Patients
            </h2>
            <Link href="/departments/rehab/dashboard/admin/patients" className="text-xs font-black text-teal-600 uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform">
              View All Patients <ChevronRight size={14} />
            </Link>
          </div>
          <div className="p-4">
            {activePatients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 font-medium">No active patients found.</p>
                <Link href="/departments/rehab/dashboard/admin/patients/new" className="text-teal-600 text-sm font-bold mt-2 inline-block">Add your first patient</Link>
              </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                  {activePatients.map(patient => (
                    <Link 
                      key={patient.id} 
                      href={`/departments/rehab/dashboard/admin/patients/${patient.id}`}
                      className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                          {patient.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{patient.name}</p>
                          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{patient.customId || patient.id}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
            )}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
          <h2 className="font-black text-gray-900 mb-6 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-teal-500" /> Quick Tasks
          </h2>
          <div className="space-y-4">
            <Link 
              href="/departments/rehab/dashboard/admin/patients/new"
              className="flex items-center gap-4 p-4 rounded-2xl bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Plus size={20} />
              </div>
              <span className="font-bold text-sm">New Admission</span>
            </Link>
            
            <Link 
              href="/departments/rehab/dashboard/admin/patients"
              className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Users size={20} />
              </div>
              <span className="font-bold text-sm">Patient Registry</span>
            </Link>

            <Link 
              href="/departments/rehab/dashboard/profile"
              className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <UserCog size={20} />
              </div>
              <span className="font-bold text-sm">My Staff Profile</span>
            </Link>
          </div>

          <div className="mt-10 p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl text-white">
            <h3 className="font-black text-sm uppercase tracking-[0.2em] opacity-50 mb-2">Notice</h3>
            <p className="text-xs leading-relaxed text-gray-300">
              Staff management, finance, and attendance logs have been moved to the <span className="text-teal-400 font-bold">HQ Manager Portal</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
