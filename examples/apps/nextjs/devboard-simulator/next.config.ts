import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/openapi.yaml', destination: '/api/openapi.yaml' },
      { source: '/api/api/:path*', destination: '/api/:path*' },
    ];
  },
};

export default nextConfig;
