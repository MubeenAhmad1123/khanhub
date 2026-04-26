// src/app/departments/spims/dashboard/layout.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, CheckCircle, Heart, UserCog,
  Banknote, FileBarChart, CreditCard, CalendarDays, ClipboardCheck,
  User, LogOut, ArrowLeft, Menu, X, Shield, Sun, Moon,
  ChevronLeft, ExternalLink, Building2, GraduationCap, TrendingUp, Calculator, FileText, BarChart2
} from 'lucide-react';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NotificationRegister from '@/components/hq/NotificationRegister';
import StaffNotifications from '@/components/layout/StaffNotifications';


type SpimsDashRole = 'admin' | 'staff' | 'student' | 'cashier' | 'superadmin';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: SpimsDashRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/departments/spims/dashboard/admin', icon: <LayoutDashboard size={16} />, roles: ['admin', 'superadmin'] },
  { label: 'Students', href: '/departments/spims/dashboard/admin/students', icon: <Heart size={16} />, roles: ['admin', 'superadmin'] },
  { label: 'Attendance', href: '/departments/spims/dashboard/admin/attendance', icon: <CalendarDays size={16} />, roles: ['admin', 'superadmin'] },
  { label: 'Tests', href: '/departments/spims/dashboard/admin/tests', icon: <ClipboardCheck size={16} />, roles: ['admin', 'superadmin'] },
  { label: 'My Attendance', href: '/departments/spims/dashboard/staff', icon: <CalendarDays size={16} />, roles: ['staff'] },
  { label: 'Student portal', href: '/departments/spims/dashboard/student', icon: <User size={16} />, roles: ['student'] },
  { label: 'My Profile', href: '/departments/spims/dashboard/profile', icon: <UserCog size={16} />, roles: ['admin', 'staff', 'student', 'cashier', 'superadmin'] },
  { label: 'Data Cleanup', href: '/departments/spims/dashboard/superadmin/cleanup', icon: <Shield size={16} />, roles: ['superadmin'] },
];

const ROLE_COLORS: Record<SpimsDashRole, string> = {
  admin: 'bg-blue-100 text-blue-700',
  staff: 'bg-teal-100 text-teal-700',
  student: 'bg-green-100 text-green-700',
  cashier: 'bg-amber-100 text-amber-800',
  superadmin: 'bg-violet-100 text-violet-800',
};

const ROLE_LABELS: Record<SpimsDashRole, string> = {
  admin: 'Admin',
  staff: 'Staff',
  student: 'Student',
  cashier: 'Cashier',
  superadmin: 'Superadmin',
};

const DEPT_INFO: Record<string, { label: string; adminUrl: string; color: string; icon: React.ReactNode }> = {
  rehab:        { label: 'Rehab',      adminUrl: '/departments/rehab/dashboard/admin',       color: 'text-rose-500',   icon: <Heart size={16} /> },
  hospital:     { label: 'Hospital',   adminUrl: '/departments/hospital/dashboard/admin',    color: 'text-blue-500',   icon: <Building2 size={16} /> },
  spims:        { label: 'SPIMS',      adminUrl: '/departments/spims/dashboard/admin',       color: 'text-teal-500',   icon: <GraduationCap size={16} /> },
  sukoon:       { label: 'Sukoon',     adminUrl: '/departments/sukoon/dashboard/admin',      color: 'text-purple-500', icon: <Heart size={16} /> },
  welfare:      { label: 'Welfare',    adminUrl: '/departments/welfare/dashboard/admin',     color: 'text-amber-500',  icon: <Heart size={16} /> },
  'job-center': { label: 'Job Center', adminUrl: '/departments/job-center/dashboard/admin',  color: 'text-orange-500', icon: <User size={16} /> },
};

const HQ_NAV_ITEMS = [
  { label: 'HQ Overview', href: '/hq/dashboard/superadmin', icon: <LayoutDashboard size={16} /> },
  { label: 'Approvals', href: '/hq/dashboard/superadmin/approvals', icon: <CheckCircle size={16} /> },
  { label: 'Finance', href: '/hq/dashboard/superadmin/finance', icon: <TrendingUp size={16} /> },
  { label: 'All Users', href: '/hq/dashboard/superadmin/users', icon: <Users size={16} /> },
  { label: 'Departments', href: '/hq/dashboard/superadmin/departments', icon: <Building2 size={16} /> },
  { label: 'Audit Log', href: '/hq/dashboard/superadmin/audit', icon: <FileText size={16} /> },
  { label: 'Reconciliation', href: '/hq/dashboard/superadmin/reconciliation', icon: <Calculator size={16} /> },
];

