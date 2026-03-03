'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Briefcase, PlusCircle, User, Search } from 'lucide-react';

const navItems = [
    { label: 'Feed', icon: Home, href: '/feed' },
    { label: 'Explore', icon: Search, href: '/explore' },
    { label: 'Upload', icon: PlusCircle, iconClass: 'text-[#FF0069]', href: '/dashboard/upload-video' },
    { label: 'Jobs', icon: Briefcase, href: '/jobs' },
    { label: 'Profile', icon: User, href: '/profile' },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-[#1F1F1F] px-6 py-3 pb-8 md:hidden z-50">
            <div className="flex justify-between items-center max-w-md mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-white' : 'text-[#888888]'
                                } hover:text-white`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'scale-110 text-[#FF0069]' : item.iconClass || ''}`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
