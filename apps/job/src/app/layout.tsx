import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import JobNavbar from '@/components/layout/JobNavbar';
import JobFooter from '@/components/layout/JobFooter';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Khanhub Jobs - Find Your Dream Career in Pakistan',
    description: 'Pakistan\'s leading job portal connecting talented professionals with top companies',
    keywords: 'jobs pakistan, careers, employment, job search, hiring',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen flex flex-col`}>
                <AuthProviderWrapper>
                    <JobNavbar />
                    <main className="flex-grow flex flex-col">{children}</main>
                    <JobFooter />
                </AuthProviderWrapper>
            </body>
        </html>
    );
}