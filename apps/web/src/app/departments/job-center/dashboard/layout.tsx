// d:\Khan Hub\apps\web\src\app\departments\job-center\dashboard\layout.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, CheckCircle, Heart, UserCog,
  Banknote, FileBarChart, CreditCard, CalendarDays,
  User, LogOut, ArrowLeft, Menu, X, Shield, Sun, Moon,
  ChevronLeft, ExternalLink, Building2, GraduationCap, TrendingUp, Calculator, FileText, BarChart2, Briefcase
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobCenterRole } from '@/types/job-center';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: JobCenterRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',      href: '/departments/job-center/dashboard/admin',          icon: <LayoutDashboard size={16}/>, roles: ['admin', 'superadmin'] },
  { label: 'Seekers',       href: '/departments/job-center/dashboard/admin/seekers',  icon: <User size={16}/>,            roles: ['admin', 'superadmin'] },
  { label: 'Employers',     href: '/departments/job-center/dashboard/admin/employers',icon: <Building2 size={16}/>,       roles: ['admin', 'superadmin'] },
  { label: 'Staff Management', href: '/departments/job-center/dashboard/admin/staff',  icon: <Users size={16}/>,           roles: ['admin', 'superadmin'] },
  { label: 'My Attendance', href: '/departments/job-center/dashboard/staff',          icon: <CalendarDays size={16}/>,    roles: ['staff'] },
  { label: 'Seeker Portal', href: '/departments/job-center/dashboard/seeker',         icon: <Briefcase size={16}/>,       roles: ['seeker'] },
  { label: 'Employer Portal', href: '/departments/job-center/dashboard/employer',     icon: <Building2 size={16}/>,       roles: ['employer'] },
  { label: 'My Profile',    href: '/departments/job-center/dashboard/profile',        icon: <UserCog size={16}/>,         roles: ['admin', 'staff', 'seeker', 'employer', 'superadmin'] },
];

const ROLE_COLORS: Record<JobCenterRole, string> = {
  admin:      'bg-blue-100 text-blue-700',
  staff:      'bg-orange-100 text-orange-700',
  seeker:     'bg-green-100 text-green-700',
  employer:   'bg-indigo-100 text-indigo-700',
  superadmin: 'bg-purple-100 text-purple-700',
};

