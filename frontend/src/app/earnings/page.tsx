"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE, fetchWithAuth } from "../../lib/api";
import type { CreatorEarning, EarningsSummary, CreatorPayout } from "../../lib/types";

type TabType = "all" | "SALON_SUBSCRIPTION" | "PAID_CONTENT";

const TAB_LABELS: Record<TabType, string> = {
  all: "全て",
  SALON_SUBSCRIPTION: "サロン",
  PAID_CONTENT: "有料コンテンツ",
};

const TYPE_LABELS: Record<string, string> = {
  SALON_SUBSCRIPTION: "サロン",
  PAID_CONTENT: "有料コンテンツ",
};

function formatYen(amount: number) {
  return `¥${amount.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function EarningsPage() {
  const { auth } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [history, setHistory] = useState<CreatorEarning[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [payouts, setPayouts] = useState<CreatorPayout[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [loading, setLoading] = useState(true);
  const [historySkip, setHistorySkip] = useState(0);
  const historyTake = 20;

  useEffect(() => {
    if (!auth?.token) {
      router.push("/login");
      return;
    }
    loadSummary();
    loadPayouts();
  }, [auth?.token]);

  useEffect(() => {
    if (auth?.token) {
      loadHistory();
    }
  }, [activeTab, historySkip, auth?.token]);

  async function loadSummary() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/earnings/summary`);
      if (res.ok) setSummary(await res.json());
    } catch { /* ignore */ }
  }

  async function loadHistory() {
    setLoading(true);
    try {
      const typeParam = activeTab !== "all" ? `&type=${activeTab}` : "";
      const res = await fetchWithAuth(
        `${API_BASE}/earnings/history?take=${historyTake}&skip=${historySkip}${typeParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setHistory(data.items);
        setHistoryTotal(data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadPayouts() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/earnings/payouts`);
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.items);
      }
    } catch { /* ignore */ }
  }

  if (!auth?.token) return null;

  return (
    <div className="min-h-screen" style={{ background: "#0d1009", color: "#ddd6c8" }}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1
          className="mb-6 font-[family-name:var(--font-playfair)] text-2xl font-bold"
          style={{ color: "#c9a84c" }}
        >
          収益ダッシュボード
        </h1>

        {/* Summary Cards */}
        {summary && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="総売上" value={formatYen(summary.grossTotal)} />
            <SummaryCard label="手数料(15%)" value={formatYen(summary.feeTotal)} />
            <SummaryCard label="純収益" value={formatYen(summary.netTotal)} highlight />
            <SummaryCard label="未振込額" value={formatYen(summary.pendingPayout)} />
          </div>
        )}

        {/* Monthly Trend */}
        {summary && summary.monthly.length > 0 && (
          <div
            className="mb-8 rounded-lg p-4"
            style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a66" }}>
              月次推移
            </h2>
            <div className="space-y-2">
              {summary.monthly.map((m) => (
                <div key={m.month} className="flex items-center justify-between text-sm">
                  <span style={{ color: "#7a7260" }}>{m.month}</span>
                  <div className="flex gap-4">
                    <span style={{ color: "#4a5245" }}>総額 {formatYen(m.gross)}</span>
                    <span style={{ color: "#c9a84c" }}>純益 {formatYen(m.net)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setHistorySkip(0); }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: activeTab === tab ? "#c9a84c" : "#192118",
                color: activeTab === tab ? "#0d1009" : "#7a7260",
                border: activeTab === tab ? "none" : "1px solid #2a3828",
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* History Table */}
        <div
          className="mb-8 overflow-hidden rounded-lg"
          style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #2a3828" }}>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "#6b7a66" }}>日付</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "#6b7a66" }}>種別</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium sm:table-cell" style={{ color: "#6b7a66" }}>説明</th>
                <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: "#6b7a66" }}>総額</th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium sm:table-cell" style={{ color: "#6b7a66" }}>手数料</th>
                <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: "#6b7a66" }}>純額</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "#4a5245" }}>
                    読み込み中...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "#4a5245" }}>
                    まだ収益データがありません
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #1f2a1e" }}>
                    <td className="px-4 py-3" style={{ color: "#7a7260" }}>{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: item.type === "SALON_SUBSCRIPTION" ? "rgba(201,168,76,0.12)" : "rgba(76,168,201,0.12)",
                          color: item.type === "SALON_SUBSCRIPTION" ? "#c9a84c" : "#4ca8c9",
                        }}
                      >
                        {TYPE_LABELS[item.type]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell" style={{ color: "#7a7260" }}>
                      {item.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "#ddd6c8" }}>
                      {formatYen(item.grossAmount)}
                    </td>
                    <td className="hidden px-4 py-3 text-right sm:table-cell" style={{ color: "#4a5245" }}>
                      -{formatYen(item.platformFee)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: "#c9a84c" }}>
                      {formatYen(item.netAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {historyTotal > historyTake && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid #1f2a1e" }}>
              <button
                onClick={() => setHistorySkip(Math.max(0, historySkip - historyTake))}
                disabled={historySkip === 0}
                className="rounded px-3 py-1 text-sm transition-colors disabled:opacity-30"
                style={{ color: "#c9a84c", border: "1px solid #2a3828" }}
              >
                前へ
              </button>
              <span className="text-xs" style={{ color: "#6b7a66" }}>
                {historySkip + 1}-{Math.min(historySkip + historyTake, historyTotal)} / {historyTotal}
              </span>
              <button
                onClick={() => setHistorySkip(historySkip + historyTake)}
                disabled={historySkip + historyTake >= historyTotal}
                className="rounded px-3 py-1 text-sm transition-colors disabled:opacity-30"
                style={{ color: "#c9a84c", border: "1px solid #2a3828" }}
              >
                次へ
              </button>
            </div>
          )}
        </div>

        {/* Payouts Section */}
        <div
          className="rounded-lg p-4"
          style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a66" }}>
            振込履歴
          </h2>
          {payouts.length === 0 ? (
            <p className="text-sm" style={{ color: "#4a5245" }}>
              振込履歴はありません
            </p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "#192118", border: "1px solid #2a3828" }}
                >
                  <div>
                    <span className="text-sm" style={{ color: "#ddd6c8" }}>{formatYen(p.amount)}</span>
                    <span className="ml-2 text-xs" style={{ color: "#6b7a66" }}>{formatDate(p.createdAt)}</span>
                  </div>
                  <span
                    className="rounded px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: p.status === "COMPLETED" ? "rgba(76,201,100,0.12)" : "rgba(201,168,76,0.12)",
                      color: p.status === "COMPLETED" ? "#4cc964" : "#c9a84c",
                    }}
                  >
                    {p.status === "COMPLETED" ? "完了" : "処理中"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: highlight ? "rgba(201,168,76,0.08)" : "#131a14",
        border: highlight ? "1px solid rgba(201,168,76,0.25)" : "1px solid #1f2a1e",
      }}
    >
      <div className="text-xs font-medium" style={{ color: "#6b7a66" }}>{label}</div>
      <div
        className="mt-1 text-lg font-bold"
        style={{ color: highlight ? "#c9a84c" : "#ddd6c8" }}
      >
        {value}
      </div>
    </div>
  );
}
