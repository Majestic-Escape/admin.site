import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The admin is an internal tool: its thumbnails and photo galleries are
    // served straight from Spaces. Vercel image transformations are a shared
    // account quota; the admin was spending it (and, once exhausted, every
    // uncached admin image answered 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "majestic-escape-host-properties.blr1.digitaloceanspaces.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname:
          "majestic-escape-host-properties.blr1.cdn.digitaloceanspaces.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3-media0.fl.yelpcdn.com",
        pathname: "/**",
      },

      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
    ],
  },

  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL || "http://localhost:5005/api/v1";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },

  /* config options here */
  eslint: {
    // Ignore ESLint errors during production build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
