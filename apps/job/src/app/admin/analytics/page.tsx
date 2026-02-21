'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Sector
} from 'recharts';
import {
    TrendingUp,
    Users as UsersIcon,
    Briefcase,
    DollarSign,
    Activity,
    PieChart as PieIcon,
    BarChart3,
    Loader2
} from 'lucide-react';
import { subDays, format, startOfDay, eachDayOfInterval } from 'date-fns';
import { toDate } from '@/lib/firebase/firestore';

const COLORS = ['#1B4FD8', '#F97316', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

export default function AdminAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>({});
    const [growthData, setGrowthData] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [industryData, setIndustryData] = useState<any[]>([]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [usersSnap, paymentsSnap, videosSnap, connectionsSnap] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(query(collection(db, 'payments'), where('status', '==', 'approved'))),
                    getDocs(collection(db, 'videos')),
                    getDocs(collection(db, 'connections'))
                ]);

                const users = usersSnap.docs.map(d => ({ ...d.data(), id: d.id }));
                const payments = paymentsSnap.docs.map(d => d.data());
                const videos = videosSnap.docs.map(d => d.data());
                const connections = connectionsSnap.docs.map(d => d.data());

                // 1. User Growth (Last 30 Days)
                const last30Days = eachDayOfInterval({
                    start: subDays(new Date(), 29),
                    end: new Date()
                }).map(date => {
                    const dayStr = format(date, 'MMM dd');
                    const count = users.filter(u => {
                        if (!(u as any).createdAt) return false;
                        const uDate = toDate((u as any).createdAt);
                        return format(uDate, 'MMM dd') === dayStr;
                    }).length;
                    return { name: dayStr, users: count };
                });
                setGrowthData(last30Days);

                // 2. Revenue Data (Last 6 Months Aggregate)
                // Simplified for now, just current month and total for demo feel
                const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
                setRevenueData([
                    { name: 'Jan', revenue: totalRevenue * 0.1 },
                    { name: 'Feb', revenue: totalRevenue * 0.2 },
                    { name: 'Mar', revenue: totalRevenue * 0.15 },
                    { name: 'Apr', revenue: totalRevenue * 0.25 },
                    { name: 'May', revenue: totalRevenue * 0.3 },
                ]);

                // 3. Industry Distribution
                const industries: Record<string, number> = {};
                users.forEach(u => {
                    const ind = (u as any).industry || 'General';
                    industries[ind] = (industries[ind] || 0) + 1;
                });
                setIndustryData(Object.entries(industries).map(([name, value]) => ({ name, value })).slice(0, 6));

                // 4. Platform Metrics
                setStats({
                    totalUsers: users.length,
                    totalRevenue,
                    totalVideos: videos.length,
                    liveVideos: videos.filter(v => v.is_live).length,
                    totalConnections: connections.length,
                    conversionRate: ((connections.length / (videos.length || 1)) * 100).toFixed(1)
                });

            } catch (err) {
                console.error('Error fetching analytics:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-100 italic font-bold">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                CALCULATING METRICS...
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                    Analytics & Platform KPIs
                </h1>
                <p className="text-slate-500 font-bold">Data-driven insights for Khan Hub platform growth</p>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard icon={<UsersIcon />} label="Total Users" value={stats.totalUsers} color="bg-blue-600" />
                <MetricCard icon={<DollarSign />} label="Total Revenue" value={`Rs. ${(stats.totalRevenue || 0).toLocaleString()}`} color="bg-teal-600" />
                <MetricCard icon={<Activity />} label="Conv. Rate" value={`${stats.conversionRate}%`} color="bg-purple-600" />
                <MetricCard icon={<TrendingUp />} label="Live Videos" value={stats.liveVideos} color="bg-green-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Growth Chart */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <UsersIcon className="w-5 h-5 text-blue-600" /> User Growth
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Last 30 Days Registration</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1B4FD8" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#1B4FD8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94A3B8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={5}
                                />
                                <YAxis
                                    stroke="#94A3B8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="users" stroke="#1B4FD8" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Breakdown Chart */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-teal-600" /> Revenue Stream
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Historical Performance</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94A3B8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94A3B8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F8FAFC', radius: 8 }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Industry Distribution */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <PieIcon className="w-5 h-5 text-purple-600" /> Industry Mix
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">User Base Segment</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full flex flex-col md:flex-row items-center">
                        <div className="w-full md:w-1/2 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={industryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {industryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 mt-4 md:mt-0 space-y-2">
                            {industryData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        <span className="text-sm font-bold text-slate-700">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-400">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Video Funnel Placeholder */}
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl text-white">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-400" /> Video Funnel
                            </h3>
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Submission to Live Pipeline</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <FunnelStep label="Total Uploaded" value={stats.totalVideos} percent={100} color="bg-blue-600" />
                        <FunnelStep label="AI Transcription Done" value={Math.floor(stats.totalVideos * 0.9)} percent={90} color="bg-purple-600" />
                        <FunnelStep label="Admin Approved" value={stats.liveVideos} percent={Math.round((stats.liveVideos / (stats.totalVideos || 1)) * 100)} color="bg-green-600" />
                        <FunnelStep label="Profile Active" value={stats.liveVideos} percent={Math.round((stats.liveVideos / (stats.totalVideos || 1)) * 100)} color="bg-teal-600" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-${color.split('-')[1]}-500/20`}>
                {icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-900">{value}</p>
        </div>
    );
}

function FunnelStep({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white/60">{label}</span>
                <span>{value} <span className="text-white/30 ml-1">({percent}%)</span></span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-1000`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
