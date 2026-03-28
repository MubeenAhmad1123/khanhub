'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, CheckCircle, Heart, UserCog,
  Banknote, FileBarChart, CreditCard, CalendarDays,
  User, LogOut, ArrowLeft, Menu, X, Shield, Bell, Activity, Sun, Moon
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type RehabRole = 'superadmin' | 'admin' | 'cashier' | 'staff' | 'family';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: RehabRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',        href: '/departments/rehab/dashboard/superadmin',          icon: <LayoutDashboard size={16}/>, roles: ['superadmin'] },
  { label: 'User Management', href: '/departments/rehab/dashboard/superadmin/users',     icon: <Users size={16}/>,           roles: ['superadmin'] },
  { label: 'Approvals',       href: '/departments/rehab/dashboard/superadmin/approvals', icon: <CheckCircle size={16}/>,     roles: ['superadmin'] },
  { label: 'Audit Log',       href: '/departments/rehab/dashboard/superadmin/audit',     icon: <Activity size={16}/>,        roles: ['superadmin'] },
  { label: 'Overview',        href: '/departments/rehab/dashboard/admin',                icon: <LayoutDashboard size={16}/>, roles: ['admin'] },
  { label: 'Patients',        href: '/departments/rehab/dashboard/admin/patients',       icon: <Heart size={16}/>,           roles: ['admin', 'superadmin'] },
  { label: 'Staff',           href: '/departments/rehab/dashboard/admin/staff',          icon: <UserCog size={16}/>,         roles: ['admin', 'superadmin'] },
  { label: 'Finance',         href: '/departments/rehab/dashboard/admin/finance',        icon: <Banknote size={16}/>,        roles: ['admin', 'superadmin'] },
  { label: 'Reports',         href: '/departments/rehab/dashboard/admin/reports',        icon: <FileBarChart size={16}/>,    roles: ['admin', 'superadmin'] },
  { label: 'Cashier Station', href: '/departments/rehab/dashboard/cashier',              icon: <CreditCard size={16}/>,      roles: ['cashier'] },
  { label: 'My Attendance',   href: '/departments/rehab/dashboard/staff',               icon: <CalendarDays size={16}/>,    roles: ['staff'] },
  { label: 'My Patient',      href: '/departments/rehab/dashboard/family',              icon: <User size={16}/>,            roles: ['family'] },
  { label: 'My Profile',      href: '/departments/rehab/dashboard/profile',             icon: <User size={16}/>,            roles: ['superadmin', 'admin', 'cashier', 'staff', 'family'] },
];

const ROLE_COLORS: Record<RehabRole, string> = {
  superadmin: 'bg-purple-100 text-purple-700',
  admin:      'bg-blue-100 text-blue-700',
  cashier:    'bg-amber-100 text-amber-700',
  staff:      'bg-teal-100 text-teal-700',
  family:     'bg-green-100 text-green-700',
};

const ROLE_LABELS: Record<RehabRole, string> = {
  superadmin: 'Super Admin',
  admin:      'Admin',
  cashier:    'Cashier',
  staff:      'Staff',
  family:     'Family',
};

export default function RehabDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<{ role: RehabRole; displayName: string; customId: string; uid: string; patientId?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('rehab_session');
    if (!session) { router.push('/departments/rehab/login'); return; }

    const performAuthCheck = async () => {
      try {
        const parsed = JSON.parse(session);
        if (!parsed.uid || !parsed.role) { throw new Error('Invalid session'); }

        // 1. Session Timeout Check (12 Hours)
        const loginTime = localStorage.getItem('rehab_login_time');
        if (loginTime) {
          const hoursElapsed = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60);
          if (hoursElapsed > 12) {
            handleSignOut();
            return;
          }
        }

        // 2. Background Verification (Role & Active Status)
        const userDoc = await getDoc(doc(db, 'rehab_users', parsed.uid));
        if (!userDoc.exists() || userDoc.data()?.isActive === false || userDoc.data()?.role !== parsed.role) {
          handleSignOut();
          return;
        }

        setUser(parsed);
        setIsChecking(false);
        setTimeout(() => setMounted(true), 50);
      } catch (err) {
        console.error('Auth check error:', err);
        handleSignOut();
      }
    };

    performAuthCheck();
    
    const saved = localStorage.getItem('rehab_dark_mode');
    if (saved === 'true') setDarkMode(true);
  }, [router]);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('rehab_dark_mode', String(next));
  };

  useEffect(() => {
    if (user?.role !== 'superadmin') return;

    const q = query(
      collection(db, 'rehab_transactions'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user?.role]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  const navItems = NAV_ITEMS.filter(item => user && item.roles.includes(user.role));
  const role = user?.role as RehabRole;

  const handleSignOut = () => {
    localStorage.removeItem('rehab_session');
    router.push('/departments/rehab/login');
  };

  const SidebarContent = () => (
    <div className={`flex flex-col h-full ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Logo + Back */}
      <div className={`px-6 pt-6 pb-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-teal-600 text-xs font-semibold mb-4 transition-colors group">
          <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
          Back to KhanHub
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-200">
            <Shield size={18} />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm leading-none">Rehab Portal</p>
            <p className="text-gray-400 text-[10px] font-semibold mt-0.5">KhanHub</p>
          </div>
        </div>
      </div>

      {/* User Role Badge */}
      <div className={`px-4 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-2xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center text-gray-600 font-black text-sm shadow-sm">
              {user?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{user?.displayName}</p>
                <p className="text-gray-400 text-[10px] font-mono truncate">{user?.customId}</p>
            </div>
          </div>
          <div className="mt-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${role ? ROLE_COLORS[role] : ''}`}>
              {role ? ROLE_LABELS[role] : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-200'
                  : darkMode
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-100 hover:translate-x-1'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 hover:translate-x-1'
              }`}
            >
              <span className={`transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
              <span>{item.label}</span>
              {item.href.includes('approvals') && pendingCount > 0 && user?.role === 'superadmin' ? (
                <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              ) : isActive ? (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className={`px-4 pb-6 pt-2 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <button
          onClick={toggleDark}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold mb-1 transition-all ${darkMode ? 'text-yellow-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-all group"
        >
          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col w-64 border-r fixed left-0 top-0 h-screen z-30 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed left-0 top-0 h-screen w-72 z-50 lg:hidden transform transition-transform duration-300 ease-out shadow-2xl ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center text-white">
              <Shield size={14} />
            </div>
            <span className="font-black text-gray-900 text-sm">Rehab Portal</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${role ? ROLE_COLORS[role] : ''}`}>
            {role ? ROLE_LABELS[role] : ''}
          </span>
        </header>

        {/* Desktop top bar */}
        <header className={`hidden lg:flex sticky top-0 z-20 backdrop-blur border-b px-8 py-4 items-center justify-between ${
          darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-100'
        }`}>
          <div className={`text-xs font-semibold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            KhanHub Rehab Portal
          </div>
          <div className="flex items-center gap-3">
            {role === 'superadmin' && pendingCount > 0 && (
              <div className="relative mr-2">
                <Bell size={18} className="text-gray-400" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              </div>
            )}
            <button onClick={toggleDark} className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-yellow-400 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'}`} title="Toggle dark mode">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${role ? ROLE_COLORS[role] : ''}`}>
              {role ? ROLE_LABELS[role] : ''}
            </span>
            <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-600 font-black text-sm">
              {user?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-gray-700 text-sm font-semibold">{user?.displayName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 p-4 lg:p-8 overflow-x-hidden transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
