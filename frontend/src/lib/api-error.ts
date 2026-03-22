/**
 * API レスポンスからユーザー向けエラーメッセージを取得する。
 * バックエンドの GlobalExceptionFilter が返す { statusCode, message } 形式に対応。
 */

/** Nest / class-validator が message を文字列配列で返す場合の正規化 */
export function normalizeApiMessageField(message: unknown): string | null {
  if (typeof message === "string") {
    const t = message.trim();
    return t || null;
  }
  if (Array.isArray(message)) {
    const parts = message
      .map((item) => (typeof item === "string" ? item.trim() : String(item)))
      .filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  }
  return null;
}

const BACKEND_MESSAGE_MAP: Record<string, string> = {
  // Auth / access
  Unauthorized: "メールアドレスまたはパスワードが違います",
  "User not found": "ユーザーが見つかりません",
  "Post not found": "投稿が見つかりません",
  "Cannot follow yourself": "自分自身をフォローすることはできません",
  "You can only delete your own posts": "自分の投稿のみ削除できます",
  "You can only pin your own posts": "自分の投稿のみ固定できます",
  // Realtime notifications
  "SSE ticket is required": "セッションが無効です。再読み込みしてください",
  "Invalid or expired SSE ticket": "セッションが無効です。再読み込みしてください",
  // Payment / webhooks (ユーザー向けには一般化)
  "Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.":
    "決済機能が現在利用できません。時間をおいて再度お試しください",
  "Stripe is not configured.": "決済機能が現在利用できません。時間をおいて再度お試しください",
  "Webhook secret not configured": "決済機能が現在利用できません。時間をおいて再度お試しください",
  "Invalid webhook signature": "決済機能が現在利用できません。時間をおいて再度お試しください",
  // AI analysis
  "AI analysis is not configured. Set ANTHROPIC_API_KEY environment variable.":
    "AI解析機能が現在利用できません。時間をおいて再度お試しください",
  // X OAuth
  "X OAuth is not configured": "Xログインは現在利用できません",
  // 投稿画像（旧メッセージ互換・サーバー側も文言更新済み想定）
  "有効なURLを入力してください":
    "画像のデータ形式をサーバーが受け付けられませんでした。画像を選び直してからもう一度投稿してください。問題が続く場合は時間をおいてお試しください。",
};

export function mapBackendUserMessage(raw: string): string {
  return BACKEND_MESSAGE_MAP[raw] ?? raw;
}

/** JSON ボディを既にパース済みのとき（throw new Error 用） */
export function userMessageFromApiBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const obj = body as Record<string, unknown>;
  const normalized = normalizeApiMessageField(obj.message);
  if (normalized) return mapBackendUserMessage(normalized);
  return fallback;
}

/**
 * fetch が失敗したときなど、ブラウザが投げる Error をユーザー向けに変換する。
 */
export function formatClientSideError(
  err: unknown,
  fallback = "接続に失敗しました。しばらくしてからお試しください",
): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message;
  if (msg === "session_invalid") {
    return "ログインの続行に失敗しました。もう一度ログインしてください。";
  }
  if (
    msg === "Failed to fetch" ||
    msg === "Load failed" ||
    msg === "NetworkError when attempting to fetch resource." ||
    /networkerror/i.test(msg)
  ) {
    return "通信に失敗しました。ネットワーク接続を確認し、しばらくしてからお試しください。";
  }
  return msg.trim() || fallback;
}

export async function parseApiError(res: Response): Promise<string> {
  try {
    const body = await res.json().catch(() => null);
    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>;
      const normalized = normalizeApiMessageField(obj.message);
      if (normalized) {
        return mapBackendUserMessage(normalized);
      }
      if (typeof obj.error === "string" && obj.error.trim()) {
        const raw = obj.error.trim();
        const mapped: Record<string, string> = {
          Unauthorized: "メールアドレスまたはパスワードが違います",
        };
        return mapped[raw] ?? raw;
      }
    }
  } catch {
    // JSON パース失敗時はステータスからメッセージを生成
  }
  switch (res.status) {
    case 400:
      return "リクエストが正しくありません";
    case 401:
      return "ログインし直してください";
    case 403:
      return "この操作は許可されていません";
    case 404:
      return "見つかりませんでした";
    case 429:
      return "しばらく時間をおいてから再度お試しください";
    case 500:
    case 502:
    case 503:
      return "サーバーエラーが発生しました。しばらくしてからお試しください";
    default:
      return "エラーが発生しました";
  }
}
