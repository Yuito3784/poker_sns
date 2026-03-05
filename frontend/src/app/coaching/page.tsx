"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth, API_BASE } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { CoachProfile } from "../../lib/types";

export default function CoachingPage() {
  const router = useRouter();
  const { auth, isInitialized } = useAuth();
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    title: "", description: "", hourlyRate: 3000, specialties: "", experience: "",
  });
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (isInitialized && !auth) router.push("/");
  }, [isInitialized, auth, router]);

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/coaching/coaches`);
      if (res.ok) setCoaches(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.title || !registerForm.description || !registerForm.specialties) return;
    setRegistering(true);
    try {
      const res = await fetchWithAuth("/coaching/profile", {
        method: "POST",
        body: JSON.stringify(registerForm),
      });
      if (res.ok) {
        setShowRegister(false);
        setRegisterForm({ title: "", description: "", hourlyRate: 3000, specialties: "", experience: "" });
        fetchCoaches();
      }
    } catch { /* ignore */ } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0d1009" }}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "#ddd6c8" }}>コーチング</h1>
          <button
            onClick={() => setShowRegister(!showRegister)}
            className="rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: "#c9a84c", color: "#0d1009" }}
          >
            コーチ登録
          </button>
        </div>

        {showRegister && (
          <div className="mb-6 rounded-xl p-4" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
            <h2 className="mb-3 font-semibold" style={{ color: "#ddd6c8" }}>コーチプロフィールを登録</h2>
            <div className="space-y-3">
              <input type="text" placeholder="タイトル (例: NLHキャッシュゲームコーチ)" value={registerForm.title} onChange={(e) => setRegisterForm({ ...registerForm, title: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} />
              <textarea placeholder="自己紹介・指導内容" value={registerForm.description} onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} rows={3} />
              <input type="text" placeholder="専門分野 (カンマ区切り: NLH,PLO,MTT)" value={registerForm.specialties} onChange={(e) => setRegisterForm({ ...registerForm, specialties: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} />
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "#7a7260" }}>時給:</span>
                <input type="number" value={registerForm.hourlyRate} onChange={(e) => setRegisterForm({ ...registerForm, hourlyRate: parseInt(e.target.value) || 0 })} className="w-32 rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} min={500} />
                <span className="text-sm" style={{ color: "#7a7260" }}>円</span>
              </div>
              <input type="text" placeholder="経歴・実績 (任意)" value={registerForm.experience} onChange={(e) => setRegisterForm({ ...registerForm, experience: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} />
              <button onClick={handleRegister} disabled={registering} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: "#c9a84c", color: "#0d1009", opacity: registering ? 0.5 : 1 }}>
                {registering ? "登録中..." : "登録"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center" style={{ color: "#4a5245" }}>読み込み中...</div>
        ) : coaches.length === 0 ? (
          <div className="py-12 text-center" style={{ color: "#4a5245" }}>コーチがまだ登録されていません</div>
        ) : (
          <div className="space-y-4">
            {coaches.map((coach) => (
              <button
                key={coach.id}
                onClick={() => router.push(`/coaching/${coach.id}`)}
                className="block w-full rounded-xl p-4 text-left transition-colors hover:bg-white/[0.02]"
                style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
              >
                <div className="flex items-start gap-3">
                  {coach.user?.avatarUrl ? (
                    <img src={coach.user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold" style={{ background: "#192118", color: "#7a7260" }}>
                      {coach.user?.name?.[0] || "?"}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" style={{ color: "#ddd6c8" }}>{coach.user?.name}</h3>
                      {coach.user?.subscriptionStatus === "active" && (
                        <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c" }}>PRO</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: "#c9a84c" }}>{coach.title}</p>
                    <p className="mt-1 text-sm line-clamp-2" style={{ color: "#7a7260" }}>{coach.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {coach.specialties.split(",").map((s) => (
                        <span key={s} className="rounded px-2 py-0.5 text-xs" style={{ background: "rgba(201,168,76,0.08)", color: "#9a7c35" }}>
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold" style={{ color: "#c9a84c" }}>
                      {coach.hourlyRate.toLocaleString()}円/h
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "#4a5245" }}>
                      {coach._count?.bookings || 0}件の予約
                    </div>
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
