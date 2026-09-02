-- CreateEnum
CREATE TYPE "NodeGraphType" AS ENUM ('CAMPAIGN', 'ROGUELIKE');

-- CreateTable
CREATE TABLE "NodeContent" (
    "id" SERIAL NOT NULL,
    "graphType" "NodeGraphType" NOT NULL,
    "nodeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NodeContent_graphType_idx" ON "NodeContent"("graphType");

-- CreateIndex
CREATE UNIQUE INDEX "NodeContent_graphType_nodeId_key" ON "NodeContent"("graphType", "nodeId");
