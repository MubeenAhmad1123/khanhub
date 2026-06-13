// src/app/departments/welfare/dashboard/layout.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, CheckCircle, Heart, UserCog,
  Banknote, FileBarChart, CalendarDays,
  User, LogOut, ArrowLeft, Menu, X, Shield,
  ChevronLeft, ExternalLink, Building2, GraduationCap, TrendingUp, Calculator, FileText
} from 'lucide-react';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import StaffNotifications from '@/components/layout/StaffNotifications';

type WelfareRole = 'admin' | 'staff' | 'family' | 'superadmin' | 'donor';

function normalizeWelfareRole(rawRole: string): WelfareRole {
  const lower = (rawRole || '').toLowerCase();
  if (lower === 'admin') return 'admin';
  if (lower === 'superadmin') return 'superadmin';
  if (lower === 'family') return 'family';
  if (lower === 'staff' || lower.includes('staff') || lower.includes('contractor') || lower.includes('internee')) {
    return 'staff';
  }
  if (lower === 'donor') return 'donor';
  return rawRole as WelfareRole;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: WelfareRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',      href: '/departments/welfare/dashboard/admin',                    icon: <LayoutDashboard size={16}/>, roles: ['admin', 'superadmin'] },
  { label: 'Children',      href: '/departments/welfare/dashboard/admin/children',           icon: <Heart size={16}/>,           roles: ['admin', 'superadmin'] },
  { label: 'Donors',        href: '/departments/welfare/dashboard/admin/donors',             icon: <Banknote size={16}/>,        roles: ['admin', 'superadmin'] },
  { label: 'Reports',       href: '/departments/welfare/dashboard/admin/reports',            icon: <FileBarChart size={16}/>,    roles: ['admin'] },
  { label: 'Reports',       href: '/departments/welfare/dashboard/superadmin/reports',       icon: <FileBarChart size={16}/>,    roles: ['superadmin'] },
  { label: 'Approvals',     href: '/departments/welfare/dashboard/superadmin/approvals',     icon: <CheckCircle size={16}/>,     roles: ['superadmin'] },
  { label: 'User Management', href: '/departments/welfare/dashboard/superadmin/users',      icon: <Users size={16}/>,           roles: ['superadmin'] },
  { label: 'My Attendance', href: '/departments/welfare/dashboard/staff',                   icon: <CalendarDays size={16}/>,    roles: ['staff'] },
  { label: 'My Child',      href: '/departments/welfare/dashboard/family',                  icon: <User size={16}/>,            roles: ['family'] },
  { label: 'My Dashboard',  href: '/departments/welfare/dashboard/donor',                   icon: <Heart size={16}/>,           roles: ['donor'] },
  { label: 'My Profile',    href: '/departments/welfare/dashboard/profile',                 icon: <UserCog size={16}/>,         roles: ['admin', 'staff', 'family', 'superadmin', 'donor'] },
];

const ROLE_COLORS: Record<WelfareRole, string> = {
  admin:      'bg-blue-50 text-blue-700 border border-blue-100',
  staff:      'bg-teal-50 text-teal-700 border border-teal-100',
  family:     'bg-green-50 text-green-700 border border-green-100',
  donor:      'bg-indigo-50 text-indigo-700 border border-indigo-100',
  superadmin: 'bg-purple-50 text-purple-700 border border-purple-100',
};

const ROLE_LABELS: Record<WelfareRole, string> = {
  admin:      'Admin',
  staff:      'Staff',
  family:     'Family',
  donor:      'Donor',
  superadmin: 'HQ Admin',
};

