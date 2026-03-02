-- Seed sample ad for development
INSERT INTO "Ad" (id, title, description, "imageUrl", "linkUrl", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'ポーカーがもっと楽しくなる',
  'プレイをレベルアップ。オンラインで腕を磨こう。',
  NULL,
  'https://example.com',
  0,
  true,
  NOW(),
  NOW()
);
