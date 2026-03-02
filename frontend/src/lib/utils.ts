// JWTトークンの有効期限チェック
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// トークン検証：有効なトークンを返すか、期限切れならnullを返す
// リフレッシュトークンがある場合はクリアしない（fetchWithAuthが自動リフレッシュする）
export function getValidToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }
  if (isTokenExpired(token)) {
    // リフレッシュトークンがあれば、期限切れのトークンでも返す
    // fetchWithAuth が 401 を受けて自動リフレッシュする
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      return token;
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    return null;
  }
  return token;
}

// 相対時間表示（X風）
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "たった今";
  if (diffMin < 60) return `${diffMin}分`;
  if (diffHour < 24) return `${diffHour}時間`;
  if (diffDay < 7) return `${diffDay}日`;
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}
