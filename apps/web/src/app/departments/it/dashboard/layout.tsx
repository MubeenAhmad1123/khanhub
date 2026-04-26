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
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { ItRole } from '@/types/it';
import StaffNotifications from '@/components/layout/StaffNotifications';


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
  { label: 'My Profile',    href: '/departments/it/dashboard/profile',        icon: <UserCog size={16}/>,         roles: ['admin', 'staff', 'student', 'client', 'superadmin'] },
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
  
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<{ role: ItRole; displayName: string; customId: string; uid: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHqAdmin, setIsHqAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'dept' | 'hq'>('dept');

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
      <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center">
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
      <div className="flex flex-col h-full bg-[#FCFBF8] text-black">
        <div className="px-6 pt-10 pb-6 border-b-2 border-black">
          <Link 
            href={viewMode === 'hq' ? "/hq/dashboard/superadmin" : "/"} 
            className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 text-[10px] font-black mb-6 transition-colors group uppercase tracking-[0.3em]"
          >
            <ArrowLeft size={10} className="group-hover:-translate-x-1 transition-transform" />
            {viewMode === 'hq' ? 'Back to HQ' : 'Back to Home'}
          </Link>
          
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-12 h-12 border-2 border-black flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-500 ${
              viewMode === 'hq' ? 'bg-black' : 'bg-indigo-600'
            }`}>
              {viewMode === 'hq' ? <Shield size={24} strokeWidth={2.5} /> : <Monitor size={24} strokeWidth={2.5} />}
            </div>
            <div>
              <p className="font-black text-lg leading-none tracking-tighter uppercase">
                {viewMode === 'hq' ? 'HQ Admin' : 'IT Portal'}
              </p>
              <p className="text-black/50 text-[10px] font-black mt-2 uppercase tracking-[0.2em] italic">
                {viewMode === 'hq' ? 'Central Node' : 'Technology Hub'}
              </p>
            </div>
          </div>

          {/* Jump Portal */}
          {isHqAdmin && (
            <div className="relative mb-6">
              <button
                onClick={() => setPortalOpen(!portalOpen)}
                className="w-full flex items-center justify-between px-4 py-3 border-2 border-black text-left transition-all bg-white hover:bg-gray-50 group shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink size={14} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Jump to Portal</span>
                </div>
                <ChevronLeft size={14} className={`text-black transition-transform ${portalOpen ? '-rotate-90' : ''}`} />
              </button>

              {portalOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 z-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-3 animate-in fade-in zoom-in-95 bg-[#FCFBF8]">
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(DEPT_INFO).map(([key, info]) => (
                      <Link
                        key={key}
                        href={info.adminUrl}
                        onClick={() => setPortalOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 border-2 border-transparent transition-all group ${
                          pathname.includes(key)
                            ? 'bg-indigo-600 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                            : 'hover:bg-gray-50 text-black hover:border-black'
                        }`}
                      >
                        <div className={`w-8 h-8 border border-black flex items-center justify-center transition-colors ${
                          pathname.includes(key) ? 'bg-white/20' : 'bg-gray-100'
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
            <div className="flex p-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <button
                onClick={() => setViewMode('dept')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black transition-all ${
                  viewMode === 'dept' ? 'bg-black text-white' : 'text-black/40 hover:text-black'
                }`}
              >
                PORTAL
              </button>
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black transition-all ${
                  viewMode === 'hq' ? 'bg-black text-white' : 'text-black/40 hover:text-black'
                }`}
              >
                HQ NODE
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-b-2 border-black bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 border-2 border-black flex items-center justify-center text-white font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${ROLE_COLORS[user?.role as ItRole || 'staff']}`}>
              {user?.displayName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-black truncate text-black">{user?.displayName}</p>
              <p className="text-[9px] font-black text-black/40 truncate uppercase tracking-widest">{user?.customId || 'STAFF'}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className={`px-3 py-1 border border-black text-[9px] font-black uppercase tracking-widest ${ROLE_COLORS[user?.role as ItRole || 'staff']} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
              {role ? ROLE_LABELS[role] : 'STAFF'}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar font-black">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 border-2 text-[13px] transition-all group ${
                  isActive 
                    ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-1' 
                    : 'text-black/50 hover:text-black hover:bg-white border-transparent hover:border-black'
                }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                <span className="flex-1 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t-2 border-black">
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-black bg-white text-sm font-black text-red-500 hover:bg-red-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1">
            <LogOut size={18} />
            SIGN OUT
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden bg-[#FCFBF8] text-black">
      <aside className="hidden lg:flex flex-col w-64 border-r-2 border-black fixed left-0 top-0 h-screen z-30 bg-[#FCFBF8]">
        <SidebarContent />
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed left-0 top-0 h-screen w-72 z-50 lg:hidden transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-[#FCFBF8] border-r-2 border-black`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 text-black hover:bg-white border border-black z-50">
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#FCFBF8] border-b-2 border-black px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-black border border-black hover:bg-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Monitor size={16} />
            </div>
            <span className="font-black text-sm uppercase tracking-tighter">IT Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 border border-black flex items-center justify-center text-white text-[10px] font-black ${ROLE_COLORS[user?.role as ItRole || 'staff']}`}>
              {(user?.displayName?.[0] || 'U').toUpperCase()}
            </div>
          </div>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-[#FCFBF8]/80 backdrop-blur-md border-b-2 border-black px-8 py-4 items-center justify-between">
          <div className="flex items-center gap-4 bg-white px-4 py-2 border-2 border-black w-96 group transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Search className="w-4 h-4 text-black group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search IT portal..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-black/30 font-black text-black"
            />
          </div>
          
          <div className="flex items-center gap-4">
            {user?.uid && <StaffNotifications uid={user.uid} dept="it" />}
            
            <div className="h-8 w-[2px] bg-black mx-2" />
            
            <div className="flex items-center gap-3 pl-2 group">
              <div className="text-right">
                <p className="text-sm font-black text-black uppercase tracking-tighter">{user?.displayName}</p>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">{user?.role} Portal</p>
              </div>
              <div className={`w-10 h-10 border-2 border-black flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-110 ${ROLE_COLORS[user?.role as ItRole || 'staff']}`}>
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
