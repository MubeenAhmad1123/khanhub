'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Search, Link as LinkIcon, CheckCircle, Clock, Users } from 'lucide-react';

interface ReferredRelation {
  id: string;
  referredUser: any;
  referrer: any;
  referredBy: string;
  createdAt: any;
}

export default function AdminReferralsPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      return;
    }

    // Subscribe to users collection
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error('[AdminReferrals] Users snapshot error:', err);
    });

    // Subscribe to videos collection
    const unsubVideos = onSnapshot(collection(db, 'videos'), (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error('[AdminReferrals] Videos snapshot error:', err);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubVideos();
    };
  }, [user?.role]);

  // Compute live referral relationships in real-time
  const referrals = useMemo(() => {
    // Create quick lookup maps
    const userMap = new Map<string, any>();
    const codeMap = new Map<string, any>();
    users.forEach(u => {
      userMap.set(u.id, u);
      if (u.referralCode) {
        codeMap.set(u.referralCode, u);
      }
    });

    // Create approved videos lookup map (userId -> count of approved videos)
    const approvedVideosMap = new Map<string, number>();
    videos.forEach(v => {
      if (v.admin_status === 'approved') {
        const currentCount = approvedVideosMap.get(v.userId) || 0;
        approvedVideosMap.set(v.userId, currentCount + 1);
      }
    });

    // Filter and map out referred relations
    const list = users
      .filter(u => u.referredBy)
      .map(u => {
        const referrer = userMap.get(u.referredByUserId || '') || codeMap.get(u.referredBy || '');
        const approvedCount = approvedVideosMap.get(u.id) || 0;
        return {
          id: u.id,
          referredUser: {
            ...u,
            approvedVideoCount: approvedCount
          },
          referrer: referrer || null,
          referredBy: u.referredBy || '',
          createdAt: u.createdAt,
        } as ReferredRelation;
      });

    // Sort by creation date descending
    list.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    return list;
  }, [users, videos]);

  // Search filter matching name, email, or referral code
  const filtered = referrals.filter(r => {
    const q = searchQuery.toLowerCase();
    const referrerMatch =
      r.referrer?.displayName?.toLowerCase().includes(q) ||
      r.referrer?.email?.toLowerCase().includes(q) ||
      r.referredBy?.toLowerCase().includes(q);
    const referredMatch =
      r.referredUser?.displayName?.toLowerCase().includes(q) ||
      r.referredUser?.email?.toLowerCase().includes(q);
    return referrerMatch || referredMatch;
  });

  const totalReferrals = referrals.length;
  const completedReferrals = referrals.filter(r => (r.referredUser?.approvedVideoCount || 0) >= 1).length;
  const pendingReferrals = totalReferrals - completedReferrals;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border border-slate-100 italic font-bold">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        LOADING REFERRAL RECORDS...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
          <LinkIcon className="w-8 h-8 text-blue-600" />
          Referral Tracking Directory
        </h1>
        <p className="text-slate-500 font-bold">Audit, visualize and track user referral program statistics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'TOTAL REFERRALS', value: totalReferrals, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'COMPLETED REFERRALS', value: completedReferrals, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'PENDING CREDITS', value: pendingReferrals, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
        ].map((stat, idx) => (
          <div key={idx} className={`bg-white p-6 rounded-3xl border-2 ${stat.border} shadow-sm flex items-center justify-between`}>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className={`text-4xl font-black ${stat.color} leading-none`}>{stat.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
              <Users className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Panel */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Referral Ledger</h2>
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 h-5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search referrers or seekers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-bold italic">
              No referral records matching search query.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Referrer (Invited By)</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Referred User (New Member)</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Approved Videos</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Referral Status</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Signup Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isCompleted = (item.referredUser?.approvedVideoCount || 0) >= 1;
                  const dateStr = item.createdAt?.toDate?.()
                    ? item.createdAt.toDate().toLocaleDateString(undefined, { dateStyle: 'medium' })
                    : 'N/A';

                  return (
                    <tr key={item.id} className="border-b border-slate-100/70 hover:bg-slate-50/50 transition-colors">
                      {/* Referrer info */}
                      <td className="py-4 px-6">
                        {item.referrer ? (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-black text-xs uppercase flex items-center justify-center border border-slate-800">
                              {item.referrer.displayName?.charAt(0) || 'R'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 leading-tight">
                                {item.referrer.displayName}
                              </p>
                              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                {item.referrer.email}
                              </p>
                              <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-md uppercase tracking-wider mt-1 border border-blue-100">
                                Code: {item.referredBy}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black rounded-md uppercase tracking-wider border border-slate-200">
                              Code: {item.referredBy}
                            </span>
                            <p className="text-xs font-bold text-slate-400 italic mt-1">Uploader not found</p>
                          </div>
                        )}
                      </td>

                      {/* Referred User info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-black text-xs uppercase flex items-center justify-center border border-blue-200">
                            {item.referredUser.displayName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-tight">
                              {item.referredUser.displayName}
                            </p>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                              {item.referredUser.email}
                            </p>
                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black rounded-md uppercase tracking-wider mt-1">
                              {item.referredUser.role || 'Job Seeker'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Approved videos count */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${isCompleted
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                            {item.referredUser.approvedVideoCount || 0} Video(s)
                          </span>
                        </div>
                      </td>

                      {/* Referral status */}
                      <td className="py-4 px-6">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-black rounded-full uppercase tracking-wider">
                            <CheckCircle className="w-3.5 h-3.5" /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-black rounded-full uppercase tracking-wider">
                            <Clock className="w-3.5 h-3.5" /> Pending Video
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-sm font-bold text-slate-500">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
