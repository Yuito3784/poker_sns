# Vercel Deploy Requirements Spec

## Overview
フロントエンド(Next.js 16)をVercelにデプロイし、CEOにURLを報告する。
バックエンドAPIは未デプロイのため、二段階方式で進行する。

## Phase 1: フロントエンド静的デプロイ (即時)

### Prerequisites
- [x] セキュリティ修正コミット済み
- [x] フロントエンドビルド通過確認済み
- [ ] 未コミットdocs変更のコミット

### Vercel Project Settings
| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Node.js Version | 20.x |

### Environment Variables (Phase 1)
フロントエンド単体表示のため、API接続なしで動作する最小構成。

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | (空 or placeholder) | Phase 2で設定 |
| `NEXT_PUBLIC_SITE_URL` | Vercel自動割り当てURL | デプロイ後に確定 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | (未設定可) | アナリティクス後回し可 |

### 想定される問題と対策
1. **next.config.ts の `turbopack.root: __dirname`**: Vercel環境で動作するか要確認。問題があれば削除。
2. **API未接続状態のエラーハンドリング**: 認証画面・フィード画面でAPIコール失敗時のUI表示を確認。
3. **画像アップロードパス(`/uploads/`)**: Vercelは永続ファイルストレージ未対応。Phase 2でS3等に移行必要。

## Phase 2: API接続 (後続)

### バックエンドデプロイ先候補
| Option | Cost | Setup Time | Notes |
|--------|------|-----------|-------|
| Railway | 無料枠あり | ~10min | PostgreSQL同梱可 |
| Render | 無料枠あり | ~10min | PostgreSQL同梱可 |
| Fly.io | 無料枠あり | ~15min | Docker対応 |

### Phase 2 Environment Variables
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | バックエンドデプロイURL + `/api` |
| `NEXT_PUBLIC_SITE_URL` | Vercel本番URL |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4測定ID |

### Phase 2 完了条件
- [ ] バックエンドAPI疎通確認
- [ ] JWT認証フロー動作
- [ ] Stripe webhook URL更新
- [ ] CORS設定にVercel URLを追加

## CEO Report Template

### デプロイ完了報告
```
[Vercel Deploy Complete]
URL: https://xxxxx.vercel.app
Status: Phase 1 (フロントエンド静的表示)
動作確認: LP表示OK / 認証画面表示OK
Next: バックエンドAPI接続 (Phase 2)
```
