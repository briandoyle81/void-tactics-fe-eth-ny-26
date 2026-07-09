-- AlterTable
ALTER TABLE "Ship" ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "purchasedShipCount" INTEGER NOT NULL DEFAULT 0;
