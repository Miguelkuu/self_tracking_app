import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // CSV imports send the whole file to a Server Action; the default 1MB
      // fits a few months of bank exports, this leaves room for a full year.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
