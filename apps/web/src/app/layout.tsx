// layout.tsx - Viewport Configuration for Mobile Optimization
// Add this to your root layout file to fix mobile zoom issues

import type { Metadata, Viewport } from 'next'

// Viewport configuration - CRITICAL for mobile responsiveness
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevents zoom on iOS when focusing inputs
  userScalable: false, // Prevents pinch-to-zoom
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#005EB8' },
    { media: '(prefers-color-scheme: dark)', color: '#005EB8' }
  ]
}

// SEO Metadata - Comprehensive configuration
export const metadata: Metadata = {
  metadataBase: new URL('https://khanhub.com.pk'),

  title: {
    default: 'Khan Hub - Empowering Lives Through Care | Pakistan\'s Leading Welfare Organization',
    template: '%s | Khan Hub'
  },

  description: 'Leading Pakistan\'s social welfare transformation with 16+ specialized departments dedicated to healthcare, education, and community development. Serving 50,000+ lives across Pakistan.',

  keywords: [
    'Khan Hub',
    'Pakistan welfare',
    'healthcare Pakistan',
    'education Pakistan',
    'social services',
    'NGO Pakistan',
    'charity Pakistan',
    'community development',
    'emergency services Pakistan',
    'medical assistance Pakistan'
  ],

  authors: [{ name: 'Khan Hub', url: 'https://khanhub.com.pk' }],

  creator: 'Khan Hub',
  publisher: 'Khan Hub',

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: 'https://khanhub.com.pk',
    siteName: 'Khan Hub',
    title: 'Khan Hub - Empowering Lives Through Care',
    description: 'Leading Pakistan\'s social welfare transformation with 16+ specialized departments',
    images: [
      {
        url: '/og-image.jpg', // Create this image: 1200x630px
        width: 1200,
        height: 630,
        alt: 'Khan Hub - Pakistan\'s Leading Welfare Organization',
      }
    ],
  },
  icons: {
    icon: '/logo.webp',
    apple: '/logo.webp',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Khan Hub - Empowering Lives Through Care',
    description: 'Leading Pakistan\'s social welfare transformation',
    images: ['/twitter-image.jpg'], // Create this: 1200x600px
    creator: '@khanhub',
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
      'ur-PK': 'https://khanhub.com.pk/ur',
    },
  },

  verification: {
    google: 'your-google-verification-code', // Add your verification code
    yandex: 'your-yandex-verification-code',
    other: {
      'facebook-domain-verification': 'your-fb-verification-code'
    }
  },

  category: 'nonprofit',

  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  }
}

import { Sora, DM_Sans } from 'next/font/google'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'
import SocialMediaSidebar from '@/components/SocialMediaSidebar'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable}`}>
      <body className="antialiased selection:bg-primary-100 selection:text-primary-900">
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <SocialMediaSidebar />
        <Footer />
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}

// Additional Performance Optimizations

// 1. Font Optimization
export const fontConfig = {
  inter: {
    preload: true,
    display: 'swap',
    fallback: ['system-ui', 'arial']
  },
  plusJakarta: {
    preload: true,
    display: 'swap',
    fallback: ['system-ui', 'arial']
  }
}

// 2. Image Optimization Settings
export const imageConfig = {
  domains: ['khanhub.com.pk'],
  formats: ['image/webp', 'image/avif'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60,
}

// 3. PWA Configuration (optional)
export const pwaConfig = {
  name: 'Khan Hub',
  short_name: 'KhanHub',
  description: 'Pakistan\'s Leading Welfare Organization',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#005EB8',
  orientation: 'portrait-primary',
  icons: [
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable'
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    }
  ]
}

// 4. Security Headers (add to next.config.js)
export const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]