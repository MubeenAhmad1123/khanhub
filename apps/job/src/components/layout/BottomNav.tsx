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
        { icon: Home, label: 'Feed', href: '/feed' },
        { icon: Search, label: 'Explore', href: '/explore' },
        { icon: PlusSquare, label: 'Post', href: '/dashboard/upload-video' },
        { icon: User, label: 'Profile', href: '/dashboard/profile', requiresAuth: true },
    ];

    const handleProfileClick = (e: React.MouseEvent, href: string) => {
        if (href === '/dashboard/profile' && !auth.currentUser) {
            e.preventDefault();
            router.push('/auth/register?from=profile');
        }
    };

    return (
        <nav
            className="flex md:hidden"
            style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid #E5E5E5',
                zIndex: 50,
                paddingBottom: 'env(safe-area-inset-bottom, 16px)',
            }}
        >
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                const handleClick = (e: React.MouseEvent) => {
                    if (item.requiresAuth && !auth.currentUser) {
                        e.preventDefault();
                        router.push('/auth/register?from=profile');
                    }
                };

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleClick}
                        style={{
                            flex: 1, padding: '10px 0',
                            background: 'none', border: 'none',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: 4,
                            cursor: 'pointer',
                            color: isActive ? 'var(--accent)' : '#AAAAAA',
                            transition: 'color 0.2s',
                        }}
                    >
                        <Icon size={item.label === 'Post' ? 28 : 22}
                            strokeWidth={item.label === 'Post' ? 2.5 : 1.5}
                            style={item.label === 'Post' ? {
                                background: 'linear-gradient(135deg, var(--accent), #7638FA)',
                                borderRadius: 8, padding: 2,
                                color: '#fff',
                            } : {}}
                        />
                        <span style={{ fontSize: 10, fontFamily: 'DM Sans', fontWeight: 600 }}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
