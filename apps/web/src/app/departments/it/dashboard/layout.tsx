'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, CheckCircle, Heart, UserCog,
  Banknote, User, LogOut, ArrowLeft, Menu, X, 
  Monitor, Bell, Search, GraduationCap, Building2, TrendingUp,
  FileText, Shield, ExternalLink, ChevronLeft, ChevronRight,
  CalendarDays, Laptop
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { ItRole } from '@/types/it';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: ItRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',      href: '/departments/it/dashboard/admin',          icon: <LayoutDashboard size={16}/>, roles: ['admin', 'superadmin'] },
  { label: 'IT Students',   href: '/departments/it/dashboard/admin/students', icon: <GraduationCap size={16}/>,    roles: ['admin', 'superadmin'] },
  { label: 'Clients',       href: '/departments/it/dashboard/admin/clients',  icon: <Building2 size={16}/>,       roles: ['admin', 'superadmin'] },
  { label: 'Staff Team',    href: '/departments/it/dashboard/admin/staff',    icon: <Users size={16}/>,           roles: ['admin', 'superadmin'] },
  { label: 'Finance',       href: '/departments/it/dashboard/admin/finance',  icon: <Banknote size={16}/>,        roles: ['admin', 'superadmin'] },
  { label: 'My Attendance', href: '/departments/it/dashboard/staff',          icon: <CalendarDays size={16}/>,    roles: ['staff'] },
  { label: 'Student Portal', href: '/departments/it/dashboard/student',        icon: <Laptop size={16}/>,          roles: ['student'] },
  { label: 'Client Portal',  href: '/departments/it/dashboard/client',         icon: <Monitor size={16}/>,         roles: ['client'] },
  { label: 'Settings',      href: '/departments/it/dashboard/profile',        icon: <UserCog size={16}/>,         roles: ['admin', 'staff', 'student', 'client', 'superadmin'] },
];

const ROLE_COLORS: Record<ItRole, string> = {
  admin:      'bg-indigo-100 text-indigo-700',
  staff:      'bg-teal-100 text-teal-700',
  student:    'bg-blue-100 text-blue-700',
  client:     'bg-purple-100 text-purple-700',
  superadmin: 'bg-zinc-100 text-zinc-700',
};

const ROLE_LABELS: Record<ItRole, string> = {
  admin:      'IT Manager',
  staff:      'IT Engineer',
  student:    'IT Intern/Student',
  client:     'Client',
  superadmin: 'HQ Admin',
};

const DEPT_INFO: Record<string, { label: string; adminUrl: string; color: string; icon: React.ReactNode }> = {
  rehab:        { label: 'Rehab',      adminUrl: '/departments/rehab/dashboard/admin',       color: 'text-rose-500',   icon: <Heart size={16} /> },
  hospital:     { label: 'Hospital',   adminUrl: '/departments/hospital/dashboard/admin',    color: 'text-blue-500',   icon: <Building2 size={16} /> },
  spims:        { label: 'SPIMS',      adminUrl: '/departments/spims/dashboard/admin',       color: 'text-teal-500',   icon: <GraduationCap size={16} /> },
  it:           { label: 'IT Dept',    adminUrl: '/departments/it/dashboard/admin',          color: 'text-indigo-500', icon: <Monitor size={16} /> },
  sukoon:       { label: 'Sukoon',     adminUrl: '/departments/sukoon/dashboard/admin',      color: 'text-purple-500', icon: <Heart size={16} /> },
  welfare:      { label: 'Welfare',    adminUrl: '/departments/welfare/dashboard/admin',     color: 'text-amber-500',  icon: <Heart size={16} /> },
  'job-center': { label: 'Job Center', adminUrl: '/departments/job-center/dashboard/admin',  color: 'text-orange-500', icon: <User size={16} /> },
  'social-media': { label: 'Media',    adminUrl: '/departments/social-media/dashboard/admin', color: 'text-indigo-500', icon: <Monitor size={16} /> },
};

const HQ_NAV_ITEMS = [
  { label: 'HQ Overview', href: '/hq/dashboard/superadmin', icon: <LayoutDashboard size={16} /> },
  { label: 'Approvals', href: '/hq/dashboard/superadmin/approvals', icon: <CheckCircle size={16} /> },
  { label: 'Finance', href: '/hq/dashboard/superadmin/finance', icon: <TrendingUp size={16} /> },
  { label: 'All Users', href: '/hq/dashboard/superadmin/users', icon: <Users size={16} /> },
  { label: 'Audit Log', href: '/hq/dashboard/superadmin/audit', icon: <FileText size={16} /> },
];

