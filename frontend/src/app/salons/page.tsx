"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth, API_BASE } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { Salon } from "../../lib/types";

export default function SalonsPage() {
  const router = useRouter();
  const { auth, isInitialized } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", slug: "", description: "", monthlyPrice: 1000 });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isInitialized && !auth) router.push("/");
  }, [isInitialized, auth, router]);

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchSalons = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/salons`);
      if (res.ok) setSalons(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.slug || !createForm.description) return;
    setCreating(true);
    try {
      const res = await fetchWithAuth("/salons", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setShowCreate(false);
        setCreateForm({ name: "", slug: "", description: "", monthlyPrice: 1000 });
        fetchSalons();
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0d1009" }}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "#ddd6c8" }}>サロン</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: "#c9a84c", color: "#0d1009" }}
          >
            サロンを作成
          </button>
        </div>

        {showCreate && (
          <div className="mb-6 rounded-xl p-4" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
            <h2 className="mb-3 font-semibold" style={{ color: "#ddd6c8" }}>新しいサロンを作成</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="サロン名"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }}
              />
              <input
                type="text"
                placeholder="スラッグ (URL用、英数字)"
                value={createForm.slug}
                onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }}
              />
              <textarea
                placeholder="説明"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }}
                rows={3}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "#7a7260" }}>月額料金:</span>
                <input
                  type="number"
                  value={createForm.monthlyPrice}
                  onChange={(e) => setCreateForm({ ...createForm, monthlyPrice: parseInt(e.target.value) || 0 })}
                  className="w-32 rounded-lg px-3 py-2 text-sm"
                  style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }}
                  min={100}
                  max={100000}
                />
                <span className="text-sm" style={{ color: "#7a7260" }}>円</span>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg px-4 py-2 text-sm font-semibold"
                style={{ background: "#c9a84c", color: "#0d1009", opacity: creating ? 0.5 : 1 }}
              >
                {creating ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center" style={{ color: "#6b7a66" }}>読み込み中...</div>
        ) : salons.length === 0 ? (
          <div className="py-12 text-center" style={{ color: "#6b7a66" }}>サロンがまだありません</div>
        ) : (
          <div className="space-y-4">
            {salons.map((salon) => (
              <button
                key={salon.id}
                onClick={() => router.push(`/salons/${salon.slug}`)}
                className="block w-full rounded-xl p-4 text-left transition-colors hover:bg-white/[0.02]"
                style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: "#ddd6c8" }}>{salon.name}</h3>
                    <p className="mt-1 text-sm" style={{ color: "#7a7260" }}>{salon.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs" style={{ color: "#6b7a66" }}>
                      <span>{salon.owner?.name}</span>
                      <span>{salon._count?.members || 0} メンバー</span>
                      <span>{salon._count?.posts || 0} 投稿</span>
                    </div>
                  </div>
                  <div className="ml-4 rounded-lg px-3 py-1 text-sm font-semibold" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
                    {salon.monthlyPrice.toLocaleString()}円/月
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
