'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Shield, Eye, FileText,
  UserCog, CalendarCheck, CheckCircle, CreditCard, History,
  LogOut, Menu, X, ArrowLeft, Sun, Moon, Calculator, Tag, DollarSign, TrendingUp, BarChart2, User,
  Building2, GraduationCap, ChevronLeft, ExternalLink, Heart
} from 'lucide-react';
import type { HqRole, HqSession } from '@/types/hq';
import { HqNotificationBell } from '@/components/hq/HqNotificationBell';
import { HqSuperadminApprovalsNavBadge } from '@/components/hq/HqSuperadminApprovalsNavBadge';

const SESSION_KEY = 'hq_session';
const SESSION_TIMEOUT = 43200000;

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: HqRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/hq/dashboard/superadmin', icon: <LayoutDashboard size={16} />, roles: ['superadmin'] },
  { label: 'Approvals', href: '/hq/dashboard/superadmin/approvals', icon: <CheckCircle size={16} />, roles: ['superadmin'] },
  { label: 'Finance', href: '/hq/dashboard/superadmin/finance', icon: <TrendingUp size={16} />, roles: ['superadmin'] },
  { label: 'All Users', href: '/hq/dashboard/superadmin/users', icon: <Users size={16} />, roles: ['superadmin'] },
  { label: 'Departments', href: '/hq/dashboard/superadmin/departments', icon: <Building2 size={16} />, roles: ['superadmin'] },
  { label: 'SPIMS', href: '/hq/dashboard/superadmin/spims', icon: <GraduationCap size={16} />, roles: ['superadmin'] },
  { label: 'Staff', href: '/hq/dashboard/superadmin/staff', icon: <UserCog size={16} />, roles: ['superadmin'] },
  { label: 'Audit Log', href: '/hq/dashboard/superadmin/audit', icon: <FileText size={16} />, roles: ['superadmin'] },
  { label: 'Reconciliation', href: '/hq/dashboard/superadmin/reconciliation', icon: <Calculator size={16} />, roles: ['superadmin'] },
  { label: 'Settings', href: '/hq/dashboard/superadmin/settings', icon: <User size={16} />, roles: ['superadmin'] },
  { label: 'Overview', href: '/hq/dashboard/manager', icon: <LayoutDashboard size={16} />, roles: ['manager'] },
  { label: 'Staff Roster', href: '/hq/dashboard/manager/staff', icon: <UserCog size={16} />, roles: ['manager'] },
  { label: 'Mark Attendance', href: '/hq/dashboard/manager/staff/attendance', icon: <CalendarCheck size={16} />, roles: ['manager'] },
  { label: 'Approvals', href: '/hq/dashboard/manager/approvals', icon: <CheckCircle size={16} />, roles: ['manager'] },
  { label: 'Salary Slips', href: '/hq/dashboard/manager/salary', icon: <DollarSign size={16} />, roles: ['manager'] },
  { label: 'Reports', href: '/hq/dashboard/manager/reports', icon: <BarChart2 size={16} />, roles: ['manager'] },
  { label: 'Profile', href: '/hq/dashboard/manager/profile', icon: <User size={16} />, roles: ['manager'] },
  { label: 'Create Users', href: '/hq/dashboard/manager/users', icon: <Users size={16} />, roles: ['manager'] },
  { label: 'Cashier Station', href: '/hq/dashboard/cashier', icon: <CreditCard size={16} />, roles: ['cashier'] },
  { label: 'Daily Close', href: '/hq/dashboard/cashier/reconciliation', icon: <Calculator size={16} />, roles: ['cashier'] },
  { label: 'Transaction History', href: '/hq/dashboard/cashier/history', icon: <History size={16} />, roles: ['cashier'] },
  { label: 'Profile', href: '/hq/dashboard/cashier/profile', icon: <User size={16} />, roles: ['cashier'] },
];

const ROLE_COLORS: Record<HqRole, string> = {
  superadmin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  cashier: 'bg-amber-100 text-amber-700',
};

const ROLE_LABELS: Record<HqRole, string> = {
  superadmin: 'Super Admin',
  manager: 'Manager',
  cashier: 'Cashier',
};

