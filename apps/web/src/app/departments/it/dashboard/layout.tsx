'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, CheckCircle, Heart, UserCog,
  Banknote, CalendarDays, User, LogOut, ArrowLeft, Menu, X, 
  Shield, ChevronLeft, ExternalLink, Building2, GraduationCap, 
  TrendingUp, Calculator, FileText, ClipboardList, Monitor, Laptop
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
  'job-center': { label: 'Job Center', adminUrl: '/departments/job-center/dashboard/admin',  color: 'text-orange-500', icon: <User size={16} /> },
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
      <div className="flex flex-col h-full bg-white text-black">
        {/* Header */}
        <div className="px-6 pt-10 pb-6 border-b border-black/5">
          <Link 
            href={viewMode === 'hq' ? "/hq/dashboard/superadmin" : "/"} 
            className="flex items-center gap-2 text-gray-400 hover:text-black text-[10px] font-black mb-6 transition-colors group uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
            {viewMode === 'hq' ? 'Back to HQ' : 'Exit Portal'}
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300 ${
              viewMode === 'hq' ? 'bg-zinc-900' : 'bg-indigo-600 shadow-indigo-200'
            }`}>
              {viewMode === 'hq' ? <Shield size={20} /> : <Monitor size={20} />}
            </div>
            <div>
              <p className="font-black text-sm leading-none tracking-tight">
                {viewMode === 'hq' ? 'HQ Navigator' : 'IT Department'}
              </p>
              <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">
                {viewMode === 'hq' ? 'Central' : 'Tech Hub'}
              </p>
            </div>
          </div>

          {/* Nav Switcher */}
          {isHqAdmin && (
            <div className={`flex p-1 rounded-xl bg-gray-100`}>
              <button
                onClick={() => setViewMode('dept')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black transition-all ${
                  viewMode === 'dept' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                IT DEPT
              </button>
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black transition-all ${
                  viewMode === 'hq' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                HQ
              </button>
            </div>
          )}
        </div>

        {/* User */}
        <div className={`px-6 py-4 border-b border-gray-100`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-black text-xs">
              {user?.displayName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold truncate">{user?.displayName}</p>
              <p className="text-[10px] font-medium text-gray-400 truncate">{user?.customId}</p>
            </div>
          </div>
          <div className="mt-3 flex">
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${role ? ROLE_COLORS[role] : ''}`}>
              {role ? ROLE_LABELS[role] : ''}
            </span>
          </div>
        </div>

        {/* Navigation */}
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

        {/* Bottom */}
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
        <header className="lg:hidden sticky top-0 z-20 backdrop-blur-md border-b border-black/5 px-4 py-3 flex items-center justify-between bg-white/80">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400"><Menu size={20} /></button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><Monitor size={14} /></div>
            <span className="font-black text-sm tracking-tight">IT Dept</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${role ? ROLE_COLORS[role] : ''}`}>{role && ROLE_LABELS[role]}</span>
        </header>

        <header className="hidden lg:flex sticky top-0 z-20 backdrop-blur-md border-b border-black/5 px-8 py-4 items-center justify-between bg-white/80">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Khan Hub • IT Portal</div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${role ? ROLE_COLORS[role] : ''}`}>{role && ROLE_LABELS[role]}</span>
               <div className="w-8 h-8 bg-black text-white rounded-xl flex items-center justify-center font-black text-sm">{user?.displayName?.[0]}</div>
               <span className="text-sm font-black text-black">{user?.displayName}</span>
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
