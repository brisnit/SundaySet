import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Chord chart PDFs. The default is 1MB, which rejects most real scans.
      bodySizeLimit: "8mb",
    },
  },
  /* config options here */
};

export default nextConfig;
