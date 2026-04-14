'use client';

import React, { useState, useEffect } from "react";
import { 
  Terminal, 
  Database, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Sparkles, 
  Filter, 
  RefreshCw, 
  Layers,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { fetchFinanceHubData, fetchFinanceSummary, DeptBreakdown, FinanceSummary } from "@/lib/hq/superadmin/finance";
import { FinanceHub } from "@/components/hq/finance/FinanceHub";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function SuperadminFinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeptBreakdown[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'terminal'>('visual');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      const [financeData, summaryData] = await Promise.all([
        fetchFinanceHubData(),
        fetchFinanceSummary()
      ]);
      setData(financeData);
      setSummary(summaryData);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Error loading finance data:", error);
      toast.error("Error loading financial nexus data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // 1 minute heartbeat
    return () => clearInterval(interval);
  }, []);

  if (loading && !summary) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-black space-y-8">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-8 border-primary/20 rounded-[2rem]"></div>
          <div className="absolute inset-0 border-8 border-primary border-t-transparent rounded-[2rem] animate-spin"></div>
        </div>
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[0.5em] text-primary mb-2 animate-pulse font-bold">Constructing Financial Data Hub</div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-50 italic">Establishing secure departmental tunnels...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-black font-sans selection:bg-primary selection:text-white">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 px-8 py-6 backdrop-blur-3xl border-b border-border/20 flex flex-wrap items-center justify-between gap-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative">
          <div className="flex items-center gap-3 text-[10px] text-primary font-black uppercase tracking-[0.4em] mb-1 italic">
            <TrendingUp className="w-4 h-4" /> Global Financial Nexus
          </div>
          <h1 className="text-4xl font-black text-black dark:text-white tracking-tighter uppercase italic leading-none">
            Master <span className="text-primary not-italic tracking-normal">Control</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={() => router.push('/hq/dashboard/superadmin/analytics')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-widest bg-muted/40 border border-border/50 text-muted-foreground hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm"
          >
            <LayoutDashboard className="w-4 h-4" /> Analytics Engine
          </button>

          <div className="flex bg-muted/40 p-1.5 rounded-[1.5rem] border border-border/50 backdrop-blur-md">
            <button
              onClick={() => setViewMode('visual')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                viewMode === 'visual' ? "bg-black dark:bg-white text-white dark:text-black shadow-xl" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Database className="w-4 h-4" /> Data Hub
            </button>
            <button
              onClick={() => setViewMode('terminal')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                viewMode === 'terminal' ? "bg-black dark:bg-white text-white dark:text-black shadow-xl" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Terminal className="w-4 h-4" /> Terminal View
            </button>
          </div>

          <button 
            onClick={loadData}
            disabled={loading}
            className="p-3.5 rounded-[1rem] bg-muted/30 hover:bg-muted text-muted-foreground transition-all border border-border/50 active:scale-95 disabled:opacity-50 group shadow-sm"
          >
            <RefreshCw className={cn("w-5 h-5 group-hover:rotate-180 transition-transform duration-500", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Stats Ribbon */}
      <div className="px-8 mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/20 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-4 block italic">Yield (TODAY)</span>
          <div className="text-3xl font-black tracking-tighter italic text-black dark:text-white">Rs. {summary?.collectedToday.toLocaleString()}</div>
          <div className={cn(
            "mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
            (summary?.collectedDailyTrend || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {(summary?.collectedDailyTrend || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(summary?.collectedDailyTrend || 0).toFixed(1)}% Real-time
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-black dark:bg-white border text-white dark:text-black shadow-2xl relative overflow-hidden group">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-4 block italic font-bold">Total Collection</span>
          <div className="text-3xl font-black tracking-tighter italic">Rs. {summary?.collectedThisMonth.toLocaleString()}</div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
            <Clock className="w-4 h-4" /> Current Month Cycle
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/20 backdrop-blur-xl relative overflow-hidden group">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-4 block italic font-bold">Dormant capital</span>
          <div className="text-3xl font-black tracking-tighter italic text-black dark:text-white">Rs. {summary?.outstandingTotal.toLocaleString()}</div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 italic">
            <AlertCircle className="w-4 h-4" /> Awaiting Liquidation
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-muted/20 border border-border/50 backdrop-blur-xl relative overflow-hidden group">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-4 block italic font-bold">Vulnerability index</span>
          <div className="text-3xl font-black tracking-tighter italic text-black dark:text-white">
            {summary?.pendingApprovals} <span className="text-sm">ITEMS</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse italic">
            <Layers className="w-4 h-4" /> Actions Required
          </div>
        </div>
      </div>

      <main className="relative min-h-[70vh] flex flex-col p-8 lg:p-12 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'visual' ? (
            <motion.div
              key="visual-hub"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 min-h-[85vh] flex items-center justify-center p-10 lg:p-20 border-2 border-border/20 rounded-[4rem] bg-grid-white/[0.02] shadow-inner relative overflow-hidden"
            >
              <FinanceHub departments={data} onUpdate={loadData} />
            </motion.div>
          ) : (
            <motion.div
              key="terminal-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-10 rounded-[4rem] border-2 border-border/20 bg-muted/20 backdrop-blur-md space-y-10 overflow-y-auto max-h-[80vh] custom-scrollbar"
            >
              {/* Pulse Velocity Matrix (Daily Tx Log - Operational) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="rounded-[3rem] border border-border/50 bg-white dark:bg-black p-10 shadow-sm overflow-hidden">
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic border-l-4 border-primary pl-6 mb-8 text-black dark:text-white">Pulse velocity matrix</h2>
                    <div className="space-y-4">
                       {data.map((dept, i) => (
                         <div key={dept.deptId} className="flex items-center justify-between p-6 rounded-3xl bg-gray-50 dark:bg-white/[0.03] border border-transparent hover:border-primary/20 transition-all group">
                             <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black shadow-xl group-hover:scale-110 transition-transform">
                                   <Database className="w-5 h-5" />
                                </div>
                                <div>
                                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Terminal: {dept.deptId}</p>
                                   <p className="text-base font-black text-black dark:text-white uppercase tracking-tighter italic">{dept.deptName}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-lg font-black text-black dark:text-white italic">RS {dept.totalIncome.toLocaleString()}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">{(dept.percentOfTotal).toFixed(1)}% Share</p>
                             </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="rounded-[3rem] border border-border/50 bg-white dark:bg-black p-10 shadow-sm overflow-hidden">
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic border-l-4 border-primary pl-6 mb-8 text-black dark:text-white">Recent System Closings</h2>
                    <div className="space-y-4 flex flex-col justify-center h-[calc(100%-80px)] items-center opacity-30 italic group">
                        <CheckCircle2 className="w-16 h-16 mb-4 group-hover:text-primary transition-colors" />
                        <p className="font-black text-xs uppercase tracking-widest">Operational verification system active.</p>
                        <p className="text-[10px] font-bold text-center max-w-xs">All departmental reconciliations are synchronized with the central audit ledger.</p>
                    </div>
                 </div>
              </div>

               {/* Integrated Drill Down Button */}
               <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-border/20 rounded-[4rem] group hover:border-primary/20 transition-all bg-white dark:bg-black/20">
                 <Sparkles className="w-20 h-20 text-muted-foreground group-hover:text-primary transition-all duration-700 mb-6 scale-90 group-hover:scale-110" />
                 <h3 className="text-xl font-black uppercase tracking-tighter italic mb-2">Deep Operational Drill-Down</h3>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-10 opacity-60">Accessing low-level data fragments and departmental logs.</p>
                 <button 
                  onClick={() => setViewMode('visual')}
                  className="px-12 py-5 rounded-3xl bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                 >
                   Open Visual Control Hub
                   <ArrowRightIcon className="w-5 h-5" />
                 </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative Background Glows */}
      <div className="fixed -top-64 -left-64 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed -bottom-64 -right-64 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] -z-10 pointer-events-none" />
    </div>
  );
}

function ArrowRightIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
