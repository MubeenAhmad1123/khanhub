'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Loader2, LogOut, User, Bell, Menu } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const ADMIN_WHITELIST = [
    'khanhubnetwork@gmail.com',
    'mubeenahma1123@gmail.com',
    'khanhub27@gmail.com',
    'mubeenahmad1123@gmail.com'
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, logout, isAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Only redirect if: 
        // 1. Not loading
        // 2. Not already on login page

        if (!loading && pathname !== '/admin/login') {
            // Case 1: Not logged in at all -> Silent redirect
            if (!user) {
                router.push('/admin/login');
                return;
            }

            // Case 2: Logged in but not admin
            const isWhitelisted = user?.email && ADMIN_WHITELIST.includes(user.email.toLowerCase());

            if (!isAdmin && !isWhitelisted) {
                // Not authorized and not even whitelisted -> Show error and redirect
                toast('Access denied. Admin only.', 'error');
                router.push('/admin/login');
            } else if (!isAdmin && isWhitelisted) {
                // Whitelisted but role not synced yet -> Silent redirect to handle promotion
                router.push('/admin/login');
            }
        }
    }, [isAdmin, user, loading, router, toast, pathname]);

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/admin/login');
        } catch (err) {
            toast('Failed to logout', 'error');
        }
    };

    // If it's the login page, just render the content without sidebar/header
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    if (loading || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F1F5F9]">
            {/* Sidebar */}
            <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <div className="lg:pl-[260px] flex flex-col min-h-screen">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-slate-800 font-bold hidden sm:block">
                            {pathname === '/admin/dashboard' ? 'Dashboard' :
                                pathname.split('/').pop()?.replace(/-/g, ' ').toUpperCase() || 'Admin Panel'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        {/* Notifications (Placeholder) */}
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        {/* Admin Profile */}
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-bold text-slate-900 leading-none mb-1">Admin</p>
                                <p className="text-xs text-slate-500 truncate max-w-[150px]">{user?.email}</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black border-2 border-blue-200 uppercase">
                                {user?.email?.charAt(0) || 'A'}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
