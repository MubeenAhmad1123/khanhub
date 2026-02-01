// src/app/layout.tsx
// ─────────────────────────────────────────────
// Root layout. Wraps EVERY page.
// Loads global CSS, Navbar, and Footer.
// ─────────────────────────────────────────────

import type { Metadata, ReactNode } from 'next';
import '@/styles/globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { SITE } from '@/data/site';

export const metadata: Metadata = {
  title:       `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  metadataBase: new URL(SITE.url),
  openGraph: {
    title:       `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url:         SITE.url,
    siteName:    SITE.name,
    type:        'website',
    locale:      'en_PK',
  },
  twitter: {
    card:        'summary_large_image',
    title:       `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  icons: {
    icon: '/icons/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
