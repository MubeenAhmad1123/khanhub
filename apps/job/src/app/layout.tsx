import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import ImprovedNavbar from '@/components/layout/ImprovedNavbar';
import Footer from '@/components/layout/Footer';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import StructuredData from '@/components/seo/StructuredData';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap', // Improve font loading performance
    preload: true,
});

export const metadata: Metadata = {
    title: {
        default: 'KhanHub Jobs | Pakistan\'s #1 Job Portal',
        template: '%s | KhanHub Jobs'
    },
    description: 'Find your dream job in Pakistan. AI-powered job matching, verified employers, and instant applications.',
    keywords: ['jobs', 'pakistan', 'careers', 'hiring', 'employment', 'khanhub'],
    authors: [{ name: 'KhanHub Team' }],
    creator: 'KhanHub',
    publisher: 'KhanHub',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL('https://jobs.khanhub.com'),
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: 'KhanHub Jobs',
        description: 'Find your dream career or hire top talent in Pakistan.',
        url: 'https://jobs.khanhub.com',
        siteName: 'KhanHub Jobs',
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'KhanHub Jobs',
        description: 'Find your dream career or hire top talent in Pakistan.',
    },
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
                <StructuredData />
                <AuthProviderWrapper>
                    <ImprovedNavbar />
                    <main>{children}</main>
                    <Footer />
                </AuthProviderWrapper>
            </body>
        </html>
    );
}