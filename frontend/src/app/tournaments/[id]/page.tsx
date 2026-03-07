"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Avatar from "../../components/Avatar";
import { fetchWithAuth, API_BASE } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import type { Tournament } from "../../../lib/types";

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { auth, isInitialized } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (isInitialized && !auth) router.push("/");
  }, [isInitialized, auth, router]);

  useEffect(() => {
    if (id) fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/tournaments/${id}`);
      if (res.ok) setTournament(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!tournament) return;
    setRegistering(true);
    try {
      const res = await fetchWithAuth(`/tournaments/${tournament.id}/register`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.paymentRequired && data.clientSecret) {
          alert("決済処理はStripeで行います。Stripe決済UIは別途実装が必要です。");
        } else {
          fetchTournament();
        }
      }
    } catch { /* ignore */ } finally {
      setRegistering(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1009", color: "#4a5245" }}>読み込み中...</div>;
  if (!tournament) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1009", color: "#4a5245" }}>トーナメントが見つかりません</div>;

  return (
    <div className="min-h-screen" style={{ background: "#0d1009" }}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button onClick={() => router.push("/tournaments")} className="mb-4 text-sm" style={{ color: "#c9a84c" }}>
          &larr; トーナメント一覧に戻る
        </button>

        <div className="rounded-xl p-6" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
          <h1 className="text-xl font-bold" style={{ color: "#ddd6c8" }}>{tournament.name}</h1>
          <p className="mt-2 text-sm whitespace-pre-wrap" style={{ color: "#7a7260" }}>{tournament.description}</p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg p-3" style={{ background: "#192118" }}>
              <div className="text-xs" style={{ color: "#4a5245" }}>参加費</div>
              <div className="text-lg font-semibold" style={{ color: "#c9a84c" }}>
                {tournament.entryFee === 0 ? "無料" : `${tournament.entryFee.toLocaleString()}円`}
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#192118" }}>
              <div className="text-xs" style={{ color: "#4a5245" }}>参加者</div>
              <div className="text-lg font-semibold" style={{ color: "#ddd6c8" }}>
                {tournament._count?.participants || 0} / {tournament.maxPlayers}
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#192118" }}>
              <div className="text-xs" style={{ color: "#4a5245" }}>開始日時</div>
              <div className="text-sm font-semibold" style={{ color: "#ddd6c8" }}>
                {new Date(tournament.startAt).toLocaleString("ja-JP")}
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#192118" }}>
              <div className="text-xs" style={{ color: "#4a5245" }}>賞金</div>
              <div className="text-sm font-semibold" style={{ color: "#c9a84c" }}>
                {tournament.prizePool || "未設定"}
              </div>
            </div>
          </div>

          {tournament.status === "upcoming" && !tournament.isRegistered && (
            <button
              onClick={handleRegister}
              disabled={registering}
              className="mt-4 w-full rounded-lg px-6 py-3 text-sm font-semibold"
              style={{ background: "#c9a84c", color: "#0d1009", opacity: registering ? 0.5 : 1 }}
            >
              {registering ? "登録中..." : "参加登録"}
            </button>
          )}

          {tournament.isRegistered && (
            <div className="mt-4 rounded-lg p-3 text-center text-sm font-semibold" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
              参加登録済み
            </div>
          )}
        </div>

        {/* Participants */}
        {tournament.participants && tournament.participants.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 font-semibold" style={{ color: "#ddd6c8" }}>参加者</h2>
            <div className="space-y-2">
              {tournament.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
                  <Avatar avatarUrl={p.user?.avatarUrl ?? null} name={p.user?.name ?? ""} size="sm" />
                  <div>
                    <div className="text-sm font-medium" style={{ color: "#ddd6c8" }}>{p.user?.name}</div>
                    <div className="text-xs" style={{ color: "#4a5245" }}>@{p.user?.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
