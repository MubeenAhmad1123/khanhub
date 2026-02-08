'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const isActive = (path: string) => pathname === path;

    // Job Seeker Menu Items
    const jobSeekerMenu = [
        { name: 'Dashboard', path: '/dashboard', icon: '📊' },
        { name: 'Find Jobs', path: '/search', icon: '🔍' },
        { name: 'My Applications', path: '/dashboard/applications', icon: '📝' },
        { name: 'Saved Jobs', path: '/dashboard/saved-jobs', icon: '⭐' },
        { name: 'Profile', path: '/dashboard/profile', icon: '👤' },
        { name: 'Premium', path: '/dashboard/premium', icon: '💎' },
    ];

    // Employer Menu Items
    const employerMenu = [
        { name: 'Dashboard', path: '/employer/dashboard', icon: '📊' },
        { name: 'Post Job', path: '/employer/post-job', icon: '➕' },
        { name: 'My Jobs', path: '/employer/jobs', icon: '💼' },
        { name: 'Applications', path: '/employer/applications', icon: '📋' },
    ];

    // Admin Menu Items
    const adminMenu = [
        { name: 'Dashboard', path: '/admin', icon: '📊' },
        { name: 'Payments', path: '/admin/payments', icon: '💰' },
        { name: 'Job Approvals', path: '/admin/jobs', icon: '✅' },
        { name: 'Users', path: '/admin/users', icon: '👥' },
        { name: 'Placements', path: '/admin/placements', icon: '🎯' },
        { name: 'Analytics', path: '/admin/analytics', icon: '📈' },
    ];

    // Select menu based on user role
    let menuItems = jobSeekerMenu;
    if (user?.role === 'employer') {
        menuItems = employerMenu;
    } else if (user?.role === 'admin') {
        menuItems = adminMenu;
    }

    return (
        <aside className="w-64 bg-white shadow-lg h-screen sticky top-0">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-teal-600">KhanHub</h2>
                <p className="text-sm text-gray-600 mt-1">
                    {user?.role === 'admin' && 'Admin Panel'}
                    {user?.role === 'employer' && 'Employer Dashboard'}
                    {user?.role === 'job_seeker' && 'Job Seeker'}
                </p>
            </div>

            <nav className="px-4 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                    </Link>
                ))}
            </nav>

            {/* User Info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">
                        {user?.email?.[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.email}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}