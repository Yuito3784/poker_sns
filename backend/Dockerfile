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
# プラットフォーム検出が 1.1.x になることがあるため、OpenSSL 3 用エンジンを明示
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p uploads/avatars uploads/posts

EXPOSE 3001
CMD ["node", "dist/src/main.js"]
