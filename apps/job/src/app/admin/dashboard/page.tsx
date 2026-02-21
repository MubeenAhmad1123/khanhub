'use client';

import { useAdminStats } from '@/hooks/useAdminStats';
import StatsCard from '@/components/admin/StatsCard';
import ActivityFeed from '@/components/admin/ActivityFeed';
import {
    Users,
    CreditCard,
    Video,
    CheckCircle,
    Link as LinkIcon,
    Coins,
    ArrowRight,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
    const stats = useAdminStats();

    const actionItems = [
        {
            title: 'Payments Pending',
            count: stats.pendingPayments,
            href: '/admin/payments',
            color: 'yellow' as const,
            icon: <CreditCard className="w-5 h-5" />,
            condition: stats.pendingPayments > 0,
            warning: stats.pendingPayments > 5, // Just an example threshold
        },
        {
            title: 'Videos in Queue',
            count: stats.pendingVideos,
            href: '/admin/videos',
            color: 'orange' as const,
            icon: <Video className="w-5 h-5" />,
            condition: stats.pendingVideos > 0,
        }
    ];

    const hasUrgentActions = actionItems.some(i => i.condition);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Welcome */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic">COMMAND CENTER</h1>
                    <p className="text-slate-500 font-medium">Khan Hub Platform Overview</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-bold text-slate-600">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    LIVE SYSTEM FEED
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                <StatsCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon="👥"
                    color="blue"
                />
                <StatsCard
                    title="Pending Payments"
                    value={stats.pendingPayments}
                    icon="⏳"
                    color="yellow"
                />
                <StatsCard
                    title="Pending Videos"
                    value={stats.pendingVideos}
                    icon="🎬"
                    color="yellow"
                />
                <StatsCard
                    title="Live Videos"
                    value={stats.liveVideos}
                    icon="✅"
                    color="green"
                />
                <StatsCard
                    title="Total Connections"
                    value={stats.totalConnections}
                    icon="🔗"
                    color="purple"
                />
                <StatsCard
                    title="Revenue (PKR)"
                    value={stats.totalRevenue.toLocaleString()}
                    icon="💰"
                    color="teal"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    {/* Action Required Section */}
                    <div className={`bg-white rounded-2xl border-2 p-6 shadow-sm ${hasUrgentActions ? 'border-red-100' : 'border-green-100'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                {hasUrgentActions ? <AlertCircle className="w-6 h-6 text-red-500" /> : <CheckCircle2 className="w-6 h-6 text-green-500" />}
                                Action Required
                            </h3>
                        </div>

                        {hasUrgentActions ? (
                            <div className="space-y-4">
                                {actionItems.filter(i => i.condition).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${item.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {item.icon}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{item.count} {item.title}</p>
                                                <p className="text-xs text-slate-500">Needs your review</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={item.href}
                                            className="px-4 py-2 bg-white border border-slate-200 text-slate-900 text-sm font-bold rounded-lg hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center gap-2"
                                        >
                                            Review Now
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <p className="text-lg font-bold text-slate-900">✓ All clear</p>
                                <p className="text-slate-500">No actions required at this moment.</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Action Cards */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Review Payment Queue', href: '/admin/payments', icon: <CreditCard className="w-5 h-5" />, color: 'bg-blue-600' },
                                { label: 'Review Video Queue', href: '/admin/videos', icon: <Video className="w-5 h-5" />, color: 'bg-orange-600' },
                                { label: 'View All Users', href: '/admin/users', icon: <Users className="w-5 h-5" />, color: 'bg-slate-900' },
                                { label: 'View Placements', href: '/admin/placements', icon: <LinkIcon className="w-5 h-5" />, color: 'bg-purple-600' },
                            ].map((action, idx) => (
                                <Link
                                    key={idx}
                                    href={action.href}
                                    className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
                                >
                                    <div className={`${action.color} text-white p-3 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
                                        {action.icon}
                                    </div>
                                    <p className="font-bold text-slate-900 leading-tight">{action.label}</p>
                                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                        Open Page <ArrowRight className="w-3 h-3" />
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                        <Link href="/admin/activity" className="text-xs font-bold text-blue-600 hover:underline px-2 py-1 bg-blue-50 rounded-lg">
                            VIEW ALL
                        </Link>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto max-h-[600px]">
                        <ActivityFeed />
                    </div>
                </div>
            </div>
        </div>
    );
}
