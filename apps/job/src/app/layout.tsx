import type { Metadata } from 'next';
import { Poppins, DM_Sans, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import 'nprogress/nprogress.css';
import StructuredData from '@/components/seo/StructuredData';
import RouteProgressBar from '@/components/layout/RouteProgressBar';
import { Suspense } from 'react';
import ClientLayout from '@/components/layout/ClientLayout';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['600', '700', '800'],
    variable: '--font-poppins',
    display: 'swap',
});

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
    display: 'swap',
});

const jetbrains = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains',
    display: 'swap',
});

import { constructMetadata } from '@/lib/seo/metadata';
import type { Viewport } from 'next';

export const metadata = constructMetadata();

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${poppins.variable} ${dmSans.variable} ${jetbrains.variable}`}>
            <body style={{ background: '#fff', color: '#0A0A0A' }} className="antialiased">
                <Suspense fallback={null}>
                    <RouteProgressBar />
                </Suspense>
                <StructuredData />
                <ClientLayout>{children}</ClientLayout>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
