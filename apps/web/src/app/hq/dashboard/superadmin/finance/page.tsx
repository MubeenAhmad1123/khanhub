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
  LayoutDashboard,
  User,
  ExternalLink
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
import { AnimatePresence } from 'framer-motion';

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
      <div className="flex h-screen items-center justify-center bg-white dark:bg-black">
        <InlineLoading label="Constructing Financial Dashboard..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 min-h-screen text-black dark:text-white">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-black dark:bg-white p-2 shadow-xl">
              <BarChart3 className="h-6 w-6 text-white dark:text-black" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-black dark:text-white uppercase">Finance terminal</h1>
          </div>
          <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">Real-time financial intelligence across all KhanHub portals.</p>
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
            className="flex h-11 items-center gap-2 rounded-2xl bg-black dark:bg-white px-6 text-xs font-black uppercase tracking-[0.2em] text-white dark:text-black transition hover:scale-105 active:scale-95 shadow-2xl"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">Audit Report</span>
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
              "whitespace-nowrap rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              tab === t 
                ? "bg-black text-white dark:bg-white dark:text-black shadow-2xl scale-105" 
                : "bg-gray-50 text-gray-400 border border-gray-100 dark:bg-white/5 dark:text-gray-500 dark:border-white/10 hover:border-black dark:hover:border-white"
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
        <div className="lg:col-span-2 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-black dark:text-white border-l-4 border-black dark:border-white pl-3">Revenue Projection Matrix</h2>
              <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase mt-1 tracking-widest italic">30-Day Chronological Flow Control</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={insights.daily}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderRadius: '16px', border: '1px solid #88888820' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '900' }}
                />
                <Area type="monotone" dataKey="income" stroke="#000000" fillOpacity={1} fill="url(#colorInc)" strokeWidth={4} />
                <Area type="monotone" dataKey="expense" stroke="#94a3b8" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Pie Chart */}
        <div className="rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <PieChartIcon className="h-4 w-4 text-black dark:text-white" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-white">Classification</h2>
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
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#000000' : '#6b7280'} />
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
        <div className="lg:col-span-4 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm">
          <h2 className="mb-6 text-sm font-black uppercase tracking-widest text-black dark:text-white">Week-over-Week</h2>
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
                <Bar dataKey="income" fill="#000000" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="expense" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Pending Dues */}
        <div className="lg:col-span-8 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-white border-l-4 border-black dark:border-white pl-3">Dormant Capital Identification</h2>
            <span className="rounded-full bg-black dark:bg-white px-4 py-1.5 text-[9px] font-black text-white dark:text-black shadow-xl">CRITICAL SURVEILLANCE</span>
          </div>
          <div className="overflow-x-auto">
            <div className="table-responsive">

            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <th className="pb-4">Patient / Student</th>
                  <th className="pb-4">Portal</th>
                  <th className="pb-4">Breakdown</th>
                  <th className="pb-4">Days Overdue</th>
                  <th className="pb-4">Last Payment</th>
                  <th className="pb-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {insights.topOutstanding.map((r, i) => (
                  <tr key={r.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{r.name}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-medium">{r.id.slice(0, 8)}</p>
                    </td>
                    <td className="py-4">
                      <span className={cn(
                        "rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest border",
                        r.portal === 'rehab' ? "bg-black dark:bg-white text-white dark:text-black border-transparent" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 border-transparent"
                      )}>
                        {r.portal}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-black dark:text-white">{formatPKR(r.outstanding)}</span>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase">PKG: {formatPKR(r.totalDue || 0)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                        <AlertCircle size={14} className={r.daysOverdue > 30 ? "text-rose-500" : "text-gray-400 dark:text-gray-600"} />
                        {r.daysOverdue} days
                      </div>
                    </td>
                    <td className="py-4 text-xs font-medium text-gray-500 dark:text-gray-400">{r.lastPaymentDate || 'Never'}</td>
                    <td className="py-4 text-right">
                      <button 
                         onClick={() => router.push(`/hq/dashboard/superadmin/${r.portal}/users/${r.id}`)}
                         className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group-hover:scale-110 flex items-center justify-center ml-auto shadow-sm"
                         title="View Profile"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Series Table */}
        <div className="rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm">
          <h2 className="mb-10 text-[10px] font-black uppercase tracking-[0.2em] border-l-4 border-black dark:border-white pl-3 text-black dark:text-white">Pulse Velocity Matrix</h2>
          <div className="space-y-3">
            {insights.daily.slice(-7).reverse().map((p) => (
              <div key={p.day} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-white/5 p-4 border border-gray-100 dark:border-white/5 group hover:border-gray-200 dark:hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "rounded-xl p-3",
                    p.variance >= 0 ? "bg-black dark:bg-white text-white dark:text-black shadow-xl scale-110" : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500"
                  )}>
                    {p.variance >= 0 ? <TrendingUp size={18} strokeWidth={3} /> : <TrendingDown size={18} />}
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
        <div className="rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">Recent Closings</h2>
            <button 
              onClick={() => router.push('/hq/dashboard/superadmin/reconciliation')}
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              Surveillance Logs <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="space-y-3">
            {insights.recentReconciliations.map((r: any) => (
              <div 
                key={r.id} 
                className={cn(
                  "rounded-2xl bg-gray-50 dark:bg-white/5 p-6 border-l-8 transition-all shadow-sm",
                  r.status === 'verified' ? "border-black dark:border-white" : "border-gray-200 dark:border-white/10"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                       <span className="text-base font-black uppercase tracking-tighter text-black dark:text-white">{r.date}</span>
                       <span className={cn(
                         "rounded-lg px-2 py-1 text-[8px] font-black uppercase tracking-widest border",
                         r.status === 'verified' ? "bg-black dark:bg-white text-white dark:text-black border-transparent" : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 border-transparent"
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
                      "text-[10px] font-black uppercase tracking-widest mt-1",
                      (r.variance || r.difference) === 0 ? "text-gray-300 italic" : "text-black dark:text-white"
                    )}>
                      Delta: {formatPKR(Math.abs(r.variance || r.difference || 0))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showReportModal && (
          <FinanceReportModal
            tab={tab}
            onClose={() => setShowReportModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
