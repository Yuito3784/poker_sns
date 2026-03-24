import type { NextConfig } from "next";

/** Railway 等のバックエンド公開 URL（末尾スラッシュなし）。Vercel 本番のみ設定し /api を同一オリジンでプロキシする */
const backendProxy = process.env.BACKEND_PROXY_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Vercel manages its own build pipeline; standalone is only for Docker
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),

  /**
   * Vercel + Railway（方針 A）:
   * NEXT_PUBLIC_API_URL=https://自ドメイン/api とし、ブラウザは常に同一オリジンへ。
   * ここで /api/* を Railway のルートパスへ転送（Docker の nginx と同様に /api を剥がす）。
   */
  async rewrites() {
    if (!backendProxy) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${backendProxy}/:path*`,
      },
    ];
  },
};

export default nextConfig;