export default function SpimsDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [viewMode, setViewMode] = useState<'dept' | 'hq'>('dept');
  const [isHqAdmin, setIsHqAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('spims_session');
    const hqSessionStr = localStorage.getItem('hq_session');
    if (hqSessionStr) {
      try {
        const hqSession = JSON.parse(hqSessionStr);
        if (hqSession?.role === 'superadmin') {
           router.push('/hq/dashboard/superadmin');
           return;
        }
      } catch(e) {}
    }
    router.push('/departments/spims/login');
  }, [router]);

  useEffect(() => {
    setMounted(true);
    let session = localStorage.getItem('spims_session');
    const hqSessionStr = localStorage.getItem('hq_session');
    
    if (hqSessionStr) {
      try {
        const hqSession = JSON.parse(hqSessionStr);
        if (hqSession?.role === 'superadmin') {
          const syncSession = {
            uid: hqSession.uid,
            customId: hqSession.customId || hqSession.email || 'HQ-USER',
            role: 'superadmin',
            displayName: hqSession.displayName || 'Superadmin',
          };
          localStorage.setItem('spims_session', JSON.stringify(syncSession));
          localStorage.setItem('spims_login_time', Date.now().toString());
          session = JSON.stringify(syncSession);
          setIsHqAdmin(true);
        }
      } catch (e) {}
    }

    if (!session) { router.push('/departments/spims/login'); return; }

    const performAuthCheck = () => {
      try {
        const parsed = JSON.parse(session!);
        if (!parsed.uid || !parsed.role) throw new Error('Invalid session');

        setUser(parsed);
        setIsChecking(false);
      } catch (err) {
        handleSignOut();
      }
    };

    performAuthCheck();
  }, [router, handleSignOut]);

  useEffect(() => {
    if (!user || !user.uid) return;
    if (user.role === 'superadmin') return;

    const unsub = onSnapshot(doc(db, 'spims_users', user.uid), (snap) => {
      if (!snap.exists()) {
        handleSignOut();
        return;
      }
      const data = snap.data();
      if (data?.isActive === false || data?.role !== user.role) {
        handleSignOut();
        return;
      }
      if (data?.forceLogoutAt) {
        const logoutTime = new Date(data.forceLogoutAt).getTime();
        const loginTimeStr = localStorage.getItem('spims_login_time');
        const loginTime = loginTimeStr ? parseInt(loginTimeStr) : 0;
        if (logoutTime > loginTime) {
          handleSignOut();
        }
      }
    });
    return () => unsub();
  }, [user, handleSignOut]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-teal-600 dark:text-teal-400 text-sm font-black uppercase tracking-[0.3em] animate-pulse">Initializing</p>
            <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">SPIMS Protocol v3.1</p>
          </div>
        </div>
      </div>
    );
  }

  const role = user?.role as SpimsDashRole;
  const rawNavItems = viewMode === 'dept'
    ? NAV_ITEMS.filter(item => user && item.roles.includes(role))
    : HQ_NAV_ITEMS;

  const navItems = rawNavItems.map(item => {
    if (viewMode === 'dept' && item.label === 'Student portal' && (user?.studentId || user?.patientId)) {
      return { ...item, href: `/departments/spims/dashboard/student/${user.studentId || user.patientId}` };
    }
    return item;
  });

  const SidebarContent = () => {
    const [portalOpen, setPortalOpen] = useState(false);

    return (
      <div className="flex flex-col h-full bg-white/50 dark:bg-black/50 backdrop-blur-xl border-r border-gray-200/50 dark:border-white/5">
        {/* Header */}
        <div className="p-8">
          <Link 
            href={viewMode === 'hq' ? "/hq/dashboard/superadmin" : "/"} 
            className="flex items-center gap-2 text-gray-400 hover:text-teal-600 text-[10px] font-bold mb-8 transition-all group uppercase tracking-widest"
          >
            <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center group-hover:border-teal-500/50 transition-colors">
              <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
            </div>
            {viewMode === 'hq' ? 'Return to Nexus' : 'Main Hub'}
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${
              viewMode === 'hq' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 rotate-3' : 'bg-gradient-to-br from-teal-400 to-emerald-500 -rotate-3'
            }`}>
              {viewMode === 'hq' ? <Shield size={24} /> : <GraduationCap size={24} />}
            </div>
            <div>
              <p className="font-black text-lg leading-tight tracking-tight dark:text-white">
                {viewMode === 'hq' ? 'HQ Admin' : 'SPIMS'}
              </p>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {viewMode === 'hq' ? 'System Core' : 'Edu Grid'}
              </p>
            </div>
          </div>

          {/* Jump Portal */}
          {isHqAdmin && (
            <div className="relative mb-6">
              <button
                onClick={() => setPortalOpen(!portalOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink size={14} className="text-teal-500 group-hover:rotate-12 transition-transform" />
                  <span className="text-[11px] font-black uppercase tracking-tight dark:text-gray-200">Switch Grid</span>
                </div>
                <ChevronLeft size={14} className={`text-gray-400 transition-transform duration-300 ${portalOpen ? '-rotate-90' : ''}`} />
              </button>

              {portalOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 z-50 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                  <div className="space-y-1.5">
                    {Object.entries(DEPT_INFO).map(([key, info]) => (
                      <Link
                        key={key}
                        href={info.adminUrl}
                        onClick={() => setPortalOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${
                          pathname.includes(key)
                            ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          pathname.includes(key) ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/5 group-hover:bg-teal-500/10'
                        }`}>
                          {React.cloneElement(info.icon as React.ReactElement, { size: 14 })}
                        </div>
                        <span className="text-xs font-black uppercase tracking-tight">{info.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nav Switcher */}
          {isHqAdmin && (
            <div className="flex p-1.5 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5 mb-8">
              <button
                onClick={() => setViewMode('dept')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'dept' ? 'bg-white dark:bg-white/10 shadow-sm text-teal-600 dark:text-teal-400' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                LOCAL
              </button>
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'hq' ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                CORE
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-sm transition-all relative group overflow-hidden ${
                  isActive 
                    ? 'bg-gradient-to-r from-teal-500/10 to-transparent text-teal-600 dark:text-teal-400' 
                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-teal-500 rounded-r-full shadow-[0_0_12px_rgba(20,184,166,0.5)]" />
                )}
                <div className={`transition-transform duration-500 group-hover:scale-110 ${isActive ? 'text-teal-500' : ''}`}>
                  {item.icon}
                </div>
                <span className="flex-1 font-black uppercase tracking-tight text-[11px]">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User & Bottom */}
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-900 to-black dark:from-white dark:to-gray-300 flex items-center justify-center text-white dark:text-black font-black text-sm shadow-xl">
              {user?.displayName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black truncate dark:text-white uppercase tracking-tight">{user?.displayName}</p>
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <p className="text-[9px] font-bold text-gray-400 truncate tracking-[0.1em] uppercase">{user?.customId}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSignOut} 
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-[11px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-200 transition-all group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            DISCONNECT
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex bg-[#FDFDFD] dark:bg-[#050505] text-black dark:text-white transition-colors duration-500 font-sans`}>
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex flex-col w-72 fixed left-0 top-0 h-screen z-30`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xl z-40 lg:hidden animate-in fade-in duration-500" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-80 z-50 lg:hidden transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full shadow-none'
      } bg-white dark:bg-[#0A0A0A] shadow-2xl`}>
        <button 
          onClick={() => setSidebarOpen(false)} 
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-black dark:text-white z-50 hover:rotate-90 transition-all"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen relative">
        {/* Background Decorative Elements */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-black dark:text-white"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-col items-center">
            <span className="font-black text-xs uppercase tracking-[0.2em] dark:text-white">SPIMS Grid</span>
            <span className="text-[8px] font-bold text-teal-500 uppercase tracking-widest mt-0.5">Academic Network</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-teal-500/20">
            {user?.displayName?.[0]}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-[#FDFDFD]/80 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-12 py-6 items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-400">Khan Hub Network</h2>
            <p className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mt-1">SPIMS Department Portal</p>
          </div>
          
          <div className="flex items-center gap-8">
             {user?.uid && <StaffNotifications uid={user.uid} dept="spims" />}
             
             <div className="h-8 w-px bg-gray-200 dark:bg-white/10" />

             <div className="flex items-center gap-4 pl-2">
                <div className="flex flex-col items-end">
                   <p className="text-xs font-black dark:text-white uppercase tracking-tight">{user?.displayName}</p>
                   <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-500 text-[8px] font-black uppercase tracking-wider mt-1 border border-teal-500/20">
                      {role && ROLE_LABELS[role]}
                   </span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white font-black text-sm shadow-sm">
                   {user?.displayName?.[0]}
                </div>
             </div>
          </div>
        </header>

        <main className={`flex-1 p-6 lg:p-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="max-w-7xl mx-auto relative">{children}</div>
          {user?.uid && <NotificationRegister userId={user.uid} userName={user.displayName} />}
        </main>
      </div>
    </div>
  );
}