// Dept label map for sidebar shortcuts
const DEPT_INFO: Record<string, { label: string; adminUrl: string; color: string; icon: React.ReactNode }> = {
  rehab:        { label: 'Rehab',      adminUrl: '/departments/rehab/dashboard/admin',       color: 'text-rose-500',   icon: <Heart size={16} /> },
  spims:        { label: 'SPIMS',      adminUrl: '/departments/spims/dashboard/admin',       color: 'text-teal-500',   icon: <GraduationCap size={16} /> },
  sukoon:       { label: 'Sukoon',     adminUrl: '/departments/sukoon/dashboard/admin',      color: 'text-purple-500', icon: <Heart size={16} /> },
  welfare:      { label: 'Welfare',    adminUrl: '/departments/welfare/dashboard/admin',     color: 'text-amber-500',  icon: <Heart size={16} /> },
  hospital:     { label: 'Hospital',   adminUrl: '/departments/hospital/dashboard/admin',    color: 'text-blue-500',   icon: <Building2 size={16} /> },
  'job-center': { label: 'Job Center', adminUrl: '/departments/job-center/dashboard/admin',  color: 'text-orange-500', icon: <User size={16} /> },
};

const DEPARTMENT_NAV: Record<string, NavItem[]> = {
  rehab: [
    { label: 'Rehab Overview', href: '/departments/rehab/dashboard/admin', icon: <LayoutDashboard size={16}/>, roles: ['superadmin'] },
    { label: 'Patients', href: '/departments/rehab/dashboard/admin/patients', icon: <Heart size={16}/>, roles: ['superadmin'] },
    { label: 'Staff', href: '/departments/rehab/dashboard/admin/staff', icon: <UserCog size={16}/>, roles: ['superadmin'] },
    { label: 'Finance', href: '/departments/rehab/dashboard/admin/finance', icon: <TrendingUp size={16}/>, roles: ['superadmin'] },
    { label: 'Credentials', href: '/departments/rehab/dashboard/admin/passwords', icon: <Shield size={16}/>, roles: ['superadmin'] },
  ],
  spims: [
    { label: 'SPIMS Overview', href: '/departments/spims/dashboard/admin', icon: <LayoutDashboard size={16} />, roles: ['superadmin'] },
    { label: 'Students', href: '/departments/spims/dashboard/admin/students', icon: <GraduationCap size={16} />, roles: ['superadmin'] },
    { label: 'Staff', href: '/departments/spims/dashboard/admin/staff', icon: <UserCog size={16} />, roles: ['superadmin'] },
    { label: 'Finance', href: '/departments/spims/dashboard/admin/finance', icon: <TrendingUp size={16} />, roles: ['superadmin'] },
    { label: 'Attendance', href: '/departments/spims/dashboard/admin/attendance', icon: <CalendarCheck size={16} />, roles: ['superadmin'] },
    { label: 'Tests', href: '/departments/spims/dashboard/admin/tests', icon: <FileText size={16} />, roles: ['superadmin'] },
    { label: 'Credentials', href: '/departments/spims/dashboard/admin/passwords', icon: <Shield size={16} />, roles: ['superadmin'] },
  ],
  sukoon: [
    { label: 'Sukoon Overview', href: '/departments/sukoon/dashboard/admin', icon: <LayoutDashboard size={16}/>, roles: ['superadmin'] },
    { label: 'Clients', href: '/departments/sukoon/dashboard/admin/clients', icon: <Users size={16}/>, roles: ['superadmin'] },
    { label: 'Staff', href: '/departments/sukoon/dashboard/admin/staff', icon: <UserCog size={16}/>, roles: ['superadmin'] },
    { label: 'Finance', href: '/departments/sukoon/dashboard/admin/finance', icon: <TrendingUp size={16}/>, roles: ['superadmin'] },
    { label: 'Credentials', href: '/departments/sukoon/dashboard/admin/passwords', icon: <Shield size={16}/>, roles: ['superadmin'] },
  ],
  welfare: [
    { label: 'Welfare Overview', href: '/departments/welfare/dashboard/admin', icon: <LayoutDashboard size={16}/>, roles: ['superadmin'] },
    { label: 'Children', href: '/departments/welfare/dashboard/admin/children', icon: <Users size={16}/>, roles: ['superadmin'] },
    { label: 'Staff', href: '/departments/welfare/dashboard/admin/staff', icon: <UserCog size={16}/>, roles: ['superadmin'] },
    { label: 'Finance', href: '/departments/welfare/dashboard/admin/finance', icon: <TrendingUp size={16}/>, roles: ['superadmin'] },
    { label: 'Credentials', href: '/departments/welfare/dashboard/admin/passwords', icon: <Shield size={16}/>, roles: ['superadmin'] },
  ],
  hospital: [
    { label: 'Hospital Overview', href: '/departments/hospital/dashboard/admin', icon: <LayoutDashboard size={16}/>, roles: ['superadmin'] },
    { label: 'Patients', href: '/departments/hospital/dashboard/admin/patients', icon: <Heart size={16}/>, roles: ['superadmin'] },
    { label: 'Staff', href: '/departments/hospital/dashboard/admin/staff', icon: <UserCog size={16}/>, roles: ['superadmin'] },
    { label: 'Finance', href: '/departments/hospital/dashboard/admin/finance', icon: <TrendingUp size={16}/>, roles: ['superadmin'] },
    { label: 'Credentials', href: '/departments/hospital/dashboard/admin/passwords', icon: <Shield size={16}/>, roles: ['superadmin'] },
  ],
  'job-center': [
    { label: 'Job Center Overv.', href: '/departments/job-center/dashboard/admin', icon: <LayoutDashboard size={16}/>, roles: ['superadmin'] },
    { label: 'Seekers', href: '/departments/job-center/dashboard/admin/seekers', icon: <Users size={16}/>, roles: ['superadmin'] },
    { label: 'Staff', href: '/departments/job-center/dashboard/admin/staff', icon: <UserCog size={16}/>, roles: ['superadmin'] },
    { label: 'Finance', href: '/departments/job-center/dashboard/admin/finance', icon: <TrendingUp size={16}/>, roles: ['superadmin'] },
    { label: 'Credentials', href: '/departments/job-center/dashboard/admin/passwords', icon: <Shield size={16}/>, roles: ['superadmin'] },
  ],
};

