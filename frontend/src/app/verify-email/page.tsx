"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { API_BASE } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { auth, setAuth } = useAuth();
  const verifyToken = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!verifyToken) {
      setStatus("error");
      setMessage("無効なリンクです。");
      return;
    }

    fetch(`${API_BASE}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: verifyToken }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "メールアドレスが確認されました。");
          // Sync AuthContext
          if (auth) {
            try {
              const updatedUser = { ...auth.user, emailVerified: true };
              setAuth(auth.token, updatedUser);
            } catch { /* ignore */ }
          }
        } else {
          setStatus("error");
          setMessage(data.message || "確認に失敗しました。");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("エラーが発生しました。");
      });
  }, [verifyToken, auth, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-neutral-900">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-lg">
        <span className="text-4xl">♠</span>
        <h1 className="mt-2 text-xl font-bold tracking-tight">メール認証</h1>

        {status === "loading" && (
          <p className="mt-4 text-sm text-neutral-500">確認中...</p>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </div>
            <p className="mt-3 text-sm text-emerald-700">{message}</p>
            <button onClick={() => router.push("/")} className="mt-4 rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              ホームに戻る
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <p className="mt-3 text-sm text-red-600">{message}</p>
            <button onClick={() => router.push("/")} className="mt-4 rounded-full border border-neutral-300 px-6 py-2 text-sm hover:bg-neutral-50">
              ホームに戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0d1009" }}>
        <p style={{ color: "#7a7260" }}>読み込み中...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
