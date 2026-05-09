// src/app/departments/sukoon/dashboard/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, doc, getDoc, setDoc, Timestamp
} from 'firebase/firestore';
import {
  UserCog, TrendingUp,
  Users, Activity, Loader2,
  Plus, X, Calendar
} from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';
import { toast } from 'react-hot-toast';

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

  const [recentStats, setRecentStats] = useState<any[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);

  // Day-Close Stats State
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [submittingStats, setSubmittingStats] = useState(false);
  const [statsForm, setStatsForm] = useState({
    clientsCount: ''
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('sukoon_session');
    if (!sessionData) { router.push('/departments/sukoon/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/sukoon/login'); return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    loadDashboard();
  }, [session]);

  const loadDashboard = async () => {
    try {
      // Fetch Day-Close Stats for all logged days
      const statsQuery = query(
        collection(db, 'sukoon_daily_stats')
      );
      const statsSnap = await getDocs(statsQuery);
      const statsList = statsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a: any, b: any) => {
        return b.id.localeCompare(a.id);
      });

      setRecentStats(statsList);
      
      const total = statsList.reduce((sum, item: any) => sum + (Number(item.clientsCount) || 0), 0);
      setTotalVisits(total);

      // Fetch Day-Close Stats for today
      const todayStr = new Date().toISOString().split('T')[0];
      const dailyDocRef = doc(db, 'sukoon_daily_stats', todayStr);
      const dailyDocSnap = await getDoc(dailyDocRef);
      
      if (dailyDocSnap.exists()) {
        const ds = dailyDocSnap.data();
        setDailyStats(ds);
        setStatsForm({
          clientsCount: String(ds.clientsCount || 0)
        });
      } else {
        setDailyStats(null);
        setStatsForm({
          clientsCount: ''
        });
      }

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStats = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingStats(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const dailyDocRef = doc(db, 'sukoon_daily_stats', todayStr);
      
      const dataToSave = {
        clientsCount: Number(statsForm.clientsCount) || 0,
        reportedBy: session.uid,
        reportedByName: session.displayName || session.name || 'Sukoon Admin',
        reportedAt: Timestamp.now()
      };

      await setDoc(dailyDocRef, dataToSave);
      toast.success('Day-Close operational report saved successfully ✓');
      setShowStatsModal(false);
      loadDashboard();
    } catch (error) {
      console.error('Error saving stats:', error);
      toast.error('Failed to save day-close stats');
    } finally {
      setSubmittingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#FCFAF2]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-10 w-full overflow-x-hidden bg-[#FCFAF2]">

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-black">
            {getGreeting()}, {session?.displayName?.split(' ')?.[0] || session?.name?.split(' ')?.[0] || 'Admin'} 👋
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {formatDateDMY(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowStatsModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-xl text-sm font-black hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 whitespace-nowrap"
          >
            <Plus size={16} /> Submit Day-Close
          </button>
        </div>
      </div>

      {/* Day-Close Operational Stats Banner */}
      <div className="bg-white rounded-[2rem] border border-gray-200 p-6 md:p-8 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
          <Activity size={180} className="text-purple-600" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${dailyStats ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'}`}>
                {dailyStats ? 'Day-Close Active ✓' : 'Day-Close Pending'}
              </span>
              <span className="text-xs text-gray-500 font-bold">Official Operational Stats</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-black">
              {dailyStats ? "Today's verified report has been filed" : "Today's Day-Close report is pending submission"}
            </h2>
            <p className="text-xs text-gray-600 font-medium max-w-xl">
              {dailyStats 
                ? `Filed by ${dailyStats.reportedByName || 'Admin'} at ${dailyStats.reportedAt?.toDate?.() ? dailyStats.reportedAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}. These values override dynamic client counts.`
                : "As Admin, file verified daily client visits to seal today's operational record."}
            </p>
          </div>
          <button
            onClick={() => setShowStatsModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-purple-100 whitespace-nowrap border border-purple-500/20"
          >
            <Plus size={16} />
            {dailyStats ? 'Update Day-Close Stats' : 'Submit Day-Close Stats'}
          </button>
        </div>

        {dailyStats && (
          <div className="grid grid-cols-1 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-center max-w-xs mx-auto w-full">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Verified Clients Visited</p>
              <p className="text-lg md:text-xl font-black text-black mt-1">{dailyStats.clientsCount}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm p-4 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-purple-100 transition-colors">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Calendar className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black text-black">{recentStats.length}</div>
            <div className="text-[9px] md:text-sm text-gray-500 font-black uppercase tracking-widest mt-1">Days Logged</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm p-4 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-blue-100 transition-colors">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black text-black">{totalVisits}</div>
            <div className="text-[9px] md:text-sm text-gray-500 font-black uppercase tracking-widest mt-1">Total Client Visits</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm p-4 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-indigo-100 transition-colors sm:col-span-2 lg:col-span-1">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <div className="text-xl md:text-4xl font-black text-black">Real-time</div>
            <div className="text-[9px] md:text-sm text-gray-500 font-black uppercase tracking-widest mt-1">Data Insights</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Daily Operational History */}
        <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 md:p-8 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-black text-black flex items-center gap-3 text-sm md:text-base">
              <Activity className="w-5 h-5 text-purple-500" /> Daily Operational History
            </h2>
            <span className="text-[9px] md:text-xs font-black text-purple-600 uppercase tracking-widest whitespace-nowrap">
              Last 7 Days
            </span>
          </div>
          <div className="p-3 md:p-4">
            {recentStats.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm font-medium">No day-close records found.</p>
                <button onClick={() => setShowStatsModal(true)} className="text-purple-600 text-sm font-bold mt-2 inline-block">File today's day-close</button>
              </div>
            ) : (
                <div className="grid grid-cols-1 gap-2">
                  {recentStats.slice(0, 7).map(stat => (
                    <div 
                      key={stat.id} 
                      className="flex items-center justify-between p-3 md:p-4 rounded-2xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-black text-sm flex-shrink-0">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-black text-sm">{formatDateDMY(new Date(stat.id))}</p>
                          <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Reported by {stat.reportedByName || 'Admin'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 font-black text-xs rounded-full">
                          {stat.clientsCount} Clients
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm p-4 md:p-8">
          <h2 className="font-black text-black mb-4 md:mb-6 flex items-center gap-3 text-sm md:text-base">
            <TrendingUp className="w-5 h-5 text-purple-500" /> Quick Tasks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <button 
              onClick={() => setShowStatsModal(true)}
              className="flex items-center gap-3 p-4 rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors group active:scale-95 text-left w-full"
            >
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                <Plus size={18} />
              </div>
              <span className="font-bold text-sm">Submit Day-Close Stats</span>
            </button>

            <Link 
              href="/departments/sukoon/dashboard/profile"
              className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors group group-hover:bg-gray-100 transition-all duration-300 active:scale-95"
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
              Staff management, finance, and attendance logs have been moved to the <span className="text-teal-400 font-bold">HQ Manager Portal</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 md:p-8 border border-gray-200 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowStatsModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-black hover:bg-gray-200 transition-all"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="font-black text-black text-lg">Daily Operational Stats</h3>
                <p className="text-xs text-gray-500 font-medium">Record verified client visits for today</p>
              </div>
            </div>

            <form onSubmit={handleSaveStats} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Clients Count</label>
                <input 
                  type="number"
                  required
                  min="0"
                  placeholder="Enter total clients visited today"
                  value={statsForm.clientsCount}
                  onChange={(e) => setStatsForm({ ...statsForm, clientsCount: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-black font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatsModal(false)}
                  className="flex-1 py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStats}
                  className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
                >
                  {submittingStats ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
