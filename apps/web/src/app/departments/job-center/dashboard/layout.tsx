// d:\Khan Hub\apps\web\src\app\departments\job-center\dashboard\layout.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, CheckCircle, Heart, UserCog,
  Banknote, FileBarChart, CreditCard, CalendarDays,
  User, LogOut, ArrowLeft, Menu, X, Shield, Sun, Moon,
  ChevronLeft, ExternalLink, Building2, GraduationCap, TrendingUp, Calculator, FileText, BarChart2, Briefcase, Search
} from 'lucide-react';
import { getDoc, doc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { JobCenterRole } from '@/types/job-center';
import StaffNotifications from '@/components/layout/StaffNotifications';


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
  { label: 'Finance',       href: '/departments/job-center/dashboard/admin/finance',  icon: <Banknote size={16}/>,        roles: ['admin', 'superadmin'] },
  { label: 'Analytics',     href: '/departments/job-center/dashboard/superadmin/analytics', icon: <TrendingUp size={16}/>, roles: ['superadmin'] },
  { label: 'My Attendance', href: '/departments/job-center/dashboard/staff',          icon: <CalendarDays size={16}/>,    roles: ['staff'] },
  { label: 'My Profile',    href: '/departments/job-center/dashboard/profile',        icon: <UserCog size={16}/>,         roles: ['admin', 'staff', 'superadmin'] },
];

const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-blue-100 text-blue-700',
  staff:      'bg-teal-100 text-teal-700',
  superadmin: 'bg-purple-100 text-purple-700',
  manager:    'bg-indigo-100 text-indigo-700',
  seeker:     'bg-green-100 text-green-700',
};

const ROLE_LABELS: Record<string, string> = {
  admin:      'Admin',
  staff:      'Staff',
  superadmin: 'HQ Admin',
  manager:    'Manager',
  seeker:     'Seeker',
};

const DEPT_INFO: Record<string, { label: string; adminUrl: string; color: string; icon: React.ReactNode }> = {
  'job-center': { label: 'Job Center', adminUrl: '/departments/job-center/dashboard/admin', color: 'text-orange-500', icon: <Briefcase size={16} /> },
  hq:           { label: 'HQ',         adminUrl: '/hq/dashboard/superadmin',                  color: 'text-indigo-500', icon: <Users size={16} /> },
};

const HQ_NAV_ITEMS = [
  { label: 'HQ Overview', href: '/hq/dashboard/superadmin', icon: <LayoutDashboard size={16} /> },
  { label: 'Analytics', href: '/hq/dashboard/superadmin/analytics', icon: <BarChart2 size={16} /> },
  { label: 'Approvals', href: '/hq/dashboard/superadmin/approvals', icon: <CheckCircle size={16} /> },
  { label: 'Finance', href: '/hq/dashboard/superadmin/finance', icon: <TrendingUp size={16} /> },
  { label: 'All Users', href: '/hq/dashboard/superadmin/users', icon: <Users size={16} /> },
  { label: 'Departments', href: '/hq/dashboard/superadmin/departments', icon: <Building2 size={16} /> },
  { label: 'Audit Log', href: '/hq/dashboard/superadmin/audit', icon: <FileText size={16} /> },
  { label: 'Reconciliation', href: '/hq/dashboard/superadmin/reconciliation', icon: <Calculator size={16} /> },
];

