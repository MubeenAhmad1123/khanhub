// src/app/departments/rehab/dashboard/layout.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, ExternalLink, Building2, GraduationCap, TrendingUp, Calculator, FileText, BarChart2, PhoneCall,
  LayoutDashboard, Heart, CalendarDays, User, UserCog, Shield, ArrowLeft, LogOut, Menu, X, CheckCircle, Users
} from 'lucide-react';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import StaffNotifications from '@/components/layout/StaffNotifications';


type RehabRole = 'admin' | 'staff' | 'family' | 'superadmin';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: RehabRole[];
}
const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',      href: '/departments/rehab/dashboard/admin',          icon: <LayoutDashboard size={16}/>, roles: ['admin', 'superadmin'] },
  { label: 'Leads & CRM',   href: '/departments/rehab/dashboard/admin/leads',    icon: <PhoneCall size={16}/>,       roles: ['admin', 'superadmin'] },
  { label: 'Patients',      href: '/departments/rehab/dashboard/admin/patients', icon: <Heart size={16}/>,           roles: ['admin', 'superadmin'] },
  { label: 'My Attendance', href: '/departments/rehab/dashboard/staff',          icon: <CalendarDays size={16}/>,    roles: ['staff'] },
  { label: 'My Patient',    href: '/departments/rehab/dashboard/family',         icon: <User size={16}/>,            roles: ['family'] },
  { label: 'My Profile',    href: '/departments/rehab/dashboard/profile',        icon: <UserCog size={16}/>,         roles: ['admin', 'staff', 'family', 'superadmin'] },
];

const ROLE_COLORS: Record<RehabRole, string> = {
  admin:      'bg-blue-100 text-blue-700',
  staff:      'bg-teal-100 text-teal-700',
  family:     'bg-green-100 text-green-700',
  superadmin: 'bg-purple-100 text-purple-700',
};

