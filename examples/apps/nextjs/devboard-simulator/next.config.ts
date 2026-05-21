import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../..'),
  async rewrites() {
    return [
      { source: '/openapi.yaml', destination: '/api/openapi.yaml' },
      { source: '/api/api/:path*', destination: '/api/:path*' },
    ];
  },
};

export default nextConfig;
