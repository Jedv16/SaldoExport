import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Turbopack resolves modules from this package directory
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
