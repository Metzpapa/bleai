import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for video/audio uploads (default is 4.5MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
