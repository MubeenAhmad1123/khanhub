import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import EnterpriseNavbar from '@/components/layout/EnterpriseNavbar';
import EnterpriseFooter from '@/components/layout/EnterpriseFooter';
import '@/styles/globals.css';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Khanhub Enterprise - Office & Business Solutions',
    description: 'Quality office equipment, furniture, and business supplies. New, imported, local, and budget products for businesses across Pakistan.',
    keywords: 'office equipment, furniture, business supplies, enterprise solutions, Pakistan',
    icons: {
        icon: '/logo.webp',
        apple: '/logo.webp',
    },
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
                        <OrderProvider>
                            <EnterpriseNavbar />
                            <main className="min-h-screen">{children}</main>
                            <EnterpriseFooter />
                        </OrderProvider>
                    </CartProvider>
                </AuthProviderWrapper>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}