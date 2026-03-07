"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AffiliateCard from "../components/AffiliateCard";
import { API_BASE } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { AffiliatePartner } from "../../lib/types";

type Category = "ALL" | "POKER_ROOM" | "TOOL" | "LEARNING" | "GOODS";

const tabs: { key: Category; label: string }[] = [
  { key: "ALL", label: "全て" },
  { key: "POKER_ROOM", label: "ポーカールーム" },
  { key: "TOOL", label: "ツール" },
  { key: "LEARNING", label: "学習" },
  { key: "GOODS", label: "グッズ" },
];

export default function PartnersPage() {
  const router = useRouter();
  const { auth, isInitialized } = useAuth();
  const [partners, setPartners] = useState<AffiliatePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Category>("ALL");

  useEffect(() => {
    if (isInitialized && !auth) {
      router.push("/");
    }
  }, [isInitialized, auth, router]);

  useEffect(() => {
    fetchPartners();
  }, [activeTab]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const params = activeTab !== "ALL" ? `?category=${activeTab}` : "";
      const res = await fetch(`${API_BASE}/affiliates${params}`);
      if (res.ok) {
        const data = await res.json();
        setPartners(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1009] text-[#ddd6c8]">
      <div className="mx-auto max-w-xl min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-50 rounded-b-xl border-b border-amber-500/10 bg-[#1a2f1c] shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-4 px-4 py-3">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-1.5 text-[#8ba388] transition-colors hover:bg-white/5 hover:text-amber-400"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="font-[family-name:var(--font-playfair)] text-xl text-[#e8f0e6]">おすすめサービス</h1>
          </div>
          {/* Category Tabs */}
          <div className="flex overflow-x-auto border-t border-white/5 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-b-2 border-amber-400 text-amber-400"
                    : "text-[#8ba388] hover:bg-white/5 hover:text-[#e8f0e6]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-sm text-[#6b7a66]">読み込み中...</p>
          </div>
        ) : partners.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-[#6b7a66]">このカテゴリのパートナーはまだありません</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {partners.map((partner) => (
              <AffiliateCard key={partner.id} partner={partner} referrer="partners_page" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
