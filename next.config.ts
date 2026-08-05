import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root: this repo is checked out under a symlinked
    // path, and a stray package-lock.json above it confuses root inference.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
