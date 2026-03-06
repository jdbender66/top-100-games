import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "**.wikipedia.org" },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
