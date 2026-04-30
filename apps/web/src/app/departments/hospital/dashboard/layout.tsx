'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Sun,
  Moon,
  PhoneCall,Search,
  LayoutDashboard, ShieldCheck, FileText, Activity, ClipboardList, UserCircle, Menu, X, LogOut, ChevronRight, GraduationCap, Heart, Building2, Shield, ArrowLeft, ExternalLink, Calculator, TrendingUp
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { HospitalRole } from '@/types/hospital';
import StaffNotifications from '@/components/layout/StaffNotifications';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: HospitalRole[];
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Overview', href: '/departments/hospital/dashboard/admin', icon: LayoutDashboard, roles: ['admin'] },
  { title: 'Leads & CRM', href: '/departments/hospital/dashboard/admin/leads', icon: PhoneCall, roles: ['admin'] },
  { title: 'SuperAdmin', href: '/departments/hospital/dashboard/superadmin', icon: ShieldCheck, roles: ['superadmin'] },
  { title: 'Transactions', href: '/departments/hospital/dashboard/admin/patients', icon: FileText, roles: ['admin'] },
  { title: 'My Duty', href: '/departments/hospital/dashboard/staff', icon: Activity, roles: ['staff'] },
  { title: 'Daily Report', href: '/departments/hospital/dashboard/staff/report', icon: ClipboardList, roles: ['staff'] },
  { title: 'My Profile', href: '/departments/hospital/dashboard/profile', icon: UserCircle, roles: ['admin', 'staff', 'superadmin'] },
  { title: 'My Hospital Profile', href: '/departments/hospital/dashboard/patient', icon: UserCircle, roles: ['family'] },
];

const ROLE_COLORS: Record<HospitalRole, string> = {
  admin: 'bg-emerald-500',
  staff: 'bg-blue-500',
  family: 'bg-purple-500',
  cashier: 'bg-orange-500',
  superadmin: 'bg-rose-500'
};

export default function HospitalDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('hospital_session');
      localStorage.removeItem('hospital_login_time');
      router.push('/departments/hospital/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [router]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionData = localStorage.getItem('hospital_session');
        const hqSession = localStorage.getItem('hq_session');

        if (!sessionData && hqSession) {
          const parsedHq = JSON.parse(hqSession);
          if (parsedHq.departmentCode === 'hospital') {
            const userDoc = await getDoc(doc(db, 'hospital_users', parsedHq.uid));
            if (userDoc.exists()) {
              const hospitalUser = {
                uid: parsedHq.uid,
                ...userDoc.data(),
                role: userDoc.data().role as HospitalRole
              };
              localStorage.setItem('hospital_session', JSON.stringify(hospitalUser));
              setUser(hospitalUser);
              setLoading(false);
              return;
            }
          }
        }

        if (!sessionData) {
          router.push('/departments/hospital/login');
          return;
        }

        const parsed = JSON.parse(sessionData);
        setUser(parsed);
      } catch (error) {
        console.error('Session check error:', error);
        router.push('/departments/hospital/login');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router, handleSignOut]);

  useEffect(() => {
    if (!user || !user.uid) return;
    if (user.role === 'superadmin') return;

    const unsub = onSnapshot(doc(db, 'hospital_users', user.uid), (snap) => {
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
        const loginTimeStr = localStorage.getItem('hospital_login_time');
        const loginTime = loginTimeStr ? parseInt(loginTimeStr) : 0;
        if (logoutTime > loginTime) {
          handleSignOut();
        }
      }
    });
    return () => unsub();
  }, [user, handleSignOut]);

  const filteredNavItems = NAV_ITEMS.filter(item => 
    user && item.roles.includes(user.role as HospitalRole)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F7FF] dark:bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-[0.3em] animate-pulse">Syncing Medical Node...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/50 dark:bg-black/50 backdrop-blur-xl border-r border-gray-200/50 dark:border-white/5">
      {/* Header */}
      <div className="p-8">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl -rotate-3 transition-transform hover:rotate-0 duration-500">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="font-black text-lg leading-tight tracking-tight dark:text-white uppercase">Hospital</h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Nexus Healthcare</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-sm transition-all relative group overflow-hidden ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-500/10 to-transparent text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                )}
                <div className={`transition-transform duration-500 group-hover:scale-110 ${isActive ? 'text-blue-500' : ''}`}>
                  <item.icon size={20} />
                </div>
                <span className="flex-1 font-black uppercase tracking-tight text-[11px]">{item.title}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-8 space-y-6">
        {/* User Card */}
        <div className="flex items-center gap-4 px-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-900 to-black dark:from-white dark:to-gray-300 flex items-center justify-center text-white dark:text-black font-black text-sm shadow-xl">
            {user?.displayName?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black truncate dark:text-white uppercase tracking-tight">{user?.displayName}</p>
            <div className="flex items-center gap-2 mt-1">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <p className="text-[9px] font-bold text-gray-400 truncate tracking-[0.1em] uppercase">{user?.role} node</p>
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

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xl z-40 lg:hidden animate-in fade-in duration-500" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-80 z-50 lg:hidden transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full shadow-none'
      } bg-white dark:bg-[#0A0A0A] shadow-2xl`}>
        <button 
          onClick={() => setIsSidebarOpen(false)} 
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-black dark:text-white z-50 hover:rotate-90 transition-all"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen relative">
        {/* Background Decorative Elements */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 lg:bg-[#FDFDFD]/80 lg:dark:bg-[#050505]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-6 lg:px-12 py-4 lg:py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-black dark:text-white"
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:flex flex-col">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-400 leading-none">Medical Grid</h2>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-2">Central Hospital Terminal</p>
            </div>
            
            <div className="hidden lg:block h-8 w-px bg-gray-200 dark:bg-white/10" />

            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search patient records..." 
                className="bg-gray-100/50 dark:bg-white/5 border border-transparent focus:border-blue-500/30 rounded-2xl pl-12 pr-6 py-2.5 text-xs font-medium w-80 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 lg:gap-8">
             {user?.uid && <StaffNotifications uid={user.uid} dept="hospital" />}
             
             <div className="hidden lg:block h-8 w-px bg-gray-200 dark:bg-white/10" />

             <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                   <p className="text-xs font-black dark:text-white uppercase tracking-tight">{user?.displayName}</p>
                   <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-wider mt-1 border border-blue-500/20">
                      {user?.role}
                   </span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white font-black text-sm shadow-sm">
                   {user?.displayName?.[0]}
                </div>
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 p-6 lg:p-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="max-max-7xl mx-auto relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
