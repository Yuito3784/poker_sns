-- CreateEnum
CREATE TYPE "TableType" AS ENUM ('CASH', 'MTT', 'SNG', 'ZOOM');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('UTG', 'UTG1', 'UTG2', 'MP', 'MP1', 'MP2', 'CO', 'BTN', 'SB', 'BB');

-- CreateEnum
CREATE TYPE "Street" AS ENUM ('PREFLOP', 'FLOP', 'TURN', 'RIVER');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isPokerHand" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PokerHand" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tableType" "TableType" NOT NULL,
    "blinds" TEXT NOT NULL,
    "tableSize" TEXT NOT NULL,
    "heroStack" TEXT NOT NULL,
    "heroPosition" "Position" NOT NULL,
    "heroHand" TEXT,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokerHand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokerStreet" (
    "id" TEXT NOT NULL,
    "pokerHandId" TEXT NOT NULL,
    "street" "Street" NOT NULL,
    "boardCards" TEXT,
    "actions" TEXT NOT NULL,
    "potSize" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokerStreet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PokerHand_postId_key" ON "PokerHand"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PokerStreet_pokerHandId_street_key" ON "PokerStreet"("pokerHandId", "street");

-- AddForeignKey
ALTER TABLE "PokerHand" ADD CONSTRAINT "PokerHand_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokerStreet" ADD CONSTRAINT "PokerStreet_pokerHandId_fkey" FOREIGN KEY ("pokerHandId") REFERENCES "PokerHand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