const DEPT_INFO: Record<string, { label: string; adminUrl: string; color: string; icon: React.ReactNode }> = {
  welfare:      { label: 'Welfare',      adminUrl: '/departments/welfare/dashboard/admin',       color: 'text-rose-500',   icon: <Heart size={16} /> },
  hospital:     { label: 'Hospital',   adminUrl: '/departments/hospital/dashboard/admin',    color: 'text-blue-500',   icon: <Building2 size={16} /> },
  spims:        { label: 'SPIMS',      adminUrl: '/departments/spims/dashboard/admin',       color: 'text-teal-500',   icon: <GraduationCap size={16} /> },
  sukoon:       { label: 'Sukoon',     adminUrl: '/departments/sukoon/dashboard/admin',      color: 'text-purple-500', icon: <Heart size={16} /> },
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

export default function WelfareDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<{ role: WelfareRole; displayName: string; customId: string; uid: string; childId?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHqAdmin, setIsHqAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'dept' | 'hq'>('dept');

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('welfare_session');
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
    router.push('/departments/welfare/login');
  }, [router]);

  useEffect(() => {
    setMounted(true);
    let session = localStorage.getItem('welfare_session');
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
          localStorage.setItem('welfare_session', JSON.stringify(syncSession));
          localStorage.setItem('welfare_login_time', Date.now().toString());
          session = JSON.stringify(syncSession);
          setIsHqAdmin(true);
        }
      } catch (e) {}
    }

    if (!session) { router.push('/departments/welfare/login'); return; }

    const performAuthCheck = () => {
      try {
        const parsed = JSON.parse(session!);
        if (!parsed.uid || !parsed.role) throw new Error('Invalid session');

        setUser({
          ...parsed,
          role: normalizeWelfareRole(parsed.role)
        });
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

    const unsub = onSnapshot(doc(db, 'welfare_users', user.uid), (snap) => {
      if (!snap.exists()) {
        handleSignOut();
        return;
      }
      const data = snap.data();
      const snapRole = normalizeWelfareRole(data?.role || '');
      
      if (data?.isActive === false || snapRole !== user.role) {
        handleSignOut();
        return;
      }
      if (data?.forceLogoutAt) {
        const logoutTime = new Date(data.forceLogoutAt).getTime();
        const loginTimeStr = localStorage.getItem('welfare_login_time');
        const loginTime = loginTimeStr ? parseInt(loginTimeStr) : 0;
        if (logoutTime > loginTime) {
          handleSignOut();
        }
      }
    }, (error) => {
      console.error('Welfare session listener error:', error);
    });
    return () => unsub();
  }, [user, handleSignOut]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-amber-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-amber-600 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Initializing</p>
            <p className="text-slate-400 text-[9px] font-medium uppercase tracking-wider">Welfare Portal</p>
          </div>
        </div>
      </div>
    );
  }

  const role = user?.role as WelfareRole;
  const navItems = viewMode === 'dept'
    ? NAV_ITEMS.filter(item => user && item.roles.includes(role))
    : HQ_NAV_ITEMS;

  const SidebarContent = () => {
    const [portalOpen, setPortalOpen] = useState(false);

    return (
      <div className="flex flex-col h-full bg-white border-r border-slate-100">
        {/* Header */}
        <div className="p-6">
          <Link 
            href={viewMode === 'hq' ? "/hq/dashboard/superadmin" : "/"} 
            className="flex items-center gap-2 text-slate-400 hover:text-slate-800 text-[10px] font-bold mb-6 transition-all group uppercase tracking-widest"
          >
            <div className="w-5 h-5 rounded-full border border-slate-100 flex items-center justify-center group-hover:border-slate-300 transition-colors">
              <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
            </div>
            {viewMode === 'hq' ? 'Return to Nexus' : 'Main Hub'}
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-all duration-500 bg-slate-900`}>
              {viewMode === 'hq' ? <Shield size={18} /> : <Heart size={18} />}
            </div>
            <div>
              <p className="font-bold text-base text-slate-900 tracking-tight">
                {viewMode === 'hq' ? 'HQ Admin' : 'Welfare'}
              </p>
              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                {viewMode === 'hq' ? 'System Core' : 'Department'}
              </p>
            </div>
          </div>

          {/* Jump Portal */}
          {isHqAdmin && (
            <div className="relative mb-4">
              <button
                onClick={() => setPortalOpen(!portalOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={12} className="text-slate-400 group-hover:rotate-12 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-700">Switch Grid</span>
                </div>
                <ChevronLeft size={12} className={`text-slate-400 transition-transform duration-300 ${portalOpen ? '-rotate-90' : ''}`} />
              </button>

              {portalOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-slate-100 bg-white shadow-lg p-2 animate-in fade-in duration-300 overflow-hidden">
                  <div className="space-y-1">
                    {Object.entries(DEPT_INFO).map(([key, info]) => (
                      <Link
                        key={key}
                        href={info.adminUrl}
                        onClick={() => setPortalOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group ${
                          pathname.includes(key)
                            ? 'bg-slate-900 text-white'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          pathname.includes(key) ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-slate-100'
                        }`}>
                          {React.cloneElement(info.icon as React.ReactElement, { size: 12 })}
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-tight">{info.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nav Switcher */}
          {isHqAdmin && (
            <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100 mb-6">
              <button
                onClick={() => setViewMode('dept')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-bold tracking-wider transition-all ${
                  viewMode === 'dept' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                LOCAL
              </button>
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-bold tracking-wider transition-all ${
                  viewMode === 'hq' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                CORE
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all relative group ${
                  isActive 
                    ? 'bg-slate-50 text-slate-900 border border-slate-100' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                  {item.icon}
                </div>
                <span className="flex-1 font-bold uppercase tracking-tight text-[10px]">{item.label}</span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-slate-900" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User & Bottom */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs border border-slate-200">
              {user?.displayName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate text-slate-900 uppercase tracking-tight">{user?.displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                 <div className="w-1 h-1 rounded-full bg-emerald-500" />
                 <p className="text-[9px] font-bold text-slate-400 truncate tracking-wider uppercase">{user?.customId}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSignOut} 
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all group"
          >
            <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            DISCONNECT
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex bg-[#FAFBFC] text-slate-900 font-sans`}>
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex flex-col w-64 fixed left-0 top-0 h-screen z-30`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden animate-in fade-in duration-300" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-72 z-50 lg:hidden transform transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full shadow-none'
      } bg-white shadow-xl`}>
        <button 
          onClick={() => setSidebarOpen(false)} 
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 z-50 hover:bg-slate-100 transition-all"
        >
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen relative">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-100"
          >
            <Menu size={16} />
          </button>
          <div className="flex flex-col items-center">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-900">Welfare Portal</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user?.displayName?.[0]}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-white border-b border-slate-100 px-10 py-4 items-center justify-between shadow-sm shadow-slate-100/50">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Khan Hub Network</h2>
            <p className="text-xs font-bold text-slate-900 mt-0.5">Welfare Portal</p>
          </div>
          
          <div className="flex items-center gap-6">
             {user?.uid && <StaffNotifications uid={user.uid} dept="welfare" />}
             
             <div className="h-6 w-px bg-slate-100" />

             <div className="flex items-center gap-3 pl-1">
                <div className="flex flex-col items-end">
                   <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{user?.displayName}</p>
                   <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 text-[8px] font-bold uppercase mt-0.5 border border-slate-100">
                      {role && ROLE_LABELS[role]}
                   </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-xs shadow-sm">
                   {user?.displayName?.[0]}
                </div>
             </div>
          </div>
        </header>

        <main className={`flex-1 p-4 lg:p-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="max-w-7xl mx-auto relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
