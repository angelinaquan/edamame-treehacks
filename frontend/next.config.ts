import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  transpilePackages: [],
  webpack: (config) => {
    // Allow imports from backend/ directory
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@backend": path.join(__dirname, "..", "backend"),
    };
    return config;
  },
};

export default nextConfig;
