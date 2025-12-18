import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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

  /* config options here */
  eslint: {
    // Ignore ESLint errors during production build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
