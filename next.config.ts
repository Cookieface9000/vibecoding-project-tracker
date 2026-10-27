import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Keep visited pages in the browser for a minute, so going back to one is instant
    // instead of re-running its database queries. Our own changes still refresh straight
    // away (server actions revalidate), and an open board polls every 15 s.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
