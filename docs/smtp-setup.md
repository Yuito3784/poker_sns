# SMTP 設定ガイド

メール認証・パスワードリセットなどで送信に使う SMTP の設定方法です。

---

## 環境変数一覧

バックエンド（NestJS）で参照する変数です。**Railway の Variables** または **ローカルの .env / docker-compose** に設定します。

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `SMTP_HOST` | SMTP サーバーのホスト名 | `smtp.gmail.com` |
| `SMTP_PORT` | ポート番号（通常 587 または 465） | `587` |
| `SMTP_SECURE` | 465 番ポートで SSL を使う場合 `true` | `false`（587 のときは false） |
| `SMTP_USER` | 認証ユーザー（メールアドレス or ユーザー名） | サービス側のログイン名 |
| `SMTP_PASS` | 認証パスワード（Gmail の場合は「アプリパスワード」） | ******** |
| `SMTP_FROM` | 送信元として表示するアドレス（From） | `noreply@yourdomain.com` |

- **認証なし SMTP**（例: ローカル MailHog）の場合は `SMTP_USER` / `SMTP_PASS` を**空のまま**にすると、auth なしで接続します。
- `SMTP_HOST` が空のときはメール送信は行われず、開発時は「再送信」で認証リンクが API から返ります（[backend/README.md](../backend/README.md) 参照）。

---

## ローカル開発での設定

### 1. 設定しない（メールは送らない）

- 変数を設定しなければ、送信は失敗しますが **「再送信」ボタンで認証リンクが返り、そのリンクで認証完了**できます。
- いち早く試したいだけならこのままで問題ありません。

### 2. MailHog で「届いたメール」を確認する（推奨・docker-compose に組み込み済み）

このリポジトリの **docker-compose.yml には MailHog とバックエンドのデフォルト SMTP 設定が入っています。**

**手順:**

1. MailHog を含めて起動する:
   ```bash
   cd /path/to/poker_sns
   docker compose up -d db backend mailhog
   ```
2. フロントは別ターミナルで `npm run dev`（ポート 3000）。
3. 新規登録または「再送信」を実行すると、バックエンドが MailHog にメールを送信します。
4. **http://localhost:8025** を開くと MailHog の Web UI で届いたメールを確認できます。

- `.env` で `SMTP_HOST` を指定していない場合、バックエンドは自動で `mailhog:1025` を使います。
- Gmail など別 SMTP を使う場合は、`.env` に `SMTP_HOST=smtp.gmail.com` などを設定すれば上書きされます。

### 3. Ethereal（テスト用の仮メール）

実メールを送らずに「送信ログ」だけ確認したい場合: [Ethereal](https://ethereal.email/) でアカウントを作成し、表示される SMTP 情報をそのまま使います。

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=あなたのEtherealユーザー
SMTP_PASS=あなたのEtherealパスワード
SMTP_FROM=noreply@pokersns.com
```

Ethereal に届いたメールは Web 上で閲覧できます。

---

## dev 環境で Gmail から送る（Railway など）

ローカルで MailHog の動作を確認したあと、**dev 用の Railway バックエンド**で実際のメール送信を試す手順です。

1. **Gmail 側の準備**
   - Google アカウントで [2 段階認証](https://myaccount.google.com/security) を有効にする。
   - [アプリパスワード](https://myaccount.google.com/apppasswords) を発行し、表示された 16 文字のパスワードを控える。

2. **Railway の dev 用バックエンドに Variables を追加**
   - 対象: **dev ブランチ用**のバックエンドサービス。
   - **Variables** で次を追加（値はあなたの Gmail とアプリパスワードに置き換え）:

   | Name | Value |
   |------|--------|
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_SECURE` | `false` |
   | `SMTP_USER` | あなたの Gmail アドレス |
   | `SMTP_PASS` | 発行したアプリパスワード（16 文字） |
   | `SMTP_FROM` | あなたの Gmail アドレス（または送信元に使うアドレス） |

3. **デプロイ後、dev のフロントから確認**
   - Vercel の dev プレビュー（または dev 用 URL）でログインし、「再送信」を実行。
   - Gmail の受信トレイ（および迷惑メール）に認証メールが届くか確認。

※ 本番でも同じ Gmail を使う場合は、本番用バックエンドの Variables に同じ SMTP_* を設定します。送信元ドメインを分けたい場合は、後から SendGrid / Resend などに切り替えるとよいです。

---

## 本番・ステージングでの設定例

### Gmail（個人 or  Google Workspace）

1. Google アカウントで **2 段階認証** を有効にする。
2. **アプリパスワード** を発行: [Google アカウント → セキュリティ → アプリパスワード](https://myaccount.google.com/apppasswords)。
3. 次のように設定（通常は 587 + STARTTLS）。

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=あなたのGmailアドレス
SMTP_PASS=発行した16文字のアプリパスワード
SMTP_FROM=あなたのGmailアドレス
```

※ 本番では `SMTP_FROM` を送信ドメインに合わせる場合、Gmail の「送信元」設定と一致させる必要があります。

### SendGrid

1. [SendGrid](https://sendgrid.com/) でアカウント作成 → **API Key** を作成（Mail Send 権限）。
2. ドメイン認証などは SendGrid の案内に従う。

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=あなたのSendGridのAPIキー
SMTP_FROM=noreply@あなたの認証済みドメイン
```

※ ユーザー名は文字通り `apikey` のままです。

### Resend

1. [Resend](https://resend.com/) でアカウント作成 → API Key を発行。
2. ドメインを追加・認証する。

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=あなたのResendのAPIキー
SMTP_FROM=noreply@あなたの認証済みドメイン
```

### AWS SES

1. AWS コンソールで **SES** を有効化し、送信元メールアドレスまたはドメインを認証する。
2. SMTP 用の認証情報を **SES → SMTP settings → Create SMTP credentials** で作成。

```env
SMTP_HOST=email-smtp.リージョン.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=SESのSMTPユーザー名
SMTP_PASS=SESのSMTPパスワード
SMTP_FROM=noreply@あなたの認証済みドメイン
```

※ リージョンは利用する SES のリージョン（例: `ap-northeast-1`）に合わせます。

---

## 設定を入れる場所

| 環境 | 設定場所 |
|------|----------|
| ローカル（Docker） | リポジトリ直下の `.env` に書くか、`docker-compose.yml` の `backend.environment` で `SMTP_*` を指定。 |
| Railway | プロジェクト → バックエンドサービス → **Variables** で `SMTP_HOST` など追加。 |

- 本番では **SMTP_PASS や API キーは Variables にだけ入れ、コードや .env を Git にコミットしない**でください。
- `.env.example` には値の例だけを記載し、実際のパスワードは含めません。

---

## このアプリでメールが送られるタイミング

- **メール認証**: 新規登録時・「再送信」押下時
- **パスワードリセット**: 「パスワードを忘れた」でメール送信時
- （その他、パスワード変更通知など実装していれば同様に `auth.service` の `createMailTransporter()` を利用）

設定後、メールが届かない場合は **バックエンドのログ**（送信エラーや `[DEV] 認証リンク` の有無）を確認してください。
