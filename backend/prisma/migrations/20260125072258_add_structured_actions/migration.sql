/*
  Warnings:

  - You are about to drop the column `actions` on the `PokerStreet` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN');

-- AlterTable
ALTER TABLE "PokerStreet" DROP COLUMN "actions";

-- CreateTable
CREATE TABLE "PokerAction" (
    "id" TEXT NOT NULL,
    "streetId" TEXT NOT NULL,
    "position" "Position" NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "amount" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokerAction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PokerAction" ADD CONSTRAINT "PokerAction_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "PokerStreet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
