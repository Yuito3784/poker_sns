# Debian ベースで OpenSSL 3 を確保（Prisma の debian-openssl-3.0.x 用）
FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node

# Prisma + Chromium (puppeteer用)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    libssl3 ca-certificates \
    chromium fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
RUN npm install prisma@5.22.0 --no-save --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p uploads/avatars uploads/posts

EXPOSE 3001
# API起動を最優先し、migrateは必要時に手動実行する
CMD ["node", "dist/src/main.js"]
