'use client';

import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import { ToastProvider } from '@/components/ui/toast';
import { usePathname } from 'next/navigation';

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

    return (
        <AuthProviderWrapper>
            <CategoryProvider>
                <ToastProvider>
                    {showNav && <TopBar />}
                    <main className={showNav ? 'pt-20 pb-28 md:pb-12' : ''}>
                        {children}
                    </main>
                    {showNav && <BottomNav />}
                </ToastProvider>
            </CategoryProvider>
        </AuthProviderWrapper>
    );
}

