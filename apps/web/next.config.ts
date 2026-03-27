import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@nexus/db', '@nexus/types'],
};

export default nextConfig;
