"use client";

import type { Ad } from "../../lib/types";

type Props = {
  ad: Ad;
};

export default function AdCard({ ad }: Props) {
  const handleClick = () => {
    if (typeof window !== "undefined" && ad.linkUrl) {
      try {
        const url = new URL(ad.linkUrl);
        if (url.protocol !== "https:") return;
        window.open(url.href, "_blank", "noopener,noreferrer");
      } catch {
        // invalid URL — ignore
      }
    }
  };

  return (
    <li className="py-0">
      <div
        className="rounded-lg p-4 transition-all"
        style={{
          background: "#131a14",
          border: "1px solid rgba(201,168,76,0.2)",
        }}
      >
        <span
          className="mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: "rgba(201,168,76,0.1)", color: "#9a7c35", border: "1px solid rgba(201,168,76,0.2)" }}
        >
          広告
        </span>
        {ad.imageUrl && (
          <div className="mb-3 overflow-hidden rounded-lg">
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="h-32 w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <h3 className="font-semibold" style={{ color: "#ddd6c8" }}>{ad.title}</h3>
        {ad.description && (
          <p className="mt-1 text-sm line-clamp-2" style={{ color: "#9a8e7a" }}>
            {ad.description}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClick}
            className="rounded px-4 py-2 text-sm font-semibold transition-all"
            style={{ background: "#c9a84c", color: "#0d1009" }}
          >
            詳細を見る
          </button>
          <a
            href="/settings"
            className="text-[10px] transition-colors hover:underline"
            style={{ color: "#6b7a66" }}
          >
            プレミアムなら広告なし
          </a>
        </div>
      </div>
    </li>
  );
}
