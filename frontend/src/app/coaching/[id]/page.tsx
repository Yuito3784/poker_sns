"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Avatar from "../../components/Avatar";
import { fetchWithAuth, API_BASE } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import type { CoachProfile } from "../../../lib/types";

export default function CoachDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { auth, isInitialized } = useAuth();
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({ scheduledAt: "", durationMinutes: 60, notes: "" });
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (isInitialized && !auth) router.push("/");
  }, [isInitialized, auth, router]);

  useEffect(() => {
    if (id) fetchCoach();
  }, [id]);

  const fetchCoach = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/coaching/coaches/${id}`);
      if (res.ok) setCoach(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!coach || !bookingForm.scheduledAt) return;
    setBooking(true);
    try {
      const res = await fetchWithAuth(`/coaching/coaches/${coach.id}/book`, {
        method: "POST",
        body: JSON.stringify(bookingForm),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.clientSecret) {
          alert(`予約金額: ${data.amount.toLocaleString()}円\nStripe決済UIは別途実装が必要です。`);
        }
        setShowBooking(false);
      }
    } catch { /* ignore */ } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1009", color: "#6b7a66" }}>読み込み中...</div>;
  if (!coach) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1009", color: "#6b7a66" }}>コーチが見つかりません</div>;

  const estimatedAmount = Math.round((coach.hourlyRate * bookingForm.durationMinutes) / 60);

  return (
    <div className="min-h-screen" style={{ background: "#0d1009" }}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button onClick={() => router.push("/coaching")} className="mb-4 text-sm" style={{ color: "#c9a84c" }}>
          &larr; コーチ一覧に戻る
        </button>

        <div className="rounded-xl p-6" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
          <div className="flex items-start gap-4">
            <Avatar avatarUrl={coach.user?.avatarUrl ?? null} name={coach.user?.name ?? ""} size="2xl" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "#ddd6c8" }}>{coach.user?.name}</h1>
                {coach.user?.subscriptionStatus === "active" && (
                  <span className="rounded px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c" }}>PRO</span>
                )}
              </div>
              <p className="font-medium" style={{ color: "#c9a84c" }}>{coach.title}</p>
              <p className="mt-1 text-sm" style={{ color: "#7a7260" }}>@{coach.user?.username}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: "#c9a84c" }}>{coach.hourlyRate.toLocaleString()}円/h</div>
            </div>
          </div>

          <p className="mt-4 text-sm whitespace-pre-wrap" style={{ color: "#ddd6c8" }}>{coach.description}</p>

          {coach.experience && (
            <div className="mt-3">
              <span className="text-xs" style={{ color: "#6b7a66" }}>経歴: </span>
              <span className="text-sm" style={{ color: "#7a7260" }}>{coach.experience}</span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1">
            {coach.specialties.split(",").map((s) => (
              <span key={s} className="rounded px-2 py-1 text-xs" style={{ background: "rgba(201,168,76,0.08)", color: "#9a7c35" }}>
                {s.trim()}
              </span>
            ))}
          </div>

          <button
            onClick={() => setShowBooking(!showBooking)}
            className="mt-6 w-full rounded-lg px-6 py-3 text-sm font-semibold"
            style={{ background: "#c9a84c", color: "#0d1009" }}
          >
            レッスンを予約
          </button>
        </div>

        {showBooking && (
          <div className="mt-4 rounded-xl p-4" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
            <h2 className="mb-3 font-semibold" style={{ color: "#ddd6c8" }}>レッスン予約</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#7a7260" }}>日時</label>
                <input type="datetime-local" value={bookingForm.scheduledAt} onChange={(e) => setBookingForm({ ...bookingForm, scheduledAt: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} />
              </div>
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#7a7260" }}>時間 (分)</label>
                <select value={bookingForm.durationMinutes} onChange={(e) => setBookingForm({ ...bookingForm, durationMinutes: parseInt(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }}>
                  <option value={30}>30分</option>
                  <option value={60}>60分</option>
                  <option value={90}>90分</option>
                  <option value={120}>120分</option>
                </select>
              </div>
              <textarea placeholder="メモ (任意)" value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }} rows={2} />
              <div className="text-sm" style={{ color: "#7a7260" }}>
                予想金額: <span className="font-semibold" style={{ color: "#c9a84c" }}>{estimatedAmount.toLocaleString()}円</span>
              </div>
              <button onClick={handleBook} disabled={booking || !bookingForm.scheduledAt} className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ background: "#c9a84c", color: "#0d1009", opacity: booking || !bookingForm.scheduledAt ? 0.5 : 1 }}>
                {booking ? "予約中..." : "予約する"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