export default function ITDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<{ role: ItRole; displayName: string; customId: string; uid: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHqAdmin, setIsHqAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'dept' | 'hq'>('dept');

  const darkMode = mounted && resolvedTheme === 'dark';

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('it_session');
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
    router.push('/departments/it/login');
  }, [router]);

  useEffect(() => {
    setMounted(true);
    let session = localStorage.getItem('it_session');
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
          localStorage.setItem('it_session', JSON.stringify(syncSession));
          localStorage.setItem('it_login_time', Date.now().toString());
          session = JSON.stringify(syncSession);
          setIsHqAdmin(true);
        }
      } catch (e) {}
    }

    if (!session) { router.push('/departments/it/login'); return; }

    try {
      const parsed = JSON.parse(session);
      setUser(parsed);
      setIsChecking(false);
    } catch (err) {
      handleSignOut();
    }
  }, [router, handleSignOut]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const role = user?.role as ItRole;
  const navItems = viewMode === 'dept'
    ? NAV_ITEMS.filter(item => user && item.roles.includes(role))
    : HQ_NAV_ITEMS;

  const SidebarContent = () => {
    const [portalOpen, setPortalOpen] = useState(false);

    return (
      <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
        <div className="px-6 pt-10 pb-6 border-b border-black/5 dark:border-white/5">
          <Link 
            href={viewMode === 'hq' ? "/hq/dashboard/superadmin" : "/"} 
            className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 text-[10px] font-black mb-6 transition-colors group uppercase tracking-[0.3em]"
          >
            <ArrowLeft size={10} className="group-hover:-translate-x-1 transition-transform" />
            {viewMode === 'hq' ? 'Back to HQ' : 'Back to Home'}
          </Link>
          
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${
              viewMode === 'hq' ? 'bg-black shadow-black/20' : 'bg-indigo-600 shadow-indigo-200'
            }`}>
              {viewMode === 'hq' ? <Shield size={24} strokeWidth={2.5} /> : <Monitor size={24} strokeWidth={2.5} />}
            </div>
            <div>
              <p className="font-black text-lg leading-none tracking-tighter uppercase">
                {viewMode === 'hq' ? 'HQ Admin' : 'IT Portal'}
              </p>
              <p className="text-gray-400 text-[10px] font-black mt-2 uppercase tracking-[0.2em] italic">
                {viewMode === 'hq' ? 'Central Node' : 'Technology Hub'}
              </p>
            </div>
          </div>

          {/* Jump Portal */}
          {isHqAdmin && (
            <div className="relative mb-6">
              <button
                onClick={() => setPortalOpen(!portalOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left transition-all bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 group"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink size={14} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Jump to Portal</span>
                </div>
                <ChevronLeft size={14} className={`text-gray-300 transition-transform ${portalOpen ? '-rotate-90' : ''}`} />
              </button>

              {portalOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 z-50 rounded-[2rem] border shadow-2xl p-3 animate-in fade-in zoom-in-95 bg-white dark:bg-black border-gray-100 dark:border-white/10">
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(DEPT_INFO).map(([key, info]) => (
                      <Link
                        key={key}
                        href={info.adminUrl}
                        onClick={() => setPortalOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                          pathname.includes(key)
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          pathname.includes(key) ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/5'
                        }`}>
                          {React.cloneElement(info.icon as React.ReactElement, { size: 14, strokeWidth: 2.5 })}
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">{info.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isHqAdmin && (
            <div className="flex p-1.5 rounded-[1.25rem] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-inner">
              <button
                onClick={() => setViewMode('dept')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'dept' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xl shadow-black/5' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                PORTAL
              </button>
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'hq' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xl shadow-black/5' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                HQ NODE
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg ${ROLE_COLORS[user?.role as ItRole || 'staff']}`}>
              {user?.displayName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-black truncate text-black dark:text-white">{user?.displayName}</p>
              <p className="text-[9px] font-black text-gray-400 truncate uppercase tracking-widest">{user?.customId || 'STAFF'}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ROLE_COLORS[user?.role as ItRole || 'staff']} shadow-sm`}>
              {role ? ROLE_LABELS[role] : 'STAFF'}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar font-black">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[13px] transition-all group ${
                  isActive 
                    ? 'bg-black text-white shadow-xl shadow-black/10 translate-x-1' 
                    : 'text-gray-500 hover:text-black hover:bg-gray-50'
                }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                <span className="flex-1 tracking-tight">{item.label}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-black/5">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black text-red-500 hover:bg-red-50 transition-all active:scale-95">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden bg-[#FDFCFB] text-black selection:bg-indigo-100">
      <aside className="hidden lg:flex flex-col w-64 border-r border-black/5 fixed left-0 top-0 h-screen z-30 bg-white">
        <SidebarContent />
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed left-0 top-0 h-screen w-72 z-50 lg:hidden transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white border-r border-black/10`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:bg-gray-100">
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between bg-white/80 dark:bg-black/80 border-slate-200/60 dark:border-white/5">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
              <Monitor size={16} />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">IT Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-md ${ROLE_COLORS[user?.role as ItRole || 'staff']}`}>
              {(user?.displayName?.[0] || 'U').toUpperCase()}
            </div>
          </div>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden lg:flex sticky top-0 z-20 backdrop-blur-md border-b px-8 py-4 items-center justify-between bg-white/80 dark:bg-black/80 border-slate-200/60 dark:border-white/5">
          <div className="flex items-center gap-4 bg-slate-100/50 dark:bg-white/5 px-4 py-2 rounded-2xl border border-slate-200/50 dark:border-white/5 w-96 group focus-within:border-indigo-300 dark:focus-within:border-indigo-500/50 transition-all">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search IT portal..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 font-medium text-slate-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2.5 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10 group">
              <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white dark:border-black animate-pulse" />
            </button>
            
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10 mx-2" />
            
            <div className="flex items-center gap-3 pl-2 group">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{user?.displayName}</p>
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">{user?.role} Portal</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-transform group-hover:scale-110 ${ROLE_COLORS[user?.role as ItRole || 'staff']}`}>
                {(user?.displayName?.[0] || 'U').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className={`flex-1 p-4 lg:p-10 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
