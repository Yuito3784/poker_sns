// デフォルトは docker-compose のバックエンドポートに合わせる（.env.local で上書き可）
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * アップロード画像のURLを返す。
 * 画像は常にバックエンド（API_BASE）から配信される。
 * 本番: nginx が /api/uploads/ → backend /uploads/ にプロキシ
 * 開発: API_BASE が直接バックエンドを指す
 */
export function uploadsUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// AuthContext の clearAuth を登録する仕組み
let onAuthCleared: (() => void) | null = null;
export function registerAuthClearHandler(handler: () => void) {
  onAuthCleared = handler;
}

// AuthContext の setAuth を登録する仕組み（リフレッシュ後にstate同期）
let onAuthRefreshed: ((token: string) => void) | null = null;
export function registerAuthRefreshHandler(handler: (token: string) => void) {
  onAuthRefreshed = handler;
}

function clearAllAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  onAuthCleared?.();
}

async function doRefresh(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAllAuth();
      return null;
    }

    const data = await res.json();
    localStorage.setItem("token", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    // AuthContext の state も同期
    onAuthRefreshed?.(data.accessToken);
    return data.accessToken;
  } catch {
    // ネットワークエラーの場合はトークンをクリアしない（一時的な問題の可能性）
    return null;
  }
}

async function getRefreshedToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  isRefreshing = true;
  refreshPromise = doRefresh().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  if (typeof window === "undefined") return fetch(url, options);
  let token = localStorage.getItem("token");
  const headers = new Headers(options.headers);

  // トークンの有効期限を事前チェックし、期限切れなら先にリフレッシュ
  if (token && isTokenExpiredCheck(token)) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      const newToken = await getRefreshedToken();
      if (newToken) {
        token = newToken;
      } else {
        // リフレッシュ失敗 → そのまま進む（401が返る）
      }
    }
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // FormDataの場合はContent-Typeを削除（boundary付きでブラウザが自動設定する必要がある）
  if (options.body instanceof FormData) {
    headers.delete("Content-Type");
  }

  const res = await fetch(url, { ...options, headers });

  // 401が返った場合のフォールバック（事前チェックを通り抜けたケース）
  if (res.status === 401 && localStorage.getItem("refreshToken")) {
    // 既に直前でリフレッシュ済みなら再試行しない（無限ループ防止）
    const currentToken = localStorage.getItem("token");
    if (currentToken && currentToken !== token) {
      // 別のリクエストが既にリフレッシュ済み → 新しいトークンで再試行
      headers.set("Authorization", `Bearer ${currentToken}`);
      return fetch(url, { ...options, headers });
    }
    const newToken = await getRefreshedToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      return fetch(url, { ...options, headers });
    }
    // リフレッシュ失敗 → 認証クリア
    clearAllAuth();
  }

  return res;
}

/** 有効なトークンを非同期で取得（必要ならリフレッシュ） */
export async function getValidTokenAsync(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null;

  if (!isTokenExpiredCheck(token)) {
    return token;
  }

  // 期限切れ → リフレッシュ試行
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    clearAllAuth();
    return null;
  }

  return getRefreshedToken();
}

function isTokenExpiredCheck(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    // 30秒の余裕を持って期限切れ判定
    return payload.exp * 1000 < Date.now() + 30000;
  } catch {
    return true;
  }
}
