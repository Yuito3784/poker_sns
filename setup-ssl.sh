#!/bin/bash
# =============================================================
# SSL セットアップスクリプト (Let's Encrypt + Certbot)
# 使い方: ./setup-ssl.sh yourdomain.com your@email.com
# =============================================================
set -e

DOMAIN="${1}"
EMAIL="${2}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "使い方: $0 <ドメイン> <メールアドレス>"
  echo "例: $0 pokersns.example.com admin@example.com"
  exit 1
fi

echo "=== SSL セットアップ: $DOMAIN ==="

# 1. nginx-prod.conf のドメインを置換
sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx-prod.conf > nginx-prod-active.conf
echo "✓ nginx-prod-active.conf を生成しました"

# 2. HTTP のみで nginx を起動（ACME challenge 用）
echo "--- nginx を HTTP モードで起動 ---"
docker compose up -d nginx

sleep 3

# 3. 証明書を取得
echo "--- Let's Encrypt 証明書を取得 ---"
docker compose run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

# 4. nginx を SSL 設定に切り替え
echo "--- nginx を HTTPS モードに切り替え ---"
docker compose down nginx
cp nginx.conf nginx-http-backup.conf
cp nginx-prod-active.conf nginx.conf

# 5. 全サービスを再起動
echo "--- 全サービスを再起動 ---"
docker compose up -d

echo ""
echo "✅ SSL セットアップ完了!"
echo "   https://$DOMAIN でアクセスできます"
echo ""
echo "📋 証明書の自動更新について:"
echo "   certbot サービスが 12 時間ごとに自動更新を試みます"
echo "   nginx を定期的にリロードするには cron に追加してください:"
echo "   0 3 * * * docker exec \$(docker ps -q -f name=nginx) nginx -s reload"
