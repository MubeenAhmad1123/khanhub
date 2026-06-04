'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  CreditCard,
  User,
  Hash,
  Sparkles,
  Calendar,
  Briefcase,
  Activity,
  Check,
  ExternalLink,
  Globe,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { DeptBreakdown, approveTransaction } from '@/lib/hq/superadmin/finance';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { cn, toDate } from '@/lib/utils';

interface DrillDownProps {
  dept: DeptBreakdown | null;
  selectedDate?: string;
  onClose: () => void;
  onUpdate: () => void;
}

export const FinanceDrillDown: React.FC<DrillDownProps> = ({ dept, selectedDate, onClose, onUpdate }) => {
  const [pending, setPending] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [approving, setApproving] = React.useState<string | null>(null);

  const [approved, setApproved] = React.useState<any[]>([]);
  const [loadingApproved, setLoadingApproved] = React.useState(false);

  // Job Center Seekers Live Integration State
  const [seekers, setSeekers] = React.useState<any[]>([]);
  const [loadingSeekers, setLoadingSeekers] = React.useState(false);
  const [seekerStats, setSeekerStats] = React.useState<{
    total: number;
    employed: number;
    seeking: number;
    placementRate: number;
  } | null>(null);

  // Time zone safe date helpers (Asia/Karachi)
  const todayStr = React.useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  const targetDateStr = selectedDate || todayStr;

  const dayKey = React.useCallback((d: Date) => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  }, []);

  const fetchPending = React.useCallback(async () => {
    if (!dept) return;
    setLoading(true);
    try {
      let col = '';
      if (dept.deptId === 'rehab') col = 'rehab_transactions';
      else if (dept.deptId === 'spims') col = 'spims_transactions';
      else if (dept.deptId === 'job-center') col = 'job_center_transactions';
      else if (dept.deptId === 'hospital') col = 'hospital_transactions';
      else col = 'cashierTransactions';

      // Always sort client-side after query to prevent composite index errors
      const q = query(collection(db, col), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      const docsMapped = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          _date: toDate(data.transactionDate || data.date || data.dateStr || data.createdAt)
        };
      }).sort((a, b) => {
        const ta = a._date?.getTime?.() ?? 0;
        const tb = b._date?.getTime?.() ?? 0;
        return tb - ta; // Descending
      });
      
      setPending(docsMapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load pending transactions");
    } finally {
      setLoading(false);
    }
  }, [dept]);

  const fetchApproved = React.useCallback(async () => {
    if (!dept) return;
    setLoadingApproved(true);
    try {
      let col = '';
      if (dept.deptId === 'rehab') col = 'rehab_transactions';
      else if (dept.deptId === 'spims') col = 'spims_transactions';
      else if (dept.deptId === 'job-center') col = 'job_center_transactions';
      else if (dept.deptId === 'hospital') col = 'hospital_transactions';
      else col = 'cashierTransactions';

      const [y, m, d] = targetDateStr.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d, 12, 0, 0); // Noon to avoid TZ edge issues

      const dayStartPKT = new Date(targetDate);
      dayStartPKT.setHours(0, 0, 0, 0);
      const utcStart = new Date(dayStartPKT.getTime() - 5 * 60 * 60 * 1000);
      const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000);

      const tsStart = Timestamp.fromDate(utcStart);
      const tsEnd   = Timestamp.fromDate(utcEnd);

      // Perform single-field Firestore range queries to strictly avoid composite index errors
      const q1 = query(
        collection(db, col),
        where('createdAt', '>=', tsStart),
        where('createdAt', '<', tsEnd)
      );

      const q2 = query(
        collection(db, col),
        where('transactionDate', '>=', tsStart),
        where('transactionDate', '<', tsEnd)
      );

      const q3 = query(
        collection(db, col),
        where('approvedAt', '>=', tsStart),
        where('approvedAt', '<', tsEnd)
      );

      const [snap1, snap2, snap3] = await Promise.all([
        getDocs(q1).catch(() => ({ docs: [] as any[] })),
        getDocs(q2).catch(() => ({ docs: [] as any[] })),
        getDocs(q3).catch(() => ({ docs: [] as any[] })),
      ]);

      const seen = new Set<string>();
      const rawDocs: any[] = [];
      for (const snap of [snap1, snap2, snap3]) {
        for (const doc of snap.docs) {
          if (!seen.has(doc.id)) {
            seen.add(doc.id);
            rawDocs.push({ id: doc.id, ...doc.data() });
          }
        }
      }

      // Map, filter, and sort client-side (fully rule-compliant)
      const mapped = rawDocs.map((tx: any) => {
        return {
          ...tx,
          _date: toDate(tx.transactionDate || tx.date || tx.dateStr || tx.createdAt),
          _approvedDate: tx.approvedAt ? toDate(tx.approvedAt) : null,
        };
      }).filter((tx: any) => {
        if (tx.status !== 'approved') return false;
        
        return tx._date && dayKey(tx._date) === targetDateStr;
      }).sort((a: any, b: any) => {
        const ta = a._date?.getTime?.() ?? 0;
        const tb = b._date?.getTime?.() ?? 0;
        return tb - ta; // Newest first
      });

      setApproved(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load approved transactions");
    } finally {
      setLoadingApproved(false);
    }
  }, [dept, targetDateStr, dayKey]);

  // Fetch job.khanhub.com.pk real-time integration statistics and seeker signup feed
  const fetchJobCenterSyncData = React.useCallback(async () => {
    if (!dept || dept.deptId !== 'job-center') return;
    setLoadingSeekers(true);
    try {
      // 1. Fetch latest 5 seekers
      const qSeekers = query(
        collection(db, 'job_center_seekers'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snapSeekers = await getDocs(qSeekers);
      const seekersMapped = snapSeekers.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          _date: toDate(data.createdAt || data.joiningDate)
        };
      });
      setSeekers(seekersMapped);

      // 2. Fetch seeker registration and placement aggregates
      const totalSnap = await getCountFromServer(collection(db, 'job_center_seekers')).catch(() => ({ data: () => ({ count: 0 }) }));
      const total = totalSnap.data().count;

      const employedSnap = await getCountFromServer(query(collection(db, 'job_center_seekers'), where('isEmployed', '==', true))).catch(() => ({ data: () => ({ count: 0 }) }));
      const employed = employedSnap.data().count;

      const seeking = Math.max(0, total - employed);
      const placementRate = total > 0 ? Math.round((employed / total) * 100) : 0;

      setSeekerStats({
        total,
        employed,
        seeking,
        placementRate
      });
    } catch (err) {
      console.warn("Failed primary Job Center fetch, running optimized fallback query...", err);
      // Fallback: client-side filter and aggregation to prevent composite index limits
      try {
        const fallbackSnap = await getDocs(query(collection(db, 'job_center_seekers'), limit(150)));
        const allSeekers = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sorted = allSeekers.map((s: any) => ({
          ...s,
          _date: toDate(s.createdAt || s.joiningDate)
        })).sort((a: any, b: any) => {
          const ta = a._date?.getTime?.() ?? 0;
          const tb = b._date?.getTime?.() ?? 0;
          return tb - ta;
        });

        setSeekers(sorted.slice(0, 5));
        
        const total = allSeekers.length;
        const employed = allSeekers.filter((s: any) => s.isEmployed).length;
        const seeking = total - employed;
        const placementRate = total > 0 ? Math.round((employed / total) * 100) : 0;

        setSeekerStats({
          total,
          employed,
          seeking,
          placementRate
        });
      } catch (fallbackErr) {
        console.error("Critical failure loading Job Center sync metrics:", fallbackErr);
      }
    } finally {
      setLoadingSeekers(false);
    }
  }, [dept]);

  React.useEffect(() => {
    if (dept) {
      fetchPending();
      fetchApproved();
      if (dept.deptId === 'job-center') {
        fetchJobCenterSyncData();
      }
    }
  }, [dept, fetchPending, fetchApproved, fetchJobCenterSyncData]);

  const handleApprove = async (txId: string) => {
    if (!dept) return;
    setApproving(txId);
    try {
      await approveTransaction(dept.deptId, txId);
      toast.success("Transaction Approved");
      setPending(prev => prev.filter(t => t.id !== txId));
      fetchApproved(); // Refresh approved list too!
      onUpdate();
    } catch (err) {
      toast.error("Approval failed");
    } finally {
      setApproving(null);
    }
  };

  if (!dept) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 40 }}
          className="relative w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-[3rem] border border-gray-100 bg-white shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-10 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2 text-indigo-600 font-black uppercase tracking-widest text-[10px]">
                <Sparkles className="w-5 h-5 fill-indigo-100" />
                HQ Finance Hub
              </div>
              <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tight">
                {dept.deptName} <span className="text-indigo-600 tracking-normal font-black">Audit</span>
              </h2>
              <p className="text-gray-500 mt-2 text-xs font-bold uppercase tracking-widest">
                Deep departmental flow analysis and authorization portal.
              </p>
            </div>
            
            <button 
              onClick={onClose} 
              className="relative z-10 p-4 rounded-3xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition-all group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#FCFBF8]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-8 rounded-[2.5rem] bg-gray-900 text-white shadow-xl flex flex-col justify-between group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-none" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 relative z-10">Verified Inflow</span>
                <div className="mt-6 relative z-10">
                   <div className="text-4xl font-black tracking-tight">Rs. {dept.totalIncome.toLocaleString()}</div>
                   <div className="flex items-center gap-2 text-[10px] mt-2 font-bold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                     <TrendingUp className="w-4 h-4 text-emerald-400" /> System Confirmed
                   </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-8 rounded-[2.5rem] border border-amber-200/50 bg-amber-50/50 flex flex-col justify-between hover:-translate-y-1 transition-all group"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Pipeline Value</span>
                <div className="mt-6">
                   <div className="text-4xl font-black tracking-tight text-amber-900">Rs. {dept.pendingAmount.toLocaleString()}</div>
                   <div className="flex items-center gap-2 text-[10px] text-amber-600 mt-2 font-bold uppercase tracking-wider animate-pulse">
                     <Clock className="w-4 h-4" /> Awaiting Auth
                   </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-8 rounded-[2.5rem] border border-gray-100 bg-white flex flex-col justify-between hover:-translate-y-1 transition-all shadow-sm"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Queue Depth</span>
                <div className="mt-6">
                   <div className="text-4xl font-black tracking-tight text-gray-800">{dept.pendingCount} <span className="text-sm font-bold opacity-30">ITEMS</span></div>
                   <div className="flex items-center gap-2 text-[10px] text-indigo-500 mt-2 font-bold uppercase tracking-wider">
                     <Hash className="w-4 h-4" /> Registry Count
                   </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-8 rounded-[2.5rem] bg-gray-50/80 border border-gray-100 flex flex-col justify-between group hover:-translate-y-1 transition-all"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Volume Share</span>
                <div className="mt-6">
                   <div className="text-4xl font-black tracking-tight text-gray-800">{Math.round(dept.percentOfTotal)}% <span className="text-sm font-bold opacity-30">GLOBAL</span></div>
                   <div className="flex items-center gap-2 text-[10px] text-indigo-600 mt-2 font-bold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                     <ArrowUpRight className="w-4 h-4" /> Dynamic Growth
                   </div>
                </div>
              </motion.div>
            </div>

            {/* Ways of Income */}
            <div className="mb-14">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 border-l-4 border-indigo-600 pl-4 font-black">Revenue Stream Distribution</h3>
              <div className="flex flex-wrap gap-4">
                {Object.entries(dept.ways).map(([key, val]) => (
                  <div 
                    key={key} 
                    className="px-6 py-4 rounded-2xl bg-white border border-gray-100 flex items-center gap-4 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="opacity-60">{key}:</span>
                    <span className="font-black text-gray-900">Rs. {val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* job.khanhub.com.pk Live Platform Monitor Subsystem */}
            {dept.deptId === 'job-center' && (
              <div className="mb-14 p-8 rounded-[3rem] border border-indigo-100 bg-gradient-to-br from-indigo-500/5 via-transparent to-indigo-500/5 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 blur-2xl rounded-full" />
                
                <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-700">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <h4 className="text-xs font-black uppercase tracking-widest">
                        job.khanhub.com.pk Live Platform Monitor
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 font-bold">
                      Direct micro-service stats and active database registry metrics.
                    </p>
                  </div>
                  
                  <a 
                    href="https://job.khanhub.com.pk" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    Launch Portal <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {loadingSeekers ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-24 bg-white/50 animate-pulse border border-gray-100 rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
                    <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-indigo-500" /> Database Pool
                      </span>
                      <div className="mt-4">
                        <span className="text-3xl font-black text-gray-900">
                          {seekerStats?.total || 0}
                        </span>
                        <span className="text-[9px] block text-gray-500 font-bold uppercase mt-1">Registered Seekers</span>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Successful Placements
                      </span>
                      <div className="mt-4">
                        <span className="text-3xl font-black text-emerald-700">
                          {seekerStats?.employed || 0}
                        </span>
                        <span className="text-[9px] block text-gray-500 font-bold uppercase mt-1">Employed & Settled</span>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-amber-500" /> Actively Searching
                      </span>
                      <div className="mt-4">
                        <span className="text-3xl font-black text-amber-700">
                          {seekerStats?.seeking || 0}
                        </span>
                        <span className="text-[9px] block text-gray-500 font-bold uppercase mt-1">Awaiting Hires</span>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Placement Rate
                      </span>
                      <div className="mt-4">
                        <span className="text-3xl font-black text-indigo-700">
                          {seekerStats?.placementRate || 0}%
                        </span>
                        <span className="text-[9px] block text-gray-500 font-bold uppercase mt-1">Platform Success Rate</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real-time Seeker Registry Feed */}
                <div className="bg-white/80 border border-gray-100/50 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" /> Live Seeker Registration Feed
                    </span>
                    <button 
                      onClick={fetchJobCenterSyncData}
                      disabled={loadingSeekers}
                      className="p-2 text-indigo-600 hover:text-indigo-800 transition-all rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                      title="Reload Seeker Data"
                    >
                      <RefreshCw className={cn("w-4 h-4", loadingSeekers && "animate-spin")} />
                    </button>
                  </div>

                  {loadingSeekers ? (
                    <div className="space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-12 bg-gray-100/50 animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : seekers.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                      No active seeker profiles found in the registry.
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 pb-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            <th className="pb-3 pr-4">Seeker ID</th>
                            <th className="pb-3 pr-4">Full Name</th>
                            <th className="pb-3 pr-4">Job Interests / Skills</th>
                            <th className="pb-3 pr-4">Status</th>
                            <th className="pb-3 text-right">Registered</th>
                          </tr>
                        </thead>
                        <tbody>
                          {seekers.map((seeker) => (
                            <tr key={seeker.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                              <td className="py-3.5 pr-4 text-[10px] font-bold text-gray-400 font-mono uppercase">
                                {seeker.seekerNumber || seeker.id.slice(-8).toUpperCase()}
                              </td>
                              <td className="py-3.5 pr-4">
                                <div className="text-xs font-black text-gray-800">{seeker.name || 'Anonymous User'}</div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase">{seeker.cnic || 'CNIC Pending'}</div>
                              </td>
                              <td className="py-3.5 pr-4">
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(seeker.skills) && seeker.skills.length > 0 ? (
                                    seeker.skills.slice(0, 3).map((skill: string, idx: number) => (
                                      <span key={idx} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[9px] font-bold uppercase tracking-wider">
                                        {skill}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[9px] text-gray-400 italic">No Preferred Skills Added</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 pr-4">
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1",
                                  seeker.isEmployed 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                    : "bg-amber-50 text-amber-700 border border-amber-100"
                                )}>
                                  <span className={cn("h-1.5 w-1.5 rounded-full", seeker.isEmployed ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                                  {seeker.isEmployed ? 'Placed' : 'Searching'}
                                </span>
                              </td>
                              <td className="py-3.5 text-[10px] text-gray-500 font-bold uppercase text-right">
                                {seeker._date ? seeker._date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }) : 'Pending'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending Ledger Verifications */}
            <div className="mb-14">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l-4 border-amber-500 pl-4 font-black">Pending Ledger Verifications</h3>
                <div className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider">{pending.length} Items Found</div>
              </div>

              {loading ? (
                <div className="space-y-6">
                  {[1,2,3].map(i => <div key={i} className="h-24 w-full animate-pulse bg-gray-100 rounded-[2rem] border border-gray-100" />)}
                </div>
              ) : pending.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-gray-200 rounded-[3rem] bg-gray-50/50 group">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500/30 mx-auto mb-6 group-hover:scale-110 group-hover:text-emerald-500/50 transition-all duration-500" />
                  <p className="font-black text-xs text-gray-400 uppercase tracking-widest">All system operations are verified. Clean state.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pending.map((tx) => {
                    const isExp = tx.type === 'expense' || String(tx.categoryName || tx.category || '').toLowerCase().includes('expense');
                    return (
                      <motion.div
                        layout
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group p-8 rounded-[2.5rem] border border-gray-100 bg-white hover:bg-gray-50 transition-all flex flex-wrap items-center justify-between gap-8 shadow-sm hover:-translate-y-1"
                      >
                        <div className="flex items-center gap-6">
                           <div className={cn(
                             "p-5 rounded-[1.5rem] transition-all duration-500 group-hover:scale-110 border border-gray-100",
                             isExp ? "bg-rose-50 text-rose-600 rotate-6" : "bg-emerald-50 text-emerald-600 -rotate-6"
                           )}>
                             {isExp ? <ArrowDownRight className="w-6 h-6" strokeWidth={3} /> : <ArrowUpRight className="w-6 h-6" strokeWidth={3} />}
                           </div>
                           <div>
                              <div className="flex items-center gap-3">
                                <span className="text-xl font-black tracking-tight text-gray-900">Rs. {(tx.amount || 0).toLocaleString()}</span>
                                <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                                  {tx.category || tx.categoryName || 'General Revenue'}
                                </div>
                              </div>
                              <div className="text-[10px] font-bold text-gray-500 flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 uppercase tracking-wider">
                                 <span className="flex items-center gap-2 text-indigo-600 font-black"><User className="w-4 h-4" /> {tx.patientName || tx.studentName || tx.seekerName || tx.name || tx.description || 'General Ledger'} {tx.patientId || tx.fileNumber || tx.studentId ? `(#${tx.patientId || tx.fileNumber || tx.studentId})` : ''}</span>
                                 <span className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> Cashier: {tx.collectedBy || tx.staffName || 'Automated System'}</span>
                                 <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" /> {tx.paymentMethod || 'Direct Ledger'}</span>
                                 <span className="flex items-center gap-2 font-mono opacity-50">#{tx.id.slice(-8).toUpperCase()}</span>
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleApprove(tx.id)}
                            disabled={approving === tx.id}
                            className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
                          >
                            {approving === tx.id ? (
                              <Clock className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-white" />
                                Authorize
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Verified Inflow Ledger List */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col gap-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l-4 border-emerald-500 pl-4 font-black">Verified Ledger Details</h3>
                  <div className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider pl-4">Target Date: {targetDateStr}</div>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider">{approved.length} Items Found</div>
              </div>

              {loadingApproved ? (
                <div className="space-y-6">
                  {[1,2,3].map(i => <div key={i} className="h-24 w-full animate-pulse bg-gray-100 rounded-[2rem] border border-gray-100" />)}
                </div>
              ) : approved.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-gray-200 rounded-[3rem] bg-gray-50/50">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                  <p className="font-black text-xs text-gray-400 uppercase tracking-widest">No verified transactions found for this period.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {approved.map((tx) => {
                    const isExp = tx.type === 'expense' || String(tx.categoryName || tx.category || '').toLowerCase().includes('expense');
                    return (
                      <motion.div
                        layout
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group p-8 rounded-[2.5rem] border border-gray-100 bg-white hover:bg-gray-50 transition-all flex flex-wrap items-center justify-between gap-8 shadow-sm hover:-translate-y-1"
                      >
                        <div className="flex items-center gap-6">
                           <div className={cn(
                             "p-5 rounded-[1.5rem] border transition-all duration-500 group-hover:scale-110",
                             isExp ? "bg-rose-50 text-rose-600 border-rose-100 rotate-6" : "bg-emerald-50 text-emerald-600 border-emerald-100 -rotate-6"
                           )}>
                             {isExp ? <ArrowDownRight className="w-6 h-6" strokeWidth={3} /> : <ArrowUpRight className="w-6 h-6" strokeWidth={3} />}
                           </div>
                           <div>
                              <div className="flex items-center gap-3">
                                <span className="text-xl font-black tracking-tight text-gray-900">
                                  Rs. {(tx.amount || 0).toLocaleString()}
                                </span>
                                <div className={cn(
                                  "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider",
                                  isExp ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                                )}>
                                  {tx.category || tx.categoryName || 'General Revenue'}
                                </div>
                              </div>
                              <div className="text-[10px] font-bold text-gray-500 flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 uppercase tracking-wider">
                                 <span className="flex items-center gap-2 text-indigo-600 font-black"><User className="w-4 h-4" /> {tx.patientName || tx.studentName || tx.seekerName || tx.name || tx.description || 'General Ledger'} {tx.patientId || tx.fileNumber || tx.studentId ? `(#${tx.patientId || tx.fileNumber || tx.studentId})` : ''}</span>
                                 <span className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> Cashier: {tx.collectedBy || tx.staffName || 'Automated System'}</span>
                                 <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" /> {tx.paymentMethod || 'Direct Ledger'}</span>
                                 <span className="flex items-center gap-2 font-mono opacity-50">#{tx.id.slice(-8).toUpperCase()}</span>
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Authorization Timestamp</span>
                          <span className="text-xs font-black text-gray-800 uppercase tracking-tight">
                            {tx._approvedDate ? tx._approvedDate.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (tx._date ? tx._date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
