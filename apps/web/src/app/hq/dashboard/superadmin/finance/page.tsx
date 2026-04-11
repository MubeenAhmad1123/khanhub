// apps/web/src/app/hq/dashboard/superadmin/finance/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { fetchFinanceInsights, fetchFinanceSummary, type FinanceTab } from '@/lib/hq/superadmin/finance';
import { StatCard } from '@/components/hq/superadmin/StatCard';
import { CsvExportButton } from '@/components/hq/superadmin/CsvExportButton';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { formatPKR } from '@/lib/hq/superadmin/format';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon, 
  ArrowRight, 
  History,
  AlertCircle,
  LayoutDashboard
} from 'lucide-react';
import { FinanceReportModal } from '@/components/hq/superadmin/FinanceReportModal';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { cn } from '@/lib/utils';

export default function SuperadminFinancePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { session, loading: sessionLoading } = useHqSession();
  const initialTab = (sp.get('tab') as FinanceTab) || 'combined';
  
  const [tab, setTab] = useState<FinanceTab>(initialTab);
  const [summary, setSummary] = useState<null | Awaited<ReturnType<typeof fetchFinanceSummary>>>(null);
  const [insights, setInsights] = useState<null | Awaited<ReturnType<typeof fetchFinanceInsights>>>(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    let alive = true;
    setLoading(true);
    Promise.all([fetchFinanceSummary(), fetchFinanceInsights(tab)])
      .then(([s, i]) => {
        if (!alive) return;
        setSummary(s);
        setInsights(i);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [session, tab]);

  const csvRows = useMemo(() => {
    const top = insights?.topOutstanding || [];
    return top.map((r) => ({
      name: r.name,
      portal: r.portal,
      outstanding: r.outstanding,
      received: r.totalReceived,
      due: r.totalDue,
      overdue_days: r.daysOverdue
    }));
  }, [insights]);

  if (loading || !summary || !insights) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <InlineLoading label="Constructing Financial Dashboard..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 min-h-screen text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-amber-400/10 p-2">
              <BarChart3 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Finance Command Center</h1>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">Real-time financial intelligence across all KhanHub portals.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/hq/dashboard/superadmin/analytics')}
            className="flex h-11 items-center gap-2 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white transition hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95"
          >
            <LayoutDashboard size={16} />
            Analytics
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex h-11 items-center gap-2 rounded-2xl bg-orange-600 px-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-orange-700 active:scale-95 shadow-lg shadow-orange-600/20"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">Detailed Report</span>
          </button>
          <CsvExportButton filename={`fin_data_${tab}.csv`} rows={csvRows} />
        </div>
      </div>

      {/* Portal Tabs */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(['combined', 'rehab', 'spims', 'hq'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all",
              tab === t 
                ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20 scale-105" 
                : "bg-gray-100 text-gray-500 border border-transparent dark:bg-white/5 dark:text-gray-400 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
            )}
          >
            {t === 'combined' ? 'Universal Feed' : t}
          </button>
        ))}
      </div>

      {/* KPI Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Collected Today" value={summary.collectedToday} tone="primary" format="pkr" 
          trend={{ value: summary.collectedDailyTrend, isUp: summary.collectedDailyTrend >= 0 }} />
        <StatCard title="This Month" value={summary.collectedThisMonth} tone="neutral" format="pkr" />
        <StatCard title="Total Outstanding" value={summary.outstandingTotal} tone="warning" format="pkr" />
        <StatCard title="Pending Approvals" value={summary.pendingApprovals} tone="danger" subtitle="Action Needed" />
        <StatCard title="Daily Close Count" value={summary.pendingReconciliations} tone="neutral" subtitle="Pending Review" />
        <StatCard title="Total TX Count" value={summary.totalTransactionsToday} tone="primary" subtitle="Daily Volume" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Overview Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Revenue Stream</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">Last 30 days performance</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={insights.daily}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F87171" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderRadius: '16px', border: '1px solid #88888820' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '900' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10B981" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} />
                <Area type="monotone" dataKey="expense" stroke="#F87171" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Pie Chart */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-widest">Type Breakdown</h2>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={insights.types}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="amount"
                >
                  {insights.types.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatPKR(value)}
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderRadius: '16px', border: '1px solid #88888820' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Growth Bar Chart */}
        <div className="lg:col-span-4 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
          <h2 className="mb-6 text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">Week-over-Week</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                <XAxis dataKey="week" stroke="#88888850" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#88888810' }}
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderRadius: '16px', border: '1px solid #88888820' }}
                />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="expense" fill="#F87171" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Pending Dues */}
        <div className="lg:col-span-8 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">Top Pending Dues</h2>
            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-[10px] font-black text-amber-600 dark:text-amber-400">CRITICAL LIST</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <th className="pb-4">Patient / Student</th>
                  <th className="pb-4">Portal</th>
                  <th className="pb-4">Outstanding</th>
                  <th className="pb-4">Days Overdue</th>
                  <th className="pb-4">Last Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {insights.topOutstanding.map((r, i) => (
                  <tr key={r.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 font-bold text-gray-900 dark:text-gray-100">{r.name}</td>
                    <td className="py-4">
                      <span className={cn(
                        "rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest border",
                        r.portal === 'rehab' ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/20" : "bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-400/20"
                      )}>
                        {r.portal}
                      </span>
                    </td>
                    <td className="py-4 font-black text-amber-600 dark:text-amber-400">{formatPKR(r.outstanding)}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                        <AlertCircle size={14} className={r.daysOverdue > 30 ? "text-rose-500" : "text-gray-400 dark:text-gray-600"} />
                        {r.daysOverdue} days
                      </div>
                    </td>
                    <td className="py-4 text-xs font-medium text-gray-500 dark:text-gray-400">{r.lastPaymentDate || 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Series Table */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
          <h2 className="mb-6 text-sm font-black uppercase tracking-widest border-l-4 border-amber-400 pl-3 text-gray-900 dark:text-gray-100">Daily Performance</h2>
          <div className="space-y-3">
            {insights.daily.slice(-7).reverse().map((p) => (
              <div key={p.day} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-white/5 p-4 border border-gray-100 dark:border-white/5 group hover:border-gray-200 dark:hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "rounded-xl p-2",
                    p.variance >= 0 ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-400/10 text-rose-600 dark:text-rose-400"
                  )}>
                    {p.variance >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">{p.day}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">{p.count} transactions recorded</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900 dark:text-white">{formatPKR(p.income)}</p>
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    p.variance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {p.variance >= 0 ? '+' : ''}{formatPKR(p.variance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reconciliation Summary */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">Recent Closings</h2>
            <button 
              onClick={() => router.push('/hq/dashboard/superadmin/reconciliation')}
              className="group flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-amber-600 dark:hover:text-amber-400"
            >
              View All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="space-y-3">
            {insights.recentReconciliations.map((r: any) => (
              <div key={r.id} className={cn(
                "rounded-2xl bg-gray-50 dark:bg-white/5 p-4 border-l-4 transition-all shadow-sm",
                r.status === 'verified' ? "border-emerald-500" : r.status === 'flagged' ? "border-rose-500" : "border-amber-500"
              )}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-black uppercase text-gray-900 dark:text-white">{r.date}</span>
                       <span className={cn(
                         "rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter",
                         r.status === 'verified' ? "bg-emerald-400/20 text-emerald-600 dark:text-emerald-400" : 
                         r.status === 'flagged' ? "bg-rose-400/20 text-rose-600 dark:text-rose-400" : 
                         "bg-amber-400/20 text-amber-600 dark:text-amber-400"
                       )}>
                         {r.status}
                       </span>
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-gray-500 uppercase">
                      Cashier: {r.cashierName} • Total TX: {r.totalTransactions || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-900 dark:text-white">{formatPKR(r.actualClosing || r.actualCash || 0)}</p>
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      (r.variance || r.difference) === 0 ? "text-gray-400 dark:text-gray-500" : "text-rose-600 dark:text-rose-400"
                    )}>
                      Var: {formatPKR(Math.abs(r.variance || r.difference || 0))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showReportModal && (
        <FinanceReportModal
          tab={tab}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
