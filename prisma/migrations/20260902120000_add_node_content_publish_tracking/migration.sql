-- AlterTable
ALTER TABLE "NodeContent" ADD COLUMN     "publishedTitle" TEXT,
ADD COLUMN     "publishedDescription" TEXT,
ADD COLUMN     "dirtyAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "NodeContent_graphType_dirtyAt_idx" ON "NodeContent"("graphType", "dirtyAt");