export default function JobCenterDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<{ role: JobCenterRole; displayName: string; customId: string; uid: string; seekerId?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHqAdmin, setIsHqAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'dept' | 'hq'>('dept');

  const handleSignOut = useCallback(() => {
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
  }, [router]);

  useEffect(() => {
    setMounted(true);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
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

      if (!session) { 
        router.push('/departments/job-center/login'); 
        return; 
      }

      try {
        const parsed = JSON.parse(session);
        if (!parsed.uid || !parsed.role) throw new Error('Invalid session');
        setUser(parsed);
        setIsChecking(false);
      } catch (err) {
        handleSignOut();
      }
    });

    return () => unsubscribeAuth();
  }, [router, handleSignOut]);

  useEffect(() => {
    if (!user || !user.uid) return;
    if (user.role === 'superadmin') return;

    let unsub: (() => void) | undefined;

    const setupListener = async () => {
      try {
        let finalDocRef = doc(db, 'jobcenter_users', user.uid);
        const snap = await getDoc(finalDocRef);
        
        if (!snap.exists()) {
          const q = query(collection(db, 'jobcenter_staff'), where('loginUserId', '==', user.uid), limit(1));
          const fallbackSnap = await getDocs(q);
          if (!fallbackSnap.empty) {
            finalDocRef = doc(db, 'jobcenter_staff', fallbackSnap.docs[0].id);
          } else {
            console.warn('[JobCenterLayout] No profile document found in jobcenter_users or jobcenter_staff');
            handleSignOut();
            return;
          }
        }

        unsub = onSnapshot(finalDocRef, (snap) => {
          if (!snap.exists()) {
            handleSignOut();
            return;
          }
          const data = snap.data();
          const dbRole = (data?.role || '').toLowerCase();
          const sessionRole = (user?.role || '').toLowerCase();
          const isDbStaff = dbRole === 'staff' || dbRole.includes('staff') || dbRole.includes('contract') || dbRole.includes('internee');
          const isSessionStaff = sessionRole === 'staff' || sessionRole.includes('staff') || sessionRole.includes('contract') || sessionRole.includes('internee');
          
          const rolesMatch = dbRole === sessionRole || (isDbStaff && isSessionStaff);

          if (data?.isActive === false || !rolesMatch) {
            handleSignOut();
            return;
          }
          if (data?.forceLogoutAt) {
            const logoutTime = new Date(data.forceLogoutAt).getTime();
            const loginTimeStr = localStorage.getItem('jobcenter_login_time');
            const loginTime = loginTimeStr ? parseInt(loginTimeStr) : 0;
            if (logoutTime > loginTime) {
              handleSignOut();
            }
          }
        }, (error) => {
          console.error('JobCenter session listener error:', error);
        });
      } catch (err) {
        console.error('Error setting up JobCenter snapshot listener:', err);
      }
    };

    setupListener();

    return () => {
      if (unsub) unsub();
    };
  }, [user, handleSignOut]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-orange-500/10 rounded-full" />
            <div className="absolute inset-0 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Initializing Grid</p>
        </div>
      </div>
    );
  }

  const role = user?.role as JobCenterRole;
  const rawRole = (user?.role || '').toLowerCase();
  const isStaff = rawRole === 'staff' || rawRole.includes('staff') || rawRole.includes('contract') || rawRole.includes('internee');
  const isSeeker = rawRole === 'seeker' || rawRole.includes('seeker') || rawRole.includes('family') || rawRole.includes('patient') || rawRole.includes('student') || rawRole.includes('child');
  const isSuperadmin = rawRole === 'superadmin';
  const isAdmin = rawRole === 'admin' || rawRole === 'manager';
  const displayRole = user?.role || '';

  const navItems = viewMode === 'dept'
    ? NAV_ITEMS.filter(item => {
        if (!user) return false;
        return item.roles.some(r => {
          const lowerR = r.toLowerCase();
          if (lowerR === 'staff') return isStaff;
          if (lowerR === 'seeker') return isSeeker;
          if (lowerR === 'superadmin') return isSuperadmin;
          if (lowerR === 'admin') return isAdmin;
          return lowerR === rawRole;
        });
      })
    : HQ_NAV_ITEMS;

  const SidebarContent = () => {
    const [portalOpen, setPortalOpen] = useState(false);

    return (
      <div className="flex flex-col h-full bg-white/50 backdrop-blur-xl border-r border-gray-200/50">
        {/* Header */}
        <div className="p-8 flex-shrink-0">
          <Link 
            href={viewMode === 'hq' ? "/hq/dashboard/superadmin" : "/"} 
            className="flex items-center gap-2 text-gray-400 hover:text-orange-500 text-[9px] font-black mb-8 transition-colors group uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
            {viewMode === 'hq' ? 'Back to HQ' : 'Exit Portal'}
          </Link>

          <div className="flex items-center gap-4 mb-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-2xl -rotate-3 transition-transform hover:rotate-0 duration-500 ${
              viewMode === 'hq' ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-gradient-to-br from-orange-400 to-red-600'
            }`}>
              {viewMode === 'hq' ? <Shield size={24} /> : <Briefcase size={24} />}
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight tracking-tight text-gray-900 uppercase">
                {viewMode === 'hq' ? 'HQ Link' : 'Job Center'}
              </h1>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {viewMode === 'hq' ? 'Nexus Central' : 'Workforce Node'}
              </p>
            </div>
          </div>

          {/* Portal Jumper */}
          {isHqAdmin && (
            <div className="relative mb-6">
              <button
                onClick={() => setPortalOpen(!portalOpen)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-orange-500/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink size={16} className="text-orange-500" />
                  <span className="text-[11px] font-black uppercase tracking-tight text-gray-950">Jump Portal</span>
                </div>
                <ChevronLeft size={16} className={`text-gray-400 transition-transform duration-300 ${portalOpen ? '-rotate-90 text-orange-500' : ''}`} />
              </button>

              {portalOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 z-50 rounded-[2rem] border border-gray-200/50 bg-white/90 backdrop-blur-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 overflow-hidden">
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(DEPT_INFO).map(([key, info]) => (
                      <Link
                        key={key}
                        href={info.adminUrl}
                        onClick={() => setPortalOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${
                          pathname.includes(key)
                            ? 'bg-orange-500/10 text-orange-600'
                            : 'text-gray-500 hover:text-black hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          pathname.includes(key) ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'bg-gray-100'
                        }`}>
                          {React.cloneElement(info.icon as React.ReactElement, { size: 14 })}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-tight">{info.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Mode Switcher */}
          {isHqAdmin && (
            <div className="flex p-1.5 bg-gray-100/50 rounded-2xl mb-8">
              <button
                onClick={() => setViewMode('dept')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'dept' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                DEPARTMENT
              </button>
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                  viewMode === 'hq' ? 'bg-white text-indigo-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                HEADQUARTERS
              </button>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-8 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-sm transition-all relative group overflow-hidden ${
                  isActive 
                    ? 'bg-gradient-to-r from-orange-500/10 to-transparent text-orange-600' 
                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50/50'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-orange-500 rounded-r-full shadow-[0_0_12px_rgba(249,115,22,0.5)]" />
                )}
                <div className={`transition-transform duration-500 group-hover:scale-110 ${isActive ? 'text-orange-500' : ''}`}>
                  {item.icon}
                </div>
                <span className="flex-1 font-black uppercase tracking-tight text-[11px]">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer User Section */}
        <div className="p-8 space-y-6 flex-shrink-0">
          <div className="flex items-center gap-4 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-900 to-black flex items-center justify-center text-white font-black text-sm shadow-xl">
              {user?.displayName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black truncate text-gray-900 uppercase tracking-tight">{user?.displayName}</p>
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                 <p className="text-[9px] font-bold text-gray-400 truncate tracking-[0.1em] uppercase">{role} node</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSignOut} 
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 text-[11px] font-black text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            DISCONNECT
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#FDFDFD] text-black transition-colors duration-500 font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 fixed left-0 top-0 h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xl z-40 lg:hidden animate-in fade-in duration-500" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-80 z-50 lg:hidden transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full shadow-none'
      } bg-white shadow-2xl`} font-sans>
        <button 
          onClick={() => setSidebarOpen(false)} 
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-black z-50 hover:rotate-90 transition-all"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen relative">
        {/* Background Decorative Circles */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 lg:bg-[#FDFDFD]/80 backdrop-blur-xl border-b border-gray-100 px-6 lg:px-12 py-4 lg:py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-black"
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:flex flex-col">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-400 leading-none">Workforce Hub</h2>
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-2">Central Job Terminal</p>
            </div>
            
            <div className="hidden lg:block h-8 w-px bg-gray-200" />

            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search workforce data..." 
                className="bg-gray-100/50 border border-transparent focus:border-orange-500/30 rounded-2xl pl-12 pr-6 py-2.5 text-xs font-medium w-80 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 lg:gap-8">
             {user?.uid && <StaffNotifications uid={user.uid} dept="job-center" />}
             
             <div className="hidden lg:block h-8 w-px bg-gray-200" />

             <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                   <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{user?.displayName}</p>
                   <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-500 text-[8px] font-black uppercase tracking-wider mt-1 border border-orange-500/20">
                      {role}
                   </span>
                </div>
                 <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center text-gray-900 font-black text-sm shadow-sm">
                   {user?.displayName?.[0]}
                </div>
             </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main className={`flex-1 p-6 lg:p-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="max-w-7xl mx-auto relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