const ROLE_LABELS: Record<JobCenterRole, string> = {
  admin:      'Admin',
  staff:      'Staff',
  seeker:     'Job Seeker',
  employer:   'Employer',
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

export default function JobCenterDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<{ role: JobCenterRole; displayName: string; customId: string; uid: string; seekerId?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHqAdmin, setIsHqAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'dept' | 'hq'>('dept');

  const darkMode = mounted && resolvedTheme === 'dark';
  const toggleDark = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    setMounted(true);
    let session = localStorage.getItem('jobcenter_session');
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
          localStorage.setItem('jobcenter_session', JSON.stringify(syncSession));
          localStorage.setItem('jobcenter_login_time', Date.now().toString());
          session = JSON.stringify(syncSession);
          setIsHqAdmin(true);
        }
      } catch (e) {}
    }

    if (!session) { router.push('/departments/job-center/login'); return; }

    const performAuthCheck = async () => {
      try {
        const parsed = JSON.parse(session!);
        if (!parsed.uid || !parsed.role) throw new Error('Invalid session');

        const loginTime = localStorage.getItem('jobcenter_login_time');
        if (loginTime && (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60) > 12) {
          handleSignOut();
          return;
        }

        if (parsed.role !== 'superadmin') {
          const userDoc = await getDoc(doc(db, 'jobcenter_users', parsed.uid));
          if (!userDoc.exists() || userDoc.data()?.isActive === false || userDoc.data()?.role !== parsed.role) {
            handleSignOut();
            return;
          }
        }

        setUser(parsed);
        setIsChecking(false);
      } catch (err) {
        handleSignOut();
      }
    };

    performAuthCheck();
  }, [router]);

  useEffect(() => {
    if (!user || !user.uid) return;
    if (user.role === 'superadmin') return;

    const unsub = onSnapshot(doc(db, 'jobcenter_users', user.uid), (snap) => {
      const data = snap.data();
      if (data?.forceLogoutAt) {
        const logoutTime = new Date(data.forceLogoutAt).getTime();
        const loginTimeStr = localStorage.getItem('jobcenter_login_time');
        const loginTime = loginTimeStr ? parseInt(loginTimeStr) : 0;
        if (logoutTime > loginTime) {
          handleSignOut();
        }
      }
    });
    return () => unsub();
  }, [user]);

  const handleSignOut = () => {
    localStorage.removeItem('jobcenter_session');
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
    router.push('/departments/job-center/login');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  const role = user?.role as JobCenterRole;
  const navItems = viewMode === 'dept'
    ? NAV_ITEMS.filter(item => user && item.roles.includes(role))
    : HQ_NAV_ITEMS;

  const SidebarContent = () => {
    const [portalOpen, setPortalOpen] = useState(false);

    return (
      <div className={`flex flex-col h-full ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <Link 
            href={viewMode === 'hq' ? "/hq/dashboard/superadmin" : "/"} 
            className="flex items-center gap-2 text-gray-400 hover:text-orange-600 text-[10px] font-bold mb-4 transition-colors group uppercase tracking-widest"
          >
            <ArrowLeft size={10} className="group-hover:-translate-x-1 transition-transform" />
            {viewMode === 'hq' ? 'Back to HQ' : 'Back to Home'}
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300 ${
              viewMode === 'hq' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-orange-500 shadow-orange-200'
            }`}>
              {viewMode === 'hq' ? <Shield size={20} /> : <User size={20} />}
            </div>
            <div>
              <p className="font-black text-sm leading-none tracking-tight">
                {viewMode === 'hq' ? 'HQ Navigator' : 'Job Center Portal'}
              </p>
              <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">
                {viewMode === 'hq' ? 'Central' : 'Department'}
              </p>
            </div>
          </div>

          {/* Jump Portal */}
          {isHqAdmin && (
            <div className="relative mb-4">
              <button
                onClick={() => setPortalOpen(!portalOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                  darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-orange-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-orange-500" />
                  <span className="text-[11px] font-black uppercase tracking-tight">Jump to Portal</span>
                </div>
                <ChevronLeft size={14} className={`text-gray-400 transition-transform ${portalOpen ? '-rotate-90' : ''}`} />
              </button>

              {portalOpen && (
                <div className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border shadow-2xl p-2 animate-in fade-in zoom-in-95 ${
                  darkMode ? 'bg-gray-800 border-white/10' : 'bg-white border-gray-100'
                }`}>
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(DEPT_INFO).map(([key, info]) => (
                      <Link
                        key={key}
                        href={info.adminUrl}
                        onClick={() => setPortalOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group ${
                          pathname.includes(key)
                            ? (darkMode ? 'bg-white/10 text-white' : 'bg-orange-50 text-orange-700')
                            : (darkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-50 text-gray-600 hover:text-orange-600')
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          pathname.includes(key) ? 'bg-orange-500 text-white' : (darkMode ? 'bg-white/5 text-gray-500' : 'bg-gray-100')
                        }`}>
                          {React.cloneElement(info.icon as React.ReactElement, { size: 14 })}
                        </div>
                        <span className="text-xs font-bold">{info.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nav Switcher */}
          {isHqAdmin && (
            <div className={`flex p-1 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('dept')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black transition-all ${
                  viewMode === 'dept' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-white text-orange-600 shadow-sm') : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                DEPT
              </button>
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black transition-all ${
                  viewMode === 'hq' ? (darkMode ? 'bg-gray-700 text-white' : 'bg-white text-orange-600 shadow-sm') : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                HQ
              </button>
            </div>
          )}
        </div>

        {/* User */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl flex items-center justify-center text-gray-500 font-black text-xs">
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
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar font-bold">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all group ${
                  isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : (darkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-50 text-gray-500 hover:text-orange-600')
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className={`p-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <button onClick={toggleDark} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold mb-1 ${darkMode ? 'text-yellow-400' : 'text-gray-500 hover:bg-gray-100'}`}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            {darkMode ? 'Light' : 'Dark'}
          </button>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex overflow-x-hidden ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <aside className={`hidden lg:flex flex-col w-64 border-r fixed left-0 top-0 h-screen z-30 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <SidebarContent />
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed left-0 top-0 h-screen w-72 z-50 lg:hidden transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:bg-gray-100">
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <header className={`lg:hidden sticky top-0 z-20 backdrop-blur border-b px-4 py-3 flex items-center justify-between ${darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400"><Menu size={20} /></button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white"><Shield size={14} /></div>
            <span className="font-black text-sm">Job Center</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${role ? ROLE_COLORS[role] : ''}`}>{role && ROLE_LABELS[role]}</span>
        </header>

        <header className={`hidden lg:flex sticky top-0 z-20 backdrop-blur border-b px-8 py-4 items-center justify-between ${darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Khan Hub Job Center Portal</div>
          <div className="flex items-center gap-3">
             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${role ? ROLE_COLORS[role] : ''}`}>{role && ROLE_LABELS[role]}</span>
             <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 font-black text-sm">{user?.displayName?.[0]}</div>
             <span className="text-sm font-bold">{user?.displayName}</span>
          </div>
        </header>

        <main className={`flex-1 p-4 lg:p-8 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

