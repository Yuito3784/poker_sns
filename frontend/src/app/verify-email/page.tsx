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
    <div className="flex min-h-screen items-center justify-center bg-[#0d1009] text-[#ddd6c8]">
      <div className="w-full max-w-sm rounded-2xl border border-[#2a3828] bg-[#131a14] p-8 text-center shadow-lg shadow-black/30">
        <span className="text-4xl text-[#c9a84c]">&#9824;</span>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-[#ddd6c8]">メール認証</h1>

        {status === "loading" && (
          <p className="mt-4 text-sm text-[#7a7260]">確認中...</p>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a2f1c]">
              <svg className="h-6 w-6 text-[#c9a84c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </div>
            <p className="mt-3 text-sm text-[#c9a84c]">{message}</p>
            <button onClick={() => router.push("/")} className="mt-4 rounded-full bg-[#c9a84c] px-6 py-2 text-sm font-semibold text-[#0d1009] hover:bg-[#d4b965]">
              ホームに戻る
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/30">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <p className="mt-3 text-sm text-red-400">{message}</p>
            <button onClick={() => router.push("/")} className="mt-4 rounded-full border border-[#2a3828] px-6 py-2 text-sm text-[#9a8e7a] hover:bg-[#192118]">
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
      <div className="flex min-h-screen items-center justify-center bg-[#0d1009]">
        <p className="text-[#9a8e7a]">読み込み中...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
