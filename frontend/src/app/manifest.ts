import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poker SNS",
    short_name: "PokerSNS",
    description: "ポーカーハンドを共有・議論できるSNS。プレイを振り返り、戦略を磨こう。",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1009",
    theme_color: "#0d1009",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
