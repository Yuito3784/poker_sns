-- Migration: Add monetization tables (Tip, PaidContent, Salon, Tournament, Coaching, Earnings)

-- 1. Create enums
DO $$ BEGIN
  CREATE TYPE "EarningType" AS ENUM ('SALON_SUBSCRIPTION', 'PAID_CONTENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add new NotificationType values
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'TIP';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'CONTENT_PURCHASE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'SALON_JOIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'TOURNAMENT_JOIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'COACHING_BOOKING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. User: add subscriptionPlan column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT;

-- 4. Tip
CREATE TABLE IF NOT EXISTS "Tip" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "postId" TEXT,
    "amount" INTEGER NOT NULL,
    "message" TEXT,
    "stripePaymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tip_stripePaymentId_key" ON "Tip"("stripePaymentId");
CREATE INDEX IF NOT EXISTS "Tip_receiverId_createdAt_idx" ON "Tip"("receiverId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Tip_senderId_createdAt_idx" ON "Tip"("senderId", "createdAt" DESC);

-- 5. PaidContent
CREATE TABLE IF NOT EXISTS "PaidContent" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "previewText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaidContent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaidContent_postId_key" ON "PaidContent"("postId");

-- 6. ContentPurchase
CREATE TABLE IF NOT EXISTS "ContentPurchase" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "paidContentId" TEXT NOT NULL,
    "stripePaymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentPurchase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContentPurchase_stripePaymentId_key" ON "ContentPurchase"("stripePaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ContentPurchase_buyerId_paidContentId_key" ON "ContentPurchase"("buyerId", "paidContentId");
CREATE INDEX IF NOT EXISTS "ContentPurchase_buyerId_createdAt_idx" ON "ContentPurchase"("buyerId", "createdAt" DESC);

-- 7. Salon
CREATE TABLE IF NOT EXISTS "Salon" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "monthlyPrice" INTEGER NOT NULL,
    "stripePriceId" TEXT,
    "stripeProductId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Salon_slug_key" ON "Salon"("slug");
CREATE INDEX IF NOT EXISTS "Salon_ownerId_idx" ON "Salon"("ownerId");
CREATE INDEX IF NOT EXISTS "Salon_isActive_createdAt_idx" ON "Salon"("isActive", "createdAt" DESC);

-- 8. SalonMember
CREATE TABLE IF NOT EXISTS "SalonMember" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalonMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SalonMember_stripeSubscriptionId_key" ON "SalonMember"("stripeSubscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "SalonMember_salonId_userId_key" ON "SalonMember"("salonId", "userId");
CREATE INDEX IF NOT EXISTS "SalonMember_userId_idx" ON "SalonMember"("userId");

-- 9. SalonPost
CREATE TABLE IF NOT EXISTS "SalonPost" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalonPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SalonPost_salonId_createdAt_idx" ON "SalonPost"("salonId", "createdAt" DESC);

-- 10. Tournament
CREATE TABLE IF NOT EXISTS "Tournament" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entryFee" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "prizePool" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Tournament_status_startAt_idx" ON "Tournament"("status", "startAt");
CREATE INDEX IF NOT EXISTS "Tournament_organizerId_idx" ON "Tournament"("organizerId");

-- 11. TournamentParticipant
CREATE TABLE IF NOT EXISTS "TournamentParticipant" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "placement" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TournamentParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TournamentParticipant_stripePaymentId_key" ON "TournamentParticipant"("stripePaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "TournamentParticipant_tournamentId_userId_key" ON "TournamentParticipant"("tournamentId", "userId");
CREATE INDEX IF NOT EXISTS "TournamentParticipant_userId_idx" ON "TournamentParticipant"("userId");

-- 12. CoachProfile
CREATE TABLE IF NOT EXISTS "CoachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hourlyRate" INTEGER NOT NULL,
    "specialties" TEXT NOT NULL,
    "experience" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CoachProfile_userId_key" ON "CoachProfile"("userId");
CREATE INDEX IF NOT EXISTS "CoachProfile_isActive_idx" ON "CoachProfile"("isActive");

-- 13. CoachBooking
CREATE TABLE IF NOT EXISTS "CoachBooking" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "amount" INTEGER NOT NULL,
    "stripePaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CoachBooking_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CoachBooking_stripePaymentId_key" ON "CoachBooking"("stripePaymentId");
CREATE INDEX IF NOT EXISTS "CoachBooking_coachId_scheduledAt_idx" ON "CoachBooking"("coachId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "CoachBooking_studentId_createdAt_idx" ON "CoachBooking"("studentId", "createdAt" DESC);

-- 14. CreatorEarning
CREATE TABLE IF NOT EXISTS "CreatorEarning" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" "EarningType" NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "description" TEXT,
    "stripePaymentId" TEXT,
    "salonId" TEXT,
    "paidContentId" TEXT,
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorEarning_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CreatorEarning_creatorId_createdAt_idx" ON "CreatorEarning"("creatorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CreatorEarning_creatorId_type_idx" ON "CreatorEarning"("creatorId", "type");
CREATE INDEX IF NOT EXISTS "CreatorEarning_payoutId_idx" ON "CreatorEarning"("payoutId");

-- 15. CreatorPayout
CREATE TABLE IF NOT EXISTS "CreatorPayout" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreatorPayout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CreatorPayout_creatorId_status_idx" ON "CreatorPayout"("creatorId", "status");

-- 16. Foreign keys
DO $$ BEGIN
  ALTER TABLE "Tip" ADD CONSTRAINT "Tip_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Tip" ADD CONSTRAINT "Tip_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Tip" ADD CONSTRAINT "Tip_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaidContent" ADD CONSTRAINT "PaidContent_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ContentPurchase" ADD CONSTRAINT "ContentPurchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ContentPurchase" ADD CONSTRAINT "ContentPurchase_paidContentId_fkey" FOREIGN KEY ("paidContentId") REFERENCES "PaidContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Salon" ADD CONSTRAINT "Salon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SalonMember" ADD CONSTRAINT "SalonMember_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SalonMember" ADD CONSTRAINT "SalonMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SalonPost" ADD CONSTRAINT "SalonPost_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SalonPost" ADD CONSTRAINT "SalonPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CoachBooking" ADD CONSTRAINT "CoachBooking_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CoachBooking" ADD CONSTRAINT "CoachBooking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CreatorEarning" ADD CONSTRAINT "CreatorEarning_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CreatorEarning" ADD CONSTRAINT "CreatorEarning_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CreatorEarning" ADD CONSTRAINT "CreatorEarning_paidContentId_fkey" FOREIGN KEY ("paidContentId") REFERENCES "PaidContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CreatorEarning" ADD CONSTRAINT "CreatorEarning_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "CreatorPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CreatorPayout" ADD CONSTRAINT "CreatorPayout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 17. Fix old migration's RESTRICT constraints to CASCADE (if they exist)
DO $$ BEGIN
  ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_authorId_fkey";
  ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Follow" DROP CONSTRAINT IF EXISTS "Follow_followerId_fkey";
  ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Follow" DROP CONSTRAINT IF EXISTS "Follow_followingId_fkey";
  ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_userId_fkey";
  ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_postId_fkey";
  ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Reply" DROP CONSTRAINT IF EXISTS "Reply_postId_fkey";
  ALTER TABLE "Reply" ADD CONSTRAINT "Reply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Reply" DROP CONSTRAINT IF EXISTS "Reply_authorId_fkey";
  ALTER TABLE "Reply" ADD CONSTRAINT "Reply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_fromUserId_fkey";
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN others THEN NULL;
END $$;
