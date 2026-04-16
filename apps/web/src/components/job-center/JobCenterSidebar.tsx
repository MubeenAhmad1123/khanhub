'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { JobCenterRole } from '@/types/job-center';

interface NavItem {
  label: string;
  href: string;
  roles: JobCenterRole[];
}

const navItems: NavItem[] = [
  { label: 'Seeker View', href: '/departments/job-center/dashboard/seeker', roles: ['seeker'] },
  { label: 'Staff Dashboard', href: '/departments/job-center/dashboard/staff', roles: ['staff'] },
  { label: 'Admin Overview', href: '/departments/job-center/dashboard/admin', roles: ['admin', 'superadmin'] },
  { label: 'Seekers', href: '/departments/job-center/dashboard/admin/seekers', roles: ['admin', 'superadmin'] },
  { label: 'Staff Management', href: '/departments/job-center/dashboard/admin/staff', roles: ['admin', 'superadmin'] },
  { label: 'Finance', href: '/departments/job-center/dashboard/admin/finance', roles: ['admin', 'superadmin'] },
  { label: 'Reports', href: '/departments/job-center/dashboard/admin/reports', roles: ['admin', 'superadmin'] },
  { label: 'Approvals', href: '/departments/job-center/dashboard/superadmin/approvals', roles: ['superadmin'] },
];

export default function JobCenterSidebar({ role, seekerId }: { role: JobCenterRole, seekerId?: string }) {
  const pathname = usePathname();

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-50 flex items-center gap-3">
        <img src="/logo.webp" alt="KhanHub" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-orange-600 text-lg">JobCenter Portal</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map((item) => {
          let href = item.href;
          if (item.label === 'Seeker View' && seekerId) {
            href = `${item.href}/${seekerId}`;
          }
          const isActive = pathname === href;
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-orange-50 text-orange-600 font-semibold shadow-sm shadow-orange-900/5' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 mt-auto">
        <button 
          onClick={() => {
            localStorage.removeItem('jobcenter_session');
            window.location.href = '/departments/job-center/login';
          }}
          className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
