'use client';

import ImprovedNavbar from '@/components/layout/ImprovedNavbar';
import Footer from '@/components/layout/Footer';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import LoginModal from '@/components/auth/LoginModal';

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProviderWrapper>
            <ImprovedNavbar />
            <LoginModal />
            <main>{children}</main>
            <Footer />
        </AuthProviderWrapper>
    );
}
