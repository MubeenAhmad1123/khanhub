'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Monitor, 
  Share2,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

interface SidebarItemProps {
  href: string;
  icon: any;
  label: string;
  active: boolean;
}

function SidebarItem({ href, icon: Icon, label, active }: SidebarItemProps) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        active 
          ? 'bg-black text-white shadow-lg shadow-black/10' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-black'
      }`}
    >
      <Icon size={20} className={active ? 'text-white' : 'text-gray-400 group-hover:text-black'} />
      <span className="font-bold text-sm uppercase tracking-wider">{label}</span>
    </Link>
  );
}

export default function ItDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/departments/it/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/departments/it/dashboard/staff', icon: Users, label: 'Staff' },
    { href: '/departments/it/dashboard/social-media', icon: Share2, label: 'Social Media' },
    { href: '/departments/it/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-gray-100 flex-col sticky top-0 h-screen">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center transition-transform group-hover:scale-105">
              <Monitor size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tighter text-black">IT <span className="text-gray-400">DEPT</span></span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Management</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <SidebarItem 
              key={item.href}
              {...item}
              active={pathname === item.href}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => {
              localStorage.removeItem('it_session');
              localStorage.removeItem('mediacenter_session');
              window.location.href = '/auth/signin';
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-bold text-sm uppercase tracking-wider"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor size={20} className="text-black" />
          <span className="font-black text-lg tracking-tighter">IT DEPT</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <nav className="space-y-4 mt-12">
              {navItems.map((item) => (
                <SidebarItem 
                  key={item.href}
                  {...item}
                  active={pathname === item.href}
                />
              ))}
              <hr className="border-gray-100 my-6" />
              <button 
                onClick={() => {
                  localStorage.removeItem('it_session');
                  localStorage.removeItem('mediacenter_session');
                  window.location.href = '/auth/signin';
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-bold text-sm uppercase tracking-wider"
              >
                <LogOut size={20} />
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
