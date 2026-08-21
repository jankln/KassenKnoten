import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server bundle for the Docker image (F17). Only enabled
  // during the image build, because `next start` cannot serve a standalone output.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Native module: it must stay outside the bundle and be required at runtime.
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
