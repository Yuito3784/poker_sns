#!/bin/bash
set -euo pipefail

# ============================================================
# Poker SNS — Production Deploy Script
# Usage: DOMAIN=pokersns.com ./deploy.sh
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Pre-flight checks ---

if [ -z "${DOMAIN:-}" ]; then
  echo -e "${RED}ERROR: DOMAIN is required.${NC}"
  echo "Usage: DOMAIN=pokersns.com ./deploy.sh"
  exit 1
fi

if [ ! -f .env ]; then
  echo -e "${RED}ERROR: .env file not found. Copy .env.example and fill in production values.${NC}"
  exit 1
fi

echo -e "${GREEN}=== Poker SNS Production Deploy ===${NC}"
echo -e "Domain: ${YELLOW}${DOMAIN}${NC}"

# --- Required env var check ---
REQUIRED_VARS=(DB_PASSWORD JWT_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET TOKEN_ENCRYPTION_KEY NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL)
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  val=$(grep -E "^${var}=" .env | cut -d'=' -f2- || true)
  if [ -z "$val" ] || echo "$val" | grep -qE '(your_|replace_|xxx|PLACEHOLDER)'; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo -e "${RED}ERROR: The following .env variables are missing or still have placeholder values:${NC}"
  for m in "${MISSING[@]}"; do
    echo "  - $m"
  done
  exit 1
fi

# --- Substitute domain in nginx-prod.conf ---
echo -e "${YELLOW}Substituting DOMAIN_PLACEHOLDER -> ${DOMAIN} in nginx-prod.conf${NC}"
sed -i.bak "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" nginx-prod.conf
rm -f nginx-prod.conf.bak

# --- Build and start ---
echo -e "${YELLOW}Building Docker images...${NC}"
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}Starting services...${NC}"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo ""
echo -e "${GREEN}=== Deploy complete ===${NC}"
echo -e "Next steps:"
echo -e "  1. Obtain SSL cert:  docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN} --email admin@${DOMAIN} --agree-tos"
echo -e "  2. Reload nginx:     docker compose exec nginx nginx -s reload"
echo -e "  3. Verify:           curl -I https://${DOMAIN}/api/health"
