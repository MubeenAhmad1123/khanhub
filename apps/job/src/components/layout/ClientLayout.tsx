'use client';

import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import { ToastProvider } from '@/components/ui/toast';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, PlusSquare, User } from 'lucide-react';

import { CategoryProvider } from '@/context/CategoryContext';

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin');
    const isAuthRoute = pathname?.startsWith('/auth');

    // Show new navigation only on non-admin and non-auth pages (main app area)
    const showNav = !isAdminRoute && !isAuthRoute;

    const router = useRouter();

    const desktopNavItems = [
        { icon: Home, href: '/feed' },
        { icon: Search, href: '/explore' },
        { icon: PlusSquare, href: '/dashboard/upload-video' },
        { icon: User, href: '/dashboard/profile' },
    ];

    return (
        <AuthProviderWrapper>
            <CategoryProvider>
                <ToastProvider>
                    {showNav && <TopBar />}

                    {/* Desktop sidebar */}
                    {showNav && (
                        <aside className="hidden md:flex" style={{
                            position: 'fixed', left: 0, top: 0, bottom: 0,
                            width: 72, background: '#000',
                            borderRight: '1px solid #111',
                            flexDirection: 'column',
                            alignItems: 'center',
                            paddingTop: 20,
                            gap: 8,
                            zIndex: 40,
                        }}>
                            {/* Logo */}
                            <div style={{ fontFamily: 'Syne', fontWeight: 900, fontSize: 14, color: '#fff', marginBottom: 16 }}>
                                <span style={{ color: 'var(--accent)' }}>J</span>R
                            </div>

                            {desktopNavItems.map(item => (
                                <button key={item.href} onClick={() => router.push(item.href)} style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: pathname === item.href ? '#1A1A1A' : 'none',
                                    border: pathname === item.href ? '1px solid var(--accent)' : '1px solid transparent',
                                    color: pathname === item.href ? 'var(--accent)' : '#555',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}>
                                    <item.icon size={20} />
                                </button>
                            ))}
                        </aside>
                    )}

                    <main className={showNav ? 'pt-20 pb-28 md:pb-12 md:pl-[72px]' : ''}>
                        {children}
                    </main>
                    {showNav && <BottomNav />}
                </ToastProvider>
            </CategoryProvider>
        </AuthProviderWrapper>
    );
}