const ROLE_LABELS: Record<RehabRole, string> = {
  admin:      'Admin',
  staff:      'Staff',
  family:     'Family',
  superadmin: 'HQ Admin',
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

export default function RehabDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<{ role: RehabRole; displayName: string; customId: string; uid: string; patientId?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHqAdmin, setIsHqAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'dept' | 'hq'>('dept');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSignOut = useCallback(() => {
    console.log('[RehabLayout] Signing out and clearing session');
    localStorage.removeItem('rehab_session');
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
    router.push('/departments/rehab/login');
  }, [router]);

  useEffect(() => {
    setMounted(true);
    let session = localStorage.getItem('rehab_session');
    const hqSessionStr = localStorage.getItem('hq_session');
    
    if (hqSessionStr) {
      try {
        const hqSession = JSON.parse(hqSessionStr);
        if (hqSession?.role === 'superadmin') {
          console.log('[RehabLayout] Detected HQ Superadmin session, syncing to rehab...');
          const syncSession = {
            uid: hqSession.uid,
            customId: hqSession.customId || hqSession.email || 'HQ-USER',
            role: 'superadmin',
            displayName: hqSession.displayName || 'Superadmin',
          };
          localStorage.setItem('rehab_session', JSON.stringify(syncSession));
          localStorage.setItem('rehab_login_time', Date.now().toString());
          session = JSON.stringify(syncSession);
          setIsHqAdmin(true);
        }
      } catch (e) {}
    }

    if (!session) { 
      console.warn('[RehabLayout] No rehab_session found, redirecting to login');
      router.push('/departments/rehab/login'); 
      return; 
    }

    const performAuthCheck = () => {
      console.log('[RehabLayout] Performing auth check. Session exists:', !!session);
      try {
        const parsed = JSON.parse(session!);
        console.log('[RehabLayout] Session parsed for:', parsed.customId, 'Role:', parsed.role);

        if (!parsed.uid || !parsed.role) {
          console.warn('[RehabLayout] Invalid session structure');
          throw new Error('Invalid session');
        }

        console.log('[RehabLayout] Auth Check SUCCESS');
        setUser(parsed);
        setIsChecking(false);
      } catch (err) {
        console.error('[RehabLayout] Auth Check FAILED:', err);
        handleSignOut();
      }
    };

    performAuthCheck();
  }, [router, handleSignOut]);

  useEffect(() => {
    if (!user || !user.uid) return;
    if (user.role === 'superadmin') return;

    const unsub = onSnapshot(doc(db, 'rehab_users', user.uid), (snap) => {
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
        const loginTimeStr = localStorage.getItem('rehab_login_time');
        const loginTime = loginTimeStr ? parseInt(loginTimeStr) : 0;
        if (logoutTime > loginTime) {
          handleSignOut();
        }
      }
    }, (error) => {
      console.error('Rehab session listener error:', error);
    });
    return () => unsub();
  }, [user, handleSignOut]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#FCFAF2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-rose-500/10 rounded-full" />
            <div className="absolute inset-0 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-rose-600 text-sm font-black uppercase tracking-[0.3em] animate-pulse">Initializing</p>
            <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">Rehab Protocol v3.0</p>
          </div>
        </div>
      </div>
    );
  }

  const role = user?.role as RehabRole;
  const navItems = viewMode === 'dept'
    ? NAV_ITEMS.filter(item => user && item.roles.includes(role))
    : HQ_NAV_ITEMS;

  const SidebarContent = ({ collapsed }: { collapsed?: boolean }) => {
    const [portalOpen, setPortalOpen] = useState(false);

    return (
      <div className="flex flex-col h-full bg-white/40 backdrop-blur-3xl border-r border-rose-100/50 shadow-[4px_0_24px_rgba(244,63,94,0.03)]">
        {/* Header */}
        <div className="p-8">
          <Link 
            href={viewMode === 'hq' ? "/hq/dashboard/superadmin" : "/"} 
            className="flex items-center gap-2 text-gray-400 hover:text-rose-600 text-[10px] font-bold mb-8 transition-all group uppercase tracking-widest"
          >
            <div className="w-6 h-6 rounded-full border border-rose-100 flex items-center justify-center group-hover:border-rose-500/50 transition-colors bg-white">
              <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
            </div>
            {viewMode === 'hq' ? 'Return to Nexus' : 'Main Hub'}
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className={`w-12 h-12 flex-shrink-0 rounded-[22px] flex items-center justify-center text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-700 hover:scale-105 ${
              viewMode === 'hq' ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rotate-3' : 'bg-gradient-to-br from-rose-400 via-pink-500 to-orange-400 -rotate-3'
            }`}>
              {viewMode === 'hq' ? <Shield size={24} /> : <Heart size={24} />}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-black text-xl leading-tight tracking-tight text-gray-900 truncate">
                  {viewMode === 'hq' ? 'HQ Admin' : 'Rehab'}
                </p>
                <p className="text-rose-500/80 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5 truncate">
                  {viewMode === 'hq' ? 'System Core' : 'Care Grid'}
                </p>
              </div>
            )}
          </div>

          {/* Jump Portal */}
          {isHqAdmin && !collapsed && (
            <div className="relative mb-6">
              <button
                onClick={() => setPortalOpen(!portalOpen)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-3xl border border-rose-100 bg-white/80 hover:bg-white transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                    <ExternalLink size={14} className="text-rose-500 group-hover:rotate-12 transition-transform" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-tight text-gray-700">Switch Grid</span>
                </div>
                <ChevronLeft size={14} className={`text-rose-300 transition-transform duration-300 ${portalOpen ? '-rotate-90' : ''}`} />
              </button>

              {portalOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 z-50 rounded-[2.5rem] border border-rose-100 bg-white/95 backdrop-blur-3xl shadow-[0_20px_50px_rgba(244,63,94,0.15)] p-4 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="space-y-2">
                    {Object.entries(DEPT_INFO).map(([key, info]) => (
                      <Link
                        key={key}
                        href={info.adminUrl}
                        onClick={() => setPortalOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${
                          pathname.includes(key)
                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
                            : 'hover:bg-rose-50 text-gray-600'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          pathname.includes(key) ? 'bg-white/20 scale-110' : 'bg-gray-100 group-hover:bg-white'
                        }`}>
                          {React.cloneElement(info.icon as React.ReactElement, { size: 14 })}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{info.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nav Switcher */}
          {isHqAdmin && !collapsed && (
            <div className="flex p-1.5 bg-rose-50/50 rounded-[1.5rem] border border-rose-100/50 mb-8">
              <button
                onClick={() => setViewMode('dept')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'dept' ? 'bg-white shadow-md text-rose-600 scale-105' : 'text-rose-300 hover:text-rose-500'
                }`}
              >
                LOCAL
              </button>
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'hq' ? 'bg-white shadow-md text-indigo-600 scale-105' : 'text-rose-300 hover:text-rose-500'
                }`}
              >
                CORE
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 space-y-3 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-6 py-4 rounded-[2rem] text-sm transition-all relative group overflow-hidden ${
                  isActive 
                    ? 'bg-gradient-to-r from-rose-500/10 to-rose-50/20 text-rose-600 shadow-[0_4px_12px_rgba(244,63,94,0.05)]' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-gradient-to-b from-rose-400 to-rose-600 rounded-r-full" />
                )}
                <div className={`transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0 ${isActive ? 'text-rose-500' : 'text-gray-400 group-hover:text-rose-400'}`}>
                  {item.icon}
                </div>
                {!collapsed && <span className="flex-1 font-black uppercase tracking-[0.1em] text-[11px] truncate">{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-rose-500 animate-bounce" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User & Bottom */}
        <div className="p-8 space-y-6">
          {!collapsed && (
            <div className="flex items-center gap-4 px-3 py-4 rounded-[2rem] bg-white shadow-sm border border-rose-50/50">
              <div className="w-10 h-10 flex-shrink-0 rounded-[18px] bg-gradient-to-br from-gray-900 to-black flex items-center justify-center text-white font-black text-sm shadow-lg">
                {user?.displayName?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black truncate text-gray-900 uppercase tracking-tight">{user?.displayName}</p>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-[9px] font-bold text-rose-400/80 truncate tracking-[0.15em] uppercase">{user?.customId}</p>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={handleSignOut} 
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-[2rem] border border-rose-100 bg-white text-[11px] font-black text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/20 transition-all duration-500 group ${collapsed ? 'px-0' : ''}`}
            title="Disconnect"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform flex-shrink-0" />
            {!collapsed && 'DISCONNECT'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex bg-[#FCFAF2] text-gray-900 transition-colors duration-500 font-sans`}>
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-30 transition-all duration-300 ${isCollapsed ? 'w-24' : 'w-72'}`}>
        <SidebarContent collapsed={isCollapsed} />
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 bg-white border border-rose-100 rounded-full flex items-center justify-center text-rose-500 shadow-sm z-50 hover:bg-rose-50 transition-transform"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
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
      } bg-white shadow-2xl`}>
        <button 
          onClick={() => setSidebarOpen(false)} 
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 z-50 hover:rotate-90 transition-all"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen relative transition-all duration-300 ${isCollapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
        {/* Background Decorative Elements */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-rose-500/10 to-orange-500/5 rounded-full blur-[140px] -mr-64 -mt-64 pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-pink-500/10 to-indigo-500/5 rounded-full blur-[140px] -ml-64 -mb-64 pointer-events-none" />

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/90 backdrop-blur-3xl border-b border-rose-100/50 px-6 py-4 flex items-center justify-between shadow-sm">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm active:scale-95 transition-all"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-col items-center">
            <span className="font-black text-[10px] uppercase tracking-[0.3em] text-gray-900">Rehab Grid</span>
            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1 px-2 py-0.5 bg-rose-50 rounded-lg">Secure Protocol</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-400 via-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-rose-500/20">
            {user?.displayName?.[0]}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-white/40 backdrop-blur-3xl border-b border-rose-100/50 px-12 py-6 items-center justify-between shadow-[0_1px_10px_rgba(244,63,94,0.02)]">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">Khan Hub Network</h2>
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-1 bg-rose-50 px-3 py-1 rounded-full inline-block border border-rose-100">Rehab Department Portal</p>
          </div>
          
          <div className="flex items-center gap-8">
             {user?.uid && <StaffNotifications uid={user.uid} dept="rehab" />}
             
             <div className="h-8 w-px bg-rose-100" />

             <div className="flex items-center gap-5 pl-2">
                <div className="flex flex-col items-end">
                   <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{user?.displayName}</p>
                   <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8px] font-black uppercase tracking-wider mt-1 shadow-sm">
                      {role && ROLE_LABELS[role]}
                   </span>
                </div>
                <div className="w-12 h-12 rounded-[20px] bg-white border border-rose-100 flex items-center justify-center text-rose-600 font-black text-sm shadow-sm hover:shadow-md transition-all cursor-pointer">
                   {user?.displayName?.[0]}
                </div>
             </div>
          </div>
        </header>

        <main className={`flex-1 p-6 lg:p-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="max-w-7xl mx-auto relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
