/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    turbopack: false,
  },
  // Enable static export if deploying to static hosts
  // output: 'export',
}

module.exports = nextConfig
