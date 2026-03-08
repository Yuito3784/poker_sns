"use client";

import { FormEvent, useState } from "react";
import { API_BASE } from "../../lib/api";
import type { User } from "../../lib/types";

type MagicLinkState = "idle" | "sending" | "sent";

type Props = {
  onAuthSuccess: (token: string, user: User) => void;
};

type FieldErrors = {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
};

// Google ロゴ SVG
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// LINE ロゴ SVG
function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

// X (Twitter) ロゴ SVG
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function AuthForm({ onAuthSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkState, setMagicLinkState] = useState<MagicLinkState>("idle");
  const [showMagicLink, setShowMagicLink] = useState(false);

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "name":
        if (!value.trim()) return "名前を入力してください";
        if (value.trim().length < 1 || value.trim().length > 50) return "名前は1〜50文字で入力してください";
        return undefined;
      case "username":
        if (!value.trim()) return "ユーザー名を入力してください";
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return "英数字とアンダースコアのみ使用できます";
        if (value.length < 3 || value.length > 20) return "3〜20文字で入力してください";
        return undefined;
      case "email":
        if (!value.trim()) return "メールアドレスを入力してください";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "正しいメールアドレスを入力してください";
        return undefined;
      case "password":
        if (!value) return "パスワードを入力してください";
        if (mode === "register" && value.length < 8) return "8文字以上で入力してください";
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const validateAll = (): boolean => {
    const errors: FieldErrors = {};
    if (mode === "register") {
      errors.name = validateField("name", name);
      errors.username = validateField("username", username);
    }
    errors.email = validateField("email", email);
    errors.password = validateField("password", password);
    setFieldErrors(errors);
    setTouched({ name: true, username: true, email: true, password: true });
    return !Object.values(errors).some(Boolean);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateAll()) return;
    setSubmitting(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" ? { name, username } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "認証に失敗しました");
      }

      const data = await res.json();
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      onAuthSuccess(data.accessToken, data.user);
      setPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof FieldErrors) =>
    `w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all ${
      touched[field] && fieldErrors[field]
        ? "border-red-800/60 ring-1 ring-red-800/40"
        : "focus:ring-1"
    }`;

  const switchMode = () => {
    setMode((p) => (p === "login" ? "register" : "login"));
    setError(null);
    setFieldErrors({});
    setTouched({});
    setShowMagicLink(false);
    setMagicLinkState("idle");
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!magicLinkEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(magicLinkEmail)) {
      setError("正しいメールアドレスを入力してください");
      return;
    }
    setError(null);
    setMagicLinkState("sending");
    try {
      await fetch(`${API_BASE}/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: magicLinkEmail }),
      });
      setMagicLinkState("sent");
    } catch {
      setMagicLinkState("idle");
      setError("送信に失敗しました。もう一度お試しください。");
    }
  };

  return (
    <div
      className="w-full max-w-sm rounded-xl p-8"
      style={{
        background: "#0f1410",
        border: "1px solid #1f2a1e",
        boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.05)",
      }}
    >
      {/* Logo */}
      <div className="mb-6 text-center">
        <div className="mb-3 flex justify-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(135deg, #c9a84c22, #9a7c3510)",
              border: "1.5px solid rgba(201,168,76,0.3)",
            }}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#c9a84c" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
        </div>
        <h1
          className="font-[family-name:var(--font-playfair)] text-xl font-bold tracking-tight"
          style={{ color: "#ddd6c8" }}
        >
          Poker SNS
        </h1>
        <p className="mt-0.5 text-xs" style={{ color: "#6b7a66" }}>
          ポーカーハンドを共有しよう
        </p>
      </div>

      {/* Social login buttons */}
      <div className="space-y-2">
        <a
          href={`${API_BASE}/auth/google`}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98]"
          style={{
            background: "#1a1f1e",
            border: "1px solid #2a3828",
            color: "#ddd6c8",
          }}
        >
          <GoogleIcon />
          Googleでログイン
        </a>
        <a
          href={`${API_BASE}/auth/line`}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-[0.98]"
          style={{ background: "#00b900", border: "1px solid #009900" }}
        >
          <LineIcon />
          LINEでログイン
        </a>
        {/* Xログインは一時無効（復活時は grid grid-cols-2 で LINE と X を並べる）
        <a href={`${API_BASE}/auth/x`} ...>X</a>
        */}
      </div>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "#1f2a1e" }} />
        <span className="text-xs" style={{ color: "#6b7a66" }}>またはメールで</span>
        <div className="h-px flex-1" style={{ background: "#1f2a1e" }} />
      </div>

      {/* Mode switch */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold" style={{ color: "#ddd6c8" }}>
          {mode === "login" ? "ログイン" : "新規登録"}
        </h2>
        <button
          type="button"
          onClick={switchMode}
          className="text-xs hover:underline"
          style={{ color: "#c9a84c" }}
        >
          {mode === "login" ? "新規登録はこちら →" : "← ログインに切り替え"}
        </button>
      </div>

      {error && (
        <div
          className="mb-3 rounded-lg px-3 py-2 text-sm"
          style={{
            background: "rgba(176,48,48,0.15)",
            border: "1px solid rgba(176,48,48,0.35)",
            color: "#f09090",
          }}
        >
          {error}
        </div>
      )}

      {/* メールリンクログインは一時無効
      Magic Link panel (login mode only)
      {mode === "login" && showMagicLink && (
        <div
          className="mb-4 rounded-lg p-4"
          style={{
            background: "rgba(201,168,76,0.06)",
            border: "1px solid rgba(201,168,76,0.2)",
          }}
        >
          {magicLinkState === "sent" ? (
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="#c9a84c" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "#c9a84c" }}>メールを送信しました</p>
              <p className="mt-1 text-xs" style={{ color: "#9a8e7a" }}>
                <span className="font-medium">{magicLinkEmail}</span> にログインリンクを送りました。
                メールをご確認ください（15分間有効）。
              </p>
              <button
                type="button"
                onClick={() => { setMagicLinkState("idle"); setMagicLinkEmail(""); }}
                className="mt-3 text-xs hover:underline"
                style={{ color: "#c9a84c" }}
              >
                別のメールで試す
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-2">
              <p className="text-xs font-medium" style={{ color: "#c9a84c" }}>パスワード不要でログイン</p>
              <input
                type="email"
                value={magicLinkEmail}
                onChange={(e) => setMagicLinkEmail(e.target.value)}
                placeholder="登録済みのメールアドレス"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: "#0d1009",
                  border: "1px solid #2a3828",
                  color: "#ddd6c8",
                }}
                required
              />
              <button
                type="submit"
                disabled={magicLinkState === "sending"}
                className="w-full rounded-lg px-3 py-2 text-sm font-semibold transition-all disabled:opacity-60"
                style={{ background: "#c9a84c", color: "#0d1009" }}
              >
                {magicLinkState === "sending" ? "送信中..." : "ログインリンクを送信"}
              </button>
            </form>
          )}
        </div>
      )}
      */}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "register" && (
          <>
            <div className="space-y-1">
              <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>名前</label>
              <input
                className={inputClass("name")}
                style={{
                  background: "#0d1009",
                  border: `1px solid ${touched.name && fieldErrors.name ? "rgba(176,48,48,0.5)" : "#1f2a1e"}`,
                  color: "#ddd6c8",
                }}
                value={name}
                onChange={(e) => { setName(e.target.value); if (touched.name) setFieldErrors((p) => ({ ...p, name: validateField("name", e.target.value) })); }}
                onBlur={() => handleBlur("name", name)}
                placeholder="例：田中太郎"
                required
              />
              {touched.name && fieldErrors.name && <p className="text-xs" style={{ color: "#f09090" }}>{fieldErrors.name}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>ユーザー名（@）</label>
              <input
                className={inputClass("username")}
                style={{
                  background: "#0d1009",
                  border: `1px solid ${touched.username && fieldErrors.username ? "rgba(176,48,48,0.5)" : "#1f2a1e"}`,
                  color: "#ddd6c8",
                }}
                value={username}
                onChange={(e) => { setUsername(e.target.value); if (touched.username) setFieldErrors((p) => ({ ...p, username: validateField("username", e.target.value) })); }}
                onBlur={() => handleBlur("username", username)}
                placeholder="例：taro_poker（3〜20文字）"
                required
              />
              {touched.username && fieldErrors.username && <p className="text-xs" style={{ color: "#f09090" }}>{fieldErrors.username}</p>}
            </div>
          </>
        )}
        <div className="space-y-1">
          <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>メールアドレス</label>
          <input
            type="email"
            className={inputClass("email")}
            style={{
              background: "#0d1009",
              border: `1px solid ${touched.email && fieldErrors.email ? "rgba(176,48,48,0.5)" : "#1f2a1e"}`,
              color: "#ddd6c8",
            }}
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (touched.email) setFieldErrors((p) => ({ ...p, email: validateField("email", e.target.value) })); }}
            onBlur={() => handleBlur("email", email)}
            placeholder="例：taro@example.com"
            autoComplete="email"
            required
          />
          {touched.email && fieldErrors.email && <p className="text-xs" style={{ color: "#f09090" }}>{fieldErrors.email}</p>}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>パスワード</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className={`${inputClass("password")} pr-10`}
              style={{
                background: "#0d1009",
                border: `1px solid ${touched.password && fieldErrors.password ? "rgba(176,48,48,0.5)" : "#1f2a1e"}`,
                color: "#ddd6c8",
              }}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (touched.password) setFieldErrors((p) => ({ ...p, password: validateField("password", e.target.value) })); }}
              onBlur={() => handleBlur("password", password)}
              placeholder={mode === "register" ? "8文字以上" : "パスワード"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "#6b7a66" }}
              aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {touched.password && fieldErrors.password && <p className="text-xs" style={{ color: "#f09090" }}>{fieldErrors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "#c9a84c", color: "#0d1009" }}
        >
          {submitting ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              処理中...
            </>
          ) : (
            mode === "login" ? "ログイン" : "登録する"
          )}
        </button>
      </form>

      {mode === "login" && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <a
            href="/forgot-password"
            className="text-xs hover:underline"
            style={{ color: "#6b7a66" }}
          >
            パスワードをお忘れですか？
          </a>
          {/* メールリンクログインは一時無効
          <span style={{ color: "#2a3828" }}>|</span>
          <button
            type="button"
            onClick={() => { setShowMagicLink((p) => !p); setError(null); setMagicLinkState("idle"); setMagicLinkEmail(""); }}
            className="text-xs hover:underline"
            style={{ color: "#6b7a66" }}
          >
            {showMagicLink ? "パスワードでログイン" : "メールリンクでログイン"}
          </button>
          */}
        </div>
      )}
      {mode === "register" && (
        <p className="mt-4 text-center text-[11px]" style={{ color: "#6b7a66" }}>
          登録することで、
          <a href="/terms" className="hover:underline" style={{ color: "#c9a84c" }}>利用規約</a>
          と
          <a href="/privacy" className="hover:underline" style={{ color: "#c9a84c" }}>プライバシーポリシー</a>
          に同意したものとみなされます。
        </p>
      )}
    </div>
  );
}
