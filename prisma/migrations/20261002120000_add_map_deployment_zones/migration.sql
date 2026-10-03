-- AlterTable
ALTER TABLE "Map" ADD COLUMN     "creatorZone" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "joinerZone" JSONB NOT NULL DEFAULT '[]';
