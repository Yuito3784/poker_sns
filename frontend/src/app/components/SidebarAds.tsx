"use client";

import { useMemo, useState, useEffect } from "react";
import { SIDEBAR_ADS, SIDEBAR_ADS_DISPLAY_COUNT, type SidebarAdItem } from "../../data/sidebarAds";

const sourceLabel: Record<"rakuten" | "amazon" | "other", string> = {
  rakuten: "楽天",
  amazon: "Amazon",
  other: "広告",
};

/**
 * 日付に応じたシードで、表示する広告の開始インデックスを決める（日替わり）
 */
function getDaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
}

function pickAdsForToday(ads: SidebarAdItem[], count: number): SidebarAdItem[] {
  if (ads.length === 0) return [];
  const seed = getDaySeed();
  const start = seed % ads.length;
  const result: SidebarAdItem[] = [];
  for (let i = 0; i < count; i++) {
    result.push(ads[(start + i) % ads.length]!);
  }
  return result;
}

function AdBlock({ ad }: { ad: SidebarAdItem }) {
  if (ad.type === "html") {
    return (
      <div
        className="overflow-x-auto rounded-lg py-1"
        style={{ maxWidth: "100%", background: "#0d1009", border: "1px solid #1f2a1e" }}
      >
        {/* 楽天ウィジェットは504px幅のため、狭いサイドバーでは横スクロールで表示 */}
        <div dangerouslySetInnerHTML={{ __html: ad.html }} />
      </div>
    );
  }

  return (
    <a
      href={ad.linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="block rounded-lg p-3 transition-colors hover:opacity-90"
      style={{
        background: "#0d1009",
        border: "1px solid #1f2a1e",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded text-xs font-bold"
          style={{
            background: "rgba(201,168,76,0.1)",
            color: "#c9a84c",
            border: "1px solid rgba(201,168,76,0.2)",
          }}
        >
          {ad.source === "rakuten" ? "楽" : ad.source === "amazon" ? "A" : "広"}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold"
            style={{ color: "#ddd6c8" }}
          >
            {ad.title}
          </p>
          {ad.description && (
            <p
              className="mt-0.5 truncate text-xs"
              style={{ color: "#6b7a66" }}
            >
              {ad.description}
            </p>
          )}
          <span
            className="mt-1 inline-block text-[10px]"
            style={{ color: "#4a5245" }}
          >
            {sourceLabel[ad.source]}
          </span>
        </div>
      </div>
    </a>
  );
}

export default function SidebarAds() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const todayAds = useMemo(
    () => (mounted ? pickAdsForToday(SIDEBAR_ADS, SIDEBAR_ADS_DISPLAY_COUNT) : []),
    [mounted],
  );

  if (!mounted || todayAds.length === 0) return null;

  return (
    <div
      className="mt-3 rounded-lg p-4"
      style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
    >
      <h3
        className="mb-3 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "#6b7a66" }}
      >
        おすすめ（ポーカー関連）
      </h3>
      <div className="space-y-4">
        {todayAds.map((ad) => (
          <AdBlock key={ad.id} ad={ad} />
        ))}
      </div>
      <p className="mt-2 text-[10px]" style={{ color: "#4a5245" }}>
        広告（日替わりで表示順が変わります）
      </p>
    </div>
  );
}
