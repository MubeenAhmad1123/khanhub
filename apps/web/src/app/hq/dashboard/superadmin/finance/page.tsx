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

const DEPT_ACCENT: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  rehab: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  spims: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  "job-center": {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  hospital: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  hq: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
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
        "rounded-[2rem] border backdrop-blur-xl overflow-hidden transition-all",
        accent.bg, accent.border
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-7 py-5 group"
      >
        <div className="flex items-center gap-4">
          <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", accent.dot)} />
          <div className="text-left">
            <p className={cn("text-xs font-black uppercase tracking-widest mb-0.5", accent.text)}>
              {dept.deptId.toUpperCase()}
            </p>
            <p className="text-lg font-bold text-black dark:text-white">{dept.deptName}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Collected</p>
            <p className="text-xl font-bold text-black dark:text-white">
              Rs. {dept.income.toLocaleString()}
            </p>
          </div>
          {dept.expense > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-0.5">Expense</p>
              <p className="text-lg font-bold text-rose-500">
                Rs. {dept.expense.toLocaleString()}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">{dept.txCount} tx</span>
            {expanded ? (
              <ChevronUp className={cn("w-4 h-4", accent.text)} />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
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
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-7 pb-6 space-y-4">
              <div className="h-px bg-border/30" />

              {!hasData ? (
                <div className="flex items-center gap-3 py-4 opacity-40">
                  <Receipt className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-wider">
                    No transactions recorded on this date
                  </span>
                </div>
              ) : (
                <>
                  {/* Category Breakdown */}
                  {Object.keys(dept.categories).length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                        Category Breakdown
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(dept.categories)
                          .sort(([, a], [, b]) => b - a)
                          .map(([cat, amount]) => (
                            <div
                              key={cat}
                              className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-border/30"
                            >
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate pr-2">
                                {cat}
                              </span>
                              <span className="text-xs font-black text-black dark:text-white whitespace-nowrap">
                                {amount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Transaction List */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                      Transactions ({dept.txCount})
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {dept.transactions.map((tx) => {
                        const isExp =
                          tx.type === "expense" ||
                          String(tx.categoryName || tx.category || "").toLowerCase().includes("expense");
                        return (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-border/20 group hover:border-border/50 transition-all"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-black dark:text-white truncate">
                                {tx.patientName || tx.studentName || tx.seekerName || tx.name || tx.description || "—"}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {tx.categoryName || tx.category || tx.type || "General"}{" "}
                                · {tx.status?.toUpperCase()}
                              </p>
                            </div>
                            <p
                              className={cn(
                                "text-sm font-black ml-3 whitespace-nowrap",
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
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
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
      <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-black space-y-8">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-8 border-primary/20 rounded-[2rem]" />
          <div className="absolute inset-0 border-8 border-primary border-t-transparent rounded-[2rem] animate-spin" />
        </div>
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[0.5em] text-primary mb-2 animate-pulse font-bold">
            Constructing Financial Data Hub
          </div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-50">
            Establishing secure departmental tunnels...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-black font-sans selection:bg-primary selection:text-white">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 px-8 py-6 backdrop-blur-3xl border-b border-border/20 flex flex-wrap items-center justify-between gap-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 text-[10px] text-primary font-bold uppercase tracking-widest mb-1">
            <TrendingUp className="w-4 h-4" /> HQ Financial Dashboard
          </div>
          <h1 className="text-4xl font-bold text-black dark:text-white tracking-tight uppercase leading-none">
            Central <span className="text-primary tracking-normal font-black">Oversight</span>
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
              <Terminal className="w-4 h-4" /> Terminal
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

      {/* ── Today's Summary Cards ────────────────────────────────────────────── */}
      <div className="px-8 mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {/* 1. Today's Collection */}
        <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/20 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 block">
            Today's Collection
          </span>
          <div className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Rs. {summary?.collectedToday.toLocaleString()}
          </div>
          <div className={cn(
            "mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
            (summary?.collectedDailyTrend || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {(summary?.collectedDailyTrend || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(summary?.collectedDailyTrend || 0).toFixed(1)}% vs Yesterday
          </div>
        </div>

        {/* 2. Today's Pending */}
        <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/20 backdrop-blur-xl relative overflow-hidden group">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 block">
            Today's Pending
          </span>
          <div className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Rs. {summary?.pendingAmountToday.toLocaleString()}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-500">
            <Clock className="w-4 h-4" /> {summary?.pendingCountToday} Items awaiting approval
          </div>
        </div>

        {/* 3. Remaining Balance */}
        <div className="p-8 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/20 backdrop-blur-xl relative overflow-hidden group">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 block">
            Remaining Balance
          </span>
          <div className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Rs. {summary?.outstandingTotal.toLocaleString()}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-rose-500">
            <AlertCircle className="w-4 h-4" /> Total Outstanding Debt
          </div>
        </div>

        {/* 4. Need Approval */}
        <div className="p-8 rounded-[2.5rem] bg-muted/20 border border-border/50 backdrop-blur-xl relative overflow-hidden group shadow-sm transition-all hover:shadow-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 block">
            Need Approval
          </span>
          <div className="text-3xl font-bold tracking-tight text-black dark:text-white uppercase tracking-tighter">
            {summary?.pendingApprovals} <span className="text-sm font-black text-primary">Task Queue</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">
            <Layers className="w-4 h-4" /> Action Required
          </div>
        </div>

        {/* 5. Monthly Total */}
        <div className="p-8 rounded-[2.5rem] bg-black dark:bg-white border text-white dark:text-black shadow-2xl relative overflow-hidden group">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 block">Monthly Total</span>
          <div className="text-3xl font-bold tracking-tight">
            Rs. {summary?.collectedThisMonth.toLocaleString()}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
            <Sparkles className="w-4 h-4" /> Current Month Collection
          </div>
        </div>
      </div>

      {/* ── Date Filter Panel ────────────────────────────────────────────────── */}
      <div className="px-8 mt-10">
        <div className="rounded-[2.5rem] border border-border/50 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Label */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary mb-0.5">
                  Historical Date Filter
                </p>
                <p className="text-sm font-semibold text-black dark:text-white">
                  View any past date's departmental breakdown
                </p>
              </div>
            </div>

            {/* Date Input */}
            <div className="flex items-center gap-3 flex-1">
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
                  "flex-1 sm:max-w-xs px-5 py-3.5 rounded-2xl border border-border/50 bg-white dark:bg-black text-black dark:text-white text-sm font-bold",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all",
                  "hover:border-primary/30 cursor-pointer"
                )}
              />
              {selectedDate && (
                <button
                  onClick={clearDateFilter}
                  className="p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 transition-all active:scale-95"
                  title="Clear date filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {filterLoading && (
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              )}
            </div>

            {/* Quick date shortcuts */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: "Yesterday", offset: -1 },
                { label: "2 days ago", offset: -2 },
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
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      isActive
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="px-8 mt-8"
          >
            {/* Grand Summary Bar */}
            <div className="rounded-[2.5rem] border border-border/30 bg-black dark:bg-white p-8 mb-6 flex flex-wrap items-center gap-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 dark:text-black/40 mb-1">
                  <CalendarDays className="w-3 h-3 inline mr-1" />
                  {isFilteringToday ? "Today" : formatDateDisplay(dailyResult.date)}
                </p>
                <p className="text-3xl font-bold text-white dark:text-black">
                  Rs. {dailyResult.grandIncome.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-white/50 dark:text-black/50">
                  Total Collected (All Departments)
                </p>
              </div>
              {dailyResult.grandExpense > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Total Expense</p>
                  <p className="text-2xl font-bold text-rose-400">
                    Rs. {dailyResult.grandExpense.toLocaleString()}
                  </p>
                </div>
              )}
              <div className="ml-auto flex items-center gap-8">
                {dailyResult.departments.filter(d => d.txCount > 0).map((dept) => {
                  const pct = dailyResult.grandIncome > 0
                    ? ((dept.income / dailyResult.grandIncome) * 100).toFixed(1)
                    : "0.0";
                  const accent = DEPT_ACCENT[dept.deptId] ?? DEPT_ACCENT.hq;
                  return (
                    <div key={dept.deptId} className="text-right">
                      <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", accent.text)}>
                        {dept.deptName}
                      </p>
                      <p className="text-lg font-bold text-white dark:text-black">
                        {pct}%
                      </p>
                      <p className="text-[10px] text-white/40 dark:text-black/30">
                        Rs. {dept.income.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-department cards */}
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 px-1 flex items-center gap-2">
              <Building2 className="w-3 h-3" />
              Department Breakdown — {formatDateDisplay(dailyResult.date)}
            </p>
            <div className="space-y-4 pb-12">
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
              <FinanceHub departments={hubDepts} onUpdate={loadData} />
            </motion.div>
          ) : (
            <motion.div
              key="terminal-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-10 rounded-[4rem] border-2 border-border/20 bg-muted/20 backdrop-blur-md space-y-10 overflow-y-auto max-h-[80vh] custom-scrollbar"
            >
              {/* Pulse Velocity Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="rounded-[3rem] border border-border/50 bg-white dark:bg-black p-10 shadow-sm overflow-hidden">
                  <h2 className="text-2xl font-bold uppercase tracking-tight border-l-4 border-primary pl-6 mb-8 text-black dark:text-white">
                    Pulse velocity matrix
                  </h2>
                  <div className="space-y-4">
                    {data.map((dept) => (
                      <div key={dept.deptId} className="flex items-center justify-between p-6 rounded-3xl bg-gray-50 dark:bg-white/[0.03] border border-transparent hover:border-primary/20 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="p-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black shadow-xl group-hover:scale-110 transition-transform">
                            <Database className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Terminal: {dept.deptId}</p>
                            <p className="text-base font-bold text-black dark:text-white uppercase tracking-tight">{dept.deptName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-black dark:text-white">RS {dept.totalIncome.toLocaleString()}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">{dept.percentOfTotal.toFixed(1)}% Share</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[3rem] border border-border/50 bg-white dark:bg-black p-10 shadow-sm overflow-hidden">
                  <h2 className="text-2xl font-bold uppercase tracking-tight border-l-4 border-primary pl-6 mb-8 text-black dark:text-white">
                    Recent System Closings
                  </h2>
                  <div className="space-y-4 flex flex-col justify-center h-[calc(100%-80px)] items-center opacity-30 group">
                    <CheckCircle2 className="w-16 h-16 mb-4 group-hover:text-primary transition-colors" />
                    <p className="font-black text-xs uppercase tracking-widest">Operational verification system active.</p>
                    <p className="text-[10px] font-bold text-center max-w-xs">
                      All departmental reconciliations are synchronized with the central audit ledger.
                    </p>
                  </div>
                </div>
              </div>

              {/* Drill Down CTA */}
              <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-border/20 rounded-[4rem] group hover:border-primary/20 transition-all bg-white dark:bg-black/20">
                <Sparkles className="w-20 h-20 text-muted-foreground group-hover:text-primary transition-all duration-700 mb-6 scale-90 group-hover:scale-110" />
                <h3 className="text-xl font-bold uppercase tracking-tight mb-2">Deep Operational Drill-Down</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-10 opacity-60">
                  Accessing low-level data fragments and departmental logs.
                </p>
                <button
                  onClick={() => setViewMode('visual')}
                  className="px-12 py-5 rounded-3xl bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                >
                  Open Visual Control Hub
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative glows */}
      <div className="fixed -top-64 -left-64 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed -bottom-64 -right-64 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] -z-10 pointer-events-none" />
    </div>
  );
}
