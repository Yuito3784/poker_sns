"use client";

import { API_BASE } from "../../lib/api";
import type { AffiliatePartner } from "../../lib/types";

type Props = {
  partner: AffiliatePartner;
  referrer?: string;
  compact?: boolean;
};

const categoryLabel: Record<AffiliatePartner["category"], string> = {
  POKER_ROOM: "ポーカールーム",
  TOOL: "ツール",
  LEARNING: "学習",
  GOODS: "グッズ",
};

export default function AffiliateCard({ partner, referrer = "partners_page", compact = false }: Props) {
  const handleClick = () => {
    if (typeof window !== "undefined") {
      window.open(
        `${API_BASE}/affiliates/${partner.slug}/redirect?ref=${referrer}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg p-3 transition-all"
        style={{ background: "#0d1009", border: "1px solid #1f2a1e" }}
      >
        {partner.logoUrl ? (
          <img src={partner.logoUrl} alt={partner.name} className="h-9 w-9 rounded-lg object-contain" referrerPolicy="no-referrer" />
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
            style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}
          >
            {partner.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: "#ddd6c8" }}>{partner.name}</p>
          {partner.bonus && (
            <p className="truncate text-xs" style={{ color: "#9a7c35" }}>{partner.bonus}</p>
          )}
        </div>
        <button
          onClick={handleClick}
          className="flex-shrink-0 rounded px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}
        >
          詳しく見る
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4 transition-all"
      style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {partner.logoUrl ? (
            <img src={partner.logoUrl} alt={partner.name} className="h-12 w-12 rounded-lg object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold"
              style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}
            >
              {partner.name.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-semibold" style={{ color: "#ddd6c8" }}>{partner.name}</h3>
            <span className="text-xs" style={{ color: "#6b7a66" }}>{categoryLabel[partner.category]}</span>
          </div>
        </div>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{ background: "#1f2a1e", color: "#6b7a66" }}
        >
          提携
        </span>
      </div>
      <p className="mb-2 text-sm line-clamp-2" style={{ color: "#9a8e7a" }}>{partner.description}</p>
      {partner.bonus && (
        <div
          className="mb-3 rounded-lg px-3 py-2"
          style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}
        >
          <span className="text-sm font-medium" style={{ color: "#c9a84c" }}>{partner.bonus}</span>
        </div>
      )}
      <button
        onClick={handleClick}
        className="w-full rounded px-4 py-2.5 text-sm font-semibold transition-colors"
        style={{ background: "#c9a84c", color: "#0d1009" }}
      >
        登録はこちら
      </button>
    </div>
  );
}
