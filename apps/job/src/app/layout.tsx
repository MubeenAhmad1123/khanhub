import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import StructuredData from '@/components/seo/StructuredData';
import ClientLayout from '@/components/layout/ClientLayout';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
    subsets: ['latin'],
    display: 'swap', // Improve font loading performance
    preload: true,
});

import { constructMetadata } from '@/lib/seo/metadata';

export const metadata = constructMetadata();

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <StructuredData />
                <ClientLayout>{children}</ClientLayout>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}