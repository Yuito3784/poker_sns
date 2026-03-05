#!/usr/bin/env bash
# pre-merge-security-check.sh
# Run before merging feature branches to dev
# Usage: ./scripts/pre-merge-security-check.sh [base-branch]
set -euo pipefail

BASE_BRANCH="${1:-dev}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
ISSUES=0

echo "=========================================="
echo " Pre-Merge Security Check"
echo " Base: $BASE_BRANCH"
echo "=========================================="

# 1. npm audit
echo -e "\n${YELLOW}[1/6] npm audit (backend)${NC}"
cd backend
if npm audit --audit-level=high --omit=dev 2>/dev/null; then
  echo -e "${GREEN}PASS${NC}: No HIGH+ runtime vulnerabilities"
else
  echo -e "${RED}WARN${NC}: HIGH+ vulnerabilities found in backend"
  ISSUES=$((ISSUES + 1))
fi
cd ..

echo -e "\n${YELLOW}[2/6] npm audit (frontend)${NC}"
cd frontend
if npm audit --audit-level=high --omit=dev 2>/dev/null; then
  echo -e "${GREEN}PASS${NC}: No HIGH+ runtime vulnerabilities"
else
  echo -e "${RED}WARN${NC}: HIGH+ vulnerabilities found in frontend"
  ISSUES=$((ISSUES + 1))
fi
cd ..

# 2. Prisma schema validation
echo -e "\n${YELLOW}[3/6] Prisma schema validation${NC}"
cd backend
if npx prisma validate 2>/dev/null; then
  echo -e "${GREEN}PASS${NC}: Prisma schema is valid"
else
  echo -e "${RED}FAIL${NC}: Prisma schema validation failed"
  ISSUES=$((ISSUES + 1))
fi

# Show schema diff if changed
if git diff "origin/${BASE_BRANCH}" -- prisma/schema.prisma | grep -q '^[+-]'; then
  echo -e "${YELLOW}INFO${NC}: Prisma schema has changes:"
  git diff "origin/${BASE_BRANCH}" -- prisma/schema.prisma | head -50
fi
cd ..

# 3. Webhook signature verification check
echo -e "\n${YELLOW}[4/6] Webhook signature verification${NC}"
WEBHOOK_CONTROLLERS=$(grep -rl "@Post.*webhook\|webhook.*@Post" backend/src/ --include="*.ts" 2>/dev/null || true)
if [ -n "$WEBHOOK_CONTROLLERS" ]; then
  for f in $WEBHOOK_CONTROLLERS; do
    SERVICE_DIR=$(dirname "$f")
    SERVICE_FILES=$(find "$SERVICE_DIR" -name "*.service.ts" 2>/dev/null || true)
    SIG_FOUND=false
    for sf in $SERVICE_FILES $f; do
      if grep -q "constructEvent" "$sf" 2>/dev/null; then
        SIG_FOUND=true
        break
      fi
    done
    if [ "$SIG_FOUND" = true ]; then
      echo -e "${GREEN}PASS${NC}: $f — signature verification found"
    else
      echo -e "${RED}FAIL${NC}: $f — no constructEvent call found"
      ISSUES=$((ISSUES + 1))
    fi
  done
else
  echo -e "${GREEN}INFO${NC}: No webhook endpoints found"
fi

# 4. Secret leak scan
echo -e "\n${YELLOW}[5/6] Secret leak scan${NC}"
SECRETS_FOUND=$(git diff "origin/${BASE_BRANCH}" -- '*.ts' '*.tsx' '*.js' '*.json' '*.yml' '*.yaml' | grep "^+" | grep -iE '(sk_live_|pk_live_|whsec_|-----BEGIN.*PRIVATE KEY)' || true)
if [ -n "$SECRETS_FOUND" ]; then
  echo -e "${RED}FAIL${NC}: Potential secrets in diff:"
  echo "$SECRETS_FOUND" | head -10
  ISSUES=$((ISSUES + 1))
else
  echo -e "${GREEN}PASS${NC}: No obvious secrets in diff"
fi

# 5. .env file check
echo -e "\n${YELLOW}[6/6] .env file tracking check${NC}"
ENV_TRACKED=$(git ls-files --cached | grep -E '\.env$|\.env\.local$|\.env\.production$' || true)
if [ -n "$ENV_TRACKED" ]; then
  echo -e "${RED}FAIL${NC}: .env files tracked by git: $ENV_TRACKED"
  ISSUES=$((ISSUES + 1))
else
  echo -e "${GREEN}PASS${NC}: No .env files tracked"
fi

# Summary
echo -e "\n=========================================="
if [ "$ISSUES" -gt 0 ]; then
  echo -e "${RED}RESULT: $ISSUES issue(s) found — review before merging${NC}"
  exit 1
else
  echo -e "${GREEN}RESULT: All security checks passed${NC}"
  exit 0
fi
