-- Migration: Add HandVote table for poker hand review voting

-- 1. Create VoteType enum
DO $$ BEGIN
  CREATE TYPE "VoteType" AS ENUM ('GOOD', 'BAD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create HandVote table
CREATE TABLE "HandVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "vote" "VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandVote_pkey" PRIMARY KEY ("id")
);

-- 3. Create unique constraint (one vote per user per post)
CREATE UNIQUE INDEX "HandVote_userId_postId_key" ON "HandVote"("userId", "postId");

-- 4. Create index for efficient post vote queries
CREATE INDEX "HandVote_postId_idx" ON "HandVote"("postId");

-- 5. Add foreign keys
ALTER TABLE "HandVote" ADD CONSTRAINT "HandVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandVote" ADD CONSTRAINT "HandVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
