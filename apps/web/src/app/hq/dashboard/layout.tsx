'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Shield, Eye, FileText,
  UserCog, CalendarCheck, CheckCircle, CreditCard, History,
  LogOut, Menu, X, ArrowLeft, Sun, Moon, Calculator, Tag, DollarSign, TrendingUp, BarChart2, User,
  Building2, GraduationCap, ChevronLeft, ExternalLink, Heart, KeyRound
} from 'lucide-react';
import { useTheme } from 'next-themes';
import type { HqRole, HqSession } from '@/types/hq';
import { HqNotificationBell } from '@/components/hq/HqNotificationBell';
import { HqSuperadminApprovalsNavBadge } from '@/components/hq/HqSuperadminApprovalsNavBadge';
import { useFcmNotifications } from '@/hooks/hq/useFcmNotifications';
import { HqNotificationPermissionBanner } from '@/components/hq/HqNotificationPermissionBanner';

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
  { label: 'Passwords', href: '/hq/dashboard/superadmin/passwords', icon: <KeyRound size={16} />, roles: ['superadmin'] },
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [activeDepts, setActiveDepts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'hq' | string>('hq');

  // FCM push notifications
  const { permission, isRequesting, requestPermission } = useFcmNotifications(user);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const showNotifBanner = mounted && !bannerDismissed && permission === 'default' && !!user;

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

  const darkMode = mounted && resolvedTheme === 'dark';
  const toggleDark = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  // Effect for mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield size={24} className="text-teal-500 animate-pulse" />
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className={`text-sm font-black uppercase tracking-[0.3em] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>KhanHub HQ</p>
          <div className="mt-2 flex items-center gap-1 justify-center">
            <span className="w-1 h-1 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 rounded-full bg-teal-500 animate-bounce" />
          </div>
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

  const SidebarContent = () => {
    const [portalOpen, setPortalOpen] = useState(false);
    
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        {/* Header / Branding */}
        <div className={`px-6 pt-7 pb-6 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 transition-transform hover:rotate-0 ${darkMode ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20' : 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20'}`}>
              <Shield size={22} strokeWidth={2.5} />
            </div>
            <div>
              <p className={`font-black tracking-tight text-base leading-none ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {viewMode === 'hq' ? 'KhanHub HQ' : DEPT_INFO[viewMode]?.label}
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 ${darkMode ? 'text-gray-500' : 'text-[#6B7280]'}`}>
                {viewMode === 'hq' ? 'Central Console' : 'Management'}
              </p>
            </div>
          </div>

          {/* Jump to Portal Dropdown - Only for Superadmins */}
          {role === 'superadmin' && (
            <div className="relative">
              <button
                onClick={() => setPortalOpen(!portalOpen)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                  darkMode 
                    ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-teal-500" />
                  <span>Jump to Portal</span>
                </div>
                <ChevronLeft size={14} className={`transition-transform duration-200 ${portalOpen ? '-rotate-90' : 'rotate-0'}`} />
              </button>

              {portalOpen && (
                <div className={`absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl border shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 ${
                  darkMode ? 'bg-gray-800 border-gray-700 shadow-black/40' : 'bg-white border-gray-100 shadow-gray-200/50'
                }`}>
                  {Object.keys(DEPT_INFO).map(dept => {
                    const info = DEPT_INFO[dept];
                    return (
                      <Link
                        key={dept}
                        href={info.adminUrl}
                        onClick={() => setPortalOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-teal-50 text-gray-600 hover:text-teal-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
                          {React.cloneElement(info.icon as React.ReactElement, { size: 12, className: info.color })}
                        </div>
                        <span>{info.label} Dashboard</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Mode Switcher - Modernized Pill */}
        {role === 'superadmin' && activeDepts.length > 0 && (
          <div className={`px-4 pt-5 pb-2`}>
            <div className={`p-1 rounded-2xl flex items-center gap-1 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  viewMode === 'hq'
                    ? darkMode ? 'bg-gray-700 text-white shadow-lg' : 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                HQ Navigator
              </button>
              {activeDepts.map(dept => (
                <button
                  key={dept}
                  onClick={() => setViewMode(dept)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    viewMode === dept
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {DEPT_INFO[dept]?.label} View
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          <p className={`px-4 text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${darkMode ? 'text-gray-600' : 'text-[#374151]'}`}>
            Menu
          </p>
          {navItems.map((item, i) => {
            const matches = navItems
              .filter(ni => pathname.startsWith(ni.href))
              .sort((a, b) => b.href.length - a.href.length);
            const isActive = matches[0]?.href === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${
                  isActive
                    ? darkMode 
                      ? 'bg-gradient-to-r from-gray-800 to-gray-800/50 text-white shadow-lg' 
                      : 'bg-white text-teal-600 shadow-xl shadow-gray-200/50'
                    : darkMode
                      ? 'text-gray-500 hover:bg-gray-800/80 hover:text-gray-200'
                      : 'text-[#374151] hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${isActive ? (darkMode ? 'text-teal-400' : 'text-teal-600') : (darkMode ? 'text-gray-500' : 'text-[#9CA3AF] group-hover:text-teal-500')}`}>
                  {React.cloneElement(item.icon as React.ReactElement, { size: 18, strokeWidth: isActive ? 2.5 : 2 })}
                </div>
                <span className="flex-1">{item.label}</span>
                {item.label === 'Approvals' && viewMode === 'hq' && role === 'superadmin' && (
                  <HqSuperadminApprovalsNavBadge />
                )}
                {isActive && (
                  <div className={`w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-teal-500' : 'bg-teal-600'} animate-pulse`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Profile & Logout */}
        <div className={`px-4 py-6 mt-auto border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="mb-4 p-3 rounded-2xl flex items-center gap-3 bg-gray-50 dark:bg-gray-800/30">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600'}`}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold truncate ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{user?.name}</p>
              <p className={`text-[9px] font-black uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-[#6B7280]'}`}>{ROLE_LABELS[role]}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className={`p-2 rounded-lg transition-all ${darkMode ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleDark}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                darkMode 
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                  : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 shadow-sm'
              }`}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              {darkMode ? 'Light' : 'Dark'}
            </button>
            <Link 
              href="/"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <ArrowLeft size={14} />
              Portal
            </Link>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen flex overflow-x-hidden bg-gray-50 dark:bg-gray-950">
      <aside className="hidden lg:flex flex-col w-64 border-r fixed left-0 top-0 h-screen z-30 bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800">
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
      } bg-white dark:bg-gray-900">
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
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

        <header className="hidden lg:flex sticky top-0 z-20 backdrop-blur border-b px-8 py-4 items-center justify-between bg-white/80 border-gray-100 dark:bg-gray-900/80 dark:border-gray-800">
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
            <span className={`text-xs font-semibold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-[#9CA3AF]'}`}>
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
            <span className="text-gray-700 text-sm font-semibold hidden xl:inline">{user?.name}</span>
          </div>
        </header>

        <main className={`flex-1 overflow-x-hidden transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {/* Notification permission banner — only when permission not yet decided */}
          {showNotifBanner && (
            <HqNotificationPermissionBanner
              isRequesting={isRequesting}
              onAllow={requestPermission}
              onDismiss={() => setBannerDismissed(true)}
            />
          )}
          <div className="p-4 lg:p-8">
            <div className="max-w-6xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}