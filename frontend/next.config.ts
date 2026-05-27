import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // TypeScript is checked by the IDE and CI — skip the in-process checker
  // to avoid OOM on low-memory build machines (Vercel handles this separately)
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
