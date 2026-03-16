"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth, API_BASE } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { Tournament } from "../../lib/types";

const statusLabels: Record<string, string> = {
  upcoming: "開催予定",
  in_progress: "開催中",
  completed: "終了",
  canceled: "中止",
};

export default function TournamentsPage() {
  const router = useRouter();
  const { auth, isInitialized } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", description: "", entryFee: 0, maxPlayers: 100, prizePool: "", startAt: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isInitialized && !auth) router.push("/");
  }, [isInitialized, auth, router]);

  useEffect(() => {
    fetchTournaments();
  }, [activeTab]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments?status=${activeTab}`);
      if (res.ok) setTournaments(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.description || !createForm.startAt) return;
    setCreating(true);
    try {
      const res = await fetchWithAuth("/tournaments", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setShowCreate(false);
        setCreateForm({ name: "", description: "", entryFee: 0, maxPlayers: 100, prizePool: "", startAt: "" });
        fetchTournaments();
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  };

  const tabs = [
    { key: "upcoming", label: "開催予定" },
    { key: "in_progress", label: "開催中" },
    { key: "completed", label: "終了" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0d1009" }}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "#ddd6c8" }}>トーナメント</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: "#c9a84c", color: "#0d1009" }}
          >
            トーナメントを作成
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg p-1" style={{ background: "#131a14" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              style={{
                background: activeTab === tab.key ? "rgba(201,168,76,0.15)" : "transparent",
                color: activeTab === tab.key ? "#c9a84c" : "#7a7260",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showCreate && (
          <div className="mb-6 rounded-xl p-4" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
            <h2 className="mb-3 font-semibold" style={{ color: "#ddd6c8" }}>新しいトーナメントを作成</h2>
            <div className="space-y-3">
              <input type="text" placeholder="トーナメント名" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} />
              <textarea placeholder="説明" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} rows={3} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs" style={{ color: "#7a7260" }}>参加費 (円)</label>
                  <input type="number" value={createForm.entryFee} onChange={(e) => setCreateForm({ ...createForm, entryFee: parseInt(e.target.value) || 0 })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} min={0} />
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: "#7a7260" }}>定員</label>
                  <input type="number" value={createForm.maxPlayers} onChange={(e) => setCreateForm({ ...createForm, maxPlayers: parseInt(e.target.value) || 10 })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} min={2} />
                </div>
              </div>
              <input type="text" placeholder="賞金プール (例: 1位 50,000円)" value={createForm.prizePool} onChange={(e) => setCreateForm({ ...createForm, prizePool: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} />
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#7a7260" }}>開始日時</label>
                <input type="datetime-local" value={createForm.startAt} onChange={(e) => setCreateForm({ ...createForm, startAt: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} />
              </div>
              <button onClick={handleCreate} disabled={creating} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: "#c9a84c", color: "#0d1009", opacity: creating ? 0.5 : 1 }}>
                {creating ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center" style={{ color: "#6b7a66" }}>読み込み中...</div>
        ) : tournaments.length === 0 ? (
          <div className="py-12 text-center" style={{ color: "#6b7a66" }}>トーナメントがありません</div>
        ) : (
          <div className="space-y-4">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => router.push(`/tournaments/${t.id}`)}
                className="block w-full rounded-xl p-4 text-left transition-colors hover:bg-white/[0.02]"
                style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" style={{ color: "#ddd6c8" }}>{t.name}</h3>
                      <span className="rounded px-2 py-0.5 text-xs" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
                        {statusLabels[t.status] || t.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm line-clamp-2" style={{ color: "#7a7260" }}>{t.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs" style={{ color: "#6b7a66" }}>
                      <span>{new Date(t.startAt).toLocaleString("ja-JP")}</span>
                      <span>{t._count?.participants || 0}/{t.maxPlayers}人</span>
                      <span>{t.organizer?.name}</span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-sm font-semibold" style={{ color: "#c9a84c" }}>
                      {t.entryFee === 0 ? "無料" : `${t.entryFee.toLocaleString()}円`}
                    </div>
                    {t.prizePool && <div className="mt-1 text-xs" style={{ color: "#7a7260" }}>{t.prizePool}</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
