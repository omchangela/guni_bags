import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/api/v1/docs/',
        permanent: false,
      },
      {
        source: '/api-docs',
        destination: '/api/v1/docs/',
        permanent: false,
      },
      {
        source: '/swagger',
        destination: '/api/v1/docs/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
