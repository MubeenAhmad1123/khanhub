/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
    formats: ['image/webp'],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://khanhub-5e552.firebaseapp.com/__/auth/:path*',
      },
      {
        source: '/__/firebase/:path*',
        destination: 'https://khanhub-5e552.firebaseapp.com/__/firebase/:path*',
      },
    ];
  },
  // ✅ COOP/COEP headers removed — they break Google OAuth popups.
  // COOP: same-origin isolates the popup window, preventing Firebase from
  // receiving the OAuth callback, causing auth/popup-closed-by-user.
};

module.exports = nextConfig;