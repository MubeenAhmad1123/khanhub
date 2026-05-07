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
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { HqRole, HqSession } from '@/types/hq';
import { db, auth } from '@/lib/firebase';
import { HqNotificationBell } from '@/components/hq/HqNotificationBell';
import { HqSuperadminApprovalsNavBadge } from '@/components/hq/HqSuperadminApprovalsNavBadge';
import { HqManagerApprovalsNavBadge } from '@/components/hq/HqManagerApprovalsNavBadge';
import { useFcmNotifications } from '@/hooks/hq/useFcmNotifications';
import { HqNotificationPermissionBanner } from '@/components/hq/HqNotificationPermissionBanner';
import { Spinner } from '@/components/ui';

const SESSION_KEY = 'hq_session';
const SESSION_TIMEOUT = 604800000; // 7 days in milliseconds

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
  superadmin: 'bg-indigo-50 text-indigo-600 border border-indigo-100 font-semibold',
  manager: 'bg-emerald-50 text-emerald-600 border border-emerald-100 font-semibold',
  cashier: 'bg-blue-50 text-blue-600 border border-blue-100 font-semibold',
};

const ROLE_LABELS: Record<HqRole, string> = {
  superadmin: 'SYSTEM ARCHITECT',
  manager: 'MANAGER',
  cashier: 'CASHIER',
};

