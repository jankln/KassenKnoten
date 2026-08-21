import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server bundle for the Docker image (F17). Only enabled
  // during the image build, because `next start` cannot serve a standalone output.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Native module: it must stay outside the bundle and be required at runtime.
  serverExternalPackages: ["better-sqlite3"],
  // The migrator opens these by a path assembled at runtime, so nothing imports them and
  // file tracing cannot see them. Without this the image starts happily and then fails
  // on its first database access, which is the worst possible time to find out.
  outputFileTracingIncludes: {
    "/*": ["db/migrations/**/*"],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
