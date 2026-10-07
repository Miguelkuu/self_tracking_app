import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // node-ical's date library (temporal-polyfill) breaks when bundled, so it's
  // loaded with plain Node require instead.
  serverExternalPackages: ["node-ical"],
  experimental: {
    serverActions: {
      // CSV imports send the whole file to a Server Action; the default 1MB
      // fits a few months of bank exports, this leaves room for a full year.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
