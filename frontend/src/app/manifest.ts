import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PokerTALK",
    short_name: "PokerTALK",
    description: "セッション帰りに今日のハンドを語る。ライブポーカープレイヤーのためのSNS。",
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
