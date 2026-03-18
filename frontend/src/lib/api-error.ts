/**
 * API レスポンスからユーザー向けエラーメッセージを取得する。
 * バックエンドの GlobalExceptionFilter が返す { statusCode, message } 形式に対応。
 */
export async function parseApiError(res: Response): Promise<string> {
  try {
    const body = await res.json().catch(() => null);
    if (body && typeof body.message === "string" && body.message.trim()) {
      const raw = body.message.trim();
      // バックエンド側の英語メッセージが混ざっても、UIは日本語で統一する
      const mapped: Record<string, string> = {
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
        "Webhook secret not configured":
          "決済機能が現在利用できません。時間をおいて再度お試しください",
        "Invalid webhook signature":
          "決済機能が現在利用できません。時間をおいて再度お試しください",
        // AI analysis
        "AI analysis is not configured. Set ANTHROPIC_API_KEY environment variable.":
          "AI解析機能が現在利用できません。時間をおいて再度お試しください",
        // X OAuth
        "X OAuth is not configured": "Xログインは現在利用できません",
      };

      return mapped[raw] ?? raw;
    }
    if (body && typeof body.error === "string" && body.error.trim()) {
      const raw = body.error.trim();
      const mapped: Record<string, string> = {
        Unauthorized: "メールアドレスまたはパスワードが違います",
      };
      return mapped[raw] ?? raw;
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