// Dept label map for sidebar shortcuts
const DEPT_INFO: Record<string, { label: string; adminUrl: string; color: string; icon: React.ReactNode }> = {
  rehab:        { label: 'Rehab',      adminUrl: '/departments/rehab/dashboard/admin',       color: 'text-black',   icon: <Heart size={16} /> },
  spims:        { label: 'SPIMS',      adminUrl: '/departments/spims/dashboard/admin',       color: 'text-black',   icon: <GraduationCap size={16} /> },
  it:           { label: 'IT',         adminUrl: '/departments/it/dashboard/admin',          color: 'text-black',   icon: <Shield size={16} /> },
  'social-media': { label: 'Media',    adminUrl: '/departments/social-media/dashboard/admin', color: 'text-black',   icon: <Eye size={16} /> },
  sukoon:       { label: 'Sukoon',     adminUrl: '/departments/sukoon/dashboard/admin',      color: 'text-black', icon: <Heart size={16} /> },
  welfare:      { label: 'Welfare',    adminUrl: '/departments/welfare/dashboard/admin',     color: 'text-black',  icon: <Heart size={16} /> },
  hospital:     { label: 'Hospital',   adminUrl: '/departments/hospital/dashboard/admin',    color: 'text-black',   icon: <Building2 size={16} /> },
  'job-center': { label: 'Job Center', adminUrl: '/departments/job-center/dashboard/admin',  color: 'text-black', icon: <User size={16} /> },
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
  const pathname = usePathname() || '';
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<HqSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeDepts, setActiveDepts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'hq' | string>('hq');
  const [activeRole, setActiveRole] = useState<HqRole | null>(null);

  // FCM push notifications
  const { permission, isRequesting, requestPermission } = useFcmNotifications(user);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('hq_fcm_banner_dismissed');
      if (!dismissed) setBannerDismissed(false);
    }
  }, []);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem('hq_fcm_banner_dismissed', 'true');
  };

  const showNotifBanner = mounted && !bannerDismissed && permission === 'default' && !!user;

  const normalizeRole = (role: unknown): HqRole | null => {
    const r = String(role || '').trim().toLowerCase();
    if (r === 'superadmin' || r === 'manager' || r === 'cashier') return r as HqRole;
    return null;
  };

  useEffect(() => {
    // 1. Session check
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
      
      // Detect any active dept sessions (from impersonation)
      const depts = Object.keys(DEPT_INFO).filter(d => {
        try { return !!localStorage.getItem(`${d}_session`); } catch { return false; }
      });
      setActiveDepts(depts);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      router.push('/hq/login');
      return;
    }

    // 2. Auth initialization check
    const unsubAuth = auth.onAuthStateChanged((firebaseUser) => {
      setAuthInitialized(true);
      if (firebaseUser) {
        setIsChecking(false);
        setTimeout(() => setMounted(true), 50);
      } else {
        const localSession = localStorage.getItem(SESSION_KEY);
        if (!localSession) {
          console.warn('[HQ Layout] No Firebase user and no local session. Redirecting...');
          router.push('/hq/login');
        } else {
          setIsChecking(false);
          setTimeout(() => setMounted(true), 50);
        }
      }
    });

    return () => unsubAuth();
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
    }, (err) => {
      console.warn("Real-time session listener permission issue (likely session expired):", err);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (user?.role === 'superadmin') {
      if (pathname.startsWith('/hq/dashboard/manager')) {
        setActiveRole('manager');
      } else if (pathname.startsWith('/hq/dashboard/cashier')) {
        setActiveRole('cashier');
      } else if (pathname.startsWith('/hq/dashboard/superadmin')) {
        setActiveRole('superadmin');
      }
    }
  }, [pathname, user]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCFBF8]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-indigo-600 text-xs font-bold uppercase tracking-widest animate-pulse">Loading HQ Portal...</p>
      </div>
    );
  }

  const role = normalizeRole(user?.role) || 'cashier';
  const currentRole = role === 'superadmin' ? (activeRole || 'superadmin') : role;
  
  // Dynamic Nav Items based on viewMode
  let navItems = viewMode === 'hq' 
    ? NAV_ITEMS.filter(item => user && item.roles.includes(currentRole))
    : DEPARTMENT_NAV[viewMode] || [];

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[Logout] Auth signout error:', err);
    }
    localStorage.removeItem(SESSION_KEY);
    router.push('/hq/login');
  };

  const SidebarContent = () => {
    const [portalOpen, setPortalOpen] = useState(false);
    
    return (
      <div className="flex flex-col h-full bg-white text-gray-900 border-r border-gray-100">
        {/* Header / Branding */}
        <div className="px-6 pt-7 pb-6 border-b border-gray-50 bg-white">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 bg-indigo-600">
              <Shield size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-black tracking-tight text-base leading-none">
                {viewMode === 'hq' ? 'Khan Hub HQ' : DEPT_INFO[viewMode]?.label}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest mt-1.5 text-black/50">
                {viewMode === 'hq' ? 'Central Console' : 'Management'}
              </p>
            </div>
          </div>

          {/* Jump to Portal Dropdown - Only for Superadmins */}
          {role === 'superadmin' && (
            <div className="relative">
              <button
                onClick={() => setPortalOpen(!portalOpen)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 border border-gray-100 text-xs font-black transition-all bg-white hover:bg-gray-50 shadow-sm rounded-xl active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-purple-500" />
                  <span className="uppercase tracking-tight">Jump to Portal</span>
                </div>
                <ChevronLeft size={14} className={`transition-transform duration-200 text-black ${portalOpen ? '-rotate-90' : 'rotate-0'}`} />
              </button>

              {portalOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 p-2 border border-gray-100 shadow-2xl rounded-2xl z-50 animate-in fade-in slide-in-from-top-2 bg-white max-h-[220px] overflow-y-auto scrollbar-thin">
                  {Object.keys(DEPT_INFO).map(dept => {
                    const info = DEPT_INFO[dept];
                    return (
                      <Link
                        key={dept}
                        href={info.adminUrl}
                        onClick={() => setPortalOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50 text-xs font-bold transition-all text-gray-700 uppercase tracking-tight"
                      >
                        <div className="p-1.5 rounded-lg border border-gray-100 bg-white">
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

        {/* Console Switcher for HQ Superadmin */}
        {role === 'superadmin' && viewMode === 'hq' && (
          <div className="px-4 pt-4 pb-1 bg-white">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.2em] mb-2 text-black/40">
              Active Console
            </p>
            <div className="p-1 rounded-2xl bg-gray-50 flex gap-1">
              <button
                onClick={() => setActiveRole('superadmin')}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${
                  currentRole === 'superadmin'
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                SUPER
              </button>
              <button
                onClick={() => setActiveRole('manager')}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${
                  currentRole === 'manager'
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                MANAGER
              </button>
              <button
                onClick={() => setActiveRole('cashier')}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${
                  currentRole === 'cashier'
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                CASHIER
              </button>
            </div>
          </div>
        )}

        {/* Navigation Mode Switcher - Modernized Pill */}
        {role === 'superadmin' && activeDepts.length > 0 && (
          <div className="px-4 pt-3 pb-2">
            <div className="p-1 rounded-2xl bg-gray-50 flex flex-col gap-1">
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                  viewMode === 'hq'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                HQ Navigator
              </button>
              {activeDepts.map(dept => (
                <button
                  key={dept}
                  onClick={() => setViewMode(dept)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                    viewMode === dept
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {DEPT_INFO[dept]?.label} View
                </button>
              ))}
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto scrollbar-hide">
          <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-black/40">
            System Menu
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
                className={`flex items-center gap-4 px-4 py-3.5 border text-xs font-black transition-all group uppercase tracking-widest rounded-2xl ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20'
                    : 'text-gray-500 border-transparent hover:border-gray-100 hover:bg-white hover:text-gray-900'
                }`}
              >
                <div className={`p-1 transition-colors ${isActive ? 'text-white' : 'text-black'}`}>
                  {React.cloneElement(item.icon as React.ReactElement, { size: 18, strokeWidth: isActive ? 3 : 2 })}
                </div>
                <span className="flex-1">{item.label}</span>
                {item.label === 'Approvals' && viewMode === 'hq' && currentRole === 'superadmin' && (
                  <HqSuperadminApprovalsNavBadge />
                )}
                {item.label === 'Contributions' && viewMode === 'hq' && currentRole === 'manager' && (
                  <HqManagerApprovalsNavBadge />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Profile & Logout */}
        <div className="px-4 py-6 mt-auto border-t border-gray-50 bg-gray-50/30">
          <div className="mb-4 p-4 border border-gray-100 flex items-center gap-4 bg-white shadow-sm rounded-2xl">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm bg-indigo-50 text-indigo-600 border border-indigo-100">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-black uppercase">{user?.name}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-black/50">{ROLE_LABELS[currentRole]}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 rounded-lg border border-transparent hover:border-rose-100 transition-all text-gray-400 hover:text-rose-600 hover:bg-rose-50"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>

          <div className="flex gap-2">
            <Link 
              href="/"
              className="w-full flex items-center justify-center gap-3 py-3 border border-gray-100 text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm rounded-xl active:scale-[0.98]"
            >
              <ArrowLeft size={14} />
              EXIT TO HUB
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden bg-white">
      <aside className="hidden lg:flex flex-col w-64 border-r border-gray-100 fixed left-0 top-0 h-screen z-30 bg-white">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-72 z-50 lg:hidden transform transition-transform duration-300 ease-out shadow-2xl ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } bg-white border-r border-gray-100`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-2.5 rounded-xl border border-gray-100 text-gray-400 bg-white shadow-sm hover:text-rose-600 hover:border-rose-100 transition-all z-50 active:scale-95"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-900 shadow-sm active:scale-95 transition-all"
            >
              <Menu size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-600 shadow-sm active:scale-95 transition-all"
              title="Go back"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 flex items-center justify-center text-white rounded-xl shadow-lg shadow-indigo-600/20">
              <Shield size={18} strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? <HqNotificationBell session={user} /> : null}
            <div className="w-9 h-9 rounded-xl border border-gray-100 bg-white flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <header className="hidden lg:flex sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-100 bg-white text-[10px] font-bold transition-all text-gray-500 hover:text-gray-900 hover:bg-gray-50 shadow-sm rounded-xl active:scale-[0.98]"
              title="Go back"
            >
              <ChevronLeft size={15} />
              BACK
            </button>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Khan Hub HQ Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-px h-6 bg-gray-100 mx-1" />
            {user ? <HqNotificationBell session={user} /> : null}
            <span className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest ${ROLE_COLORS[currentRole]} shadow-sm`}>
              {ROLE_LABELS[currentRole]}
            </span>
            <div className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center text-gray-900 font-bold text-sm shadow-sm bg-white">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-gray-700 text-sm font-bold hidden xl:inline uppercase tracking-tight">{user?.name}</span>
          </div>
        </header>

        <main className={`flex-1 overflow-x-hidden transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {/* Notification permission banner — only when permission not yet decided */}
          {showNotifBanner && (
            <HqNotificationPermissionBanner
              isRequesting={isRequesting}
              onAllow={requestPermission}
              onDismiss={handleDismissBanner}
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
