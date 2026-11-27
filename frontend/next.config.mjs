/** @type {import('next').NextConfig} */
const rawBackend = process.env.BACKEND_API_URL || 'http://localhost:5000';
const cleanBackend = rawBackend
  .replace(/\/api\/:path\*$/, '')
  .replace(/\/api$/, '')
  .replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${cleanBackend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
