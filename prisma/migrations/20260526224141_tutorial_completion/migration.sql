-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tutorialCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tutorialPath" TEXT;
