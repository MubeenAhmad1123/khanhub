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
      <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-black text-xs font-black uppercase tracking-widest animate-pulse">Loading Media Portal...</p>
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
      <div className="flex flex-col h-full bg-[#FCFBF8] text-black">
        <div className="px-6 pt-6 pb-4 border-b-2 border-black bg-white">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 text-[10px] font-bold mb-4 transition-colors group uppercase tracking-widest">
            <ArrowLeft size={10} className="group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 border-2 border-black flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-indigo-600`}>
              <Monitor size={20} />
            </div>
            <div>
              <p className="font-black text-sm leading-none tracking-tight">Media Portal</p>
              <p className="text-black/50 text-[10px] font-black mt-1 uppercase tracking-widest italic">Department</p>
            </div>
          </div>

          {isHqAdmin && (
            <div className="flex p-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
              <button
                onClick={() => setViewMode('dept')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black transition-all ${
                  viewMode === 'dept' ? 'bg-black text-white' : 'text-black/40 hover:text-black'
                }`}
              >
                DEPT
              </button>
              <button
                onClick={() => setViewMode('hq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black transition-all ${
                  viewMode === 'hq' ? 'bg-black text-white' : 'text-black/40 hover:text-black'
                }`}
              >
                HQ
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-b-2 border-black bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center text-black font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {user?.displayName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-black truncate">{user?.displayName}</p>
              <p className="text-[10px] font-black text-black/40 truncate tracking-widest">{user?.customId}</p>
            </div>
          </div>
          <div className="mt-3 flex">
            <span className={`px-2.5 py-0.5 border border-black text-[9px] font-black uppercase tracking-wider ${role ? ROLE_COLORS[role] : ''} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
              {role ? ROLE_LABELS[role] : 'Staff'}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar font-black">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 border-2 text-sm transition-all group ${
                  isActive ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-1' : 'hover:bg-white text-black/50 border-transparent hover:border-black hover:text-black'
                }`}
              >
                {item.icon}
                <span className="flex-1 uppercase tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t-2 border-black bg-white">
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-black bg-white text-sm font-black text-red-500 hover:bg-red-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
            <LogOut size={16} />
            SIGN OUT
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#FCFBF8] text-black">
      <aside className="hidden lg:flex flex-col w-64 border-r-2 border-black fixed left-0 top-0 h-screen z-30 bg-[#FCFBF8]">
        <SidebarContent />
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed left-0 top-0 h-screen w-72 z-50 lg:hidden transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-[#FCFBF8] border-r-2 border-black`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 text-black border border-black z-50 bg-white">
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-[#FCFBF8] border-b-2 border-black px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-black border border-black bg-white"><Menu size={20} /></button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><Monitor size={14} /></div>
            <span className="font-black text-sm uppercase tracking-tighter">Media Portal</span>
          </div>
          <span className={`px-2 py-0.5 border border-black text-[9px] font-black uppercase ${role ? ROLE_COLORS[role] : ''} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>{role && ROLE_LABELS[role]}</span>
        </header>

        <header className="hidden lg:flex sticky top-0 z-20 bg-[#FCFBF8]/80 backdrop-blur-md border-b-2 border-black px-8 py-4 items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-black">Social Media Department Dashboard</div>
          <div className="flex items-center gap-3">
             {user?.uid && <StaffNotifications uid={user.uid} dept="social-media" />}
             <span className={`px-3 py-1 border border-black text-[10px] font-black uppercase tracking-wider ${role ? ROLE_COLORS[role] : ''} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>{role && ROLE_LABELS[role]}</span>
             <div className="w-8 h-8 border-2 border-black flex items-center justify-center text-black font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">{user?.displayName?.[0]}</div>
             <span className="text-sm font-black uppercase tracking-tight">{user?.displayName}</span>
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
