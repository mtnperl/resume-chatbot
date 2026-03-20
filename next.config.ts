import type { NextConfig } from "next";

const LUNIA_URL = "https://lunia-studio.vercel.app";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dash",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/luniastudio",
        destination: `${LUNIA_URL}/`,
      },
      {
        source: "/luniastudio/:path*",
        destination: `${LUNIA_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
