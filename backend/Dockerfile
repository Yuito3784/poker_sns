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

# Prisma の debian-openssl-3.0.x エンジンが libssl.so.3 を必要とするためインストール
RUN apt-get update -y && apt-get install -y --no-install-recommends libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
# Prisma CLI を 5.x で入れておく（migrate deploy 用。devDependency なので ci --omit=dev では入らない）
RUN npm install prisma@5.22.0 --no-save --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p uploads/avatars uploads/posts

EXPOSE 3001
CMD ["node", "dist/src/main.js"]
