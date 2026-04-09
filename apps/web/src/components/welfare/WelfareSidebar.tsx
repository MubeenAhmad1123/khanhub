'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WelfareRole } from '@/types/welfare';

interface NavItem {
  label: string;
  href: string;
  roles: WelfareRole[];
}

const navItems: NavItem[] = [
  { label: 'Family View', href: '/departments/welfare/dashboard/family', roles: ['family'] },
  { label: 'Staff Dashboard', href: '/departments/welfare/dashboard/staff', roles: ['staff'] },
  { label: 'Cashier Dashboard', href: '/departments/welfare/dashboard/cashier', roles: ['cashier', 'superadmin'] },
  { label: 'Admin Overview', href: '/departments/welfare/dashboard/admin', roles: ['admin', 'superadmin'] },
  { label: 'Patients', href: '/departments/welfare/dashboard/admin/patients', roles: ['admin', 'superadmin'] },
  { label: 'Staff Management', href: '/departments/welfare/dashboard/admin/staff', roles: ['admin', 'superadmin'] },
  { label: 'Finance', href: '/departments/welfare/dashboard/admin/finance', roles: ['admin', 'superadmin'] },
  { label: 'Reports', href: '/departments/welfare/dashboard/admin/reports', roles: ['admin', 'superadmin'] },
  { label: 'Approvals', href: '/departments/welfare/dashboard/superadmin/approvals', roles: ['superadmin'] },
];

export default function WelfareSidebar({ role, patientId }: { role: WelfareRole, patientId?: string }) {
  const pathname = usePathname();

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-50 flex items-center gap-3">
        <img src="/logo.webp" alt="KhanHub" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-[#1D9E75] text-lg">Welfare Portal</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map((item) => {
          let href = item.href;
          if (item.label === 'Family View' && patientId) {
            href = `${item.href}/${patientId}`;
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
            localStorage.removeItem('welfare_session');
            window.location.href = '/departments/welfare/login';
          }}
          className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
