'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Search, 
  Bookmark, 
  User, 
  PlusSquare, 
  LogOut, 
  X,
  ChevronRight
} from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

const MENU_ITEMS = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Explore', icon: Search, href: '/explore' },
  { label: 'Saved', icon: Bookmark, href: '/saved' },
  { label: 'Profile', icon: User, href: '/profile/me' },
  { label: 'Upload Video', icon: PlusSquare, href: '/upload' },
];

export default function HamburgerDrawer({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      onClose();
      router.push('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[280px] bg-white z-[101] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-bottom border-slate-100">
              <span className="text-xl font-black italic tracking-tighter uppercase text-[--accent]">
                KHAN HUB
              </span>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {MENU_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href === '/profile/me' && pathname.startsWith('/profile'));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-all group ${
                      isActive 
                        ? 'bg-[#FFF5F8] text-[#FF0069] border border-[#FFE0EB]' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                      <span className={`font-poppins text-[15px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight size={18} className={`${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'} transition-opacity`} />
                  </Link>
                );
              })}
            </div>

            {/* Footer / Logout */}
            <div className="p-6 border-t border-slate-100">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-4 w-full p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-colors font-poppins font-bold"
              >
                <LogOut size={22} />
                <span>Sign Out</span>
              </button>
              <p className="mt-4 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Khan Hub v2.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
