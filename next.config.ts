import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // CE.SDK boots a WebAssembly engine per mount; React's development double-mount would start two.
  reactStrictMode: false,
};

export default nextConfig;
