-- AlterTable
ALTER TABLE "Lobby" ADD COLUMN     "aiDifficulty" TEXT,
ADD COLUMN     "isAiGame" BOOLEAN NOT NULL DEFAULT false;
