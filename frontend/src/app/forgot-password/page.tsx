"use client";

import { FormEvent, useState } from "react";
import { API_BASE } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "エラーが発生しました");
      }
      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1009] text-[#ddd6c8]">
      <div className="w-full max-w-sm rounded-2xl border border-[#2a3828] bg-[#131a14] p-8 shadow-lg shadow-black/30">
        <div className="mb-6 text-center">
          <span className="text-4xl text-[#c9a84c]">&#9824;</span>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-[#ddd6c8]">パスワードリセット</h1>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-[#9a8e7a]">
              パスワードリセットのメールを送信しました。メールに記載されたリンクからパスワードをリセットしてください。
            </p>
            <a href="/" className="inline-block text-sm text-[#c9a84c] hover:underline">
              ログインに戻る
            </a>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-[#7a7260]">
              登録済みのメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
            </p>
            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#9a8e7a]">メールアドレス</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-[#2a3828] bg-[#192118] px-3 py-2 text-sm text-[#ddd6c8] outline-none placeholder:text-[#4a5245] focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#0d1009] hover:bg-[#d4b965] disabled:opacity-50"
              >
                {loading ? "送信中..." : "リセットリンクを送信"}
              </button>
            </form>
            <div className="mt-4 text-center">
              <a href="/" className="text-xs text-[#c9a84c] hover:underline">
                ログインに戻る
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
