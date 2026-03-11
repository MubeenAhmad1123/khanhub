'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Plus, Bookmark, UserCircle2 } from 'lucide-react';
import { useCategory } from '@/context/CategoryContext';
import { auth } from '@/lib/firebase/firebase-config';
import { useRouter } from 'next/navigation';
import { startProgress } from '@/components/layout/RouteProgressBar';

export function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { activeCategory } = useCategory();

    const navItems = [
        { icon: Home, label: 'Home', href: '/feed' },
        { icon: Compass, label: 'Explore', href: '/explore' },
        { icon: Plus, label: 'Post', href: '/dashboard/upload-video', isSpecial: true },
        { icon: Bookmark, label: 'Saved', href: '/saved', requiresAuth: true },
        { icon: UserCircle2, label: 'Profile', href: '/dashboard/profile', requiresAuth: true },
    ];

    return (
        <nav
            className="flex md:hidden items-center"
            style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid #E5E5E5',
                zIndex: 50,
                paddingBottom: 'env(safe-area-inset-bottom, 8px)',
                height: '70px'
            }}
        >
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                const handleClick = (e: React.MouseEvent) => {
                    if (item.requiresAuth && !auth.currentUser) {
                        e.preventDefault();
                        startProgress();
                        router.push('/auth/register?from=' + item.label.toLowerCase());
                    } else {
                        // For standard links that don't trigger native route events reliably in App Router,
                        // we can start the bar manually on click.
                        startProgress();
                    }
                };

                if (item.isSpecial) {
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleClick}
                            className="flex-1 flex flex-col items-center justify-center -mt-4"
                        >
                            <div style={{
                                background: 'var(--accent)',
                                borderRadius: '16px',
                                width: '52px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '8px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                            }}>
                                <Plus size={24} color="#fff" strokeWidth={3} />
                            </div>
                            <span style={{ fontSize: 10, fontFamily: 'DM Sans', fontWeight: 700, color: '#0A0A0A' }}>
                                {item.label}
                            </span>
                        </Link>
                    );
                }

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleClick}
                        style={{
                            flex: 1, height: '100%',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: 4,
                            cursor: 'pointer',
                            color: isActive ? 'var(--accent)' : '#888888',
                            transition: 'color 0.2s',
                        }}
                    >
                        <Icon size={22}
                            strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span style={{ fontSize: 10, fontFamily: 'DM Sans', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--accent)' : '#888888' }}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
