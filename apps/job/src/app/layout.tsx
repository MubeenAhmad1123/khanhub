import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import ImprovedNavbar from '@/components/layout/ImprovedNavbar';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'KhanHub - Pakistan\'s #1 Job Portal',
    description: 'Find your dream job in Pakistan. AI-powered job matching, verified employers, and instant applications.',
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
                    <ImprovedNavbar />
                    <main>{children}</main>
                </AuthProviderWrapper>
            </body>
        </html>
    );
}