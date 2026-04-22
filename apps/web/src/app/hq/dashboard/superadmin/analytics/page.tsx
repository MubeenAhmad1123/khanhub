'use client';

import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Database, 
  LayoutDashboard,
  Zap,
  Layers,
  Search,
  Download,
  Activity,
  Box,
  CircleDot,
  MousePointer2,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { resolveProfilePath } from "@/lib/hq/superadmin/navigation";
import { 
  fetchAnalyticsMetrics, 
  fetchFinanceInsights,
  FinanceInsights,
  AnalyticsMetrics 
} from "@/lib/hq/superadmin/analytics";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SuperadminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [insights, setInsights] = useState<FinanceInsights | null>(null);
  const [activeTab, setActiveTab] = useState<'universal' | 'rehab' | 'spims' | 'job_center' | 'hq'>('universal');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const router = useRouter();

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsData, insightsData] = await Promise.all([
        fetchAnalyticsMetrics(activeTab, timeRange),
        fetchFinanceInsights()
      ]);
      setMetrics(metricsData);
      setInsights(insightsData);
    } catch (error) {
      console.error("Error loading analytics data:", error);
      toast.error("Error synchronizing analytics intelligence");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, timeRange]);

  const stats = useMemo(() => [
    { label: "Gross Revenue", value: `Rs. ${(metrics?.grossRevenue || 0).toLocaleString()}`, change: metrics?.revenueGrowth || 0, icon: TrendingUp },
    { label: "Retention rate", value: `${(metrics?.retentionRate || 0)}%`, change: metrics?.retentionGrowth || 0, icon: Target },
    { label: "Active Nodes", value: (metrics?.activeNodes || 0).toString(), change: metrics?.nodeGrowth || 0, icon: Activity },
    { label: "Conversion Index", value: `${(metrics?.conversionIndex || 0)}%`, change: metrics?.conversionGrowth || 0, icon: Zap },
  ], [metrics]);

  const COLORS = ['#000000', '#2563eb', '#10b981', '#f59e0b', '#ef4444'];

  if (loading && !metrics) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-black space-y-8">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-8 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-8 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[0.5em] text-primary mb-2 animate-pulse">Synchronizing Intelligence</div>
          <div className="text-[10px] font-bold text-black uppercase tracking-widest opacity-50 italic">Compacting data fragments for analysis...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-black font-sans selection:bg-primary selection:text-white pb-20">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 px-8 py-8 backdrop-blur-3xl border-b border-border/20 flex flex-wrap items-center justify-between gap-6">
        <div className="relative">
          <div className="flex items-center gap-3 text-[10px] text-primary font-black uppercase tracking-[0.4em] mb-1 italic">
            <LayoutDashboard className="w-4 h-4" /> Global Intelligence
          </div>
          <h1 className="text-4xl font-black text-black dark:text-white tracking-tighter uppercase italic leading-none">
            Deep <span className="text-primary not-italic tracking-normal font-medium">Analytics</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex bg-muted/30 p-1 rounded-2xl border border-border/50">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  timeRange === r ? "bg-black dark:bg-white text-white dark:text-black shadow-lg" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl">
            <Download className="w-4 h-4" /> Export Intel
          </button>
        </div>
      </header>

      <main className="px-8 mt-10 space-y-12">
        {/* Department Switcher */}
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {(['universal', 'rehab', 'spims', 'job_center', 'hq'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "whitespace-nowrap flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border transition-all duration-300",
                activeTab === tab 
                  ? "bg-primary border-primary text-white shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] scale-105" 
                  : "bg-muted/10 border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <CircleDot className={cn("w-4 h-4", activeTab === tab ? "animate-pulse" : "opacity-30")} />
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Intelligence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 rounded-[3rem] bg-white dark:bg-black border border-border/50 hover:border-primary/40 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-all duration-500 group-hover:rotate-12">
                <stat.icon className="w-16 h-16" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black mb-6 italic">{stat.label}</p>
              <div className="text-3xl font-black tracking-tighter italic text-black dark:text-white mb-4">{stat.value}</div>
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase",
                stat.change >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {stat.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(stat.change)}% Growth
              </div>
            </motion.div>
          ))}
        </div>

        {/* High-Fidelity Charts Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Performance Area Chart */}
          <div className="lg:col-span-2 p-10 rounded-[4rem] bg-white dark:bg-[#0a0a0a] border border-border/50 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black dark:text-white mb-2">Network Velocity</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic">Real-time revenue liquidity tracking</p>
              </div>
              <div className="p-4 rounded-3xl bg-muted/30 border border-border/50 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights?.dailySeries || []}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, textAnchor: 'middle', fill: '#666' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#666' }}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '24px', 
                      backgroundColor: '#000', 
                      border: 'none', 
                      boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                      padding: '16px'
                    }}
                    labelStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '8px', color: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#velocityGrad)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Departmental Weight Pie Chart */}
          <div className="p-10 rounded-[4rem] bg-white dark:bg-[#0a0a0a] border border-border/50 shadow-sm relative overflow-hidden group">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black dark:text-white mb-2 text-center">Departmental Weight</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic text-center mb-8">Revenue distribution by domain</p>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insights?.typeBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={8}
                    dataKey="value"
                    animationDuration={1500}
                  >
                    {insights?.typeBreakdown.map((entry: { name: string; value: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', backgroundColor: '#000', border: 'none', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 space-y-4">
               {insights?.typeBreakdown.map((type: { name: string; value: number }, i: number) => (
                 <div key={type.name} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-border transition-all">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                       <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{type.name}</span>
                    </div>
                    <span className="text-[10px] font-black italic text-black dark:text-white">Rs. {type.value.toLocaleString()}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Dormant Capital Surveillance (Outstanding Table) */}
        <div className="p-12 rounded-[4rem] bg-white dark:bg-[#050505] border border-border/50 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter italic text-black dark:text-white mb-2">Liquidity Leakage Audit</h2>
              <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic">Surveillance of high-value outstanding departmental receivables</p>
            </div>
            <div className="hidden md:flex items-center gap-3 px-6 py-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-black uppercase tracking-widest animate-pulse">
              <CircleDot className="w-4 h-4" /> Strategic Alert: Active Receivables Detected
            </div>
          </div>

          <div className="overflow-x-auto rounded-[2rem] border border-border/50">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 border-b border-border/50">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-black">ENTITY identifier</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-black">Classification</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-black">Vulnerability amount</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-black">Action status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {insights?.topOutstanding.map((item: { id: string; name: string; amount: number; type: string }, i: number) => (
                  <motion.tr 
                    key={item.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (i * 0.05) }}
                    className="group hover:bg-muted/10 transition-colors cursor-pointer"
                    onClick={() => router.push(resolveProfilePath(item.type, '', item.id))}
                  >
                    <td className="px-10 py-8 italic font-black text-sm tracking-tight text-black dark:text-white">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center font-black text-xs border border-border/50 group-hover:bg-primary group-hover:text-white transition-all">
                          {item.name.charAt(0)}
                        </div>
                        {item.name}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <span className="inline-flex px-4 py-1.5 rounded-xl bg-muted/40 text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border/50">
                        {item.type}
                       </span>
                    </td>
                    <td className="px-10 py-8 font-black text-rose-500 italic tracking-tighter text-lg">
                      Rs. {item.amount.toLocaleString()}
                    </td>
                    <td className="px-10 py-8">
                      <button className="p-3 rounded-full hover:bg-primary hover:text-white transition-all border border-border text-muted-foreground">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Persistent Visual Accents */}
      <div className="fixed top-1/2 left-0 -translate-y-1/2 w-1 h-64 bg-primary/20 blur-sm rounded-r-full" />
      <div className="fixed top-1/2 right-0 -translate-y-1/2 w-1 h-64 bg-primary/20 blur-sm rounded-l-full" />
    </div>
  );
}
