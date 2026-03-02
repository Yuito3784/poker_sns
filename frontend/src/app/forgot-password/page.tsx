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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f8faf5] to-[#e8f0e6] text-neutral-900">
      <div className="w-full max-w-sm rounded-2xl border border-[#d1e0cc] bg-white p-8 shadow-lg shadow-neutral-200/50">
        <div className="mb-6 text-center">
          <span className="text-4xl">♠</span>
          <h1 className="mt-2 text-xl font-bold tracking-tight">パスワードリセット</h1>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-neutral-600">
              パスワードリセットのメールを送信しました。メールに記載されたリンクからパスワードをリセットしてください。
            </p>
            <a href="/" className="inline-block text-sm text-teal-600 hover:underline">
              ログインに戻る
            </a>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-neutral-500">
              登録済みのメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
            </p>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-600">メールアドレス</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-[#d1e0cc] px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {loading ? "送信中..." : "リセットリンクを送信"}
              </button>
            </form>
            <div className="mt-4 text-center">
              <a href="/" className="text-xs text-teal-600 hover:underline">
                ログインに戻る
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
