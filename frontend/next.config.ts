import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel manages its own build pipeline; standalone is only for Docker
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
};

export default nextConfig;

