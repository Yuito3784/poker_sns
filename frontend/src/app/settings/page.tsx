"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE, fetchWithAuth } from "../../lib/api";
import { parseApiError } from "../../lib/api-error";
import { useAuth } from "../../contexts/AuthContext";
import { isPremium } from "../../lib/subscription";

type SubStatus = {
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#0d1009" }} />}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { auth, isInitialized, clearAuth, setAuth } = useAuth();
  const token = auth?.token ?? null;
  const currentUser = auth?.user ?? null;

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Subscription
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subMsg, setSubMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [subFetchError, setSubFetchError] = useState<string | null>(null);

  // Cancel confirmation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && !auth) {
      router.push("/");
    }
  }, [isInitialized, auth, router]);

  useEffect(() => {
    if (!token) return;
    // チェックアウトから戻ってきた場合は confirm-session に任せる（レースコンディション防止）
    if (searchParams.get("subscription") === "success") return;
    fetchSubStatus();
  }, [token]);

  useEffect(() => {
    const sub = searchParams.get("subscription");
    const sessionId = searchParams.get("session_id");
    if (sub !== "success") return;
    setSubMsg({ type: "success", text: "プレミアムプランに加入しました！" });
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const POLL_INTERVAL_MS = 2000;
    const POLL_MAX_MS = 15000;

    const poll = async () => {
      const data = await fetchSubStatus();
      if (cancelled || !data) return;
      if (data.status !== "free") return;
      const started = Date.now();
      pollTimer = setInterval(async () => {
        if (cancelled || Date.now() - started > POLL_MAX_MS) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
          return;
        }
        const next = await fetchSubStatus();
        if (next && next.status !== "free" && pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }, POLL_INTERVAL_MS);
    };

    const run = async () => {
      // session_id がなくてもバックエンドが Stripe customer から検索するので常に呼ぶ
      try {
        const body: Record<string, string> = {};
        if (sessionId) body.session_id = sessionId;
        const res = await fetchWithAuth(`${API_BASE}/subscriptions/confirm-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setSubStatus(data);
          if (auth?.user) {
            setAuth(auth.token, { ...auth.user, subscriptionStatus: data.status });
          }
          return;
        }
        // confirm-session が失敗した場合はポーリングにフォールバック
        const message = await parseApiError(res);
        setSubMsg({ type: "error", text: message });
        poll();
      } catch {
        setSubMsg({ type: "error", text: "接続に失敗しました。しばらくしてからお試しください" });
        poll();
      }
    };
    run();
    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [searchParams]);

  const fetchSubStatus = async (): Promise<SubStatus | null> => {
    setSubFetchError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/subscriptions/status`);
      if (res.ok) {
        const data = await res.json();
        setSubStatus(data);
        if (auth?.user) {
          setAuth(auth.token, { ...auth.user, subscriptionStatus: data.status });
        }
        return data;
      }
      const message =
        res.status === 401
          ? "ログインの有効期限が切れている可能性があります。ページを再読み込みするか、再度ログインしてください。"
          : await parseApiError(res);
      setSubFetchError(message);
      return null;
    } catch {
      setSubFetchError("接続に失敗しました。ネットワークを確認して再試行してください。");
      return null;
    }
  };

  const handleCheckout = async () => {
    setSubLoading(true);
    setSubMsg(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/subscriptions/checkout`, { method: "POST" });
      if (!res.ok) {
        const message = await parseApiError(res);
        setSubMsg({ type: "error", text: message });
        return;
      }
      const data = await res.json();
      if (data.checkoutUrl && typeof window !== "undefined") {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "接続に失敗しました。しばらくしてからお試しください";
      setSubMsg({ type: "error", text: message });
    } finally {
      setSubLoading(false);
    }
  };

  const handleCancelSub = async () => {
    setSubLoading(true);
    setSubMsg(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/subscriptions/cancel`, { method: "POST" });
      if (!res.ok) {
        setSubMsg({ type: "error", text: await parseApiError(res) });
        return;
      }
      setSubMsg({ type: "success", text: "サブスクリプションは現在の期間終了時にキャンセルされます。" });
      fetchSubStatus();
    } catch (err: unknown) {
      setSubMsg({ type: "error", text: err instanceof Error ? err.message : "接続に失敗しました。しばらくしてからお試しください" });
    } finally {
      setSubLoading(false);
    }
  };

  const handleReactivateSub = async () => {
    setSubLoading(true);
    setSubMsg(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/subscriptions/reactivate`, { method: "POST" });
      if (!res.ok) {
        setSubMsg({ type: "error", text: await parseApiError(res) });
        return;
      }
      setSubMsg({ type: "success", text: "サブスクリプションが再開されました。" });
      fetchSubStatus();
    } catch (err: unknown) {
      setSubMsg({ type: "error", text: err instanceof Error ? err.message : "接続に失敗しました。しばらくしてからお試しください" });
    } finally {
      setSubLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setSubLoading(true);
    setSubMsg(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/subscriptions/portal`, { method: "POST" });
      if (!res.ok) {
        setSubMsg({ type: "error", text: await parseApiError(res) });
        return;
      }
      const data = await res.json();
      if (data.portalUrl && typeof window !== "undefined") {
        window.location.href = data.portalUrl;
      }
    } catch (err: unknown) {
      setSubMsg({ type: "error", text: err instanceof Error ? err.message : "接続に失敗しました。しばらくしてからお試しください" });
    } finally {
      setSubLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "新しいパスワードが一致しません" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "パスワードは8文字以上必要です" });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        setPasswordMsg({ type: "error", text: await parseApiError(res) });
        return;
      }
      setPasswordMsg({ type: "success", text: "パスワードが変更されました。再度ログインしてください。" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        clearAuth();
        router.push("/");
      }, 2000);
    } catch (err: unknown) {
      setPasswordMsg({ type: "error", text: err instanceof Error ? err.message : "接続に失敗しました。しばらくしてからお試しください" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "削除する") return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/me`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setDeleteError(await parseApiError(res));
        return;
      }
      clearAuth();
      router.push("/");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "接続に失敗しました。しばらくしてからお試しください");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isInitialized || !token) {
    return <div className="min-h-screen" style={{ background: "#0d1009" }} />;
  }

  return (
    <div className="min-h-screen" style={{ background: "#0d1009", color: "#ddd6c8" }}>
      <div className="mx-auto max-w-xl min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center gap-4 px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.15)]" style={{ background: "#131a14", borderBottom: "1px solid #1f2a1e" }}>
          <button onClick={() => router.back()} className="rounded-lg p-1.5 transition-colors hover:bg-white/5" style={{ color: "#9a8e7a" }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          </button>
          <h1 className="font-[family-name:var(--font-playfair)] text-xl" style={{ color: "#ddd6c8" }}>設定</h1>
        </div>

        {/* Subscription */}
        <div className="px-4 py-6" style={{ borderBottom: "1px solid #1f2a1e" }}>
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "#ddd6c8" }}>サブスクリプション</h2>
          {subMsg && (
            <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{
              background: subMsg.type === "success" ? "rgba(76,175,80,0.1)" : "rgba(201,168,76,0.1)",
              border: `1px solid ${subMsg.type === "success" ? "rgba(76,175,80,0.3)" : "rgba(201,168,76,0.3)"}`,
              color: subMsg.type === "success" ? "#81c784" : "#c9a84c",
            }}>
              {subMsg.text}
            </div>
          )}
          {!subStatus && !subFetchError ? (
            <p className="text-sm" style={{ color: "#6b7a66" }}>読み込み中...</p>
          ) : subFetchError ? (
            <div className="space-y-2">
              <p className="text-sm" style={{ color: "#c9a84c" }}>{subFetchError}</p>
              <button
                type="button"
                onClick={() => fetchSubStatus()}
                className="rounded px-4 py-2 text-sm font-medium transition-colors"
                style={{ border: "1px solid #2a3828", color: "#ddd6c8" }}
              >
                再試行
              </button>
            </div>
          ) : subStatus && (subStatus.status === "free" && !isPremium(currentUser?.subscriptionStatus) && searchParams.get("subscription") !== "success") ? (
            <div>
              <div className="relative mb-4 overflow-hidden rounded-xl p-5" style={{ background: "#192118", border: "1px solid #2a3828" }}>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-6 opacity-10" style={{ color: "#c9a84c" }}>
                  <span className="text-4xl">♠</span>
                  <span className="text-4xl">♥</span>
                  <span className="text-4xl">♦</span>
                  <span className="text-4xl">♣</span>
                </div>
                <h3 className="relative mb-2 font-[family-name:var(--font-playfair)] font-semibold" style={{ color: "#ddd6c8" }}>プレミアムプラン</h3>
                <ul className="relative mb-3 space-y-1.5 text-sm" style={{ color: "#9a8e7a" }}>
                  <li className="flex items-center gap-2"><span style={{ color: "#c9a84c" }}>✓</span> 広告非表示</li>
                  <li className="flex items-center gap-2"><span style={{ color: "#c9a84c" }}>✓</span> プレミアムバッジ表示</li>
                  <li className="flex items-center gap-2"><span style={{ color: "#c9a84c" }}>✓</span> 投稿文字数 1,000文字に拡張</li>
                </ul>
                <p className="relative mb-3 text-lg font-bold" style={{ color: "#ddd6c8" }}>¥980 <span className="text-sm font-normal" style={{ color: "#9a8e7a" }}>/月</span></p>
              </div>
              <button
                onClick={handleCheckout}
                disabled={subLoading}
                className="w-full rounded px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: "#c9a84c", color: "#0d1009" }}
              >
                {subLoading ? "処理中..." : "プレミアムに加入"}
              </button>
            </div>
          ) : subStatus && ((subStatus.status === "active" && !subStatus.cancelAtPeriodEnd) || (subStatus.status === "free" && (isPremium(currentUser?.subscriptionStatus) || searchParams.get("subscription") === "success"))) ? (
            <div>
              <div className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: "rgba(76,175,80,0.08)", border: "1px solid rgba(76,175,80,0.25)" }}>
                <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(76,175,80,0.2)", color: "#81c784" }}>有効</span>
                <span className="text-sm" style={{ color: "#81c784" }}>プレミアムプラン</span>
              </div>
              {subStatus.periodEnd && (
                <p className="mb-4 text-xs" style={{ color: "#6b7a66" }}>
                  次の更新日: {new Date(subStatus.periodEnd).toLocaleDateString("ja-JP")}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleOpenPortal}
                  disabled={subLoading}
                  className="rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ border: "1px solid #2a3828", color: "#ddd6c8" }}
                >
                  支払い情報を管理
                </button>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={subLoading}
                  className="rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ border: "1px solid rgba(201,168,76,0.3)", color: "#9a7c35" }}
                >
                  プランを解約
                </button>
              </div>
              {/* Cancel Confirmation Dialog */}
              {showCancelConfirm && (
                <div className="mt-4 rounded-lg p-4 animate-fade-in" style={{ background: "#192118", border: "1px solid #2a3828" }}>
                  <p className="mb-1 text-sm font-semibold" style={{ color: "#c9a84c" }}>解約の確認</p>
                  <p className="mb-4 text-sm" style={{ color: "#9a8e7a" }}>
                    解約しても、現在の請求期間（{subStatus.periodEnd ? new Date(subStatus.periodEnd).toLocaleDateString("ja-JP") : ""}）までプレミアム機能をご利用いただけます。即時解約ではありません。
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { handleCancelSub(); setShowCancelConfirm(false); }}
                      disabled={subLoading}
                      className="rounded px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                      style={{ border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}
                    >
                      {subLoading ? "処理中..." : "期末で解約する"}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="rounded px-4 py-2 text-sm transition-colors"
                      style={{ border: "1px solid #2a3828", color: "#9a8e7a" }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : subStatus?.status === "canceled" || subStatus?.cancelAtPeriodEnd ? (
            <div>
              <div className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.25)" }}>
                <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>解約予定</span>
                <span className="text-sm" style={{ color: "#c9a84c" }}>プレミアムプラン</span>
              </div>
              {subStatus.periodEnd && (
                <p className="mb-4 text-xs" style={{ color: "#6b7a66" }}>
                  {new Date(subStatus.periodEnd).toLocaleDateString("ja-JP")} まで利用可能
                </p>
              )}
              <button
                onClick={handleReactivateSub}
                disabled={subLoading}
                className="rounded px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: "#c9a84c", color: "#0d1009" }}
              >
                {subLoading ? "処理中..." : "プランを再開"}
              </button>
            </div>
          ) : subStatus?.status === "past_due" ? (
            <div>
              <div className="mb-3 rounded-lg px-4 py-3" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)" }}>
                <div className="mb-1 flex items-center gap-2">
                  <svg className="h-4 w-4" style={{ color: "#c9a84c" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  <span className="text-sm font-semibold" style={{ color: "#c9a84c" }}>お支払いに問題があります</span>
                </div>
                <p className="text-xs" style={{ color: "#9a7c35" }}>
                  支払い方法を更新して、プレミアム機能を引き続きご利用ください。
                </p>
              </div>
              <button
                onClick={handleOpenPortal}
                disabled={subLoading}
                className="rounded px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: "#c9a84c", color: "#0d1009" }}
              >
                支払い情報を更新
              </button>
            </div>
          ) : null}
        </div>

        {/* Security & Privacy */}
        <div className="px-4 py-6" style={{ borderBottom: "1px solid #1f2a1e" }}>
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#192118" }}>
              <svg className="h-4 w-4" style={{ color: "#c9a84c" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            </div>
            <h2 className="text-sm font-semibold" style={{ color: "#ddd6c8" }}>セキュリティとプライバシー</h2>
          </div>

          {/* Password Change */}
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a66" }}>パスワード変更</h3>
          {passwordMsg && (
            <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{
              background: passwordMsg.type === "success" ? "rgba(76,175,80,0.1)" : "rgba(201,168,76,0.1)",
              border: `1px solid ${passwordMsg.type === "success" ? "rgba(76,175,80,0.3)" : "rgba(201,168,76,0.3)"}`,
              color: passwordMsg.type === "success" ? "#81c784" : "#c9a84c",
            }}>
              {passwordMsg.text}
            </div>
          )}
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>現在のパスワード</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  className="w-full rounded px-3 py-2 pr-10 text-sm outline-none"
                  style={{ background: "#131a14", border: "1px solid #2a3828", color: "#ddd6c8" }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#6b7a66" }}
                  aria-label={showCurrentPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showCurrentPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>新しいパスワード</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="w-full rounded px-3 py-2 pr-10 text-sm outline-none"
                  style={{ background: "#131a14", border: "1px solid #2a3828", color: "#ddd6c8" }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#6b7a66" }}
                  aria-label={showNewPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showNewPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>パスワード確認</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full rounded px-3 py-2 pr-10 text-sm outline-none"
                  style={{ background: "#131a14", border: "1px solid #2a3828", color: "#ddd6c8" }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#6b7a66" }}
                  aria-label={showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showConfirmPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="rounded px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: "#c9a84c", color: "#0d1009" }}
            >
              {passwordLoading ? "変更中..." : "パスワードを変更"}
            </button>
          </form>

          {/* Privacy & Legal Links */}
          <div className="mt-6 pt-5" style={{ borderTop: "1px solid #1f2a1e" }}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a66" }}>プライバシーと法的情報</h3>
            <div className="space-y-1">
              <a
                href="/privacy"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/5"
                style={{ color: "#ddd6c8" }}
              >
                <span className="flex items-center gap-2.5">
                  <svg className="h-4 w-4" style={{ color: "#6b7a66" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  プライバシーポリシー
                </span>
                <svg className="h-4 w-4" style={{ color: "#2a3828" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </a>
              <a
                href="/terms"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/5"
                style={{ color: "#ddd6c8" }}
              >
                <span className="flex items-center gap-2.5">
                  <svg className="h-4 w-4" style={{ color: "#6b7a66" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                  利用規約
                </span>
                <svg className="h-4 w-4" style={{ color: "#2a3828" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </a>
            </div>
          </div>

          {/* Account Deletion */}
          <div className="mt-6 pt-5" style={{ borderTop: "1px solid #1f2a1e" }}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#e05050" }}>アカウント削除</h3>
            <p className="mb-4 text-xs" style={{ color: "#6b7a66" }}>
              アカウントを削除すると、全ての投稿・フォロー関係・通知が永久に削除されます。この操作は取り消せません。
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded px-5 py-2 text-sm font-semibold transition-colors"
                style={{ border: "1px solid rgba(224,80,80,0.3)", color: "#e05050" }}
              >
                アカウントを削除
              </button>
            ) : (
              <div className="rounded-lg p-4 animate-fade-in" style={{ background: "rgba(224,80,80,0.06)", border: "1px solid rgba(224,80,80,0.25)" }}>
                <p className="mb-3 text-sm" style={{ color: "#e05050" }}>
                  本当にアカウントを削除しますか？確認のため「削除する」と入力してください。
                </p>
                {deleteError && (
                  <p className="mb-3 text-sm" style={{ color: "#e05050" }}>{deleteError}</p>
                )}
                <input
                  type="text"
                  className="mb-3 w-full rounded px-3 py-2 text-sm outline-none"
                  style={{ background: "#131a14", border: "1px solid rgba(224,80,80,0.3)", color: "#ddd6c8" }}
                  placeholder="削除する"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoComplete="off"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== "削除する" || deleteLoading}
                    className="rounded px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ background: "#e05050", color: "#fff" }}
                  >
                    {deleteLoading ? "削除中..." : "完全に削除する"}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                    className="rounded px-5 py-2 text-sm transition-colors"
                    style={{ border: "1px solid #2a3828", color: "#9a8e7a" }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
