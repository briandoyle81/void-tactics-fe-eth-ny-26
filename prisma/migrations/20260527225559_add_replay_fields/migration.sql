-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "initialState" JSONB;

-- AlterTable
ALTER TABLE "GameTurn" ADD COLUMN     "snapshot" JSONB;
