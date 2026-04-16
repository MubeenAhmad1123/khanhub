'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight,
  Bell,
  Search,
  Activity,
  UserCircle,
  ShieldCheck,
  ClipboardList,
  FileText,
  CreditCard,
  ShoppingBag
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { HospitalRole } from '@/types/hospital';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: HospitalRole[];
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Overview', href: '/departments/hospital/dashboard/admin', icon: LayoutDashboard, roles: ['admin'] },
  { title: 'SuperAdmin', href: '/departments/hospital/dashboard/superadmin', icon: ShieldCheck, roles: ['superadmin'] },
  { title: 'Transactions', href: '/departments/hospital/dashboard/admin/patients', icon: FileText, roles: ['admin'] },
  { title: 'My Duty', href: '/departments/hospital/dashboard/staff', icon: Activity, roles: ['staff'] },
  { title: 'Daily Report', href: '/departments/hospital/dashboard/staff/report', icon: ClipboardList, roles: ['staff'] },
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        // Verify user still exists and is active
        const userDoc = await getDoc(doc(db, 'hospital_users', parsed.uid));
        if (!userDoc.exists() || !userDoc.data().isActive) {
          handleSignOut();
          return;
        }

        setUser({ uid: userDoc.id, ...userDoc.data() });
      } catch (error) {
        console.error('Session check error:', error);
        router.push('/departments/hospital/login');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('hospital_session');
      localStorage.removeItem('hospital_login_time');
      router.push('/departments/hospital/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const filteredNavItems = NAV_ITEMS.filter(item => 
    user && item.roles.includes(user.role as HospitalRole)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Syncing Hospital Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">Hospital Portal</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      <div className="flex relative min-h-[calc(100-4rem)] lg:min-h-screen">
        {/* Sidebar Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-0 left-0 z-50
          w-72 h-screen bg-white border-r border-slate-200
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full">
            {/* Logo Section */}
            <div className="p-6 hidden lg:block">
              <div className="flex items-center gap-3 bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-900 leading-none">Hospital</h1>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">KhanHub Ecosystem</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
              <div className="mb-4">
                <p className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Main Menu</p>
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                        ${isActive 
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'}
                      `}
                    >
                      <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'group-hover:text-emerald-600'}`} />
                      <span className="font-medium">{item.title}</span>
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  );
                })}
              </div>

              {/* Quick Actions / Status */}
              <div className="pt-4 border-t border-slate-100">
                <p className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Account Status</p>
                <div className="mx-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${ROLE_COLORS[user?.role as HospitalRole || 'staff']}`}>
                      {(user?.role?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{user?.displayName}</p>
                      <p className="text-[10px] text-slate-500 font-medium capitalize">{user?.role} Portal</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-full" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">Active</span>
                  </div>
                </div>
              </div>
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-100 space-y-2">
              <Link 
                href="/departments/hospital/dashboard/settings"
                className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-xl transition-all"
              >
                <Settings className="w-5 h-5 text-slate-400" />
                <span className="font-medium">Settings</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          {/* Top Bar for Desktop */}
          <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/60">
            <div className="flex items-center gap-4 bg-slate-100/50 px-4 py-2 rounded-2xl border border-slate-200/50 w-96">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 font-medium"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="relative p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
              </button>
              
              <div className="h-8 w-[1px] bg-slate-200 mx-2" />
              
              <div className="flex items-center gap-3 pl-2">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{user?.displayName}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">{user?.role}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${ROLE_COLORS[user?.role as HospitalRole || 'staff']}`}>
                  {(user?.displayName?.[0] || 'U').toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
