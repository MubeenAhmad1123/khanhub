import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import EnterpriseNavbar from '@/components/layout/EnterpriseNavbar';
import EnterpriseFooter from '@/components/layout/EnterpriseFooter';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Khanhub Enterprise - Office & Business Solutions',
    description: 'Quality office equipment, furniture, and business supplies. New, imported, local, and budget products for businesses across Pakistan.',
    keywords: 'office equipment, furniture, business supplies, enterprise solutions, Pakistan',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthProviderWrapper>
                    <CartProvider>
                        <EnterpriseNavbar />
                        <main className="min-h-screen">{children}</main>
                        <EnterpriseFooter />
                    </CartProvider>
                </AuthProviderWrapper>
            </body>
        </html>
    );
}