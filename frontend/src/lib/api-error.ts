/**
 * API レスポンスからユーザー向けエラーメッセージを取得する。
 * バックエンドの GlobalExceptionFilter が返す { statusCode, message } 形式に対応。
 */
export async function parseApiError(res: Response): Promise<string> {
  try {
    const body = await res.json().catch(() => null);
    if (body && typeof body.message === "string" && body.message.trim()) {
      return body.message.trim();
    }
    if (body && typeof body.error === "string" && body.error.trim()) {
      return body.error.trim();
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
