'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SpimsRole } from '@/types/spims';

interface NavItem {
  label: string;
  href: string;
  roles: SpimsRole[];
}

const navItems: NavItem[] = [
  { label: 'Student View', href: '/departments/spims/dashboard/student', roles: ['student'] },
  { label: 'Staff Dashboard', href: '/departments/spims/dashboard/staff', roles: ['staff'] },
  { label: 'Cashier Dashboard', href: '/departments/spims/dashboard/cashier', roles: ['cashier', 'superadmin'] },
  { label: 'Admin Overview', href: '/departments/spims/dashboard/admin', roles: ['admin', 'superadmin'] },
  { label: 'Students', href: '/departments/spims/dashboard/admin/students', roles: ['admin', 'superadmin'] },
  { label: 'Staff Management', href: '/departments/spims/dashboard/admin/staff', roles: ['admin', 'superadmin'] },
  { label: 'Finance', href: '/departments/spims/dashboard/admin/finance', roles: ['admin', 'superadmin'] },
  { label: 'Reports', href: '/departments/spims/dashboard/admin/reports', roles: ['admin', 'superadmin'] },
  { label: 'Approvals', href: '/departments/spims/dashboard/superadmin/approvals', roles: ['superadmin'] },
];

export default function SpimsSidebar({ role, studentId }: { role: SpimsRole; studentId?: string }) {
  const pathname = usePathname();

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-50 flex items-center gap-3">
        <img src="/logo.webp" alt="Khan Hub" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-[#1D9E75] text-lg">Spims Portal</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map((item) => {
          let href = item.href;
          if (item.label === 'Student View' && studentId) {
            href = `${item.href}/${studentId}`;
          }
          const isActive = pathname === href;
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-[#1D9E75]/10 text-[#1D9E75] font-semibold' 
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
            localStorage.removeItem('spims_session');
            window.location.href = '/departments/spims/login';
          }}
          className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
