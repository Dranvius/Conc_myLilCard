import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@respira/shared'],
  async rewrites() {
    // En el servidor (SSR/RSC) se usa la URL interna; en browser, el proxy Next.js
    // ya resuelve hacia esta URL. El cliente nunca hace fetch cross-origin.
    const apiUrl =
      process.env.INTERNAL_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:4000';
    return [
      {
        source: '/backend/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
