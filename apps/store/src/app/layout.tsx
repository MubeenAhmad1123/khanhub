import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import StoreNavbar from '@/components/layout/StoreNavbar';
import StoreFooter from '@/components/layout/StoreFooter';
import { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';
import { AuthProvider } from '@/context/AuthContext';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Khanhub Store - Medical & Enterprise Solutions',
    description: 'Quality surgical equipment and office supplies for professionals across Pakistan',
    keywords: 'surgical equipment, medical instruments, office supplies, Pakistan',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthProvider>
                    <CartProvider>
                        <OrderProvider>
                            <StoreNavbar />
                            <main className="min-h-screen">{children}</main>
                            <StoreFooter />
                        </OrderProvider>
                    </CartProvider>
                </AuthProvider>
            </body>
        </html>
    );
}