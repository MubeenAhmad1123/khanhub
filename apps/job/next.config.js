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
    ],
    formats: ['image/webp'],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig;
