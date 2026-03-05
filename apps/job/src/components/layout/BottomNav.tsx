'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react';
import { useCategory } from '@/context/CategoryContext';
import { auth } from '@/lib/firebase/firebase-config';
import { useRouter } from 'next/navigation';

export function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { activeCategory } = useCategory();

    const navItems = [
        { label: 'Feed', icon: Home, href: '/feed' },
        { label: 'Explore', icon: Search, href: '/explore' },
        { label: 'Post', icon: PlusSquare, href: '/dashboard/upload-video', highlight: true },
        { label: 'Inbox', icon: MessageCircle, href: '/messages' },
        { label: 'Profile', icon: User, href: '/dashboard/profile' },
    ];

    const handleProfileClick = (e: React.MouseEvent, href: string) => {
        if (href === '/dashboard/profile' && !auth.currentUser) {
            e.preventDefault();
            router.push('/auth/register?from=profile');
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-[--border] px-6 py-2 pt-3 pb-8 md:pb-4 z-50">
            <div className="flex justify-between items-center max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={(e) => handleProfileClick(e, item.href)}
                            className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-white' : 'text-[--text-muted]'
                                } hover:text-white`}
                        >
                            <div className="relative">
                                <Icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : ''}`} style={{ color: isActive ? 'var(--accent)' : 'inherit' }} />
                                {isActive && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[--accent] blur-[2px] opacity-50" />
                                )}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
