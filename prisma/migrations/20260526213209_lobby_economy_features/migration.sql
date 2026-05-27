-- AlterTable
ALTER TABLE "Lobby" ADD COLUMN     "joinerFleetSetAt" TIMESTAMP(3),
ADD COLUMN     "reservedJoinerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kickTimeoutUntil" TIMESTAMP(3),
ADD COLUMN     "lobbiesCreatedCount" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_reservedJoinerId_fkey" FOREIGN KEY ("reservedJoinerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
