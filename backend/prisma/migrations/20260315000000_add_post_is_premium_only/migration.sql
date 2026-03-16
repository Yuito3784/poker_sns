-- Post.isPremiumOnly: プレミアム限定投稿フラグ（スキーマに存在したがマイグレーションがなかった）
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isPremiumOnly" BOOLEAN NOT NULL DEFAULT false;
