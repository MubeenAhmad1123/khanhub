'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { X, Menu } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface BadgeCounts {
    pendingVideos: number;
    pendingPayments: number;
}

const navSections = [
    {
        label: null,
        items: [
            { href: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
        ],
    },
    {
        label: 'VIDEO MANAGEMENT',
        items: [
            { href: '/admin/videos', icon: '🎬', label: 'Video Queue', badgeKey: 'pendingVideos' as const },
        ],
    },
    {
        label: 'PAYMENTS',
        items: [
            { href: '/admin/payments', icon: '💳', label: 'All Payments', badgeKey: 'pendingPayments' as const },
        ],
    },
    {
        label: 'USERS',
        items: [
            { href: '/admin/users', icon: '👥', label: 'All Users' },
        ],
    },
    {
        label: 'PLACEMENTS',
        items: [
            { href: '/admin/placements', icon: '🤝', label: 'Placements' },
        ],
    },
    {
        label: 'SYSTEM',
        items: [
            { href: '/admin/analytics', icon: '📈', label: 'Analytics' },
            { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
        ],
    },
];

export default function AdminSidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const [badges, setBadges] = useState<BadgeCounts>({ pendingVideos: 0, pendingPayments: 0 });

    useEffect(() => {
        // Live badge counts
        const videosUnsub = onSnapshot(
            query(collection(db, 'videos'), where('admin_status', '==', 'pending')),
            (snap) => setBadges(prev => ({ ...prev, pendingVideos: snap.size }))
        );
        const paymentsUnsub = onSnapshot(
            query(collection(db, 'payments'), where('status', '==', 'pending')),
            (snap) => setBadges(prev => ({ ...prev, pendingPayments: snap.size }))
        );
        return () => { videosUnsub(); paymentsUnsub(); };
    }, []);

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="px-6 py-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-1">Khan Hub</p>
                        <h1 className="text-white font-black text-lg leading-none">Admin Panel</h1>
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
                {navSections.map((section, si) => (
                    <div key={si} className="mb-2">
                        {section.label && (
                            <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase px-3 py-2 mt-2">
                                {section.label}
                            </p>
                        )}
                        {section.items.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                            const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-sm font-medium group relative ${isActive
                                            ? 'bg-blue-600/20 text-white border-l-2 border-blue-500 pl-[calc(0.75rem-2px)]'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-2 border-transparent'
                                        }`}
                                >
                                    <span className="text-base">{item.icon}</span>
                                    <span className="flex-1">{item.label}</span>
                                    {badgeCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                                            {badgeCount > 99 ? '99+' : badgeCount}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-700/50">
                <p className="text-[10px] text-slate-600">Khan Hub Admin v2.0</p>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex flex-col w-[260px] min-h-screen bg-[#0F172A] fixed left-0 top-0 z-40">
                <SidebarContent />
            </aside>

            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Mobile drawer */}
            <aside
                className={`lg:hidden fixed left-0 top-0 h-full w-[260px] bg-[#0F172A] z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <SidebarContent />
            </aside>
        </>
    );
}
