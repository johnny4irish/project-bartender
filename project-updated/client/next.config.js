/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
          : (process.env.NODE_ENV === 'production'
            ? 'https://project-bartender-production.up.railway.app/api/:path*'
            : 'http://localhost:5000/api/:path*'),
      },
    ]
  },
}

module.exports = nextConfig