export default function HqDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<HqSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeDepts, setActiveDepts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'hq' | string>('hq');

  const normalizeRole = (role: unknown): HqRole | null => {
    const r = String(role || '').trim().toLowerCase();
    if (r === 'superadmin' || r === 'manager' || r === 'cashier') return r as HqRole;
    return null;
  };

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) { router.push('/hq/login'); return; }

    try {
      const parsed: HqSession = JSON.parse(session);
      const elapsed = Date.now() - parsed.loginTime;
      if (elapsed > SESSION_TIMEOUT) {
        localStorage.removeItem(SESSION_KEY);
        router.push('/hq/login');
        return;
      }
      setUser(parsed);
      setIsChecking(false);
      setTimeout(() => setMounted(true), 50);

      // Detect any active dept sessions (from impersonation)
      const depts = Object.keys(DEPT_INFO).filter(d => {
        try { return !!localStorage.getItem(`${d}_session`); } catch { return false; }
      });
      setActiveDepts(depts);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      router.push('/hq/login');
    }
  }, [router]);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('hq_dark_mode', String(next));
  };

  useEffect(() => {
    const saved = localStorage.getItem('hq_dark_mode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  const role = normalizeRole(user?.role) || 'cashier';
  
  // Dynamic Nav Items based on viewMode
  let navItems = viewMode === 'hq' 
    ? NAV_ITEMS.filter(item => user && item.roles.includes(role))
    : DEPARTMENT_NAV[viewMode] || [];

  const handleSignOut = () => {
    localStorage.removeItem(SESSION_KEY);
    router.push('/hq/login');
  };

  const SidebarContent = () => (
    <div className={`flex flex-col h-full ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className={`px-6 pt-6 pb-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-teal-600 text-xs font-semibold mb-4 transition-colors group">
          <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
          Back to KhanHub
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Shield size={18} />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm leading-none">
              {viewMode === 'hq' ? 'KhanHub HQ' : `${DEPT_INFO[viewMode]?.label} Mode`}
            </p>
            <p className="text-gray-400 text-[10px] font-semibold mt-0.5">
              {viewMode === 'hq' ? 'Central Control' : 'Department View'}
            </p>
          </div>
        </div>
      </div>

      <div className={`px-4 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-2xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center text-gray-600 font-black text-sm shadow-sm">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm truncate ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{user?.name}</p>
              <p className="text-gray-400 text-[10px] font-mono truncate">{user?.customId}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ROLE_COLORS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
            {viewMode !== 'hq' && (
              <button 
                onClick={() => setViewMode('hq')}
                className="text-[10px] font-black text-teal-600 hover:text-teal-700 underline underline-offset-2 uppercase tracking-tighter"
              >
                Exit View
              </button>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          // Find the longest match to ensure only the most specific route is highlighted
          const matches = navItems
            .filter(ni => pathname.startsWith(ni.href))
            .sort((a, b) => b.href.length - a.href.length);
          
          const isActive = matches[0]?.href === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gray-800 text-white shadow-md'
                  : darkMode
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-100 hover:translate-x-1'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 hover:translate-x-1'
              }`}
            >
              <span className={`transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
              <span>{item.label}</span>
              <span className="ml-auto flex items-center gap-2 shrink-0">
                {item.label === 'Approvals' && viewMode === 'hq' && role === 'superadmin' ? (
                  <HqSuperadminApprovalsNavBadge />
                ) : null}
                {isActive ? <span className="w-1.5 h-1.5 rounded-full bg-white/60" /> : null}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Nav Mode Switcher — only for Superadmins with active dept sessions */}
      {role === 'superadmin' && activeDepts.length > 0 && (
        <div className={`px-4 py-3 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-3 px-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>Switch Navigator</p>
          <div className="grid grid-cols-2 gap-2">
            <button
               onClick={() => setViewMode('hq')}
               className={`flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all ${
                 viewMode === 'hq' 
                  ? 'bg-gray-900 text-white border-transparent' 
                  : darkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
               }`}
            >
              HQ
            </button>
            {activeDepts.map(dept => (
              <button
                key={dept}
                onClick={() => setViewMode(dept)}
                className={`flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all ${
                  viewMode === dept 
                   ? 'bg-teal-600 text-white border-transparent shadow-lg shadow-teal-500/20' 
                   : darkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {DEPT_INFO[dept]?.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Go to Dept Dashboard shortcut */}
      {activeDepts.length > 0 && viewMode === 'hq' && (
        <div className={`px-4 py-3 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 px-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>Jump to Portal</p>
          {activeDepts.map(dept => {
            const info = DEPT_INFO[dept];
            return (
              <Link
                key={dept}
                href={info.adminUrl}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold mb-0.5 transition-all ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}
              >
                <div className={`p-1 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
                  {React.cloneElement(info.icon as React.ReactElement, { size: 10, className: info.color })}
                </div>
                <span>{info.label} Dashboard</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className={`px-4 pb-6 pt-2 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <button
          onClick={toggleDark}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold mb-1 transition-all ${darkMode ? 'text-yellow-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-all group"
        >
          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <aside className={`hidden lg:flex flex-col w-64 border-r fixed left-0 top-0 h-screen z-30 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-72 z-50 lg:hidden transform transition-transform duration-300 ease-out shadow-2xl ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className={`lg:hidden sticky top-0 z-20 backdrop-blur border-b px-4 py-3 flex items-center justify-between ${
          darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-100'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => router.back()}
              className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Go back"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center text-white">
              <Shield size={14} />
            </div>
            <span className={`font-black text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>KhanHub HQ</span>
          </div>
          <div className="flex items-center gap-2">
            {user ? <HqNotificationBell session={user} /> : null}
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${ROLE_COLORS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
          </div>
        </header>

        <header className={`hidden lg:flex sticky top-0 z-20 backdrop-blur border-b px-8 py-4 items-center justify-between ${
          darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-100'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="Go back"
            >
              <ChevronLeft size={15} />
              Back
            </button>
            <span className={`text-xs font-semibold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              KhanHub HQ Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? <HqNotificationBell session={user} /> : null}
            <button onClick={toggleDark} className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-yellow-400 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'}`} title="Toggle dark mode">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ROLE_COLORS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
            <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-600 font-black text-sm">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-gray-700 text-sm font-semibold">{user?.name}</span>
          </div>
        </header>

        <main className={`flex-1 p-4 lg:p-8 overflow-x-hidden transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}