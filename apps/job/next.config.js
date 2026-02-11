/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                pathname: '**',
            },
        ],
    },
    transpilePackages: ['@khanhub/auth', '@khanhub/shared-ui'],
    webpack: (config, { isServer }) => {
        if (!isServer) {
            // Don't attempt to load these server-only packages on the client
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                stream: false,
                crypto: false,
            };
        }
        return config;
    },
};

module.exports = nextConfig;
