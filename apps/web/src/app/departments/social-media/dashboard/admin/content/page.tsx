'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaSession } from '@/hooks/social-media/useMediaSession';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, doc, updateDoc, Timestamp, orderBy, limit
} from 'firebase/firestore';
import {
  Camera, Loader2, Sparkles, Check, X, Search, Calendar,
  FileText, Star, Trophy, ArrowUpRight, CheckCircle2, AlertCircle, Bookmark
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MediaContentLogs() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useMediaSession();

  const [loading, setLoading] = useState(true);
  const [contentList, setContentList] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Aggregated Stats
  const [aggregations, setAggregations] = useState({
    totalLogs: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0
  });

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !['admin', 'manager', 'superadmin'].includes(user.role)) {
      router.push('/departments/social-media/login');
    }
  }, [sessionLoading, user, router]);

  const loadContentLogs = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, 'media_contributions'), orderBy('createdAt', 'desc'))
      );
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setContentList(list);

      // Perform Aggregations
      const total = list.length;
      const approved = list.filter((item: any) => item.isApproved === true).length;
      const rejected = list.filter((item: any) => item.rejected === true).length;
      const pending = list.filter((item: any) => item.isApproved === false && !item.rejected).length;

      setAggregations({
        totalLogs: total,
        approvedCount: approved,
        pendingCount: pending,
        rejectedCount: rejected
      });

    } catch (error) {
      console.error('Error loading content logs:', error);
      toast.error('Failed to load content log database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadContentLogs();
    }
  }, [user]);

  const handleApprove = async (contribId: string, staffId: string, points: number = 10) => {
    try {
      await updateDoc(doc(db, 'media_contributions', contribId), {
        isApproved: true,
        approvedAt: Timestamp.now(),
        approvedBy: user?.displayName || 'Admin'
      });

      toast.success('Log approved successfully!');
      loadContentLogs();
    } catch (error: any) {
      toast.error('Approval failed: ' + error.message);
    }
  };

  const handleReject = async (contribId: string) => {
    try {
      await updateDoc(doc(db, 'media_contributions', contribId), {
        isApproved: false,
        rejected: true,
        rejectedAt: Timestamp.now(),
        rejectedBy: user?.displayName || 'Admin'
      });
      toast.success('Log marked as rejected');
      loadContentLogs();
    } catch (error: any) {
      toast.error('Operation failed: ' + error.message);
    }
  };

  // Filter & Search Logic
  const filteredLogs = contentList.filter(log => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'approved' && log.isApproved === true) ||
      (filter === 'pending' && log.isApproved === false && !log.rejected) ||
      (filter === 'rejected' && log.rejected === true);

    const matchesSearch =
      (log.staffName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.date || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

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

  const glassStyle = "bg-white/70 dark:bg-black/20 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 shadow-sm";

  return (
    <div className="space-y-10">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-500/20">
            Publishing Archives
          </span>
          <h1 className="text-3xl md:text-5xl font-[1000] text-gray-900 dark:text-white tracking-tighter mt-4 uppercase">
            Content <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-400">Log Aggregation</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-semibold mt-2 leading-relaxed">
            Review live content submissions, evaluate daily publications, and monitor branding compliance.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Content Submissions', value: aggregations.totalLogs, icon: Bookmark, text: 'text-indigo-500' },
          { label: 'Approved & Active', value: aggregations.approvedCount, icon: CheckCircle2, text: 'text-emerald-500' },
          { label: 'Awaiting Approvals', value: aggregations.pendingCount, icon: Sparkles, text: 'text-amber-500' },
          { label: 'Rejected / Drafts', value: aggregations.rejectedCount, icon: AlertCircle, text: 'text-rose-500' }
        ].map((stat, idx) => (
          <div key={idx} className={`p-6 rounded-3xl ${glassStyle} flex flex-col justify-between hover:scale-[1.01] transition-all`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-[140px]">{stat.label}</span>
              <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 ${stat.text}`}>
                <stat.icon size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Panel Content */}
      <div className={`p-8 rounded-[2.5rem] ${glassStyle} space-y-6`}>
        {/* Filter bar & search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-gray-100 dark:border-white/5">
          {/* Tabs */}
          <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-2xl overflow-x-auto gap-1">
            {[
              { id: 'all', label: 'All Content' },
              { id: 'approved', label: 'Approved' },
              { id: 'pending', label: 'Pending' },
              { id: 'rejected', label: 'Rejected' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as any)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  filter === t.id
                    ? 'bg-white dark:bg-white/10 text-indigo-500 shadow-sm'
                    : 'text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by creator, keywords..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-2xl text-xs font-bold text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Content list Grid */}
        {filteredLogs.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-3xl opacity-60">
            <Camera className="w-12 h-12 text-slate-300 mb-4 animate-pulse" />
            <p className="text-sm font-black text-gray-900 dark:text-white uppercase">Archive Empty</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">No logs found matching your search query or filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-6 bg-slate-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl space-y-4 hover:border-indigo-500/10 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black uppercase text-sm">
                      {log.staffName?.[0] || 'S'}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{log.staffName || 'Creator Profile'}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">{log.date || 'Shift Date'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {log.isApproved === false && !log.rejected && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(log.id, log.staffId)}
                          className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 border border-emerald-500/20 transition-all active:scale-95"
                          title="Approve"
                        >
                          <Check size={14} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => handleReject(log.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-500/20 transition-all active:scale-95"
                          title="Reject"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${
                      log.isApproved === true ? 'bg-emerald-100 text-emerald-600' :
                      log.rejected === true ? 'bg-rose-100 text-rose-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {log.isApproved === true ? 'Approved' : log.rejected === true ? 'Rejected' : 'Pending Approval'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-white dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                  {log.content}
                </p>

                {log.approvedBy && (
                  <div className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-white/5">
                    <CheckCircle2 size={12} /> Approved by {log.approvedBy}
                  </div>
                )}
                {log.rejectedBy && (
                  <div className="text-[9px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-white/5">
                    <AlertCircle size={12} /> Rejected by {log.rejectedBy}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
