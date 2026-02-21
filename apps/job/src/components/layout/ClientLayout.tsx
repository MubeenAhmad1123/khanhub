'use client';

import ImprovedNavbar from '@/components/layout/ImprovedNavbar';
import Footer from '@/components/layout/Footer';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import LoginModal from '@/components/auth/LoginModal';

import { ToastProvider } from '@/components/ui/toast'; // Import ToastProvider

import { usePathname } from 'next/navigation';

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin');

    return (
        <AuthProviderWrapper>
            <ToastProvider>
                {!isAdminRoute && <ImprovedNavbar />}
                <LoginModal />
                <main>{children}</main>
                {!isAdminRoute && <Footer />}
            </ToastProvider>
        </AuthProviderWrapper>
    );
}
