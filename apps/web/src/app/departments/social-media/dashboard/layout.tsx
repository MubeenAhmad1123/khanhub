// src/app/departments/social-media/dashboard/layout.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, CheckCircle, Heart, UserCog,
  Banknote, FileBarChart, CreditCard, CalendarDays, ClipboardCheck,
  User, LogOut, ArrowLeft, Menu, X, Shield, Sun, Moon,
  ChevronLeft, ExternalLink, Building2, GraduationCap, TrendingUp, Calculator, FileText, Monitor, Camera, Share2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NotificationRegister from '@/components/hq/NotificationRegister';

type MediaRole = 'admin' | 'staff' | 'manager' | 'superadmin';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: MediaRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/departments/social-media/dashboard/admin', icon: <LayoutDashboard size={16} />, roles: ['admin', 'manager', 'superadmin'] },
  { label: 'Staff Management', href: '/departments/social-media/dashboard/admin/staff', icon: <Users size={16} />, roles: ['admin', 'manager', 'superadmin'] },
  { label: 'Campaigns', href: '/departments/social-media/dashboard/admin/campaigns', icon: <Share2 size={16} />, roles: ['admin', 'manager', 'superadmin'] },
  { label: 'Content Log', href: '/departments/social-media/dashboard/admin/content', icon: <Camera size={16} />, roles: ['admin', 'manager', 'superadmin'] },
  { label: 'My Profile', href: '/departments/social-media/dashboard/profile', icon: <UserCog size={16} />, roles: ['admin', 'staff', 'manager', 'superadmin'] },
];

const ROLE_COLORS: Record<MediaRole, string> = {
  admin: 'bg-indigo-100 text-indigo-700',
  staff: 'bg-blue-100 text-blue-700',
  manager: 'bg-purple-100 text-purple-700',
  superadmin: 'bg-zinc-100 text-zinc-700',
};

const ROLE_LABELS: Record<MediaRole, string> = {
  admin: 'Admin',
  staff: 'Social Media Staff',
  manager: 'Media Manager',
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
  { label: 'Departments', href: '/hq/dashboard/superadmin/departments', icon: <Building2 size={16} /> },
  { label: 'Audit Log', href: '/hq/dashboard/superadmin/audit', icon: <FileText size={16} /> },
];

export default function SocialMediaDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<{
    role: MediaRole;
    displayName: string;
    customId: string;
    uid: string;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHqAdmin, setIsHqAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'dept' | 'hq'>('dept');

  const darkMode = mounted && resolvedTheme === 'dark';
  const toggleDark = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('media_session');
    router.push('/departments/social-media/login');
  }, [router]);

  useEffect(() => {
    setMounted(true);
    let session = localStorage.getItem('media_session');
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
          localStorage.setItem('media_session', JSON.stringify(syncSession));
          session = JSON.stringify(syncSession);
          setIsHqAdmin(true);
        }
      } catch (e) {}
    }

    if (!session) { 
      // check if it's the public media page, if so don't redirect
      if (pathname === '/media') return;
      router.push('/departments/social-media/login'); 
      return; 
    }

    try {
      const parsed = JSON.parse(session);
      setUser(parsed);
      setIsChecking(false);
    } catch (err) {
      handleSignOut();
    }
  }, [router, handleSignOut, pathname]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Loading Media Portal...</p>
        </div>
      </div>
    );
  }

  const role = user?.role as MediaRole;
  const navItems = viewMode === 'dept'
    ? NAV_ITEMS.filter(item => user && item.roles.includes(role))
    : HQ_NAV_ITEMS;

  const SidebarContent = () => {
    const [portalOpen, setPortalOpen] = useState(false);

    return (
      <div className="flex flex-col h-full bg-white text-black transition-colors duration-300">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 text-[10px] font-bold mb-4 transition-colors group uppercase tracking-widest">
            <ArrowLeft size={10} className="group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-indigo-600 shadow-indigo-100`}>
              <Monitor size={20} />
            </div>
            <div>
              <p className="font-black text-sm leading-none tracking-tight">Media Portal</p>
              <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Department</p>
            </div>
          </div>

          {isHqAdmin && (
            <div className="flex p-1 rounded-xl bg-gray-100 mb-4">
              <button
                onClick={() => setViewMode('dept')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black transition-all ${
                  viewMode === 'dept' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                DEPT
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

        <div className="px-6 py-4 border-b border-gray-100">
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
              {role ? ROLE_LABELS[role] : 'Staff'}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto font-bold">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all group ${
                  isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-gray-50 text-gray-500 hover:text-indigo-600'
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-white text-black transition-colors duration-300">
      <aside className="hidden lg:flex flex-col w-64 border-r fixed left-0 top-0 h-screen z-30 bg-white border-gray-100 transition-colors duration-300">
        <SidebarContent />
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed left-0 top-0 h-screen w-72 z-50 lg:hidden transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:bg-gray-100">
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
        <header className="lg:hidden sticky top-0 z-20 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between bg-white/80 border-gray-100">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400"><Menu size={20} /></button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><Monitor size={14} /></div>
            <span className="font-black text-sm">Media Portal</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${role ? ROLE_COLORS[role] : ''}`}>{role && ROLE_LABELS[role]}</span>
        </header>

        <header className="hidden lg:flex sticky top-0 z-20 backdrop-blur-md border-b px-8 py-4 items-center justify-between bg-white/80 border-gray-100">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Social Media Department Dashboard</div>
          <div className="flex items-center gap-3">
             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${role ? ROLE_COLORS[role] : ''}`}>{role && ROLE_LABELS[role]}</span>
             <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-black text-sm">{user?.displayName?.[0]}</div>
             <span className="text-sm font-bold">{user?.displayName}</span>
          </div>
        </header>

        <main className={`flex-1 p-4 lg:p-8 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="max-w-6xl mx-auto">{children}</div>
          {user?.uid && <NotificationRegister userId={user.uid} userName={user.displayName} />}
        </main>
      </div>
    </div>
  );
}
