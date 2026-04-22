import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import ConditionalShell from '@/components/layout/ConditionalShell'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

// ─── Viewport ────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#005EB8' },
    { media: '(prefers-color-scheme: dark)', color: '#005EB8' },
  ],
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL('https://khanhub.com.pk'),

  title: {
    default: "Khan Hub - Empowering Lives Through Care | Pakistan's Leading Welfare Organization",
    template: '%s | Khan Hub',
  },

  description:
    "Leading Pakistan's social welfare transformation with 16+ specialized departments dedicated to healthcare, education, and community development. Serving 50,000+ lives across Pakistan.",

  keywords: [
    'Khan Hub',
    'Khan Hub',
    'Pakistan welfare',
    'healthcare Pakistan',
    'education Pakistan',
    'social services',
    'NGO Pakistan',
    'charity Pakistan',
    'community development',
    'emergency services Pakistan',
    'medical assistance Pakistan',
  ],

  authors: [{ name: 'Khan Hub', url: 'https://khanhub.com.pk' }],
  creator: 'Khan Hub',
  publisher: 'Khan Hub',

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // ✅ PWA Manifest — this is what makes the APK work
  manifest: '/manifest.json',

  // ✅ App Icons — PNG files you generate from your logo-circle.webp
  icons: {
    icon: [
      { url: '/icons/icon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icons/icon-96x96.png',
  },

  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: 'https://khanhub.com.pk',
    siteName: 'Khan Hub',
    title: 'Khan Hub - Empowering Lives Through Care',
    description: "Leading Pakistan's social welfare transformation with 16+ specialized departments",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: "Khan Hub - Pakistan's Leading Welfare Organization",
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Khan Hub - Empowering Lives Through Care',
    description: "Leading Pakistan's social welfare transformation",
    images: ['/twitter-image.jpg'],
    creator: '@Khan Hub',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  alternates: {
    canonical: 'https://khanhub.com.pk',
    languages: {
      'en-PK': 'https://khanhub.com.pk',
    },
  },

  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    other: {
      'facebook-domain-verification': 'your-fb-verification-code',
    },
  },

  category: 'nonprofit',

  // ✅ PWA / installable app meta tags
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'Khan Hub',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'application-name': 'Khan Hub',
    'msapplication-TileColor': '#005EB8',
    'msapplication-TileImage': '/icons/icon-144x144.png',
  },
}



// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased selection:bg-primary-100 selection:text-primary-900">
        <ThemeProvider
          attribute="class"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <ConditionalShell>
            {children}
          </ConditionalShell>
          <Toaster position="bottom-right" />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
