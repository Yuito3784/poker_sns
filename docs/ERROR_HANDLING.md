# エラーハンドリング方針

## 概要

- **バックエンド**: 想定内は `HttpException`（BadRequest / Unauthorized / NotFound 等）でメッセージを返し、想定外はログを残して 500 で返す。`catch` ではログを必ず取り、再 throw または適切な例外に変換する。
- **フロントエンド**: API のエラーレスポンスは `parseApiError(res)` でメッセージを取得し、ユーザーに表示する。ネットワークエラー時は「接続に失敗しました」等の文言を表示する。

---

## バックエンド

### 例外

- `GlobalExceptionFilter` がすべての例外をキャッチし、`statusCode` と `message` を JSON で返す。
- 4xx は WARN、5xx は ERROR でログを出す。5xx のときは Webhook 通知も送る。

### サービス層

- **Stripe 呼び出し**: `try/catch` で囲み、失敗時はログ（`this.logger.error` / `warn`）を出したうえで `BadRequestException` などでユーザー向けメッセージを返す。スタックは ERROR 時のみ渡す。
- **OAuth コールバック**（Google / LINE 等）: `catch` で必ず `this.logger.error` し、リダイレクト先に `authError` を付与。
- その他: エラーを握りつぶさず、ログを出してから `throw` する。

---

## フロントエンド

### `lib/api-error.ts`

- `parseApiError(res: Response): Promise<string>` で、レスポンス body の `message` / `error` を優先し、なければステータスコードから文言を決める。
- 新規 API 呼び出しでは、`!res.ok` のときに `setError(await parseApiError(res))` のように使い、サーバーが返したメッセージをそのまま表示する。

### 推奨パターン

```ts
const res = await fetchWithAuth(url, options);
if (!res.ok) {
  setError(await parseApiError(res));
  return;
}
// 成功時の処理
```

ネットワークエラー（`fetch` が throw する場合）:

```ts
} catch (err: unknown) {
  setError(err instanceof Error ? err.message : "接続に失敗しました。しばらくしてからお試しください");
}
```

### 既に適用している箇所

- 設定: サブスク（checkout / cancel / reactivate / portal / confirm-session）、課金状況取得失敗時の表示と再試行、パスワード変更、アカウント削除。
- 認証: AuthForm のログイン・登録。

### 今後の拡張

- 投稿・いいね・フォロー・プロフィール編集など、ユーザー操作の結果を表示する API では、`!res.ok` のときに `parseApiError(res)` でメッセージを取得し、トーストやインラインで表示する。
- 一覧取得など「失敗しても致命的でない」場合は、再試行ボタンや「読み込みに失敗しました」の表示を検討する。
