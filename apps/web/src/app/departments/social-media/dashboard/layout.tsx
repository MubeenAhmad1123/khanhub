// src/app/departments/social-media/dashboard/layout.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, CheckCircle, Heart, UserCog,
  Banknote, FileBarChart, CreditCard, CalendarDays, ClipboardCheck,
  User, LogOut, ArrowLeft, Menu, X, Shield, Sun, Moon,
  ChevronLeft, ExternalLink, Building2, GraduationCap, TrendingUp, Calculator, FileText, Monitor, Camera, Share2, Search
} from 'lucide-react';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import StaffNotifications from '@/components/layout/StaffNotifications';
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
      <div className="min-h-screen bg-[#F0FBFF] dark:bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-cyan-600 dark:text-cyan-400 text-xs font-black uppercase tracking-[0.3em] animate-pulse">Broadcasting Node...</p>
        </div>
      </div>
    );
  }

  const role = user?.role as MediaRole;
  const navItems = viewMode === 'dept'
    ? NAV_ITEMS.filter(item => user && item.roles.includes(role))
    : HQ_NAV_ITEMS;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/50 dark:bg-black/50 backdrop-blur-xl border-r border-gray-200/50 dark:border-white/5">
      {/* Header */}
      <div className="p-8">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-cyan-500 text-[9px] font-black mb-8 transition-colors group uppercase tracking-[0.2em]">
          <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
          Home System
        </Link>

        <div className="flex items-center gap-4 mb-10">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-2xl -rotate-3 transition-transform hover:rotate-0 duration-500 ${
            viewMode === 'hq' ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-gradient-to-br from-cyan-400 to-blue-600'
          }`}>
            {viewMode === 'hq' ? <Shield size={24} /> : <Share2 size={24} />}
          </div>
          <div>
            <h1 className="font-black text-lg leading-tight tracking-tight dark:text-white uppercase">
              {viewMode === 'hq' ? 'HQ Link' : 'Media'}
            </h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              {viewMode === 'hq' ? 'Nexus Central' : 'Broadcast Node'}
            </p>
          </div>
        </div>

        {/* Navigation Mode Switcher */}
        {isHqAdmin && (
          <div className="flex p-1.5 bg-gray-100/50 dark:bg-white/5 rounded-2xl mb-8">
            <button
              onClick={() => setViewMode('dept')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                viewMode === 'dept' ? 'bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              DEPT
            </button>
            <button
              onClick={() => setViewMode('hq')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                viewMode === 'hq' ? 'bg-white dark:bg-white/10 text-indigo-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              HQ
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-sm transition-all relative group overflow-hidden ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-500/10 to-transparent text-cyan-600 dark:text-cyan-400' 
                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-500 rounded-r-full shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
                )}
                <div className={`transition-transform duration-500 group-hover:scale-110 ${isActive ? 'text-cyan-500' : ''}`}>
                  {item.icon}
                </div>
                <span className="flex-1 font-black uppercase tracking-tight text-[11px]">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Card */}
      <div className="mt-auto p-8 space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-900 to-black dark:from-white dark:to-gray-300 flex items-center justify-center text-white dark:text-black font-black text-sm shadow-xl">
            {user?.displayName?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black truncate dark:text-white uppercase tracking-tight">{user?.displayName}</p>
            <div className="flex items-center gap-2 mt-1">
               <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
               <p className="text-[9px] font-bold text-gray-400 truncate tracking-[0.1em] uppercase">{role} node</p>
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

  return (
    <div className="min-h-screen flex bg-[#FDFDFD] dark:bg-[#050505] text-black dark:text-white transition-colors duration-500 font-sans">
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
        {/* Decorative Background Circles */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 lg:bg-[#FDFDFD]/80 lg:dark:bg-[#050505]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-6 lg:px-12 py-4 lg:py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-black dark:text-white"
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:flex flex-col">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-400 leading-none">Broadcast Grid</h2>
              <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mt-2">Central Media Terminal</p>
            </div>
            
            <div className="hidden lg:block h-8 w-px bg-gray-200 dark:bg-white/10" />

            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-cyan-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search campaigns & content..." 
                className="bg-gray-100/50 dark:bg-white/5 border border-transparent focus:border-cyan-500/30 rounded-2xl pl-12 pr-6 py-2.5 text-xs font-medium w-80 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 lg:gap-8">
             {user?.uid && <StaffNotifications uid={user.uid} dept="social-media" />}
             
             <div className="hidden lg:block h-8 w-px bg-gray-200 dark:bg-white/10" />

             <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                   <p className="text-xs font-black dark:text-white uppercase tracking-tight">{user?.displayName}</p>
                   <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-500 text-[8px] font-black uppercase tracking-wider mt-1 border border-cyan-500/20">
                      {role}
                   </span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white font-black text-sm shadow-sm">
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
          {user?.uid && <NotificationRegister userId={user.uid} userName={user.displayName} />}
        </main>
      </div>
    </div>
  );
}
