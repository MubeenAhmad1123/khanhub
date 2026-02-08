'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Briefcase, DollarSign, Calendar, ArrowLeft, Loader2, PieChart, BarChart3, Activity } from 'lucide-react';
import Link from 'next/link';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AnalyticsData } from '@/types/admin';

export default function AdminAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // This is a simplified analytics fetcher for the demo
                // In a real app, this would be a specialized cloud function or a more complex query
                const [paymentsSnap, appsSnap, usersSnap, jobsSnap, placementsSnap] = await Promise.all([
                    getDocs(collection(db, 'payments')),
                    getDocs(collection(db, 'applications')),
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'jobs')),
                    getDocs(collection(db, 'placements'))
                ]);

                const payments = paymentsSnap.docs.map(d => d.data());
                const applications = appsSnap.docs.map(d => d.data());
                const users = usersSnap.docs.map(d => d.data());
                const jobs = jobsSnap.docs.map(d => d.data());
                const placements = placementsSnap.docs.map(d => d.data());

                const totalRevenue = payments
                    .filter(p => p.status === 'approved')
                    .reduce((sum, p) => sum + (p.amount || 0), 0) +
                    placements
                        .filter(p => p.commissionStatus === 'collected')
                        .reduce((sum, p) => sum + (p.commissionAmount || 0), 0);

                setData({
                    totalRevenue,
                    revenueToday: 0, // Simplified
                    revenueThisWeek: 0,
                    revenueThisMonth: 0,
                    totalApplications: applications.length,
                    applicationsToday: 0,
                    applicationsThisWeek: 0,
                    applicationsThisMonth: 0,
                    totalJobSeekers: users.filter(u => u.role === 'job_seeker').length,
                    totalEmployers: users.filter(u => u.role === 'employer').length,
                    totalActiveJobs: jobs.filter(j => j.status === 'approved').length,
                    totalPlacements: placements.length,
                    pendingPayments: payments.filter(p => p.status === 'pending').length,
                    pendingJobs: jobs.filter(j => j.status === 'pending').length,
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
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-jobs-neutral p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin" className="p-3 bg-white rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <ArrowLeft className="h-6 w-6 text-jobs-dark" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-jobs-dark">Analytics & Insights</h1>
                        <p className="text-jobs-dark/60">Platform performance and growth metrics</p>
                    </div>
                </div>

                {/* Primary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                        label="Total Revenue"
                        value={`Rs. ${data?.totalRevenue.toLocaleString()}`}
                        icon={<DollarSign className="h-6 w-6 text-green-600" />}
                        color="bg-green-100"
                    />
                    <MetricCard
                        label="Active Jobs"
                        value={data?.totalActiveJobs || 0}
                        icon={<Briefcase className="h-6 w-6 text-blue-600" />}
                        color="bg-blue-100"
                    />
                    <MetricCard
                        label="Total Users"
                        value={(data?.totalJobSeekers || 0) + (data?.totalEmployers || 0)}
                        icon={<Users className="h-6 w-6 text-purple-600" />}
                        color="bg-purple-100"
                    />
                    <MetricCard
                        label="Placements"
                        value={data?.totalPlacements || 0}
                        icon={<TrendingUp className="h-6 w-6 text-orange-600" />}
                        color="bg-orange-100"
                    />
                </div>

                {/* Detailed Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-jobs-dark flex items-center gap-2">
                                <Users className="h-5 w-5 text-jobs-primary" /> User Distribution
                            </h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-jobs-neutral rounded-2xl">
                                <span className="font-bold text-jobs-dark">Job Seekers</span>
                                <span className="px-4 py-1 bg-white rounded-full font-black text-jobs-primary border border-jobs-primary/10">
                                    {data?.totalJobSeekers}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-jobs-neutral rounded-2xl">
                                <span className="font-bold text-jobs-dark">Employers</span>
                                <span className="px-4 py-1 bg-white rounded-full font-black text-jobs-primary border border-jobs-primary/10">
                                    {data?.totalEmployers}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-jobs-dark flex items-center gap-2">
                                <Activity className="h-5 w-5 text-jobs-accent" /> Platform Activity
                            </h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-jobs-neutral rounded-2xl">
                                <span className="font-bold text-jobs-dark">Total Applications</span>
                                <span className="font-black text-jobs-accent">{data?.totalApplications}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-jobs-neutral rounded-2xl">
                                <span className="font-bold text-jobs-dark">Pending Jobs</span>
                                <span className="font-black text-red-500">{data?.pendingJobs}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-jobs-neutral rounded-2xl">
                                <span className="font-bold text-jobs-dark">Pending Payments</span>
                                <span className="font-black text-orange-500">{data?.pendingPayments}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Growth Chart Placeholder */}
                <div className="bg-jobs-dark p-8 rounded-3xl shadow-2xl text-white">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black mb-1">Growth Overview</h2>
                            <p className="text-white/40 text-sm">Monthly performance tracking</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="px-4 py-2 bg-white/10 rounded-xl text-xs font-bold">Monthly</div>
                        </div>
                    </div>

                    <div className="h-64 flex items-end gap-2 px-4">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 95, 75, 60, 100].map((height, i) => (
                            <div key={i} className="flex-1 bg-jobs-primary/20 rounded-t-lg group relative hover:bg-jobs-primary transition-all duration-300" style={{ height: `${height}%` }}>
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-jobs-dark px-2 py-1 rounded text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                                    {height}%
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 px-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>May</span>
                        <span>Jun</span>
                        <span>Jul</span>
                        <span>Aug</span>
                        <span>Sep</span>
                        <span>Oct</span>
                        <span>Nov</span>
                        <span>Dec</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
            <div className={`${color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <div className="text-sm font-bold text-jobs-dark/60 uppercase tracking-tight mb-1">{label}</div>
            <div className="text-2xl font-black text-jobs-dark">{value}</div>
        </div>
    );
}
