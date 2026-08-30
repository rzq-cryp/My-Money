import type { NextConfig } from 'next';
// @ts-ignore
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  // Matikan source maps agar file JS yang di-download browser jauh lebih ringan
  productionBrowserSourceMaps: false,
  experimental: {
    // Tree shaking otomatis untuk icon lucide-react agar tidak load semua icon
    optimizePackageImports: ['lucide-react'],
  },
};

export default withPWA(nextConfig);