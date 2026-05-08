'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaSession } from '@/hooks/social-media/useMediaSession';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy, limit, doc, updateDoc, increment, Timestamp
} from 'firebase/firestore';
import {
  TrendingUp, Users, Loader2, Sparkles, Check, X, Camera, Share2, HelpCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function MediaAdminOverview() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useMediaSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    pendingContributionsCount: 0,
    totalStaff: 0,
    todaysContentCount: 0
  });
  const [pendingContributions, setPendingContributions] = useState<any[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !['admin', 'manager', 'superadmin'].includes(user.role)) {
      router.push('/departments/social-media/login');
    }
  }, [sessionLoading, user, router]);

  const loadOverviewData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // 1. Load total active staff
      const staffSnap = await getDocs(
        query(collection(db, 'media_users'), where('role', '==', 'staff'))
      );
      const activeStaffCount = staffSnap.size;

      // 2. Load pending contributions
      const pendingContribsSnap = await getDocs(
        query(collection(db, 'media_contributions'), where('isApproved', '==', false))
      );
      const pendingList = pendingContribsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingContributions(pendingList);

      // 3. Load campaigns count and recent list
      const campaignsSnap = await getDocs(collection(db, 'media_campaigns'));
      const activeCampaignsCount = campaignsSnap.docs.filter((d: any) => d.data().status === 'active').length;
      const campaignsList = campaignsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecentCampaigns(campaignsList.slice(0, 5));

      // 4. Load today's content count
      const todayContentSnap = await getDocs(
        query(collection(db, 'media_contributions'), where('date', '==', today))
      );
      const todaysContent = todayContentSnap.size;

      setStats({
        activeCampaigns: activeCampaignsCount,
        pendingContributionsCount: pendingList.length,
        totalStaff: activeStaffCount,
        todaysContentCount: todaysContent
      });

    } catch (error) {
      console.error('Error loading media admin overview:', error);
      toast.error('Failed to load overview data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadOverviewData();
    }
  }, [user, loadOverviewData]);

  const handleApproveContribution = async (contribId: string, staffId: string, points: number = 10) => {
    try {
      // Approve the contribution
      await updateDoc(doc(db, 'media_contributions', contribId), {
        isApproved: true,
        approvedAt: Timestamp.now(),
        approvedBy: user?.displayName || 'Admin'
      });

      // Award growth points to the staff member
      await updateDoc(doc(db, 'media_users', staffId), {
        totalGrowthPoints: increment(points)
      }).catch(async () => {
        // Fallback update if totalGrowthPoints doesn't exist
        await updateDoc(doc(db, 'media_users', staffId), {
          totalGrowthPoints: points
        });
      });

      toast.success('Contribution approved and points awarded!');
      loadOverviewData();
    } catch (error: any) {
      console.error('Error approving contribution:', error);
      toast.error('Failed to approve: ' + error.message);
    }
  };

  const handleRejectContribution = async (contribId: string) => {
    try {
      await updateDoc(doc(db, 'media_contributions', contribId), {
        isApproved: false,
        rejected: true,
        rejectedAt: Timestamp.now(),
        rejectedBy: user?.displayName || 'Admin'
      });
      toast.success('Contribution marked as rejected');
      loadOverviewData();
    } catch (error: any) {
      toast.error('Failed to reject: ' + error.message);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Loading Grid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-8 md:p-12 border border-indigo-500/10 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_40%)]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-500/20">
              Media Core Node
            </span>
            <h1 className="text-3xl md:text-5xl font-[1000] text-white tracking-tighter mt-4 uppercase">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{user?.displayName?.split(' ')[0]}</span>
            </h1>
            <p className="text-indigo-200/60 text-xs md:text-sm font-semibold max-w-xl mt-3 leading-relaxed">
              Welcome back to the Social Media Admin Dashboard. Manage internal campaigns, content logs, and staff performance metrics.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadOverviewData}
              className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
            >
              <Sparkles size={14} className="text-cyan-400 animate-pulse" />
              Sync Grid
            </button>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Campaigns', value: stats.activeCampaigns, icon: Share2, color: 'from-indigo-500 to-indigo-600', text: 'text-indigo-500' },
          { label: 'Pending Approvals', value: stats.pendingContributionsCount, icon: Sparkles, color: 'from-amber-500 to-orange-500', text: 'text-amber-500' },
          { label: 'Total Media Staff', value: stats.totalStaff, icon: Users, color: 'from-cyan-500 to-blue-500', text: 'text-cyan-500' },
          { label: "Today's Content Logs", value: stats.todaysContentCount, icon: Camera, color: 'from-purple-500 to-pink-500', text: 'text-purple-500' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-black/20 border border-gray-200/50 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:translate-y-[-2px] transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
              <div className={`p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 ${stat.text} group-hover:scale-110 transition-transform`}>
                <stat.icon size={18} />
              </div>
            </div>
            <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pending Approvals Card */}
        <div className="lg:col-span-7 bg-white dark:bg-black/20 border border-gray-200/50 dark:border-white/5 rounded-[2rem] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Pending Approvals</h2>
              <p className="text-xs text-slate-400 mt-1">Review staff contributions and reward growth points</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
              {pendingContributions.length} Pending
            </span>
          </div>

          {pendingContributions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
              <Check className="w-12 h-12 text-emerald-500 mb-4 bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-full" />
              <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">All Caught Up!</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">No pending contributions currently require review.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
              {pendingContributions.map((c) => (
                <div key={c.id} className="p-6 bg-slate-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl space-y-4 hover:border-indigo-500/20 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase">{c.staffName || 'Unknown Staff'}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{c.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveContribution(c.id, c.staffId)}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 border border-emerald-500/20 transition-all active:scale-95"
                        title="Approve & award 10 GP"
                      >
                        <Check size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => handleRejectContribution(c.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-500/20 transition-all active:scale-95"
                        title="Reject contribution"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-white dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Campaigns Card */}
        <div className="lg:col-span-5 bg-white dark:bg-black/20 border border-gray-200/50 dark:border-white/5 rounded-[2rem] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Campaigns</h2>
              <p className="text-xs text-slate-400 mt-1">Status of ongoing media distribution campaigns</p>
            </div>
            <button
              onClick={() => router.push('/departments/social-media/dashboard/admin/campaigns')}
              className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest"
            >
              View All
            </button>
          </div>

          {recentCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
              <Share2 className="w-12 h-12 text-indigo-500 mb-4 bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-full animate-pulse" />
              <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">No Campaigns</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Create media campaigns to align staff tasks and achieve branding goals.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
              {recentCampaigns.map((camp) => (
                <div key={camp.id} className="p-5 bg-slate-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl hover:border-indigo-500/20 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-black text-gray-900 dark:text-white uppercase truncate max-w-[180px]">{camp.title}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                      camp.status === 'active' ? 'bg-emerald-100 text-emerald-600 border border-emerald-500/20' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium line-clamp-2">{camp.description}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Platform: <strong className="text-indigo-500">{camp.platform || 'General'}</strong></span>
                    <span>Target: <strong className="text-cyan-500">{camp.target || 'None'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
