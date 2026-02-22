import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import SurgicalNavbar from '@/components/layout/SurgicalNavbar';
import SurgicalFooter from '@/components/layout/SurgicalFooter';
import { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import '@/styles/globals.css';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Khanhub Surgical - Medical & Enterprise Solutions',
    description: 'Quality surgical equipment and office supplies for professionals across Pakistan',
    keywords: 'surgical equipment, medical instruments, office supplies, Pakistan',
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
                            <SurgicalNavbar />
                            <main className="min-h-screen">{children}</main>
                            <SurgicalFooter />
                        </OrderProvider>
                    </CartProvider>
                </AuthProviderWrapper>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}