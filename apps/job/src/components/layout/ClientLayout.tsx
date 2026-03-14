'use client';

import { TopBar } from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import { ToastProvider } from '@/components/ui/toast';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, PlusSquare, User } from 'lucide-react';

import { CategoryProvider } from '@/context/CategoryContext';
import ImprovedNavbar from '@/components/layout/ImprovedNavbar';
import HamburgerDrawer from '@/components/layout/HamburgerDrawer';
import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { FeedToastProvider } from '@/components/ui/FeedToast';
import { startProgress } from '@/components/layout/RouteProgressBar';

// Wrap non-critical layout components with next/dynamic
const DynamicBottomNav = dynamic(() => import('@/components/layout/BottomNav').then(mod => mod.default), { ssr: false });

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin');
    const isAuthRoute = pathname?.startsWith('/auth');

    // Show new navigation only on non-admin and non-auth pages (main app area)
    const hiddenRoutes = ['/feed']; // hide topbar on feed ONLY
    const isFeedRoute = hiddenRoutes.includes(pathname || '');
    const showNav = !isAdminRoute && !isAuthRoute;
    const showTopBar = showNav && !isFeedRoute;

    const [drawerOpen, setDrawerOpen] = useState(false);

    const router = useRouter();

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (let registration of registrations) {
                    registration.unregister();
                }
            }).catch(err => console.error('SW unregistration error:', err));
        }

        // Prefetch key routes for instant navigation
        router.prefetch('/feed')
        router.prefetch('/explore')
        router.prefetch('/saved')
        router.prefetch('/dashboard/profile')
        router.prefetch('/dashboard/upload-video')
    }, [router]);

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
                    {showTopBar && <ImprovedNavbar onMenuOpen={() => setDrawerOpen(true)} />}

                    {/* Desktop sidebar */}
                    {showNav && (
                        <aside className="hidden md:flex" style={{
                            position: 'fixed', left: 0, top: 0, bottom: 0,
                            width: 72, background: '#FFFFFF',
                            borderRight: '1px solid #E5E5E5',
                            flexDirection: 'column',
                            alignItems: 'center',
                            paddingTop: 20,
                            gap: 8,
                            zIndex: 40,
                        }}>
                            {/* Logo */}
                            <div style={{ fontFamily: 'Poppins', fontWeight: 900, fontSize: 14, color: '#0A0A0A', marginBottom: 16 }}>
                                <span style={{ color: 'var(--accent)' }}>J</span>R
                            </div>

                            {desktopNavItems.map(item => (
                                <button key={item.href} onClick={() => { startProgress(); router.push(item.href); }} style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: pathname === item.href ? '#F0F0F0' : 'none',
                                    border: pathname === item.href ? '1px solid var(--accent)' : '1px solid transparent',
                                    color: pathname === item.href ? 'var(--accent)' : '#888888',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}>
                                    <item.icon size={20} />
                                </button>
                            ))}
                        </aside>
                    )}

                    <main className={showNav ? 'pt-[58px] pb-28 md:pb-12 md:pl-[72px]' : ''}>
                        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
                            {children}
                        </Suspense>
                    </main>
                    {showNav && <DynamicBottomNav />}
                    <FeedToastProvider />

                    {/* HamburgerDrawer renders at root level, outside every sticky/transform container */}
                    <HamburgerDrawer
                        isOpen={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                    />
                </ToastProvider>
            </CategoryProvider>
        </AuthProviderWrapper>
    );
}

