'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Filter,
  Download,
  Activity,
  ChevronRight
} from 'lucide-react';
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
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { fetchAnalyticsData, AnalyticsData } from '@/lib/hq/superadmin/analytics';
import { InlineLoading } from '@/components/hq/superadmin/DataState';

// ─── Constants & Styles ────────────────────────────────────────────────────────

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.21, 0.45, 0.32, 0.9] }
  })
};

const CHART_COLORS = {
  rehab: '#000000', // Black
  spims: '#475569', // Slate-600
  job_center: '#94A3B8', // Slate-400
  grid: 'rgba(0, 0, 0, 0.05)',
  gridDark: 'rgba(255, 255, 255, 0.05)',
  text: '#64748B', // Slate-500
  textDark: '#94A3B8' // Slate-400
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function AnalyticsCard({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  delay = 0 
}: { 
  title: string; 
  value: string; 
  trend?: { val: string; positive: boolean };
  icon: any; 
  delay?: number 
}) {
  return (
    <motion.div
      custom={delay}
      initial="hidden"
      animate="visible"
      variants={CARD_VARIANTS}
      className="relative overflow-hidden rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{title}</p>
          <h3 className="mt-1 text-3xl font-black tracking-tight text-black dark:text-white">{value}</h3>
          {trend && (
            <div className={`mt-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest ${trend.positive ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
              {trend.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{trend.val} Shift</span>
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-3 text-black dark:text-white border border-gray-100 dark:border-white/5">
          <Icon size={24} />
        </div>
      </div>
      {/* Decorative gradient */}
      <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5 blur-3xl" />
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white/90 dark:bg-black/90 p-4 shadow-2xl backdrop-blur-md">
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 capitalize">{entry.name}</span>
              </div>
              <span className="text-xs font-black text-black dark:text-white">
                {typeof entry.value === 'number' && entry.value > 1000 
                  ? `RS ${entry.value.toLocaleString()}` 
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6M');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    fetchAnalyticsData()
      .then(setData)
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <InlineLoading label="Designing your dashboard..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 text-black dark:text-white mb-2">
            <Activity size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Intelligence Node</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-black dark:text-white md:text-5xl">Analytics <span className="text-black/10 dark:text-white/20">&</span> Metrics</h1>
          <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">Holistic performance ecosystem for KhanHub departments.</p>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-1 backdrop-blur-md">
            {['1M', '3M', '6M', '1Y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-xl px-4 py-2 text-[10px] font-black tracking-widest transition-all ${
                  timeRange === range ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-[10px] font-black text-black dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/10 shadow-sm">
            <Download size={16} />
            <span className="uppercase tracking-widest">Export</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard 
          title="Total Ecosystem Revenue" 
          value={`RS ${data?.totalRevenue?.toLocaleString()}`}
          trend={{ val: '12.5%', positive: true }}
          icon={DollarSign}
          delay={0}
        />
        <AnalyticsCard 
          title="Active Engagement" 
          value={data?.totalUsers?.toString() || '0'}
          trend={{ val: '8.2%', positive: true }}
          icon={Users}
          delay={1}
        />
        <AnalyticsCard 
          title="Growth Velocity" 
          value="4.8x"
          trend={{ val: '22%', positive: true }}
          icon={TrendingUp}
          delay={2}
        />
        <AnalyticsCard 
          title="Conversion Rate" 
          value="18.5%"
          trend={{ val: '2.1%', positive: false }}
          icon={ArrowUpRight}
          delay={3}
        />
      </div>

      {/* Main Insights Grid */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Revenue Growth Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="lg:col-span-2 rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-8 shadow-sm"
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-black dark:text-white">Revenue Performance</h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest font-black">Monthly Trend per Department</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-black dark:bg-white" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Rehab</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-slate-500" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">SPIMS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-slate-400" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Jobs</span>
              </div>
            </div>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRehab" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.rehab} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.rehab} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSpims" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.spims} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.spims} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorJob" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.job_center} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.job_center} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: CHART_COLORS.text, fontSize: 10, fontWeight: 900 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: CHART_COLORS.text, fontSize: 10, fontWeight: 900 }}
                  tickFormatter={(val) => `RS ${val/1000}k`}
                />
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                <Area 
                  type="monotone" 
                  dataKey="rehab" 
                  stroke={CHART_COLORS.rehab} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRehab)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="spims" 
                  stroke={CHART_COLORS.spims} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSpims)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="jobCenter" 
                  stroke={CHART_COLORS.job_center} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorJob)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Departmental Allocation */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-8 shadow-sm flex flex-col items-center justify-center text-center"
        >
          <div className="mb-6 w-full text-left">
            <h2 className="text-xl font-black text-black dark:text-white">Revenue Split</h2>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest font-black">Total Contribution</p>
          </div>
          
          <div className="relative h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.revenueByDept}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {data?.revenueByDept.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#000000' : index === 1 ? '#475569' : '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Total</span>
              <span className="text-xl font-black text-black dark:text-white">100%</span>
            </div>
          </div>

          <div className="mt-8 grid w-full grid-cols-1 gap-3">
            {data?.revenueByDept.map((dept, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-white/[0.03] p-4 border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: i === 0 ? '#000000' : i === 1 ? '#475569' : '#94A3B8' }} />
                  <span className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">{dept.name}</span>
                </div>
                <span className="text-sm font-black text-black dark:text-white">
                  {Math.round((dept.value / (data?.totalRevenue || 1)) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Dynamic Engagement Section */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* User Acquisition Trend */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-8 shadow-sm"
        >
          <div className="mb-8">
            <h2 className="text-xl font-black text-black dark:text-white">Engagement Velocity</h2>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest font-black">New Registrations (Last 30 Days)</p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.userGrowth} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: CHART_COLORS.text, fontSize: 9, fontWeight: 900 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: CHART_COLORS.text, fontSize: 9, fontWeight: 900 }} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="rehab" fill={CHART_COLORS.rehab} radius={[4, 4, 0, 0]} />
                <Bar dataKey="spims" fill={CHART_COLORS.spims} radius={[4, 4, 0, 0]} />
                <Bar dataKey="jobCenter" fill={CHART_COLORS.job_center} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Entities / Drill Down */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-8 shadow-sm"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-black dark:text-white">Operational Excellence</h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest font-black">Real-time Efficiency Matrix</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Staff Efficiency', value: 94, color: 'black' },
              { label: 'System Uptime', value: 99.9, color: 'black' },
              { label: 'Resolution Rate', value: 87, color: 'black' },
              { label: 'Data Latency', value: 12, unit: 'ms', color: 'gray', inverse: true },
            ].map((metric, i) => (
              <div key={i} className="group relative overflow-hidden rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-5 transition-all hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white dark:group-hover:text-black transition-colors">{metric.label}</span>
                  <span className="text-sm font-black transition-colors">{metric.value}{metric.unit || '%'}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden border border-black/5 dark:border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.inverse ? 100 - metric.value : metric.value}%` }}
                    transition={{ delay: 1 + (i * 0.1), duration: 1 }}
                    className={`h-full ${
                      metric.color === 'black' ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  />
                </div>
              </div>
            ))}
            
            <button className="mt-4 flex w-full items-center justify-between rounded-3xl bg-black dark:bg-white px-6 py-5 text-white dark:text-black transition-all hover:opacity-90 active:scale-[0.98] shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-widest">Generate Detailed Report</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
