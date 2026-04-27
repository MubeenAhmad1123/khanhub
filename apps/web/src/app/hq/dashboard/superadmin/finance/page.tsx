'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Terminal,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Layers,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  X,
  ChevronDown,
  ChevronUp,
  Receipt,
  Building2,
  DollarSign,
  PieChart,
  ArrowRight,
} from "lucide-react";
import {
  fetchFinanceHubData,
  fetchFinanceSummary,
  fetchDailyBreakdown,
  DeptBreakdown,
  FinanceSummary,
  DailyBreakdownResult,
  DailyDeptBreakdown,
} from "@/lib/hq/superadmin/finance";
import { FinanceHub } from "@/components/hq/finance/FinanceHub";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn, formatDateDMY, parseDateDMY } from "@/lib/utils";
import { useRouter } from "next/navigation";
import LogoLoader from "@/components/ui/LogoLoader";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayLocalDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

const DEPT_ACCENT: Record<string, { bg: string; border: string; text: string; dot: string; gradient: string }> = {
  rehab: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/10",
    text: "text-emerald-600",
    dot: "bg-emerald-500",
    gradient: "from-emerald-500/10 to-transparent",
  },
  spims: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/10",
    text: "text-sky-600",
    dot: "bg-sky-500",
    gradient: "from-sky-500/10 to-transparent",
  },
  "job-center": {
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/10",
    text: "text-indigo-600",
    dot: "bg-indigo-500",
    gradient: "from-indigo-500/10 to-transparent",
  },
  hospital: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/10",
    text: "text-rose-600",
    dot: "bg-rose-500",
    gradient: "from-rose-500/10 to-transparent",
  },
  hq: {
    bg: "bg-slate-500/5",
    border: "border-slate-500/10",
    text: "text-slate-600",
    dot: "bg-slate-500",
    gradient: "from-slate-500/10 to-transparent",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function DeptDayCard({ dept, expanded, onToggle }: {
  dept: DailyDeptBreakdown;
  expanded: boolean;
  onToggle: () => void;
}) {
  const accent = DEPT_ACCENT[dept.deptId] ?? DEPT_ACCENT.hq;
  const hasData = dept.txCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-[2.5rem] border overflow-hidden transition-all duration-500 bg-white border-gray-100 shadow-2xl shadow-gray-200/50 hover:shadow-gray-300/80 hover:-translate-y-1"
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-10 py-8 group relative overflow-hidden"
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity group-hover:opacity-60", accent.gradient)} />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className={cn("w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-xl", accent.bg, accent.text)}>
            <Building2 size={32} />
          </div>
          <div className="text-left">
            <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", accent.text)}>
              {dept.deptId.toUpperCase()} MATRIX
            </p>
            <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">{dept.deptName}</p>
          </div>
        </div>
        <div className="flex items-center gap-10 relative z-10">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Gross Collected</p>
            <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">
              Rs. {dept.income.toLocaleString()}
            </p>
          </div>
          {dept.expense > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Matrix Expense</p>
              <p className="text-2xl font-black text-rose-600 tracking-tighter leading-none">
                Rs. {dept.expense.toLocaleString()}
              </p>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="px-5 py-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-[9px] font-black text-gray-900 uppercase tracking-widest">
              {dept.txCount} TRANSFERS
            </div>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform", expanded ? "rotate-180" : "group-hover:translate-y-1")}>
              <ChevronDown size={20} strokeWidth={3} className={accent.text} />
            </div>
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden relative z-10"
          >
            <div className="px-10 pb-10 space-y-8">
              <div className="h-px bg-black/5 dark:bg-white/5" />

              {!hasData ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 opacity-40">
                  <Receipt className="w-12 h-12" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-center">
                    Zero Activity Detected In Matrix Registry
                  </span>
                </div>
              ) : (
                <>
                  {/* Category Breakdown */}
                  {Object.keys(dept.categories).length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 mb-6">
                        <PieChart size={16} className="text-gray-400" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                          Resource Allocation Breakdown
                        </p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        {Object.entries(dept.categories)
                          .sort(([, a], [, b]) => b - a)
                          .map(([cat, amount]) => (
                            <div
                              key={cat}
                              className="flex flex-col gap-2 p-6 rounded-[2rem] bg-gray-50 border border-gray-100 shadow-sm transition-transform hover:scale-105"
                            >
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">
                                {cat}
                              </span>
                              <span className="text-lg font-black text-gray-900 tracking-tighter">
                                {amount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Transaction List */}
                  <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="flex items-center gap-3 mb-6">
                      <Database size={16} className="text-gray-400" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        Operational Ledger Stream ({dept.txCount})
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {dept.transactions.map((tx) => {
                        const isExp =
                          tx.type === "expense" ||
                          String(tx.categoryName || tx.category || "").toLowerCase().includes("expense");
                        return (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 group hover:border-gray-900 transition-all hover:shadow-xl shadow-gray-200/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">
                                {tx.patientName || tx.studentName || tx.seekerName || tx.name || tx.description || "UNIDENTIFIED"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                  {tx.categoryName || tx.category || tx.type || "General"}
                                </span>
                                <div className="w-1 h-1 rounded-full bg-gray-300" />
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest",
                                  tx.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'
                                )}>
                                  {tx.status}
                                </span>
                              </div>
                            </div>
                            <p
                              className={cn(
                                "text-lg font-black ml-4 whitespace-nowrap tracking-tighter",
                                isExp ? "text-rose-500" : "text-emerald-500"
                              )}
                            >
                              {isExp ? "−" : "+"}Rs. {Number(tx.amount || 0).toLocaleString()}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuperadminFinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeptBreakdown[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'terminal'>('visual');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // ── Date filter state ──────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string>("");       // YYYY-MM-DD
  const [filterLoading, setFilterLoading] = useState(false);
  const [dailyResult, setDailyResult] = useState<DailyBreakdownResult | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const todayStr = todayLocalDateString();

  // ── Derive FinanceHub dept data — today's data normally, filtered date when active ──
  const hubDepts = useMemo(() => {
    if (!dailyResult) return data;
    const grandIncome = dailyResult.grandIncome;
    return dailyResult.departments.map((d) => ({
      deptId: d.deptId,
      deptName: d.deptName,
      totalIncome: d.income,
      totalExpense: d.expense,
      pendingCount: 0,
      pendingAmount: 0,
      ways: d.categories,
      percentOfTotal: grandIncome > 0 ? (d.income / grandIncome) * 100 : 0,
    }));
  }, [dailyResult, data]);

  // ── Load today's summary ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [financeData, summaryData] = await Promise.all([
        fetchFinanceHubData(),
        fetchFinanceSummary(),
      ]);
      setData(financeData);
      setSummary(summaryData);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Error loading finance data:", error);
      toast.error("Error loading financial data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Fetch breakdown for selected date ─────────────────────────────────────
  const fetchDayData = useCallback(async (dateStr: string) => {
    if (!dateStr) {
      setDailyResult(null);
      return;
    }
    setFilterLoading(true);
    try {
      // Parse YYYY-MM-DD
      const [y, m, d] = dateStr.split("-").map(Number);
      const targetDate = new Date(y, m - 1, d, 12, 0, 0); // noon to avoid TZ edge cases
      const result = await fetchDailyBreakdown(targetDate);
      setDailyResult(result);
      // expand all depts that have data
      const expanded: Record<string, boolean> = {};
      result.departments.forEach((dept) => {
        expanded[dept.deptId] = dept.txCount > 0;
      });
      setExpandedDepts(expanded);
      if (result.grandIncome === 0 && result.grandExpense === 0) {
        toast("No transactions found for this date across all departments.");
      }
    } catch (err) {
      console.error("Error fetching daily breakdown:", err);
      toast.error("Could not load data for selected date");
    } finally {
      setFilterLoading(false);
    }
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedDate(val);
    if (val) fetchDayData(val);
    else setDailyResult(null);
  };

  const clearDateFilter = () => {
    setSelectedDate("");
    setDailyResult(null);
    setExpandedDepts({});
  };

  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const isFilteringToday = selectedDate === todayStr;

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading && !summary) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#FCFBF8] space-y-12 animate-in fade-in duration-700">
        <LogoLoader size="xl" showText={true} />
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[0.5em] text-primary mb-3 animate-pulse">
            Synchronizing Financial Intelligence
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Mapping secure departmental nodes...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-500 overflow-x-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-[60] px-6 lg:px-10 py-10 backdrop-blur-3xl border-b border-gray-100 flex flex-wrap items-center justify-between gap-10">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative group">
          <div className="flex items-center gap-4 text-[10px] text-indigo-600 font-black uppercase tracking-[0.3em] mb-2 group-hover:translate-x-1 transition-transform">
            <div className="p-2 rounded-lg bg-indigo-50">
              <TrendingUp className="w-4 h-4" />
            </div>
            Oversight Protocol
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
            Financial <span className="text-indigo-600 italic font-[1000]">Matrix</span>
          </h1>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="flex bg-white p-2 rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-200/50">
            <button
              onClick={() => setViewMode('visual')}
              className={cn(
                "flex items-center gap-3 px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'visual' ? "bg-black text-white shadow-2xl" : "text-gray-400 hover:text-black"
              )}
            >
              <Database className="w-4 h-4" /> Control Hub
            </button>
            <button
              onClick={() => setViewMode('terminal')}
              className={cn(
                "flex items-center gap-3 px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'terminal' ? "bg-black text-white shadow-2xl" : "text-gray-400 hover:text-black"
              )}
            >
              <Terminal className="w-4 h-4" /> Raw Feed
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-5 rounded-[1.5rem] bg-white hover:bg-black text-gray-400 hover:text-white transition-all border border-gray-100 active:scale-90 disabled:opacity-50 group shadow-xl shadow-gray-200/50"
          >
            <RefreshCw className={cn("w-6 h-6 group-hover:rotate-180 transition-transform duration-1000", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* ── Today's Summary Cards ────────────────────────────────────────────── */}
      <div className="px-2 lg:px-4 mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Today's Collection */}
        <div className="p-10 rounded-[3rem] bg-white border border-gray-100 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-2xl shadow-gray-200/50">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="flex items-center justify-between mb-8">
             <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/20">
               <DollarSign size={24} />
             </div>
             <div className={cn(
              "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-50 border border-emerald-500/10",
              (summary?.collectedDailyTrend || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
            )}>
              {(summary?.collectedDailyTrend || 0) >= 0 ? "+" : ""}{Math.abs(summary?.collectedDailyTrend || 0).toFixed(1)}%
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-2 block">Daily Collection</span>
          <div className="text-4xl font-black tracking-tighter text-gray-900 leading-none">
            Rs. {summary?.collectedToday.toLocaleString()}
          </div>
        </div>

        {/* 2. Today's Pending */}
        <div className="p-10 rounded-[3rem] bg-white border border-gray-100 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-2xl shadow-gray-200/50">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="flex items-center justify-between mb-8">
             <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-xl shadow-amber-500/20">
               <Clock size={24} />
             </div>
             <div className="px-4 py-2 rounded-full text-[10px] font-black text-amber-600 uppercase tracking-widest bg-gray-50 border border-amber-500/10">
               {summary?.pendingCountToday} QUEUED
             </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-2 block">Matrix Pending</span>
          <div className="text-4xl font-black tracking-tighter text-gray-900 leading-none">
            Rs. {summary?.pendingAmountToday.toLocaleString()}
          </div>
        </div>

        {/* 3. Remaining Balance */}
        <div className="p-10 rounded-[3rem] bg-white border border-gray-100 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-2xl shadow-gray-200/50">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl" />
          <div className="flex items-center justify-between mb-8">
             <div className="p-4 rounded-2xl bg-rose-500 text-white shadow-xl shadow-rose-500/20">
               <AlertCircle size={24} />
             </div>
             <div className="px-4 py-2 rounded-full text-[10px] font-black text-rose-600 uppercase tracking-widest bg-gray-50 border border-rose-500/10">
               OUTSTANDING
             </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 mb-2 block">Central Debt</span>
          <div className="text-4xl font-black tracking-tighter text-gray-900 leading-none">
            Rs. {summary?.outstandingTotal.toLocaleString()}
          </div>
        </div>

        {/* 4. Need Approval */}
        <div className="p-10 rounded-[3rem] bg-white border border-gray-100 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-2xl shadow-gray-200/50">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="flex items-center justify-between mb-8">
             <div className="p-4 rounded-2xl bg-indigo-500 text-white shadow-xl shadow-indigo-500/20">
               <Layers size={24} />
             </div>
             <div className="px-4 py-2 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-gray-50 border border-indigo-500/10 animate-pulse">
               ACTION REQUIRED
             </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-2 block">Audit Queue</span>
          <div className="text-4xl font-black tracking-tighter text-gray-900 leading-none">
            {summary?.pendingApprovals} TASKS
          </div>
        </div>

        {/* 5. Monthly Total */}
        <div className="p-10 rounded-[3rem] bg-indigo-600 text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-2xl shadow-indigo-600/30">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="flex items-center justify-between mb-8">
             <div className="p-4 rounded-2xl bg-white/10">
               <Sparkles size={24} />
             </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2 block">Monthly Revenue</span>
          <div className="text-4xl font-black tracking-tighter leading-none">
            Rs. {summary?.collectedThisMonth.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── Date Filter Panel ────────────────────────────────────────────────── */}
      <div className="px-2 lg:px-4 mt-6">
        <div className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-2xl shadow-gray-200/50">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10">
            {/* Label */}
            <div className="flex items-center gap-6 flex-shrink-0">
              <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center shadow-xl">
                <CalendarDays className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-1">
                  Temporal Audit Filter
                </p>
                <p className="text-xl font-black text-gray-900 uppercase tracking-tight">
                  Historical Registry Access
                </p>
              </div>
            </div>

            {/* Date Input */}
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="DD MM YYYY"
                  value={formatDateDMY(selectedDate)}
                  onChange={handleDateChange}
                  onBlur={(e) => {
                    const parsed = parseDateDMY(e.target.value);
                    if (parsed) {
                      const val = parsed.toISOString().split("T")[0];
                      setSelectedDate(val);
                      fetchDayData(val);
                    }
                  }}
                  className={cn(
                    "w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-gray-100 text-sm font-black text-gray-900 uppercase tracking-widest",
                    "focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all",
                    "hover:bg-gray-100 cursor-pointer shadow-inner"
                  )}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                   <ArrowRight size={20} />
                </div>
              </div>
              
              {selectedDate && (
                <button
                  onClick={clearDateFilter}
                  className="p-5 rounded-[1.5rem] bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all active:scale-90 border border-rose-500/20"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
              {filterLoading && (
                <div className="flex items-center gap-3 px-6 py-4 rounded-[1.5rem] bg-primary/5 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Querying Archive...
                </div>
              )}
            </div>

            {/* Quick date shortcuts */}
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: "Yesterday", offset: -1 },
                { label: "Last week", offset: -7 },
              ].map(({ label, offset }) => {
                const d = new Date();
                d.setDate(d.getDate() + offset);
                const str = new Intl.DateTimeFormat("en-CA", {
                  timeZone: "Asia/Karachi",
                  year: "numeric", month: "2-digit", day: "2-digit",
                }).format(d);
                const isActive = selectedDate === str;
                return (
                  <button
                    key={label}
                    onClick={() => {
                      setSelectedDate(str);
                      fetchDayData(str);
                    }}
                    className={cn(
                      "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all border shadow-lg",
                      isActive
                        ? "bg-black text-white border-black shadow-black/20"
                        : "bg-white border-gray-100 text-gray-400 hover:text-black shadow-gray-100/50"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Daily Breakdown Results ───────────────────────────────────────────── */}
      <AnimatePresence>
        {dailyResult && !filterLoading && (
          <motion.div
            key="daily-breakdown"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="px-2 lg:px-4 mt-6"
          >
            {/* Grand Summary Bar */}
            <div className="rounded-[4rem] bg-gray-900 p-12 mb-8 flex flex-wrap items-center gap-16 shadow-2xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  {isFilteringToday ? "OPERATIONAL PERIOD: TODAY" : `ARCHIVE: ${formatDateDisplay(dailyResult.date)}`}
                </p>
                <p className="text-6xl font-black text-white tracking-tighter leading-none mb-3">
                  Rs. {dailyResult.grandIncome.toLocaleString()}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                  Aggregate Liquidity Influx (Cross-Matrix)
                </p>
              </div>
              
              {dailyResult.grandExpense > 0 && (
                <div className="p-8 rounded-[3rem] bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">Total Matrix Expense</p>
                  <p className="text-3xl font-black text-rose-500 tracking-tighter leading-none">
                    Rs. {dailyResult.grandExpense.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="ml-auto grid grid-cols-2 lg:grid-cols-4 gap-12">
                {dailyResult.departments.filter(d => d.txCount > 0).map((dept) => {
                  const pct = dailyResult.grandIncome > 0
                    ? ((dept.income / dailyResult.grandIncome) * 100).toFixed(1)
                    : "0.0";
                  const accent = DEPT_ACCENT[dept.deptId] ?? DEPT_ACCENT.hq;
                  return (
                    <div key={dept.deptId} className="text-right group">
                      <p className={cn("text-[10px] font-black uppercase tracking-widest mb-2 transition-transform group-hover:-translate-x-1", accent.text)}>
                        {dept.deptName}
                      </p>
                      <p className="text-2xl font-black text-white tracking-tighter leading-none mb-1">
                        {pct}%
                      </p>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        Rs. {dept.income.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-department cards */}
            <div className="flex items-center gap-4 mb-8 px-6">
               <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
               <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">Departmental Ledger Nodes</p>
               <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
            </div>
            
            <div className="space-y-6 pb-20">
              {dailyResult.departments.map((dept) => (
                <DeptDayCard
                  key={dept.deptId}
                  dept={dept}
                  expanded={!!expandedDepts[dept.deptId]}
                  onToggle={() => toggleDept(dept.deptId)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Data Hub ────────────────────────────────────────────────────── */}
      <main className="relative min-h-[85vh] flex flex-col p-2 lg:p-4 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'visual' ? (
            <motion.div
              key="visual-hub"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 min-h-[110vh] rounded-[4rem] bg-white shadow-2xl shadow-gray-200/50 relative overflow-hidden flex flex-col items-center border border-gray-100"
            >
              <div className="absolute inset-0 bg-grid-black/[0.01] pointer-events-none" />
              <div className="w-full relative z-10 p-4 lg:p-8">
                <FinanceHub departments={hubDepts} onUpdate={loadData} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="terminal-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 p-12 lg:p-20 rounded-[4rem] bg-white border border-gray-100 shadow-2xl shadow-gray-200/50 space-y-16 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              {/* Pulse Velocity Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-10">
                  <div className="relative">
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none mb-4">
                      Pulse Velocity <span className="text-indigo-600 italic">Matrix</span>
                    </h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Departmental Stream Analysis</p>
                  </div>
                  
                  <div className="space-y-4">
                    {data.map((dept) => (
                      <div key={dept.deptId} className="flex items-center justify-between p-8 rounded-[2.5rem] bg-gray-50 dark:bg-white/[0.03] border border-black/5 hover:border-primary/20 transition-all group hover:shadow-2xl shadow-black/5">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                            <Database size={24} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Terminal: {dept.deptId}</p>
                            <p className="text-xl font-black text-black dark:text-white uppercase tracking-tight">{dept.deptName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-black dark:text-white tracking-tighter leading-none mb-1">RS {dept.totalIncome.toLocaleString()}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">{dept.percentOfTotal.toFixed(1)}% Velocity</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[4rem] bg-gray-50 border border-gray-100 p-16 flex flex-col justify-center items-center text-center group overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <div className="w-24 h-24 rounded-[2.5rem] bg-gray-900 text-white flex items-center justify-center shadow-2xl mb-10 group-hover:scale-110 transition-transform duration-700 relative z-10">
                    <CheckCircle2 size={48} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4 relative z-10">Operational Integrity Active</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10 relative z-10">Verification Protocol Synchronized</p>
                  <p className="text-sm font-bold text-gray-500 max-w-sm leading-relaxed relative z-10">
                    All departmental reconciliations are cryptographically verified and synchronized with the central governance audit ledger in real-time.
                  </p>
                </div>
              </div>

              {/* Drill Down CTA */}
              <div className="relative p-20 border-2 border-dashed border-gray-200 rounded-[4rem] group hover:border-indigo-600 transition-all duration-1000 bg-gray-50 flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <Sparkles className="w-32 h-32 text-gray-200 group-hover:text-indigo-600 transition-all duration-1000 mb-10 scale-90 group-hover:scale-110 relative z-10" />
                <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-4 relative z-10">Low-Level Matrix Access</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mb-16 relative z-10">Deep Operational Data Drilling</p>
                <button
                  onClick={() => setViewMode('visual')}
                  className="px-16 py-6 rounded-[2.5rem] bg-gray-900 text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-6 relative z-10 group/btn"
                >
                  Synchronize Visual Interface
                  <ArrowRight size={24} strokeWidth={3} className="transition-transform group-hover/btn:translate-x-2" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative glows */}
      <div className="fixed -top-96 -left-96 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[200px] -z-10 pointer-events-none" />
      <div className="fixed -bottom-96 -right-96 w-[1000px] h-[1000px] bg-primary/10 rounded-full blur-[200px] -z-10 pointer-events-none" />
    </div>
  );
}
