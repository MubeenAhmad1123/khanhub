'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Shield, Eye, FileText,
  UserCog, CalendarCheck, CheckCircle, CreditCard, History,
  LogOut, Menu, X, ArrowLeft, Calculator, Tag, DollarSign, TrendingUp, BarChart2, User,
  Building2, GraduationCap, ChevronLeft, ExternalLink, Heart, KeyRound
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { doc, onSnapshot } from 'firebase/firestore';
import type { HqRole, HqSession } from '@/types/hq';
import { db } from '@/lib/firebase';
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
  { label: 'Contributions', href: '/hq/dashboard/manager/approvals', icon: <CheckCircle size={16} />, roles: ['manager'] },
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

  useEffect(() => {
    if (!user || !user.uid) return;

    const unsub = onSnapshot(doc(db, 'hq_users', user.uid), (snap) => {
      const data = snap.data();
      if (data?.forceLogoutAt) {
        const logoutTime = new Date(data.forceLogoutAt).getTime();
        if (logoutTime > user.loginTime) {
          handleSignOut();
        }
      }
    });
    return () => unsub();
  }, [user]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-subtle">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield size={24} className="text-purple-500 animate-pulse" />
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">
            Khan Hub HQ
          </p>
          <div className="mt-2 flex items-center gap-1 justify-center">
            <span className="w-1 h-1 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 rounded-full bg-purple-500 animate-bounce" />
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
      <div className="flex flex-col h-full bg-surface-default text-black border-r border-border-subtle">
        {/* Header / Branding */}
        <div className="px-6 pt-7 pb-6 border-b border-border-subtle">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 transition-transform hover:rotate-0 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20">
              <Shield size={22} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-black tracking-tight text-base leading-none">
                {viewMode === 'hq' ? 'Khan Hub HQ' : DEPT_INFO[viewMode]?.label}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest mt-1.5 text-gray-400 dark:text-gray-500">
                {viewMode === 'hq' ? 'Central Console' : 'Management'}
              </p>
            </div>
          </div>

          {/* Jump to Portal Dropdown - Only for Superadmins */}
          {role === 'superadmin' && (
            <div className="relative">
              <button
                onClick={() => setPortalOpen(!portalOpen)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all border bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-purple-500" />
                  <span>Jump to Portal</span>
                </div>
                <ChevronLeft size={14} className={`transition-transform duration-200 ${portalOpen ? '-rotate-90' : 'rotate-0'}`} />
              </button>

              {portalOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl border shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 bg-white border-gray-100 shadow-black/10">
                  {Object.keys(DEPT_INFO).map(dept => {
                    const info = DEPT_INFO[dept];
                    return (
                      <Link
                        key={dept}
                        href={info.adminUrl}
                        onClick={() => setPortalOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300"
                      >
                        <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 shadow-sm">
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
          <div className="px-4 pt-5 pb-2">
            <div className="p-1 rounded-2xl flex items-center gap-1 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  viewMode === 'hq'
                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-white shadow-sm dark:shadow-lg'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
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
                      ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-white shadow-sm dark:shadow-lg'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
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
          <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-gray-600">
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
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-purple-600 dark:hover:text-white'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-purple-500'}`}>
                  {React.cloneElement(item.icon as React.ReactElement, { size: 18, strokeWidth: isActive ? 2.5 : 2 })}
                </div>
                <span className="flex-1">{item.label}</span>
                {item.label === 'Approvals' && viewMode === 'hq' && role === 'superadmin' && (
                  <HqSuperadminApprovalsNavBadge />
                )}
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Profile & Logout */}
        <div className="px-4 py-6 mt-auto border-t border-border-subtle">
          <div className="mb-4 p-3 rounded-2xl flex items-center gap-3 bg-surface-subtle border border-border-subtle">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm bg-white text-gray-600 border border-border-subtle">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-black">{user?.name}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-gray-500">{ROLE_LABELS[role]}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 rounded-lg transition-all text-gray-400 hover:text-red-500 hover:bg-red-50"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>

          <div className="flex gap-2">
            <Link 
              href="/"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-white border border-border-subtle text-gray-600 hover:bg-surface-subtle shadow-sm"
            >
              <ArrowLeft size={14} />
              Back to Main Portal
            </Link>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen flex overflow-x-hidden bg-surface-default">
      <aside className="hidden lg:flex flex-col w-64 border-r fixed left-0 top-0 h-screen z-30 bg-surface-default border-border-subtle">
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
      } bg-white dark:bg-gray-900`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <header className="lg:hidden sticky top-0 z-20 backdrop-blur border-b px-4 py-3 flex items-center justify-between bg-surface-overlay border-border-subtle">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl transition-colors text-gray-400 hover:bg-surface-subtle"
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl transition-colors text-gray-400 hover:bg-surface-subtle"
              title="Go back"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center text-white">
              <Shield size={14} />
            </div>
            <span className="font-black text-sm text-black">Khan Hub HQ</span>
          </div>
          <div className="flex items-center gap-2">
            {user ? <HqNotificationBell session={user} /> : null}
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${ROLE_COLORS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
          </div>
        </header>

        <header className="hidden lg:flex sticky top-0 z-20 backdrop-blur-md border-b px-8 py-4 items-center justify-between bg-surface-overlay border-border-subtle">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-gray-500 hover:bg-surface-subtle hover:text-black"
              title="Go back"
            >
              <ChevronLeft size={15} />
              Back
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Khan Hub HQ Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-px h-6 bg-border-subtle mx-1" />
            {user ? <HqNotificationBell session={user} /> : null}
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ROLE_COLORS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
            <div className="w-8 h-8 bg-surface-subtle rounded-xl flex items-center justify-center text-black font-black text-sm">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-black text-sm font-black hidden xl:inline">{user?.name}</span>
          </div>
        </header>

        <main className={`flex-1 overflow-x-hidden transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
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
