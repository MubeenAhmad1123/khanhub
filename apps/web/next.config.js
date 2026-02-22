/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebaseio.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async redirects() {
    return [
      { source: '/contact.php', destination: '/contact', permanent: true },
      { source: '/about.php', destination: '/about', permanent: true },
      { source: '/media.php', destination: '/media', permanent: true },
      // Mapping department IDs 
      {
        source: '/departments_details.php',
        has: [{ type: 'query', key: 'id', value: '3' }],
        destination: '/departments/education',
        permanent: true,
      },
      {
        source: '/departments_details.php',
        has: [{ type: 'query', key: 'id', value: '5' }],
        destination: '/departments/job-placement',
        permanent: true,
      },
      {
        source: '/departments_details.php',
        has: [{ type: 'query', key: 'id', value: '9' }],
        destination: '/departments/surgical-services',
        permanent: true,
      },
      {
        source: '/departments_details.php',
        has: [{ type: 'query', key: 'id', value: '12' }],
        destination: '/departments/tourism',
        permanent: true,
      },
      {
        source: '/departments_details.php',
        has: [{ type: 'query', key: 'id', value: '15' }],
        destination: '/departments/institute-health-sciences',
        permanent: true,
      },
      {
        source: '/departments_details.php',
        has: [{ type: 'query', key: 'id', value: '16' }],
        destination: '/departments',
        permanent: true,
      },
      // Fallback for departments_details.php without matching ID
      { source: '/departments_details.php', destination: '/departments', permanent: true },
    ];
  },
};

module.exports = nextConfig;
